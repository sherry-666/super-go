class EternalNightSkill extends BaseSkill {
    constructor() {
        super('eternal_night', 'skillEternalNight', 'skillEternalNightDesc', SkillTier.TIER5);
    }

    isValidTarget(x, y, step, selectedCell) {
        // Full board, so any click on the board is valid
        return true;
    }

    applyEffect(step, targetX, targetY, selectedCell, skillManager) {
        if (!skillManager.activeEffects.blindfolds) {
            skillManager.activeEffects.blindfolds = [];
        }
        
        // Add fog effect: 19x19 area starting at (0,0), 5 turns duration
        skillManager.activeEffects.blindfolds.push({
            x: 0,
            y: 0,
            size: BOARD_SIZE,
            duration: 5,
            owner: currentPlayer
        });
    }

    getAffectedCells(x, y, step, selectedCell) {
        const cells = [];
        for (let dy = 0; dy < BOARD_SIZE; dy++) {
            for (let dx = 0; dx < BOARD_SIZE; dx++) {
                cells.push({ x: dx, y: dy });
            }
        }
        return cells;
    }
}

window.EternalNightSkill = EternalNightSkill;
