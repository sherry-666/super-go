class FlashMoveSkill extends BaseSkill {
    constructor() {
        super('flash_move', 'skillFlashMove', 'skillFlashMoveDesc', SkillTier.TIER1);
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
        if (step === 1) {
            return board[x][y] === currentPlayer;
        } else if (step === 2 && selectedCell) {
            return board[x][y] === EMPTY && this.isInFlashRange(selectedCell.x, selectedCell.y, x, y);
        }
        return false;
    }

    applyEffect(step, targetX, targetY, selectedCell) {
        const x1 = selectedCell.x, y1 = selectedCell.y;
        const x2 = targetX, y2 = targetY;
        
        board[x2][y2] = board[x1][y1];
        board[x1][y1] = EMPTY;
        playStoneSound();
        
        // Immediately redraw board so the opponent sees the skill effect right away
        if (typeof drawBoard === 'function') {
            drawBoard();
        }
    }

    isInFlashRange(fromX, fromY, toX, toY) {
        return Math.abs(toX - fromX) <= 2 && Math.abs(toY - fromY) <= 2;
    }
}
