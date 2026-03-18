class KOHunterSkill extends BaseSkill {
    constructor(tier = SkillTier.TIER1) {
        const id = `ko_hunter_${tier}`;
        super(id, 'skillKOHunter', 'skillKOHunterDesc', tier);
    }

    getTotalSteps() {
        return 0; // Instant activation
    }

    hasValidTargets() {
        return true; // Always usable
    }

    async applyEffect(step, targetX, targetY, selectionHistory, manager) {
        // Handled by showKOHunterModal in game.js
        if (typeof window.showKOHunterModal === 'function') {
            await window.showKOHunterModal(currentPlayer, this.tier);
        }
    }
}
