class ComingThroughSkill extends BaseSkill {
    constructor() {
        super('coming_through', 'skillComingThrough', 'skillComingThroughDesc', SkillTier.TIER4);
        this.endsTurn = true;
    }

    getTotalSteps() {
        return 1;
    }

    hasValidTargets(board, currentPlayer) {
        // Can target anywhere as long as it doesn't push the 2x2 area off-board
        return true;
    }

    isValidTarget(x, y, step, selectedCell) {
        if (x >= board.length - 1 || y >= board.length - 1) return false;
        return !(window.isSquatter(x, y) || window.isSquatter(x+1, y) || 
                 window.isSquatter(x, y+1) || window.isSquatter(x+1, y+1));
    }

    async applyEffect(step, targetX, targetY, selectedCell, manager) {
        const p = currentPlayer;
        
        // The 4 stones representing the giant 2x2 stone
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
        
        let logMsg = `${label} dropped Coming Through! at ${colLetter}${rowNumber}`;
        if (crushed > 0) logMsg += ` (Crushed ${crushed})`;
        
        if (typeof addLog === 'function') {
            addLog(logMsg, p === BLACK ? 'black' : 'white');
        }
        
        // Update last move which manager uses for UI markers
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
            borderColor: 'rgba(255, 100, 0, 1)',
            glowColor: 'rgba(255, 100, 0, 0.8)'
        };
    }
}

window.ComingThroughSkill = ComingThroughSkill;
