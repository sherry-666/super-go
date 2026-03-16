class DustStoneSkill extends BaseSkill {
    constructor() {
        super('dust_stone', 'skillDustStone', 'skillDustStoneDesc', SkillTier.TIER1);
    }

    isValidTarget(x, y, step, selectedCell) {
        if (window.isSquatter(x, y)) return false;
        const opponentColor = currentPlayer === BLACK ? WHITE : BLACK;
        return board[x][y] === opponentColor;
    }

    applyEffect(step, targetX, targetY, selectedCell, manager) {
        board[targetX][targetY] = EMPTY;
        captures[currentPlayer]++;
        if (typeof drawBoard === 'function') {
            drawBoard();
        }
        if (manager && typeof manager.addTransientHighlight === 'function') {
            manager.addTransientHighlight(targetX, targetY, {
                borderColor: 'rgba(0, 100, 255, 0.9)',
                glowColor: 'rgba(0, 100, 255, 0.6)',
                isDotted: true
            });
        }
    }
}
