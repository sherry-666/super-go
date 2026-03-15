class MirageSkill extends BaseSkill {
    constructor() {
        super('mirage', 'skillMirage', 'skillMirageDesc', SkillTier.TIER2);
    }

    isValidTarget(x, y, step, selectedCell) {
        // Can target any 5x5 area as long as the top-left (x, y) doesn't push the area off-board
        return x < BOARD_SIZE - 4 && y < BOARD_SIZE - 4;
    }

    applyEffect(step, targetX, targetY, selectedCell, skillManager) {
        if (!skillManager.activeEffects.blindfolds) {
            skillManager.activeEffects.blindfolds = [];
        }
        
        // Add fog effect: 5x5 area, 5 turns duration
        // Owner is the current player (the one who cast it)
        skillManager.activeEffects.blindfolds.push({
            x: targetX,
            y: targetY,
            size: 5,
            duration: 5,
            owner: currentPlayer
        });
    }

    getAffectedCells(x, y, step, selectedCell) {
        const cells = [];
        for (let dy = 0; dy < 5; dy++) {
            for (let dx = 0; dx < 5; dx++) {
                cells.push({ x: x + dx, y: y + dy });
            }
        }
        return cells;
    }
}

window.MirageSkill = MirageSkill;
