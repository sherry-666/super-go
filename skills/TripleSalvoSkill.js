class TripleSalvoSkill extends BaseSkill {
    constructor() {
        super('triple_salvo', 'skillTripleSalvo', 'skillTripleSalvoDesc', SkillTier.TIER3);
        this.endsTurn = true;
    }

    getTotalSteps() {
        return 2;
    }

    hasValidTargets(board, currentPlayer) {
        // Find if there is a 3-long straight gap
        const size = board.length;
        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                // Check Horizontal
                if (x <= size - 3) {
                    if (board[x][y] === EMPTY && board[x+1][y] === EMPTY && board[x+2][y] === EMPTY) return true;
                }
                // Check Vertical
                if (y <= size - 3) {
                    if (board[x][y] === EMPTY && board[x][y+1] === EMPTY && board[x][y+2] === EMPTY) return true;
                }
            }
        }
        return false;
    }

    isValidTarget(x, y, step, selectionHistory) {
        if (board[x][y] !== EMPTY) return false;

        // Blocked by Construction
        const manager = window.skillManager;
        if (manager && manager.isAreaBlocked(x, y, currentPlayer)) return false;

        if (step === 2) {
            const selectedCell = selectionHistory[0];
            const dx = Math.abs(x - selectedCell.x);
            const dy = Math.abs(y - selectedCell.y);
            
            // Must be exactly 2 units away and in a straight line
            if (!((dx === 2 && dy === 0) || (dx === 0 && dy === 2))) return false;

            // Intermediate cell must also be empty
            const midX = (x + selectedCell.x) / 2;
            const midY = (y + selectedCell.y) / 2;
            if (board[midX][midY] !== EMPTY) return false;
            
            // Mid cell must also not be blocked by construction
            if (manager && manager.isAreaBlocked(midX, midY, currentPlayer)) return false;
        }

        return true;
    }

    async applyEffect(step, targetX, targetY, selectionHistory, manager) {
        const p = currentPlayer;
        const selectedCell = selectionHistory[0];
        const midX = (targetX + selectedCell.x) / 2;
        const midY = (targetY + selectedCell.y) / 2;
        
        const stones = [
            { x: selectedCell.x, y: selectedCell.y },
            { x: midX, y: midY },
            { x: targetX, y: targetY }
        ];

        const allCaptured = [];

        const placeAndCapture = (px, py) => {
            board[px][py] = p;
            const opponentColor = p === BLACK ? WHITE : BLACK;
            const neighbors = [[px-1, py], [px+1, py], [px, py-1], [px, py+1]];
            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
                    if (board[nx][ny] === opponentColor) {
                        const group = getGroup(nx, ny, board);
                        if (group.liberties.length === 0) {
                            group.stones.forEach(([cx, cy]) => {
                                allCaptured.push({ x: cx, y: cy });
                                board[cx][cy] = EMPTY;
                                captures[p]++;
                            });
                        }
                    }
                }
            }
        };

        // Sequential placement for visual/audio effect
        for (let i = 0; i < stones.length; i++) {
            const stone = stones[i];
            
            // Wait 200ms for each salvo shot
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            placeAndCapture(stone.x, stone.y);
            playStoneSound();
            
            if (i === stones.length - 1) {
                if (manager && typeof manager.addTransientHighlight === 'function') {
                    allCaptured.forEach(({ x, y }) => {
                        manager.addTransientHighlight(x, y, {
                            borderColor: 'rgba(0, 100, 255, 0.9)',
                            glowColor: 'rgba(0, 100, 255, 0.6)',
                            isDotted: true
                        });
                    });
                }
                const label = p === BLACK ? 'Black' : 'White';
                const c1 = String.fromCharCode(65 + stones[0].x);
                const r1 = BOARD_SIZE - stones[0].y;
                const c3 = String.fromCharCode(65 + stones[2].x);
                const r3 = BOARD_SIZE - stones[2].y;
                
                // Log purely for history (manager handles the turn end)
                if (typeof addLog === 'function') {
                    addLog(`${label} Triple Salvo → ${c1}${r1} to ${c3}${r3}`, p === BLACK ? 'black' : 'white');
                }
            } else {
                if (typeof drawBoard === 'function') drawBoard();
                if (typeof updateUI === 'function') updateUI();
            }
        }

        // Final cleanup for self-captured stones (suicide)
        const opponentColor = p === BLACK ? WHITE : BLACK;
        stones.forEach(pos => {
            if (board[pos.x][pos.y] === p) {
                const group = getGroup(pos.x, pos.y, board);
                if (group.liberties.length === 0) {
                    group.stones.forEach(([cx, cy]) => {
                        board[cx][cy] = EMPTY;
                        if (typeof captures !== 'undefined') captures[opponentColor]++;
                    });
                }
            }
        });

        if (typeof drawBoard === 'function') drawBoard();
        if (typeof updateUI === 'function') updateUI();
    }

    getAffectedCells(x, y, step, selectionHistory) {
        if (step === 2) {
            const selectedCell = selectionHistory[0];
            const midX = (x + selectedCell.x) / 2;
            const midY = (y + selectedCell.y) / 2;
            return [
                { x: selectedCell.x, y: selectedCell.y },
                { x: midX, y: midY },
                { x: x, y: y }
            ];
        }
        return [{ x, y }];
    }
}

window.TripleSalvoSkill = TripleSalvoSkill;
