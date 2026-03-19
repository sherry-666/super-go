window.SkillTier = Object.freeze({
    TIER1: 1,
    TIER2: 2,
    TIER3: 3,
    TIER4: 4,
    TIER5: 5
});

class BaseSkill {
    constructor(id, nameKey, descKey, tier) {
        this.id = id;
        this.nameKey = nameKey;
        this.descKey = descKey;
        this.tier = tier;
        this.isSecret = false; // Default: announcement-based skills
        this.endsTurn = false; // Default: skills are "free actions"
        this.isCopyable = true; // Default: skills can be copied by Copycat
    }

    /**
     * Called when a player clicks the board while the skill is active.
     * @param {number} x - The clicked column index (0-18)
     * @param {number} y - The clicked row index (0-18)
     * @param {number} step - The current multi-step index (1-based, e.g. 1, 2)
     * @param {Array<{x: number, y: number}>} selectionHistory - History of points selected in previous steps
     * @returns {boolean} True if the target is valid for the current step.
     */
    isValidTarget(x, y, step, selectionHistory) {
        return false;
    }

    /**
     * Applies the skill effect to the game state.
     * @param {number} step - The step the skill reached before completion
     * @param {number} targetX - The x coordinate of the final click
     * @param {number} targetY - The y coordinate of the final click
     * @param {Array<{x: number, y: number}>} selectionHistory - The array of all points selected (including the final one)
     * @param {SkillManager} manager - The skill manager instance
     */
    applyEffect(step, targetX, targetY, selectionHistory, manager) {
        // To be implemented by subclasses
    }

    /**
     * Determines what color highlight to use. 
     * Useful for skills that differentiate between selecting your own token vs target token.
     * @param {number} step - The current multi-step index
     * @returns {Object} Object containing { borderColor, glowColor } strings
     */
    getHighlightStyle(step) {
        return {
            borderColor: 'rgba(255, 60, 60, 0.9)', // Red default
            glowColor: 'rgba(255, 60, 60, 0.6)'
        };
    }

    /**
     * Total number of targeting steps required by the skill.
     * @returns {number} Default 1. Two-step skills like excuse_me should return 2.
     */
    getTotalSteps() {
        return 1;
    }

    /**
     * Checks if there are ANY valid targets on the entire board for this skill.
     * Used to disable the skill button if it cannot be used.
     * @param {Array} board - The current game board
     * @param {number} currentPlayer - The color of the current player
     * @returns {boolean} True if at least one valid target exists
     */
    hasValidTargets(board, currentPlayer) {
        // Default implementation checks isValidTarget for step 1 across the board
        for (let x = 0; x < board.length; x++) {
            for (let y = 0; y < board[x].length; y++) {
                if (this.isValidTarget(x, y, 1, [], board, currentPlayer)) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Returns an array of {x, y} coordinates affected by the skill at the current step.
     * @param {number} x - The column index
     * @param {number} y - The row index
     * @param {number} step - The current multi-step index
     * @param {Array<{x: number, y: number}>} selectionHistory - History of points selected in previous steps
     * @returns {Array<{x: number, y: number}>}
     */
    getAffectedCells(x, y, step, selectionHistory) {
        return [{ x, y }];
    }
}
