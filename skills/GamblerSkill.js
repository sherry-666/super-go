class GamblerSkill extends BaseSkill {
    constructor(tier = SkillTier.TIER1) {
        const id = `gambler_${tier}`;
        const tierName = `tier${tier}`;
        super(id, 'skillGambler', 'skillGamblerDesc', tier);
    }

    getTotalSteps() {
        return 0; // Instant activation
    }

    hasValidTargets() {
        return true; // Always usable
    }

    async applyEffect(step, targetX, targetY, selectionHistory, manager) {
        // This will be handled by showGamblerModal in game.js
        if (typeof window.showGamblerModal === 'function') {
            await window.showGamblerModal(currentPlayer, this.tier);
        }
    }
}
