class OopsSkill extends BaseSkill {
    constructor() {
        super('oops', 'skillOops', 'skillOopsDesc', SkillTier.TIER1);
    }

    getTotalSteps() {
        return 0; // Immediate effect
    }

    hasValidTargets(board, currentPlayer) {
        return true; 
    }

    applyEffect(step, targetX, targetY, selectedCell, manager) {
        const opponentColor = currentPlayer === BLACK ? WHITE : BLACK;
        manager.activeEffects.oops = opponentColor;
    }
}

// Make globally available
window.OopsSkill = OopsSkill;
