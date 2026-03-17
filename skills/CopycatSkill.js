class CopycatSkill extends BaseSkill {
    constructor() {
        super('copycat', 'skillCopycat', 'skillCopycatDesc', SkillTier.TIER3);
    }

    getTotalSteps() {
        // Copycat itself doesn't have steps; it delegates to the copied skill.
        // However, the SkillManager handling for Copycat will look up the total steps 
        // of the target skill. So 0 is fine as a placeholder.
        return 0;
    }

    isValidTarget(x, y, step, selectionHistory) {
        // This should not be called directly for Copycat.
        // SkillManager redirects targeting to the copied skill.
        return false;
    }

    async applyEffect(step, targetX, targetY, selectionHistory, manager) {
        // This is called for 0-step copied skills (passive/global effects).
        const opponent = currentPlayer === 1 ? 2 : 1;
        const lastId = manager.lastSkillUsed[opponent];
        if (lastId && lastId !== 'copycat') {
            const copiedSkill = manager.skills[lastId];
            if (copiedSkill) {
                return await copiedSkill.applyEffect(step, targetX, targetY, selectionHistory, manager);
            }
        }
    }

    hasValidTargets(board, player) {
        const manager = window.skillManager;
        if (!manager) return false;

        const opponent = player === 1 ? 2 : 1;
        const lastId = manager.lastSkillUsed[opponent];

        if (!lastId || lastId === 'copycat') return false;

        const copiedSkill = manager.skills[lastId];
        if (!copiedSkill) return false;

        return copiedSkill.hasValidTargets(board, player);
    }
}

// Make globally available
window.CopycatSkill = CopycatSkill;
