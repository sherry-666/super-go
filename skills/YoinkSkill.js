class YoinkSkill extends BaseSkill {
    constructor() {
        super('yoink', 'skillYoink', 'skillYoinkDesc', SkillTier.TIER1); // Skill ID, NameKey, DescKey, Tier
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} step
     * @param {Object} selectedCell
     * @returns {boolean}
     */
    isValidTarget(x, y, step, selectionHistory) {
        if (window.isSquatter(x, y)) return false;
        // Can only retract your own stone
        return board[x][y] === currentPlayer;
    }

    /**
     * @param {number} step
     * @param {number} targetX
     * @param {number} targetY
     * @param {Object} selectedCell
     * @param {Object} manager
     */
    applyEffect(step, targetX, targetY, selectionHistory, manager) {
        // "Retract" the stone by making the cell empty.
        board[targetX][targetY] = EMPTY;
        
        // Immediately redraw board so the opponent sees the skill effect right away
        if (typeof drawBoard === 'function') {
            drawBoard();
        }

        // Highlight the retracted stone's original location for feedback (especially for opponent)
        if (manager && typeof manager.addTransientHighlight === 'function') {
            const highlightConfig = {
                borderColor: 'rgba(0, 100, 255, 0.9)',
                glowColor: 'rgba(0, 100, 255, 0.6)',
                isDotted: true
            };
            manager.addTransientHighlight(targetX, targetY, highlightConfig);
        }
    }

    getHighlightStyle(step) {
        // Blue ring for selecting own stone
        return {
            borderColor: 'rgba(0, 100, 255, 0.8)',
            glowColor: 'rgba(0, 100, 255, 0.6)'
        };
    }

    getTotalSteps() {
        return 1;
    }
}

// Make globally available if not using modules
window.YoinkSkill = YoinkSkill;
