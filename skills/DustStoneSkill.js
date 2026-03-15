class DustStoneSkill extends BaseSkill {
    constructor() {
        super('dust_stone', 'skillDustStone', 'skillDustStoneDesc', SkillTier.TIER1);
    }

    isValidTarget(x, y, step, selectedCell) {
        if (window.isSquatter(x, y)) return false;
        const opponentColor = currentPlayer === BLACK ? WHITE : BLACK;
        return board[x][y] === opponentColor;
    }

    applyEffect(step, targetX, targetY, selectedCell) {
        board[targetX][targetY] = EMPTY;
        captures[currentPlayer]++;
        if (typeof drawBoard === 'function') {
            drawBoard();
        }
    }
}
