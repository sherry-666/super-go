class ExcuseMeSkill extends BaseSkill {
    constructor() {
        super('excuse_me', 'skillExcuseMe', 'skillExcuseMeDesc', SkillTier.TIER1);
    }

    getTotalSteps() {
        return 2;
    }

    getHighlightStyle(step) {
        if (step === 1) {
            return {
                borderColor: 'rgba(100, 180, 255, 0.9)', // Blue for selecting own stone
                glowColor: 'rgba(100, 180, 255, 0.6)'
            };
        }
        return super.getHighlightStyle(step);
    }

    isValidTarget(x, y, step, selectedCell) {
        if (window.isSquatter(x, y)) return false;
        const opponentColor = currentPlayer === BLACK ? WHITE : BLACK;
        
        if (step === 1) {
            // Select own stone adjacent to enemy
            if (board[x][y] === currentPlayer) {
                const neighbors = getNeighbors(x, y);
                return neighbors.some(([nx, ny]) => board[nx][ny] === opponentColor);
            }
        } else if (step === 2 && selectedCell) {
            // Select enemy adjacent to the selected own stone
            if (board[x][y] === opponentColor) {
                const neighbors = getNeighbors(selectedCell.x, selectedCell.y);
                return neighbors.some(([nx, ny]) => nx === x && ny === y);
            }
        }
        return false;
    }

    applyEffect(step, targetX, targetY, selectedCell) {
        // Swap the two stones
        const x1 = selectedCell.x, y1 = selectedCell.y;
        const x2 = targetX, y2 = targetY;
        
        const temp = board[x1][y1];
        board[x1][y1] = board[x2][y2];
        board[x2][y2] = temp;
        playStoneSound();

        // Broadcast effect immediately for opponent
        if (typeof drawBoard === 'function') {
            drawBoard();
        }
        
        // Temporarily highlight the two swapped stones to make it obvious
        if (manager && typeof manager.addTransientHighlight === 'function') {
            const highlightConfig = {
                borderColor: 'rgba(100, 180, 255, 0.9)',
                glowColor: 'rgba(100, 180, 255, 0.6)'
            };
            manager.addTransientHighlight(x1, y1, highlightConfig);
            manager.addTransientHighlight(x2, y2, highlightConfig);
        }
    }
}
