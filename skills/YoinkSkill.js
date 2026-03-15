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
    isValidTarget(x, y, step, selectedCell) {
        if (window.isSquatter(x, y)) return false;
        return board[x][y] === currentPlayer;
    }

    /**
     * @param {number} step
     * @param {number} targetX
     * @param {number} targetY
     * @param {Object} selectedCell
     * @param {Object} manager
     */
    applyEffect(step, targetX, targetY, selectedCell, manager) {
        // "Retract" the stone by making the cell empty.
        board[targetX][targetY] = EMPTY;
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
