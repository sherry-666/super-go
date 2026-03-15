class BlindfoldSkill extends BaseSkill {
    constructor() {
        super('blindfold', 'skillBlindfold', 'skillBlindfoldDesc', SkillTier.TIER1);
    }

    isValidTarget(x, y, step, selectedCell) {
        // Can target any 3x3 area as long as the top-left (x, y) doesn't push the area off-board
        return x < BOARD_SIZE - 2 && y < BOARD_SIZE - 2;
    }

    applyEffect(step, targetX, targetY, selectedCell, skillManager) {
        if (!skillManager.activeEffects.blindfolds) {
            skillManager.activeEffects.blindfolds = [];
        }
        
        // Add fog effect: 3x3 area, 5 turns duration
        // Owner is the current player (the one who cast it)
        skillManager.activeEffects.blindfolds.push({
            x: targetX,
            y: targetY,
            size: 3,
            duration: 5,
            owner: currentPlayer
        });
    }

    getAffectedCells(x, y, step, selectedCell) {
        const cells = [];
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                cells.push({ x: x + dx, y: y + dy });
            }
        }
        return cells;
    }
}
