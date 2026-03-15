class NoSlackingSkill extends BaseSkill {
    constructor() {
        super('no_slacking', 'skillNoSlacking', 'skillNoSlackingDesc', SkillTier.TIER1);
        this.isSecret = true;
    }

    getTotalSteps() {
        return 0; // Immediate effect, no targeting required
    }

    hasValidTargets(board, currentPlayer) {
        return true; 
    }

    applyEffect(step, targetX, targetY, selectedCell, manager) {
        // Find opponent's color
        const opponentColor = currentPlayer === BLACK ? WHITE : BLACK;
        // Apply debuff to opponent
        manager.activeEffects.noSlacking = opponentColor;
    }
}

// Make globally available
window.NoSlackingSkill = NoSlackingSkill;
