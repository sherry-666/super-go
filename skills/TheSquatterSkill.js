class TheSquatterSkill extends BaseSkill {
    constructor() {
        super('the_squatter', 'skillTheSquatter', 'skillTheSquatterDesc', SkillTier.TIER5);
        this.endsTurn = true;
    }

    getTotalSteps() {
        return 1;
    }

    hasValidTargets(board, currentPlayer) {
        return true;
    }

    isValidTarget(x, y, step, selectedCell) {
        if (x >= board.length - 1 || y >= board.length - 1) return false;
        // Cannot drop on top of another Squatter (must respect existing squatters)
        return !(window.isSquatter(x, y) || window.isSquatter(x+1, y) || 
                 window.isSquatter(x, y+1) || window.isSquatter(x+1, y+1));
    }

    async applyEffect(step, targetX, targetY, selectedCell, manager) {
        const p = currentPlayer;
        
        // The 4 stones representing the giant 2x2 squatter stone
        const stones = [
            {x: targetX, y: targetY},
            {x: targetX + 1, y: targetY},
            {x: targetX, y: targetY + 1},
            {x: targetX + 1, y: targetY + 1}
        ];

        // 1. Crush/Overwrite existing stones
        let crushed = 0;
        stones.forEach(s => {
            if (board[s.x][s.y] !== EMPTY && board[s.x][s.y] !== p) {
                crushed++;
            }
            board[s.x][s.y] = p;
        });
        
        if (crushed > 0) {
            captures[p] += crushed;
        }

        // 2. Resolve captures on adjacent enemy groups (Squatters can still crush things in normal engine loop)
        const opponentColor = p === BLACK ? WHITE : BLACK;
        const processedGroups = new Set();

        stones.forEach(stone => {
            const neighbors = [
                [stone.x - 1, stone.y], [stone.x + 1, stone.y],
                [stone.x, stone.y - 1], [stone.x, stone.y + 1]
            ];
            
            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
                    if (board[nx][ny] === opponentColor) {
                        const group = getGroup(nx, ny, board);
                        // Convert group stones array to unique string signature
                        const sig = group.stones.map(s => `${s[0]},${s[1]}`).sort().join(';');
                        
                        if (!processedGroups.has(sig)) {
                            processedGroups.add(sig);
                            if (group.liberties.length === 0) {
                                group.stones.forEach(([cx, cy]) => {
                                    if (!window.isSquatter(cx, cy)) {
                                        board[cx][cy] = EMPTY;
                                        captures[p]++;
                                    }
                                });
                            }
                        }
                    }
                }
            }
        });

        // 3. Mark as Squatter in manager to make it permanently immortal
        if (!manager.activeEffects.squatters) {
            manager.activeEffects.squatters = [];
        }
        stones.forEach(s => {
            manager.activeEffects.squatters.push({x: s.x, y: s.y, color: p, anchor: targetX === s.x && targetY === s.y});
        });

        // Add to giant stones for rendering as one massive block, but tagged as a squatter
        manager.activeEffects.giantStones.push({
            x: targetX,
            y: targetY,
            color: p,
            isSquatter: true
        });

        playSkillSound('impact'); 
        await new Promise(resolve => setTimeout(resolve, 100));
        playStoneSound(); 

        const label = p === BLACK ? 'Black' : 'White';
        const colLetter = String.fromCharCode(65 + targetX);
        const rowNumber = BOARD_SIZE - targetY;
        
        let logMsg = `${label} placed The Squatter at ${colLetter}${rowNumber}`;
        if (crushed > 0) logMsg += ` (Crushed ${crushed})`;
        
        if (typeof addLog === 'function') {
            addLog(logMsg, p === BLACK ? 'black' : 'white');
        }
        
        lastMove = { x: targetX, y: targetY };
    }

    getAffectedCells(x, y, step, selectedCell) {
        if (x >= board.length - 1 || y >= board.length - 1) return [{x, y}];
        return [
            { x: x, y: y },
            { x: x + 1, y: y },
            { x: x, y: y + 1 },
            { x: x + 1, y: y + 1 }
        ];
    }
    
    getHighlightStyle() {
        return {
            borderColor: 'rgba(255, 215, 0, 1)',
            glowColor: 'rgba(255, 215, 0, 0.8)'
        };
    }
}

window.TheSquatterSkill = TheSquatterSkill;
