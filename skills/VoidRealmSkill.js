class VoidRealmSkill extends BaseSkill {
    constructor() {
        super('void_realm', 'skillVoidRealm', 'skillVoidRealmDesc', SkillTier.TIER4);
    }

    isValidTarget(x, y, step, selectedCell) {
        // Can target any 12x12 area as long as the top-left (x, y) doesn't push the area off-board
        return x < BOARD_SIZE - 11 && y < BOARD_SIZE - 11;
    }

    applyEffect(step, targetX, targetY, selectedCell, skillManager) {
        if (!skillManager.activeEffects.blindfolds) {
            skillManager.activeEffects.blindfolds = [];
        }
        
        // Add fog effect: 12x12 area, 8 turns duration
        // Owner is the current player (the one who cast it)
        skillManager.activeEffects.blindfolds.push({
            x: targetX,
            y: targetY,
            size: 12,
            duration: 8,
            owner: currentPlayer
        });
    }

    getAffectedCells(x, y, step, selectedCell) {
        const cells = [];
        for (let dy = 0; dy < 12; dy++) {
            for (let dx = 0; dx < 12; dx++) {
                cells.push({ x: x + dx, y: y + dy });
            }
        }
        return cells;
    }
}

window.VoidRealmSkill = VoidRealmSkill;
