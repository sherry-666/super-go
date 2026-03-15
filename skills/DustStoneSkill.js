class DustStoneSkill extends BaseSkill {
    constructor() {
        super('dust_stone', 'skillDustStone', 'skillDustStoneDesc', 1);
    }

    isValidTarget(x, y, step, selectedCell) {
        const opponentColor = currentPlayer === BLACK ? WHITE : BLACK;
        return board[x][y] === opponentColor;
    }

    applyEffect(step, targetX, targetY, selectedCell) {
        board[targetX][targetY] = EMPTY;
        captures[currentPlayer]++;
    }
}
