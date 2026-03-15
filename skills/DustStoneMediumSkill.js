class DustStoneMediumSkill extends BaseSkill {
    constructor() {
        super('dust_stone_medium', 'skillDustStoneMedium', 'skillDustStoneMediumDesc', SkillTier.TIER2); // 1 = 1 step
    }

    // Centered at target as top-left of 2x2
    isValidTarget(x, y, step, selectedCell) {
        // Just need to be on the board; checking boundaries for the 2x2
        return x >= 0 && x < BOARD_SIZE - 1 && y >= 0 && y < BOARD_SIZE - 1;
    }

    applyEffect(step, targetX, targetY, selectedCell) {
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const nx = targetX + dx;
                const ny = targetY + dy;
                if (board[nx][ny] !== EMPTY) {
                    board[nx][ny] = EMPTY;
                    captures[currentPlayer]++;
                }
            }
        }
        if (typeof drawBoard === 'function') {
            drawBoard();
        }
    }

    getAffectedCells(x, y, step, selectedCell) {
        return [
            { x: x, y: y },
            { x: x + 1, y: y },
            { x: x, y: y + 1 },
            { x: x + 1, y: y + 1 }
        ];
    }
}
