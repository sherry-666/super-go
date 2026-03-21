class AdhdSkill extends BaseSkill {
    constructor() {
        super('adhd', 'skillAdhd', 'skillAdhdDesc', SkillTier.TIER1);
    }

    getTotalSteps() {
        return 0; // Immediate effect
    }

    hasValidTargets(board, currentPlayer) {
        return true; 
    }

    applyEffect(step, targetX, targetY, selectionHistory, manager) {
        const p = currentPlayer;
        const opponentColor = p === BLACK ? WHITE : BLACK;
        
        if (!manager.activeEffects.extraMoves) {
            manager.activeEffects.extraMoves = { 1: 0, 2: 0 };
        }
        
        // Caster gets an extra move right now
        manager.activeEffects.extraMoves[p]++;
        // Opponent will get an extra move on their upcoming turn
        manager.activeEffects.extraMoves[opponentColor]++;

        playSkillSound('buff');
        if (typeof showSkillPopup === 'function') {
            showSkillPopup(t('skillSuccessMsg'));
        }

        if (typeof addLog === 'function') {
            const label = p === BLACK ? 'Black' : 'White';
            addLog(`${label} gets ADHD! Both players gain 1 extra stone placement.`, p === BLACK ? 'black' : 'white');
        }
    }
}

// Make globally available
window.AdhdSkill = AdhdSkill;
