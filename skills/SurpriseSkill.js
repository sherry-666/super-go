class SurpriseSkill extends BaseSkill {
    constructor() {
        super('surprise', 'skillSurprise', 'skillSurpriseDesc', SkillTier.TIER2);
        this.isSecret = true;  // Don't announce to the opponent
        this.endsTurn = true;  // Ends the turn after placing
        this.isCopyable = false;
    }

    getTotalSteps() {
        return 1;
    }

    hasValidTargets(board, player) {
        for (let x = 0; x < board.length; x++) {
            for (let y = 0; y < board[x].length; y++) {
                if (board[x][y] === EMPTY) return true;
            }
        }
        return false;
    }

    isValidTarget(x, y, step, selectionHistory) {
        return board[x][y] === EMPTY;
    }

    applyEffect(step, targetX, targetY, selectionHistory, manager) {
        const p = currentPlayer;

        // Place the stone — looks like a regular stone
        board[targetX][targetY] = p;

        // Register it as a surprise stone
        manager.activeEffects.surpriseStones.push({ x: targetX, y: targetY, owner: p });

        playStoneSound();
        if (typeof drawBoard === 'function') drawBoard();

        const label = p === BLACK ? 'Black' : 'White';
        if (typeof addLog === 'function') {
            addLog(`${label} placed a Surprise Stone at ${String.fromCharCode(65 + targetX)}${BOARD_SIZE - targetY}`, p === BLACK ? 'black' : 'white');
        }

        lastMove = { x: targetX, y: targetY };
    }

    getHighlightStyle() {
        return {
            borderColor: 'rgba(255, 200, 0, 0.9)',
            glowColor: 'rgba(255, 200, 0, 0.6)'
        };
    }
}

window.SurpriseSkill = SurpriseSkill;
