class SoulReaperSkill extends BaseSkill {
    constructor(tier = SkillTier.TIER1) {
        const id = `soul_reaper_${tier}`;
        super(id, 'skillSoulReaper', 'skillSoulReaperDesc', tier);
    }

    getTotalSteps() {
        return 0; // Instant activation
    }

    hasValidTargets() {
        return true; // Always usable
    }

    async applyEffect(step, targetX, targetY, selectionHistory, manager) {
        // Handled by showSoulReaperModal in game.js
        if (typeof window.showSoulReaperModal === 'function') {
            await window.showSoulReaperModal(currentPlayer, this.tier);
        }
    }
}
