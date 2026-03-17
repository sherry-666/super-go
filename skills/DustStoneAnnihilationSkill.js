class DustStoneAnnihilationSkill extends BaseSkill {
    constructor() {
        super('dust_stone_annihilation', 'skillDustStoneAnnihilation', 'skillDustStoneAnnihilationDesc', SkillTier.TIER5);
    }

    // Centered at target as top-left of 5x5
    isValidTarget(x, y, step, selectedCell) {
        return x >= 0 && x < BOARD_SIZE - 4 && y >= 0 && y < BOARD_SIZE - 4;
    }

    async applyEffect(step, targetX, targetY, selectedCell, manager) {
        const removed = [];
        for (let dy = 0; dy < 5; dy++) {
            for (let dx = 0; dx < 5; dx++) {
                const nx = targetX + dx;
                const ny = targetY + dy;
                if (board[nx][ny] !== EMPTY) {
                    removed.push({ x: nx, y: ny });
                    board[nx][ny] = EMPTY;
                    captures[currentPlayer]++;
                }
            }
        }
        if (typeof drawBoard === 'function') {
            drawBoard();
        }
        if (manager && typeof manager.addTransientHighlight === 'function') {
            removed.forEach(({ x, y }) => {
                manager.addTransientHighlight(x, y, {
                    borderColor: 'rgba(0, 100, 255, 0.9)',
                    glowColor: 'rgba(0, 100, 255, 0.6)',
                    isDotted: true
                });
            });
        }
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

window.DustStoneAnnihilationSkill = DustStoneAnnihilationSkill;
