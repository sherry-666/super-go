window.BOARD_SIZE = 19;
window.SkillTier = Object.freeze({
    TIER1: 1,
    TIER2: 2,
    TIER3: 3,
    TIER4: 4,
    TIER5: 5
});
let cellSize = 0;
let padding = 28; // Reduced from 40 for more board space

// Global skill metadata for UI refresh
const skillMeta = {
    dust_stone:    { icon: '🌪️', nameKey: 'skillDustStone', descKey: 'skillDustStoneDesc', tier: SkillTier.TIER1 },
    dust_stone_medium: { icon: '🌪️', nameKey: 'skillDustStoneMedium', descKey: 'skillDustStoneMediumDesc', tier: SkillTier.TIER2 },
    excuse_me:     { icon: '🤝', nameKey: 'skillExcuseMe',       descKey: 'skillExcuseMeDesc', tier: SkillTier.TIER1 },
    flash_move:    { icon: '⚡', nameKey: 'skillFlashMove',      descKey: 'skillFlashMoveDesc', tier: SkillTier.TIER1 },
    yoink:         { icon: '🤏', nameKey: 'skillYoink',          descKey: 'skillYoinkDesc', tier: SkillTier.TIER1 },
    no_slacking:   { icon: '🚫', nameKey: 'skillNoSlacking',     descKey: 'skillNoSlackingDesc', tier: SkillTier.TIER1 },
    oops:          { icon: '😜', nameKey: 'skillOops',           descKey: 'skillOopsDesc', tier: SkillTier.TIER1 },
    double_tap:    { icon: '⚔️', nameKey: 'skillDoubleTap',      descKey: 'skillDoubleTapDesc', tier: SkillTier.TIER1 },
    blindfold:     { icon: '🌫️', nameKey: 'skillBlindfold',      descKey: 'skillBlindfoldDesc', tier: SkillTier.TIER1 },
    mirage:        { icon: '🌫️', nameKey: 'skillMirage',         descKey: 'skillMirageDesc', tier: SkillTier.TIER2 },
    triple_salvo:  { icon: '🚀', nameKey: 'skillTripleSalvo',    descKey: 'skillTripleSalvoDesc', tier: SkillTier.TIER3 },
    dibs:          { icon: '☄️', nameKey: 'skillDibs',           descKey: 'skillDibsDesc', tier: SkillTier.TIER3 },
    deep_mist:     { icon: '🌪️', nameKey: 'skillDeepMist',       descKey: 'skillDeepMistDesc', tier: SkillTier.TIER3 },
    void_realm:    { icon: '🌌', nameKey: 'skillVoidRealm',      descKey: 'skillVoidRealmDesc', tier: SkillTier.TIER4 },
    coming_through:{ icon: '🚷', nameKey: 'skillComingThrough',  descKey: 'skillComingThroughDesc', tier: SkillTier.TIER4 },
    eternal_night: { icon: '🌑', nameKey: 'skillEternalNight',   descKey: 'skillEternalNightDesc', tier: SkillTier.TIER5 },
    the_squatter:  { icon: '🔒', nameKey: 'skillTheSquatter',    descKey: 'skillTheSquatterDesc', tier: SkillTier.TIER5 },
};

const KOMI = 6.5;
const DAME = 3; // neutral/ambiguous territory marker

// Music State
let musicStarted = false;
let musicEN = document.getElementById('lobby-music-en');
let musicZH = document.getElementById('lobby-music-zh');

function getActiveMusic() {
    return window.currentLang === 'zh' ? musicZH : musicEN;
}

function stopAllMusic() {
    if (musicEN) musicEN.pause();
    if (musicZH) musicZH.pause();
}

function syncLobbyMusic() {
    console.log("Syncing lobby music. CurrentLang:", window.currentLang, "MusicStarted:", musicStarted);
    if (!musicEN || !musicZH) {
        musicEN = document.getElementById('lobby-music-en');
        musicZH = document.getElementById('lobby-music-zh');
    }
    if (!musicEN || !musicZH) {
        console.error("Lobby music elements still missing!");
        return;
    }

    const lobby = document.getElementById('lobby');
    const isLobbyVisible = lobby && !lobby.classList.contains('hidden');
    
    if (!isLobbyVisible) {
        stopAllMusic();
        return;
    }

    const active = getActiveMusic();
    const inactive = window.currentLang === 'zh' ? musicEN : musicZH;
    
    // Hard stop inactive
    if (inactive) {
        inactive.pause();
        try { inactive.currentTime = 0; } catch(e) {}
    }
    
    // Play active if we can
    if (active && musicStarted) {
        console.log("Attempting to play active track:", active.id);
        const slider = document.getElementById('volume-slider');
        active.volume = slider ? slider.value : 0.5;
        
        if (active.paused) {
            active.play().then(() => {
                console.log("Playback successfully started for", active.id);
            }).catch(e => {
                console.warn("Music playback failed or blocked by policy", active.id, e);
            });
        }
    }
}

function initMusic() {
    const slider = document.getElementById('volume-slider');
    const updateVolume = () => {
        const vol = slider ? slider.value : 0.5;
        if (musicEN) musicEN.volume = vol;
        if (musicZH) musicZH.volume = vol;
    };

    if (slider) {
        slider.addEventListener('input', updateVolume);
    }
    updateVolume();

    // Auto-play workaround: start on first click
    document.addEventListener('click', () => {
        if (!musicStarted) {
            console.log("First interaction, starting music");
            musicStarted = true;
            syncLobbyMusic();
        }
    }); // Bubble phase is safer for gesture chains
}

// Initialize music
initMusic();


// Initialized flag
let gameInitialized = false;

let board = Array(window.BOARD_SIZE).fill(null).map(() => Array(window.BOARD_SIZE).fill(EMPTY));
let markedDead = Array(window.BOARD_SIZE).fill(null).map(() => Array(window.BOARD_SIZE).fill(false));
let territoryMap = Array(window.BOARD_SIZE).fill(null).map(() => Array(window.BOARD_SIZE).fill(null));
let currentPlayer = 1; // BLACK
let captures = { 1: 0, 2: 0 };
let history = [];
let consecutivePasses = 0;
let showingTerritory = false;
let gamePhase = 'playing'; // 'playing' or 'scoring'
let lastMove = null; // {x, y}

// Online multiplayer state
let gameMode = 'local'; // 'local' or 'online'
let myColor = null;      // BLACK or WHITE (set in online mode)
let ws = null;           // WebSocket connection
let roomCode = null;

// Skills state
const skillManager = new SkillManager();

// Helper to check if a specific cell contains a 'Squatter'
window.isSquatter = function(x, y) {
    if (!skillManager || !skillManager.activeEffects || !skillManager.activeEffects.squatters) return false;
    return skillManager.activeEffects.squatters.some(s => s.x === x && s.y === y);
};

// Draw round state
let turnCount = 0;
let nextDrawAt = 0;
let pendingOnlineDrawPick = false;
let lastMovedColor = null; // tracks who just made the last move

// ====================== Canvas Setup ======================
const canvas = document.getElementById('go-board');
const ctx = canvas.getContext('2d');

// ====================== Lobby Logic ======================
function showLobbySection(id) {
    document.querySelectorAll('.lobby-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// Check for Test Mode URL access
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.startsWith('/test')) {
        const testControl = document.querySelector('.test-mode-control');
        if (testControl) testControl.style.display = 'flex';
        // Auto-check if on /test for better UX
        const toggle = document.getElementById('test-mode-toggle');
        if (toggle) toggle.checked = true;
    }
});

document.getElementById('btn-play-local').addEventListener('click', () => {
    gameMode = 'local';
    myColor = null;
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('online-indicator').classList.add('hidden');
    initGame();
});

document.getElementById('btn-play-online').addEventListener('click', () => {
    showLobbySection('lobby-online');
});

document.getElementById('btn-online-back').addEventListener('click', () => {
    showLobbySection('lobby-menu');
    // Ensure music is playing if it was started
    if (lobbyMusic && musicStarted) {
        lobbyMusic.play().catch(e => console.log("Music back resume blocked", e));
    }
});

document.getElementById('btn-host').addEventListener('click', () => {
    showLobbySection('lobby-hosting');
    connectAndHost();
});

document.getElementById('btn-host-cancel').addEventListener('click', () => {
    if (ws) { ws.close(); ws = null; }
    showLobbySection('lobby-online');
});

document.getElementById('btn-join-show').addEventListener('click', () => {
    showLobbySection('lobby-join');
    document.getElementById('join-error').classList.add('hidden');
    document.getElementById('join-code-input').value = '';
    document.getElementById('join-code-input').focus();
});

document.getElementById('btn-join-back').addEventListener('click', () => {
    if (ws) { ws.close(); ws = null; }
    showLobbySection('lobby-online');
});

document.getElementById('btn-join-game').addEventListener('click', () => {
    const code = document.getElementById('join-code-input').value.trim();
    if (code.length !== 5 || !/^\d{5}$/.test(code)) {
        showJoinError(t('invalidCode'));
        return;
    }
    connectAndJoin(code);
});

document.getElementById('join-code-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('btn-join-game').click();
    }
});

function showJoinError(msg) {
    const el = document.getElementById('join-error');
    el.textContent = msg;
    el.classList.remove('hidden');
}

// ====================== WebSocket Connection ======================
function connectWS(callback) {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${protocol}://${location.host}`);

    ws.onopen = () => callback();

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
    };

    ws.onclose = () => {
        // If game was in progress, show disconnect message
        if (gameMode === 'online' && !document.getElementById('lobby').classList.contains('hidden') === false) {
            // Still in lobby, ignore
        }
    };
}

function connectAndHost() {
    document.getElementById('game-code').textContent = '-----';
    const isTestMode = document.getElementById('test-mode-toggle').checked;
    console.log(`Hosting game... Test Mode: ${isTestMode}`);
    connectWS(() => {
        wsSend('host', { isTestMode });
    });
}

function connectAndJoin(code) {
    const isTestMode = document.getElementById('test-mode-toggle').checked;
    console.log(`Joining game ${code}... Test Mode: ${isTestMode}`);
    connectWS(() => {
        wsSend('join', { code, isTestMode });
    });
}

function wsSend(type, data) {
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type, data }));
    }
}

function handleServerMessage(msg) {
    const { type, data } = msg;

    switch (type) {
        case 'hosted':
            roomCode = data.code;
            document.getElementById('game-code').textContent = data.code;
            break;

        case 'start':
            gameMode = 'online';
            myColor = data.color;
            document.getElementById('lobby').classList.add('hidden');
            document.getElementById('game-container').classList.remove('hidden');
            
            // Show online indicator
            const indicator = document.getElementById('online-indicator');
            indicator.classList.remove('hidden');
            document.getElementById('online-color-label').textContent = 
                myColor === BLACK ? t('youAreBlack') : t('youAreWhite');
            document.getElementById('online-code-label').textContent = 
                roomCode ? `${t('room')}: ${roomCode}` : '';
            
            initGame(data.isTestMode);
            break;

        case 'error':
            if (data.message === 'mode_mismatch') {
                showJoinError(t('modeMismatch'));
            } else {
                showJoinError(data.message);
            }
            break;

        case 'move':
            // Opponent placed a stone
            applyMove(data.x, data.y);
            break;

        case 'pass':
            applyPass();
            break;

        case 'resign':
            applyResign();
            break;

        case 'mark_dead':
            applyMarkDead(data.x, data.y);
            break;

        case 'accept_score':
            applyAcceptScore();
            break;

        case 'skill':
            const skillResult = skillManager.applyRemoteSkill(data.skill, data);
            if (skillResult.applied) {
                handleSkillApplied(skillResult.skillId, skillResult.endsTurn);
            }
            break;

        case 'skill_pick':
            // Opponent picked a skill during draw round
            skillManager.addSkillToHand(data.player, data.skillId);
            const playerLabel = getPlayerLabel(data.player);
            // Hide opponent skill from log in online mode
            if (gameMode === 'online' && data.player !== myColor) {
                addLog(t('drewGenericLabel').replace('{player}', playerLabel), 'system');
            } else {
                addLog(t('drewLabel').replace('{player}', playerLabel).replace('{skill}', t(skillManager.getSkillById(data.skillId).nameKey)), 'system');
            }
            break;

        case 'draw_round':
            // Opponent triggered a draw round — show my draw modal too
            if (data && data.nextDrawAt) {
                nextDrawAt = data.nextDrawAt;
            }
            gamePhase = 'drawing';
            showDrawModal(myColor, () => {
                gamePhase = 'playing';
                updateSkillUI();
            });
            break;

        case 'resume_game':
            applyResumeGame();
            break;

        case 'opponent_left':
            showModal(t('opponentDisconnected'), 
                `<p style="text-align:center; font-size:1.2rem;">${t('opponentLeft')}</p>`);
            break;
    }
}

// ====================== Game Init ======================
function initGame(onlineIsTestMode = null) {
    // Strictly stop lobby music during gameplay
    stopAllMusic();

    // Game State
    board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
    markedDead = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
    territoryMap = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    currentPlayer = BLACK;
    captures = { [BLACK]: 0, [WHITE]: 0 };
    history = [];
    consecutivePasses = 0;
    showingTerritory = false;
    lastMove = null;
    gamePhase = 'playing';
    turnCount = 0;
    nextDrawAt = 20 + Math.floor(Math.random() * 11); // 10-15 rounds (20-30 turns)
    pendingOnlineDrawPick = false;
    document.getElementById('game-over-modal').classList.add('hidden');
    document.getElementById('scoring-banner').classList.add('hidden');
    document.querySelector('.controls').style.display = 'flex';
    document.getElementById('btn-return-lobby').classList.remove('hidden');
    skillManager.resetAll();

    // Check Test Mode (Online uses server truth, Local uses toggle)
    let finalTestMode = false;
    if (gameMode === 'online' && onlineIsTestMode !== null) {
        finalTestMode = onlineIsTestMode;
    } else {
        finalTestMode = document.getElementById('test-mode-toggle').checked;
    }

    if (finalTestMode) {
        const allSkillIds = Object.keys(skillManager.skills);
        allSkillIds.forEach(id => {
            skillManager.addSkillToHand(BLACK, id);
            skillManager.addSkillToHand(WHITE, id);
        });
        addLog(t('testMode') + ' ACTIVE: All skills unlocked.', 'system');
        
        // Indicate in UI
        const codeLabel = document.getElementById('online-code-label');
        if (codeLabel && gameMode === 'online') {
            codeLabel.textContent += ` [${t('testMode')}]`;
        }
    }

    hoveredCell = null;
    clearLog();
    updateSkillUI();
    updateUI();
    
    // Start animation loop if not already running
    if (!window.animationLoopId) {
        animate();
    } else {
        // Redraw immediately to clear lingering fogs which are no longer active
        drawBoard();
    }
}

// ====================== Animation ======================
function animate() {
    window.animationLoopId = requestAnimationFrame(animate);
    
    // Check if we actually need to redraw for animations
    const hasActiveFogs = skillManager && skillManager.activeEffects.blindfolds && skillManager.activeEffects.blindfolds.length > 0;
    const isTargeting = skillManager && skillManager.activeSkill;
    
    // We only redraw everything if there's movement to show
    if (hasActiveFogs || isTargeting) {
        drawBoard();
    }
}

// ====================== Drawing ======================
function drawBoard() {
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    cellSize = (width - 2 * padding) / (BOARD_SIZE - 1);

    // Draw lines
    ctx.strokeStyle = '#2c1a01';
    ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(padding, padding + i * cellSize);
        ctx.lineTo(width - padding, padding + i * cellSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(padding + i * cellSize, padding);
        ctx.lineTo(padding + i * cellSize, height - padding);
        ctx.stroke();
    }

    // Draw star points (hoshi)
    const starPoints = BOARD_SIZE === 19 ? [3, 9, 15] : (BOARD_SIZE === 13 ? [3, 9] : [2, 6]);
    ctx.fillStyle = '#2c1a01';
    for (let i of starPoints) {
        for (let j of starPoints) {
            ctx.beginPath();
            ctx.arc(padding + i * cellSize, padding + j * cellSize, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    // Draw Coordinates
    ctx.fillStyle = 'rgba(44, 26, 1, 0.7)'; // Slightly transparent for less clutter
    ctx.font = 'bold 11px "Outfit", sans-serif'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const labels = "ABCDEFGHJKLMNOPQRST"; // Standard Go skipping 'I'

    for (let i = 0; i < BOARD_SIZE; i++) {
        // Horizontal labels (Letters A-T) - BOTTOM ONLY
        const labelX = labels[i];
        const xPos = padding + i * cellSize;
        ctx.fillText(labelX, xPos, height - padding / 2);

        // Vertical labels (Numbers 1-19) - LEFT ONLY
        const labelY = (BOARD_SIZE - i).toString();
        const yPos = padding + i * cellSize;
        ctx.fillText(labelY, padding / 2, yPos);
    }

    // Draw stones, dead markers, territory markers, and skill highlights
    if (!board || !Array.isArray(board)) return;

    // Cache affected cells for hover to avoid repeated calls in the loop
    let affectedCells = [];
    if (skillManager && skillManager.activeSkill && hoveredCell) {
        if (skillManager.isValidTargetHover(hoveredCell.x, hoveredCell.y)) {
            affectedCells = skillManager.getAffectedCells(hoveredCell.x, hoveredCell.y);
        }
    }

    const highlightStyle = skillManager.getHighlightStyle();

    // Track which cells to skip drawing normal stones because they are part of a giant stone
    const skipDrawing = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));

    if (skillManager && skillManager.activeEffects.giantStones) {
        skillManager.activeEffects.giantStones = skillManager.activeEffects.giantStones.filter(gs => {
            // Check if the 2x2 area is still intact and belongs to the correct player
            if (gs.x + 1 < BOARD_SIZE && gs.y + 1 < BOARD_SIZE &&
                board[gs.x][gs.y] === gs.color &&
                board[gs.x+1][gs.y] === gs.color &&
                board[gs.x][gs.y+1] === gs.color &&
                board[gs.x+1][gs.y+1] === gs.color) {
                
                skipDrawing[gs.x][gs.y] = true;
                skipDrawing[gs.x+1][gs.y] = true;
                skipDrawing[gs.x][gs.y+1] = true;
                skipDrawing[gs.x+1][gs.y+1] = true;
                
                // Draw the giant stone itself
                drawGiantStone(gs.x, gs.y, gs.color, gs.isSquatter);
                return true; // Keep it
            }
            return false; // Remove it, it was broken or captured
        });
    }

    for (let i = 0; i < BOARD_SIZE; i++) {
        if (!board[i] || !Array.isArray(board[i])) continue; // Defensive
        for (let j = 0; j < BOARD_SIZE; j++) {
            const stone = board[i][j];
            if (stone !== EMPTY) {
                if (!skipDrawing[i][j]) {
                    drawStone(i, j, stone);
                }
                if (markedDead && markedDead[i] && markedDead[i][j]) {
                    drawDeadMarker(i, j);
                }
                // Skill: brighter hover highlight on the specific hovered stones (AOE)
                const isAffected = affectedCells.some(c => c.x === i && c.y === j);
                if (isAffected) {
                    drawSkillHighlight(i, j, highlightStyle);
                }
            } else if (showingTerritory && territoryMap && territoryMap[i] && territoryMap[i][j] !== null) {
                drawTerritoryMarker(i, j, territoryMap[i][j]);
            } else if (stone === EMPTY) {
                // Check if AOE highlight applies even to empty cells
                const isAffected = affectedCells.some(c => c.x === i && c.y === j);
                if (isAffected) {
                    drawSkillHighlight(i, j, highlightStyle);
                } else if (skillManager && skillManager.activeSkill && skillManager.isValidTargetHover(i, j)) {
                    // Highlight valid empty targets with standard green
                    drawSkillValidTarget(i, j);
                }
            }
            
            // Draw No Slacking indicator Zone
            let showNoSlacking = false;
            if (skillManager.activeEffects.noSlacking !== null) {
                if (gameMode === 'online') {
                    showNoSlacking = (myColor === skillManager.activeEffects.noSlacking);
                } else {
                    showNoSlacking = (currentPlayer === skillManager.activeEffects.noSlacking);
                }
            }

            if (showNoSlacking && (i <= 2 || i >= BOARD_SIZE - 3 || j <= 2 || j >= BOARD_SIZE - 3)) {
                const cx = padding + i * cellSize;
                const cy = padding + j * cellSize;
                ctx.fillStyle = 'rgba(255, 60, 60, 0.2)'; // Red warning zone
                ctx.beginPath();
                ctx.arc(cx, cy, cellSize * 0.35, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }

    // Draw last move marker (BEFORE fog, so fog can hide it if needed)
    if (lastMove && gamePhase === 'playing') {
        drawLastMoveMarker(lastMove.x, lastMove.y);
    }

    // Draw Blindfold Fogs
    if (skillManager.activeEffects.blindfolds) {
        skillManager.activeEffects.blindfolds.forEach(fog => {
            // In online mode, the owner shouldn't see the fog
            const isOwner = (gameMode === 'online' && myColor === fog.owner);
            if (!isOwner) {
                drawFog(fog.x, fog.y, fog.size || 2);
            }
        });
    }
}

function drawFog(x, y, gridSize = 2) {
    let fogX = padding + x * cellSize - cellSize * 0.5;
    let fogY = padding + y * cellSize - cellSize * 0.5;
    let size = cellSize * gridSize;
    
    // For full-board eternal night type fogs, cover the absolute entirety of the canvas
    if (gridSize >= BOARD_SIZE) {
        fogX = 0;
        fogY = 0;
        size = Math.max(canvas.width, canvas.height);
    }

    const centerX = fogX + size / 2;
    const centerY = fogY + size / 2;
    const time = Date.now() / 1000;

    ctx.save();
    
    if (gridSize <= 3) {
        // --- Style 1: Standard Fog (e.g. Blindfold 3x3) ---
        const pulse = Math.sin(time * 1.5) * 5;
        const driftX = Math.cos(time * 0.8) * 4;
        const driftY = Math.sin(time * 0.8) * 4;
        
        const grad = ctx.createRadialGradient(
            centerX + driftX, centerY + driftY, 0,
            centerX, centerY, (size/1.2) + pulse
        );
        grad.addColorStop(0, 'rgba(80, 80, 100, 1)'); 
        grad.addColorStop(1, 'rgba(25, 25, 35, 1)');  
        
        ctx.fillStyle = grad;
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.fillRect(fogX, fogY, size, size);

        // Dynamic Whispies/Clouds
        ctx.globalCompositeOperation = 'screen';
        for(let i = 0; i < 8; i++) {
            const speed = 0.5 + (i * 0.1);
            const orbitRadius = cellSize * 0.4;
            const angle = time * speed + (i * Math.PI / 4);
            
            const wx = centerX + Math.cos(angle) * orbitRadius * (1 + Math.sin(time * 0.5) * 0.2);
            const wy = centerY + Math.sin(angle) * orbitRadius * (1 + Math.cos(time * 0.5) * 0.2);
            const wr = cellSize * (0.5 + Math.sin(time + i) * 0.1);
            
            ctx.fillStyle = `rgba(200, 200, 220, ${0.1 + Math.sin(time * 2 + i) * 0.05})`;
            ctx.beginPath();
            ctx.arc(wx, wy, wr, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (gridSize <= 8) {
        // --- Style 2: Dense Swirling Mist (e.g. Mirage, Deep Mist) ---
        const pulse = Math.sin(time) * (size * 0.05);
        ctx.fillStyle = 'rgba(15, 18, 25, 1)';
        ctx.fillRect(fogX, fogY, size, size); // solid dark base

        const grad = ctx.createRadialGradient(
            centerX, centerY, size * 0.1,
            centerX, centerY, size * 0.6 + pulse
        );
        grad.addColorStop(0, 'rgba(40, 50, 70, 0.9)'); 
        grad.addColorStop(0.5, 'rgba(20, 25, 40, 0.95)');
        grad.addColorStop(1, 'rgba(10, 12, 18, 1)');  
        
        ctx.fillStyle = grad;
        ctx.fillRect(fogX, fogY, size, size);

        // Dense swirling layers
        ctx.globalCompositeOperation = 'screen';
        const numClouds = Math.floor(gridSize * 4); 
        for (let i = 0; i < numClouds; i++) {
            const seed = i * 13.5;
            const speed = 0.3 + (i % 3) * 0.1;
            const orbit = (cellSize * 0.5) * (1 + (i % Math.max(1, gridSize - 1)));
            const angle = time * speed + seed;
            
            const wx = centerX + Math.cos(angle) * orbit;
            // slightly elliptical orbit
            const wy = centerY + Math.sin(angle) * orbit * 0.8; 
            const wr = cellSize * (0.8 + Math.sin(time + seed) * 0.3);
            
            ctx.fillStyle = `rgba(90, 130, 180, ${0.05 + Math.sin(time + seed) * 0.02})`;
            ctx.beginPath();
            ctx.arc(wx, wy, wr, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // --- Style 3: Galactic Void (e.g. Void Realm, Eternal Night) ---
        const pulse = Math.sin(time * 0.5) * (size * 0.05);
        
        ctx.fillStyle = 'rgba(2, 2, 5, 1)';
        ctx.fillRect(fogX, fogY, size, size);

        // Deep space gradient
        const grad = ctx.createRadialGradient(
            centerX, centerY, size * 0.1,
            centerX, centerY, size * 0.6 + pulse
        );
        grad.addColorStop(0, 'rgba(60, 20, 100, 0.9)'); 
        grad.addColorStop(0.4, 'rgba(20, 10, 40, 0.95)'); 
        grad.addColorStop(1, 'rgba(0, 0, 0, 1)');
        
        ctx.fillStyle = grad;
        ctx.fillRect(fogX, fogY, size, size);

        // Twinkling stars
        ctx.globalCompositeOperation = 'screen';
        // Density scales with the area of the void
        const numStars = Math.min(300, Math.floor((size * size) / 5000));
        for (let i = 0; i < numStars; i++) {
            const seed = i * 99.1;
            const sx = fogX + (Math.sin(seed * 1.1) * 0.5 + 0.5) * size;
            const sy = fogY + (Math.cos(seed * 1.3) * 0.5 + 0.5) * size;
            const twinkle = Math.max(0, Math.sin(time * (1 + i % 3) + seed));
            const sr = 1 + (i % 2) * twinkle;

            ctx.fillStyle = `rgba(200, 150, 255, ${twinkle * 0.8})`;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        }

        // Space vortex tendrils
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 7; i++) {
            const angleOffset = i * (Math.PI * 2 / 7) + time * 0.3;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            for (let r = 0; r < size * 0.6; r += 20) {
                const a = angleOffset + r * 0.005; 
                const tx = centerX + Math.cos(a) * r;
                const ty = centerY + Math.sin(a) * r;
                ctx.lineTo(tx, ty);
            }
            ctx.strokeStyle = `rgba(90, 40, 180, 0.15)`;
            ctx.lineWidth = size * 0.05;
            ctx.stroke();
        }
    }
    
    ctx.restore();
}

function drawLastMoveMarker(x, y) {
    const cx = padding + x * cellSize;
    const cy = padding + y * cellSize;
    
    // A small white or black circle outline depending on the stone color
    const stoneColor = board[x][y];
    if (stoneColor === EMPTY) return;

    ctx.save();
    ctx.strokeStyle = stoneColor === BLACK ? 'white' : 'black';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, cellSize * 0.15, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
}

function drawGiantStone(x, y, color, isSquatter = false) {
    // The center is exactly halfway between the top-left and bottom-right intersections
    const cx = padding + x * cellSize + cellSize / 2;
    const cy = padding + y * cellSize + cellSize / 2;
    
    // Total width spans almost 2 cells. Standard stone radius is roughly cellSize/2.
    // Giant stone radius should be slightly less than full cellSize.
    const radius = cellSize - 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    
    // Gradients for 3D effect
    const gradient = ctx.createRadialGradient(
        cx - radius / 3, 
        cy - radius / 3, 
        radius / 10, 
        cx, cy, radius
    );
    
    if (color === BLACK) {
        gradient.addColorStop(0, '#666');
        gradient.addColorStop(1, '#111');
    } else {
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(1, '#ccc');
    }
    
    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.fill();
    
    if (color === WHITE) {
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Draw lock icon if it's an immortal squatter
    if (isSquatter) {
        ctx.font = `${radius * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒', cx, cy);
    }
    
    ctx.restore();
}

function drawDeadMarker(x, y) {
    const cx = padding + x * cellSize;
    const cy = padding + y * cellSize;
    const size = cellSize * 0.4;
    
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - size/2, cy - size/2);
    ctx.lineTo(cx + size/2, cy + size/2);
    ctx.moveTo(cx + size/2, cy - size/2);
    ctx.lineTo(cx - size/2, cy + size/2);
    ctx.stroke();
}

function drawTerritoryMarker(x, y, color) {
    const cx = padding + x * cellSize;
    const cy = padding + y * cellSize;
    const size = cellSize * 0.3;

    if (color === BLACK) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(cx - size/2, cy - size/2, size, size);
    } else if (color === WHITE) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(cx - size/2, cy - size/2, size, size);
    } else if (color === DAME) {
        ctx.fillStyle = 'rgba(128, 128, 128, 0.6)';
        ctx.beginPath();
        ctx.moveTo(cx, cy - size/2);
        ctx.lineTo(cx + size/2, cy);
        ctx.lineTo(cx, cy + size/2);
        ctx.lineTo(cx - size/2, cy);
        ctx.closePath();
        ctx.fill();
    }
}

function drawSkillValidTarget(x, y) {
    const cx = padding + x * cellSize;
    const cy = padding + y * cellSize;
    const radius = cellSize * 0.46;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 220, 100, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(100, 220, 100, 0.4)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
}

function drawSkillHighlight(x, y, style) {
    if (!style) return;

    const cx = padding + x * cellSize;
    const cy = padding + y * cellSize;
    const radius = cellSize * 0.48;
    
    ctx.save();
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = style.glowColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
}

function drawStone(x, y, color) {
    const cx = padding + x * cellSize;
    const cy = padding + y * cellSize;
    const radius = cellSize * 0.45;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    
    const gradient = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
    
    if (color === BLACK) {
        gradient.addColorStop(0, '#555');
        gradient.addColorStop(1, '#000');
    } else {
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(1, '#ccc');
    }
    
    ctx.fillStyle = gradient;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

// ====================== Game Logic ======================
function getNeighbors(x, y) {
    const neighbors = [];
    if (x > 0) neighbors.push([x - 1, y]);
    if (x < BOARD_SIZE - 1) neighbors.push([x + 1, y]);
    if (y > 0) neighbors.push([x, y - 1]);
    if (y < BOARD_SIZE - 1) neighbors.push([x, y + 1]);
    return neighbors;
}

function getGroup(x, y, currentBoard = board) {
    const color = currentBoard[x][y];
    if (color === EMPTY) return { stones: [], liberties: [] };

    const stones = [];
    const liberties = new Set();
    const visited = new Set();
    const queue = [[x, y]];
    let hasSquatter = false;
    
    visited.add(`${x},${y}`);

    while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        stones.push([cx, cy]);
        
        if (window.isSquatter(cx, cy)) {
            hasSquatter = true;
        }

        for (const [nx, ny] of getNeighbors(cx, cy)) {
            const nColor = currentBoard[nx][ny];
            const nKey = `${nx},${ny}`;
            
            if (nColor === EMPTY) {
                liberties.add(nKey);
            } else if (nColor === color && !visited.has(nKey)) {
                visited.add(nKey);
                queue.push([nx, ny]);
            }
        }
    }

    return { stones, liberties: Array.from(liberties), hasSquatter };
}

function calculateScore() {
    let blackTerritory = 0;
    let whiteTerritory = 0;
    
    const scoring = territoryScoring(board, markedDead, false);

    territoryMap = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            const s = scoring[i][j];
            if (s.isTerritoryFor === BLACK) {
                if (board[i][j] === EMPTY) blackTerritory++;
                territoryMap[i][j] = BLACK;
            } else if (s.isTerritoryFor === WHITE) {
                if (board[i][j] === EMPTY) whiteTerritory++;
                territoryMap[i][j] = WHITE;
            } else if (board[i][j] === EMPTY) {
                if (s.isDame || s.belongsToSekiGroup !== EMPTY) {
                    territoryMap[i][j] = DAME;
                }
            }
        }
    }

    const finalScores = finalTerritoryScore(board, markedDead, captures[BLACK], captures[WHITE], KOMI, false);

    return {
        black: { territory: blackTerritory, captures: captures[BLACK], total: finalScores.black },
        white: { territory: whiteTerritory, captures: captures[WHITE], komi: KOMI, total: finalScores.white }
    };
}

function cloneBoard(b) {
    return b.map(row => [...row]);
}

function boardsEqual(b1, b2) {
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (b1[i][j] !== b2[i][j]) return false;
        }
    }
    return true;
}

function isMyTurn() {
    if (gameMode === 'local') return true;
    return currentPlayer === myColor;
}

// ====================== Move Application (shared by local & online) ======================
function isValidMove(x, y, playerColor, currentBoard = board) {
    if (currentBoard[x][y] !== EMPTY) return false; // Already occupied

    const enemyColor = playerColor === BLACK ? WHITE : BLACK;

    // Check liberties of resulting group (and if it captures anything)
    const nextBoard = cloneBoard(currentBoard);
    nextBoard[x][y] = playerColor;
    let capturesEnemy = false;
    
    // Check if it captures enemy (even groups with squatters lose their non-squatter stones)
    for(const [nx, ny] of getNeighbors(x, y)) {
        if(nextBoard[nx][ny] === enemyColor) {
            const enemyGroup = getGroup(nx, ny, nextBoard);
            if(enemyGroup.liberties.length === 0) {
                // Capturable if there's at least one non-squatter stone
                const hasNonSquatter = enemyGroup.stones.some(([sx, sy]) => !window.isSquatter(sx, sy));
                if (hasNonSquatter || !enemyGroup.hasSquatter) {
                    capturesEnemy = true;
                    break;
                }
            }
        }
    }
    
    // If it captures, it's not suicide
    if(capturesEnemy) return true;
    
    // If it doesn't capture, check its own liberties
    const myGroup = getGroup(x, y, nextBoard);
    if(myGroup.liberties.length === 0 && !myGroup.hasSquatter) {
        return false; // Suicide (squatter cells keep the group alive)
    }
    
    return true;
}

function applyMove(x, y) {
    const nextBoard = cloneBoard(board);
    nextBoard[x][y] = currentPlayer;
    const opponentColor = currentPlayer === BLACK ? WHITE : BLACK;
    let capturedCount = 0;

    for (const [nx, ny] of getNeighbors(x, y)) {
        if (nextBoard[nx][ny] === opponentColor) {
            const group = getGroup(nx, ny, nextBoard);
            if (group.liberties.length === 0) {
                group.stones.forEach(([cx, cy]) => {
                    // Squatter cells are immortal — skip them
                    if (!window.isSquatter(cx, cy)) {
                        nextBoard[cx][cy] = EMPTY;
                        capturedCount++;
                    }
                });
            }
        }
    }

    history.push(cloneBoard(board));
    if (history.length > 2) history.shift();

    territoryMap = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));

    // Clear my active debuffs at the END of my turn before switching
    skillManager.clearEffects(currentPlayer);

    board = nextBoard;
    captures[currentPlayer] += capturedCount;
    lastMove = { x, y };

    // Log the move
    const playerLabel = currentPlayer === BLACK ? 'Black' : 'White';
    const colLetter = String.fromCharCode(65 + x);
    const rowNumber = BOARD_SIZE - y;
    let logMsg = `${playerLabel} → ${colLetter}${rowNumber}`;
    if (capturedCount > 0) logMsg += ` (captured ${capturedCount})`;
    addLog(logMsg, currentPlayer === BLACK ? 'black' : 'white');

    lastMovedColor = currentPlayer;
    skillManager.decrementEffects(currentPlayer);
    currentPlayer = opponentColor;
    consecutivePasses = 0;
    showingTerritory = false;
    skillManager.resetTurn(currentPlayer);
    turnCount++;
    
    playStoneSound(); 
    drawBoard();
    updateUI();
    updateSkillUI();
    checkDrawRound();
}

// Used by skills that manage their own board mutations but still need to end the turn
function finalizeTurn(logMessage, logType, lastX = null, lastY = null) {
    history.push(cloneBoard(board));
    if (history.length > 2) history.shift();

    skillManager.clearEffects(currentPlayer);

    if (logMessage) addLog(logMessage, logType || 'system');

    if (lastX !== null && lastY !== null) {
        lastMove = { x: lastX, y: lastY };
    } else {
        lastMove = null; // Clear it if the skill doesn't specify a "last move" (e.g. removal)
    }

    lastMovedColor = currentPlayer;
    skillManager.decrementEffects(currentPlayer);
    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    consecutivePasses = 0;
    showingTerritory = false;
    territoryMap = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    skillManager.resetTurn(currentPlayer);
    turnCount++;
    
    drawBoard();
    updateUI();
    updateSkillUI();
    checkDrawRound();
}

function applyPass() {
    history.push(cloneBoard(board));
    if (history.length > 2) history.shift();
    
    // Clear my active debuffs
    skillManager.clearEffects(currentPlayer);

    const playerLabel = currentPlayer === BLACK ? 'Black' : 'White';
    addLog(`${playerLabel} passed`, currentPlayer === BLACK ? 'black' : 'white');

    skillManager.decrementEffects(currentPlayer);
    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    skillManager.resetTurn(currentPlayer);
    consecutivePasses++;
    updateUI();
    
    if (consecutivePasses >= 2) {
        gamePhase = 'scoring';
        showingTerritory = true;
        document.getElementById('scoring-banner').classList.remove('hidden');
        document.querySelector('.controls').style.display = 'none';
        
        calculateScore();
        drawBoard();
    }
}

function applyResign() {
    const winner = currentPlayer === BLACK ? t('white') : t('black');
    showModal(t('resignation'), `<p style="text-align:center; font-size:1.2rem;">${t('winsByResignation').replace('{winner}', winner)}</p>`);
}

function applyMarkDead(x, y) {
    const group = getGroup(x, y);
    const isNowDead = !markedDead[x][y];
    
    group.stones.forEach(([cx, cy]) => {
        markedDead[cx][cy] = isNowDead;
    });
    
    calculateScore();
    drawBoard();
}

function applyAcceptScore() {
    const score = calculateScore();
    document.getElementById('scoring-banner').classList.add('hidden');
    document.querySelector('.controls').style.display = 'flex';
    
    let winner = score.black.total > score.white.total ? t('black') : t('white');
    let margin = Math.abs(score.black.total - score.white.total);
    
    const detailsHtml = `
        <p><strong>${t('black')}:</strong> ${score.black.total} ${t('pts')}<br>
        <span class="captures">(${t('territory')}: ${score.black.territory}, ${t('captures')}: ${score.black.captures})</span></p>
        <div style="height: 10px;"></div>
        <p><strong>${t('white')}:</strong> ${score.white.total} ${t('pts')}<br>
        <span class="captures">(${t('territory')}: ${score.white.territory}, ${t('captures')}: ${score.white.captures}, ${t('komi')}: ${score.white.komi})</span></p>
        <div style="height: 15px;"></div>
        <p style="text-align: center; color: var(--board-color);"><strong>${t('winsBy').replace('{winner}', winner).replace('{margin}', margin)}</strong></p>
    `;
    showModal(t('gameOver'), detailsHtml);
}

function applyResumeGame() {
    gamePhase = 'playing';
    showingTerritory = false;
    consecutivePasses = 0;
    markedDead = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
    
    document.getElementById('scoring-banner').classList.add('hidden');
    document.querySelector('.controls').style.display = 'flex';
    drawBoard();
}

// ====================== User Interaction (click, buttons) ======================
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

canvas.addEventListener('click', (e) => {
    const coords = getCanvasCoordinates(e);
    const x = coords.x;
    const y = coords.y;

    const gridX = Math.round((x - padding) / cellSize);
    const gridY = Math.round((y - padding) / cellSize);

    if (gridX >= 0 && gridX < BOARD_SIZE && gridY >= 0 && gridY < BOARD_SIZE) {
        if (gamePhase === 'playing') {
            if (skillManager.activeSkill && isMyTurn()) {
                // Skill targeting mode (delegate to manager)
                const result = skillManager.handleTargetClick(gridX, gridY, gameMode === 'online', wsSend);
                if (result.applied) {
                    handleSkillApplied(result.skillId, result.endsTurn, gridX, gridY);
                } else {
                    drawBoard();
                    updateSkillUI();
                }
            } else if (isMyTurn()) {
                // Check Blindfold fog overlap
                const inFog = skillManager.activeEffects.blindfolds.some(fog => {
                    // Only apply penalty if the active player is NOT the owner
                    if (gameMode === 'online' && currentPlayer === fog.owner) return false;
                    
                    const size = fog.size || 2;
                    return gridX >= fog.x && gridX < fog.x + size && gridY >= fog.y && gridY < fog.y + size;
                });

                if (inFog && board[gridX][gridY] !== EMPTY) {
                    // Forced skip!
                    playDisallowSound();
                    showSkillPopup(t('fogOverlap'), true);
                    if (gameMode === 'online') {
                        wsSend('pass', {});
                    }
                    applyPass();
                } else if (board[gridX][gridY] === EMPTY) {
                    tryPlaceStone(gridX, gridY);
                } else {
                    playDisallowSound(); // Cell occupied
                }
            }
        } else if (gamePhase === 'scoring') {
            if (board[gridX][gridY] !== EMPTY) {
                applyMarkDead(gridX, gridY);
                if (gameMode === 'online') {
                    wsSend('mark_dead', { x: gridX, y: gridY });
                }
            }
        }
    }
});

// Cancel skill on right-click or Esc
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (skillManager.activeSkill) {
        skillManager.cancelActiveSkill();
        updateSkillUI();
        drawBoard();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && skillManager.activeSkill) {
        skillManager.cancelActiveSkill();
        hoveredCell = null;
        updateSkillUI();
        drawBoard();
    }
});

// Mousemove for skill hover highlighting
canvas.addEventListener('mousemove', (e) => {
    if (!skillManager.activeSkill) {
        if (hoveredCell) {
            hoveredCell = null;
            drawBoard();
        }
        return;
    }
    
    const coords = getCanvasCoordinates(e);
    const x = coords.x;
    const y = coords.y;
    const gridX = Math.round((x - padding) / cellSize);
    const gridY = Math.round((y - padding) / cellSize);
    
    if (gridX >= 0 && gridX < BOARD_SIZE && gridY >= 0 && gridY < BOARD_SIZE) {
        if (skillManager.isValidTargetHover(gridX, gridY)) {
            if (!hoveredCell || hoveredCell.x !== gridX || hoveredCell.y !== gridY) {
                hoveredCell = { x: gridX, y: gridY };
                drawBoard();
            }
            return;
        }
    }
    if (hoveredCell) {
        hoveredCell = null;
        drawBoard();
    }
});

canvas.addEventListener('mouseleave', () => {
    if (hoveredCell) {
        hoveredCell = null;
        drawBoard();
    }
});

function playStoneSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        
        // 1. Initial "click/snap" (High frequency)
        const snapOsc = audioCtx.createOscillator();
        const snapGain = audioCtx.createGain();
        snapOsc.type = 'triangle';
        snapOsc.frequency.setValueAtTime(800, audioCtx.currentTime);
        snapOsc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.02);
        
        snapGain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        snapGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        
        snapOsc.connect(snapGain);
        snapGain.connect(audioCtx.destination);
        
        // 2. Main "thump" (Lower frequency, wood-like)
        const thumpOsc = audioCtx.createOscillator();
        const thumpGain = audioCtx.createGain();
        thumpOsc.type = 'sine';
        thumpOsc.frequency.setValueAtTime(150, audioCtx.currentTime);
        thumpOsc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.1);
        
        thumpGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        thumpGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        
        thumpOsc.connect(thumpGain);
        thumpGain.connect(audioCtx.destination);
        
        snapOsc.start();
        snapOsc.stop(audioCtx.currentTime + 0.05);
        thumpOsc.start();
        thumpOsc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
        console.log('Audio play failed', e);
    }
}

function playDisallowSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); // Low warning buzz
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
        console.log('Audio play failed', e);
    }
}

function playSkillSound(type = 'impact') {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        
        const masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        masterGain.connect(audioCtx.destination);

        if (type === 'shimmer') {
            // Option A: Shimmer (Magical/Sparkly)
            for (let i = 0; i < 3; i++) {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200 + i * 400, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(800 + i * 200, audioCtx.currentTime + 0.3);
                
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                
                osc.connect(gain);
                gain.connect(masterGain);
                osc.start(audioCtx.currentTime + i * 0.05);
                osc.stop(audioCtx.currentTime + 0.4 + i * 0.05);
            }
        } else if (type === 'impact') {
            // Option B: Impact (Powerful Thump)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.2);
            
            gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'energy') {
            // Option C: Energy (Rising Charge)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.25);
            
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        }
    } catch (e) {
        console.log('Skill sound failed', e);
    }
}

function showSkillPopup(text, isTrigger = false) {
    const popup = document.getElementById('skill-popup');
    if (!popup) return;

    popup.textContent = text;
    popup.classList.remove('trigger');
    if (isTrigger) popup.classList.add('trigger');
    
    popup.classList.add('show');
    
    setTimeout(() => {
        popup.classList.remove('show');
    }, 2000);
}

function tryPlaceStone(x, y) {
    if (skillManager.activeEffects.noSlacking === currentPlayer) {
        if (x <= 2 || x >= BOARD_SIZE - 3 || y <= 2 || y >= BOARD_SIZE - 3) {
            playDisallowSound();
            playSkillSound('impact');
            showSkillPopup(t('skillNoSlacking') + ' Triggered!', true);
            return; // Block placement on or below 3rd line
        }
    }

    // Apply "Oops, My Bad" deviation
    if (skillManager.activeEffects.oops === currentPlayer) {
        const validDeviations = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[nx][ny] === EMPTY) {
                    validDeviations.push({x: nx, y: ny});
                }
            }
        }
        if (validDeviations.length > 0) {
            const randIndex = Math.floor(Math.random() * validDeviations.length);
            x = validDeviations[randIndex].x;
            y = validDeviations[randIndex].y;
            playSkillSound('impact');
            showSkillPopup(t('skillOops') + ' Triggered!', true);
        }
    }

    const nextBoard = cloneBoard(board);
    nextBoard[x][y] = currentPlayer;
    const opponentColor = currentPlayer === BLACK ? WHITE : BLACK;
    let anyCaptures = false;

    // Check for captures
    for (const [nx, ny] of getNeighbors(x, y)) {
        if (nextBoard[nx][ny] === opponentColor) {
            const group = getGroup(nx, ny, nextBoard);
            if (group.liberties.length === 0) {
                anyCaptures = true;
                group.stones.forEach(([cx, cy]) => {
                    nextBoard[cx][cy] = EMPTY;
                });
            }
        }
    }

    // Check for suicide
    if (!anyCaptures) {
        const group = getGroup(x, y, nextBoard);
        if (group.liberties.length === 0) {
            playDisallowSound();
            return; // Suicide not allowed
        }
    }

    // Check Ko rule
    if (history.length > 0) {
        const previousBoard = history[history.length - 1];
        if (boardsEqual(nextBoard, previousBoard)) {
            playDisallowSound();
            return; // Ko rule violation
        }
    }

    // Valid move — apply it
    applyMove(x, y);

    // Send to server if online
    if (gameMode === 'online') {
        wsSend('move', { x, y });
    }
}

function updateUI() {
    document.getElementById('player-black').classList.toggle('active', currentPlayer === BLACK);
    document.getElementById('player-white').classList.toggle('active', currentPlayer === WHITE);
    
    document.getElementById('black-captures').innerText = captures[BLACK];
    document.getElementById('white-captures').innerText = captures[WHITE];
    
    // Update turn counter
    const turnEl = document.getElementById('current-turn');
    if (turnEl) turnEl.textContent = turnCount + 1;

    updateSkillUI();
}

function refreshUI() {
    updateUI();
    drawBoard();

    // Sync Music
    syncLobbyMusic();
    
    // If a modal is open, we might need to refresh its specific dynamic content
    const drawModal = document.getElementById('skill-draw-modal');
    if (drawModal && !drawModal.classList.contains('hidden')) {
        const playerEl = document.getElementById('draw-modal-player');
        const player = parseInt(playerEl.getAttribute('data-draw-player'));
        if (!isNaN(player)) {
            playerEl.textContent = t('isDrawing').replace('{player}', getPlayerLabel(player));
        }

        // Refresh existing cards
        const cards = drawModal.querySelectorAll('.draw-card');
        cards.forEach(card => {
            const skillId = card.getAttribute('data-skill-id');
            const meta = skillMeta[skillId];
            if (meta) {
                card.querySelector('.draw-card-tier').textContent = t('tier1');
                card.querySelector('.draw-card-name').textContent = t(meta.nameKey);
                card.querySelector('.draw-card-desc').textContent = t(meta.descKey);
            }
        });
    }
}

// ====================== Game Log ======================
function addLog(message, type = 'system') {
    const container = document.getElementById('game-log-content');
    if (!container) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = message;
    container.appendChild(entry);
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function clearLog() {
    const container = document.getElementById('game-log-content');
    if (container) container.innerHTML = '';
}

function getPlayerLabel(player) {
    return player === BLACK ? t('black') : t('white');
}

// ====================== Skills System ======================

function updateSkillUI() {
    const handEl = document.getElementById('skill-hand');
    const emptyEl = document.getElementById('skill-hand-empty');
    const statusEl = document.getElementById('skill-status');

    if (!handEl) return;

    // In online mode always show MY hand; in local mode show the active player's hand
    const viewPlayer = gameMode === 'online' ? myColor : currentPlayer;
    const hand = skillManager.playerHands[viewPlayer] || [];
    const canUse = isMyTurn() && !skillManager.skillUsedThisTurn[currentPlayer] && gamePhase === 'playing';

    // Remove all existing dynamic buttons (keep the empty placeholder)
    handEl.querySelectorAll('.skill-btn').forEach(btn => btn.remove());

    // Show/hide the whole skill panel
    const panelEl = handEl.closest('.skill-panel');
    if (panelEl) panelEl.style.display = hand.length === 0 ? 'none' : '';

    if (hand.length === 0) {
        if (emptyEl) emptyEl.style.display = '';
    } else {
        if (emptyEl) emptyEl.style.display = 'none';

        // Unique logic per skill using global skillMeta

        // Remove duplicate IDs in hand (show each once
        const uniqueHand = [...new Set(hand)];
        uniqueHand.forEach(skillId => {
            const meta = skillMeta[skillId] || { icon: '✨', nameKey: skillId, descKey: '' };
            const isActive = skillManager.activeSkill && skillManager.activeSkill.id === skillId;
            const isUsable = canUse && skillManager.isSkillUsable(skillId, board, currentPlayer);

            const btn = document.createElement('button');
            btn.className = 'btn skill-btn' + (isActive ? ' skill-active' : '');
            btn.disabled = !isUsable;
            btn.dataset.skillId = skillId;
            btn.title = t(meta.descKey);
            const tierKey = `tier${meta.tier || 1}`;
            btn.innerHTML = `
                <span class="skill-tier" data-i18n="${tierKey}">${t(tierKey)}</span>
                <span class="skill-icon">${meta.icon}</span>
                <span class="skill-name">${t(meta.nameKey)}</span>
                <span class="skill-desc">${t(meta.descKey)}</span>
            `;
            btn.addEventListener('click', () => handleSkillButtonClick(skillId));
            handEl.appendChild(btn);
        });
    }

    // Skill status bar
    if (statusEl) {
        const activeId = skillManager.activeSkill ? skillManager.activeSkill.id : null;
        const stepMsgs = {
            dust_stone:  [t('skillActive')],
            dust_stone_medium: [t('skillActive')],
            excuse_me:   [t('skillExcuseMeStep1'), t('skillExcuseMeStep2')],
            flash_move:  [t('skillFlashMoveStep1'), t('skillFlashMoveStep2')],
            yoink:       [t('skillYoinkStep1')],
            double_tap:  [t('skillDoubleTapStep1'), t('skillDoubleTapStep2')],
            triple_salvo:[t('skillTripleSalvoStep1'), t('skillTripleSalvoStep2')],
            mirage:      [t('skillMirageStep1')],
            dibs:        [t('skillDibsStep1')],
            deep_mist:   [t('skillDeepMistStep1')],
            void_realm:  [t('skillVoidRealmStep1')],
            coming_through: [t('skillComingThroughStep1')],
            eternal_night: [t('skillEternalNightStep1')],
        };
        if (activeId && stepMsgs[activeId]) {
            statusEl.textContent = stepMsgs[activeId][(skillManager.skillStep - 1)] || '';
            statusEl.classList.remove('hidden');
        } else if (skillManager.skillUsedThisTurn[currentPlayer]) {
            statusEl.textContent = t('skillUsed');
            statusEl.classList.remove('hidden');
        } else {
            statusEl.classList.add('hidden');
        }
    }
}

function handleSkillButtonClick(skillId) {
    if (!isMyTurn() || skillManager.skillUsedThisTurn[currentPlayer] || gamePhase !== 'playing') return;
    if (!skillManager.playerHasSkill(currentPlayer, skillId)) return;

    // Skills that need confirmation first
    const confirmSkills = { no_slacking: true, oops: true };
    if (confirmSkills[skillId]) {
        const skill = skillManager.getSkillById(skillId);
        const nameKey = skill ? skill.nameKey : skillId;
        const descKey = skill ? skill.descKey : '';
        const title = t(nameKey);
        const msg = `<p>${t(descKey)}</p><p style="margin-top: 10px;"><strong>${t('useSkillQuery')}</strong></p>`;
        showConfirm(title, msg, () => {
            const result = skillManager.toggleSkill(skillId, gameMode === 'online', wsSend);
            if (result.applied) {
                handleSkillApplied(result.skillId, result.endsTurn);
            }
            addLog(t('usedLabel').replace('{player}', getPlayerLabel(currentPlayer)).replace('{skill}', t(nameKey)), 'system');
            updateSkillUI();
            drawBoard();
        });
        return;
    }

    skillManager.toggleSkill(skillId, gameMode === 'online', wsSend);
    // log activation for targeting skills
    if (skillManager.activeSkill) {
        const skill = skillManager.getSkillById(skillId);
        if (skill) addLog(t('activatedLabel').replace('{player}', getPlayerLabel(currentPlayer)).replace('{skill}', t(skill.nameKey)), 'system');
    }
    updateSkillUI();
    drawBoard();
}

// ====================== Draw Round ======================

function checkDrawRound() {
    if (gamePhase !== 'playing') return;
    if (document.getElementById('test-mode-toggle').checked) return; // Skip in Test Mode
    if (turnCount < nextDrawAt) return;

    // Schedule next draw
    const cooldown = 5 + Math.floor(Math.random() * 11); // 5-15 turns
    nextDrawAt = turnCount + cooldown;

    if (gameMode === 'online') {
        // Only the player who just moved triggers the draw and notifies the opponent
        if (lastMovedColor !== myColor) return;
        gamePhase = 'drawing';
        wsSend('draw_round', { nextDrawAt: nextDrawAt });
        showDrawModal(myColor, () => {
            gamePhase = 'playing';
            updateSkillUI();
        });
    } else {
        // Local: Black draws first, then White
        gamePhase = 'drawing';
        showDrawModal(BLACK, () => {
            showDrawModal(WHITE, () => {
                gamePhase = 'playing';
                updateSkillUI();
            });
        });
    }
}

function showDrawModal(player, onComplete) {
    const modal = document.getElementById('skill-draw-modal');
    const playerEl = document.getElementById('draw-modal-player');
    const cardsEl = document.getElementById('draw-cards');

    const options = skillManager.getDrawOptions(player, 3);
    const playerLabel = getPlayerLabel(player);
    
    playerEl.textContent = t('isDrawing').replace('{player}', playerLabel);
    playerEl.setAttribute('data-draw-player', player); // Mark who's drawing for refresh
    
    cardsEl.innerHTML = '';


    if (options.length === 0) {
        // Player has all skills – skip
        modal.classList.add('hidden');
        if (onComplete) onComplete();
        return;
    }

    options.forEach(skillId => {
        const meta = skillMeta[skillId] || { icon: '✨', nameKey: skillId, descKey: '' };
        const card = document.createElement('div');
        card.className = 'draw-card';
        card.setAttribute('data-skill-id', skillId); // For refresh
        const tierKey = `tier${meta.tier || 1}`;
        card.innerHTML = `
            <div class="draw-card-icon">${meta.icon}</div>
            <div class="draw-card-tier">${t(tierKey)}</div>
            <div class="draw-card-name">${t(meta.nameKey)}</div>
            <div class="draw-card-desc">${t(meta.descKey)}</div>
        `;
        card.addEventListener('click', () => {
            // Prevent double-pick
            cardsEl.querySelectorAll('.draw-card').forEach(c => c.style.pointerEvents = 'none');
            card.classList.add('selected');

            skillManager.addSkillToHand(player, skillId);
            addLog(t('drewLabel').replace('{player}', getPlayerLabel(player)).replace('{skill}', t(meta.nameKey)), 'system');

            if (gameMode === 'online') {
                wsSend('skill_pick', { player, skillId });
            }

            setTimeout(() => {
                modal.classList.add('hidden');
                if (onComplete) onComplete();
            }, 600); // brief pause to show selection
        });
        cardsEl.appendChild(card);
    });

    modal.classList.remove('hidden');
}

// ====================== Button Event Listeners ======================
document.getElementById('btn-pass').addEventListener('click', () => {
    if (!isMyTurn()) return;
    showConfirm(t('pass'), t('confirmPass'), () => {
        applyPass();
        if (gameMode === 'online') {
            wsSend('pass', {});
        }
    });
});

document.getElementById('btn-resign').addEventListener('click', () => {
    showConfirm(t('resign'), t('confirmResign'), () => {
        applyResign();
        if (gameMode === 'online') {
            wsSend('resign', {});
        }
    });
});

document.getElementById('btn-territory').addEventListener('click', () => {
    calculateScore();
    showingTerritory = !showingTerritory;
    drawBoard();
});

document.getElementById('btn-accept-score').addEventListener('click', () => {
    applyAcceptScore();
    if (gameMode === 'online') {
        wsSend('accept_score', {});
    }
});

document.getElementById('btn-resume-game').addEventListener('click', () => {
    applyResumeGame();
    if (gameMode === 'online') {
        wsSend('resume_game', {});
    }
});

function returnToLobby() {
    if (ws) { ws.close(); ws = null; }
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('game-over-modal').classList.add('hidden');
    document.getElementById('lobby').classList.remove('hidden');
    document.getElementById('btn-return-lobby').classList.add('hidden');
    showLobbySection('lobby-menu');
    gameMode = 'local';
    syncLobbyMusic();
}

document.getElementById('btn-play-again').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.add('hidden');
    if (gameMode === 'online') {
        if (ws) {
            wsSend('pass', {}); // As a proxy to let the other person know or simply let them click Play Again too.
        }
    }
    initGame();
});

document.getElementById('btn-return-lobby').addEventListener('click', () => {
    if (gamePhase === 'playing' && turnCount > 1) {
        showConfirm(t('resign'), t('confirmLobbyResign'), () => {
            applyResign();
            if (gameMode === 'online') {
                wsSend('resign', {});
            }
        });
    } else {
        returnToLobby();
    }
});

document.getElementById('btn-modal-return-lobby').addEventListener('click', returnToLobby);

function showModal(titleKey, contentHtml) {
    const titleEl = document.getElementById('modal-title');
    titleEl.innerText = t(titleKey);
    titleEl.setAttribute('data-i18n', titleKey);
    
    document.getElementById('modal-score').innerHTML = contentHtml;
    document.getElementById('game-over-modal').classList.remove('hidden');
}

// ====================== Skill Button Listeners ======================
document.getElementById('btn-show-log').addEventListener('click', () => {
    document.getElementById('log-modal').classList.remove('hidden');
});

document.getElementById('btn-close-log').addEventListener('click', () => {
    document.getElementById('log-modal').classList.add('hidden');
});

// ====================== Modals ======================
function showConfirm(titleKey, messageKey, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const bodyEl = document.getElementById('confirm-modal-body');

    titleEl.textContent = t(titleKey);
    titleEl.setAttribute('data-i18n', titleKey);
    
    bodyEl.innerHTML = t(messageKey);
    bodyEl.setAttribute('data-i18n-html', messageKey);
    
    const btnYes = document.getElementById('btn-confirm-yes');
    const btnNo = document.getElementById('btn-confirm-no');
    
    // Cleanup previous listeners
    const newBtnYes = btnYes.cloneNode(true);
    const newBtnNo = btnNo.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);
    btnNo.parentNode.replaceChild(newBtnNo, btnNo);
    
    newBtnYes.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (onConfirm) onConfirm();
    });
    
    newBtnNo.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    modal.classList.remove('hidden');
}

// Don't auto-init; lobby handles it
