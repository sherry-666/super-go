class DibsSkill extends BaseSkill {
    constructor() {
        super('dibs', 'skillDibs', 'skillDibsDesc', SkillTier.TIER3);
        this.endsTurn = true;
    }

    getTotalSteps() {
        return 1;
    }

    hasValidTargets(board, currentPlayer) {
        const size = board.length;
        for (let x = 0; x < size - 1; x++) {
            for (let y = 0; y < size - 1; y++) {
                if (board[x][y] === EMPTY &&
                    board[x + 1][y] === EMPTY &&
                    board[x][y + 1] === EMPTY &&
                    board[x + 1][y + 1] === EMPTY) {
                    return true;
                }
            }
        }
        return false;
    }

    isValidTarget(x, y, step, selectedCell) {
        if (x >= board.length - 1 || y >= board.length - 1) return false;

        // Blocked by Construction
        const manager = window.skillManager;
        if (manager) {
            if (manager.isAreaBlocked(x, y, currentPlayer) ||
                manager.isAreaBlocked(x + 1, y, currentPlayer) ||
                manager.isAreaBlocked(x, y + 1, currentPlayer) ||
                manager.isAreaBlocked(x + 1, y + 1, currentPlayer)) {
                return false;
            }
        }

        return board[x][y] === EMPTY &&
            board[x + 1][y] === EMPTY &&
            board[x][y + 1] === EMPTY &&
            board[x + 1][y + 1] === EMPTY;
    }

    async applyEffect(step, targetX, targetY, selectedCell, manager) {
        const p = currentPlayer;

        // The 4 stones representing the giant 2x2 stone
        const stones = [
            { x: targetX, y: targetY },
            { x: targetX + 1, y: targetY },
            { x: targetX, y: targetY + 1 },
            { x: targetX + 1, y: targetY + 1 }
        ];

        // 1. Crush/Overwrite existing stones
        let crushed = 0;
        stones.forEach(s => {
            if (board[s.x][s.y] !== EMPTY && board[s.x][s.y] !== p) {
                crushed++;
            }
            // Overwrite (though isValidTarget enforces empty locally, this ensures crushing if forced)
            board[s.x][s.y] = p;
        });

        if (crushed > 0) {
            captures[p] += crushed;
        }

        // 2. Resolve captures on adjacent enemy groups
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
                                    board[cx][cy] = EMPTY;
                                    captures[p]++;
                                });
                            }
                        }
                    }
                }
            }
        });

        // 3. Visuals and Finalization
        manager.activeEffects.giantStones.push({
            x: targetX,
            y: targetY,
            color: p
        });

        playSkillSound('impact'); // loud crush
        await new Promise(resolve => setTimeout(resolve, 100));
        playStoneSound(); 

        const label = p === BLACK ? 'Black' : 'White';
        const colLetter = String.fromCharCode(65 + targetX);
        const rowNumber = BOARD_SIZE - targetY;

        let logMsg = `${label} dropped Justice from Above at ${colLetter}${rowNumber}`;
        if (crushed > 0) logMsg += ` (Crushed ${crushed})`;

        // Final cleanup for self-captured stones (suicide)
        // If the giant stone has no liberties, the whole 2x2 area is removed.
        let isCaptured = false;
        for (const s of stones) {
            if (board[s.x][s.y] === p) {
                const group = getGroup(s.x, s.y, board);
                if (group.liberties.length === 0) {
                    isCaptured = true;
                    break;
                }
            }
        }

        if (isCaptured) {
            stones.forEach(s => {
                if (board[s.x][s.y] === p) {
                    board[s.x][s.y] = EMPTY;
                    if (typeof captures !== 'undefined') captures[opponentColor]++;
                }
            });
            // Also remove from giantstones list
            manager.activeEffects.giantStones = manager.activeEffects.giantStones.filter(gs => gs.x !== targetX || gs.y !== targetY);
        }

        if (typeof drawBoard === 'function') drawBoard();
        if (typeof updateUI === 'function') updateUI();

        if (typeof addLog === 'function') {
            addLog(logMsg, p === BLACK ? 'black' : 'white');
        }
        
        lastMove = { x: targetX, y: targetY };
    }

    getAffectedCells(x, y, step, selectedCell) {
        if (x >= board.length - 1 || y >= board.length - 1) return [{ x, y }];
        return [
            { x: x, y: y },
            { x: x + 1, y: y },
            { x: x, y: y + 1 },
            { x: x + 1, y: y + 1 }
        ];
    }

    getHighlightStyle() {
        return {
            borderColor: 'rgba(255, 50, 50, 1)',
            glowColor: 'rgba(255, 50, 50, 0.8)'
        };
    }
}

window.DibsSkill = DibsSkill;
