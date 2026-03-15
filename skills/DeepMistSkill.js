class DeepMistSkill extends BaseSkill {
    constructor() {
        super('deep_mist', 'skillDeepMist', 'skillDeepMistDesc', SkillTier.TIER3);
    }

    isValidTarget(x, y, step, selectedCell) {
        // Can target any 8x8 area as long as the top-left (x, y) doesn't push the area off-board
        return x < BOARD_SIZE - 7 && y < BOARD_SIZE - 7;
    }

    applyEffect(step, targetX, targetY, selectedCell, skillManager) {
        if (!skillManager.activeEffects.blindfolds) {
            skillManager.activeEffects.blindfolds = [];
        }
        
        // Add fog effect: 8x8 area, 6 turns duration
        // Owner is the current player (the one who cast it)
        skillManager.activeEffects.blindfolds.push({
            x: targetX,
            y: targetY,
            size: 8,
            duration: 6,
            owner: currentPlayer
        });
    }

    getAffectedCells(x, y, step, selectedCell) {
        const cells = [];
        for (let dy = 0; dy < 8; dy++) {
            for (let dx = 0; dx < 8; dx++) {
                cells.push({ x: x + dx, y: y + dy });
            }
        }
        return cells;
    }
}

window.DeepMistSkill = DeepMistSkill;
