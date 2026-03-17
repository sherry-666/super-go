class VoidStoneSkill extends BaseSkill {
    constructor() {
        super('void_stone', 'skillVoidStone', 'skillVoidStoneDesc', SkillTier.TIER3);
        this.isSecret = true;  // Don't broadcast skill usage to the opponent
        this.endsTurn = false; // Player still places their normal stone after
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
        // Must be an empty cell that doesn't already have a void stone
        if (board[x][y] !== EMPTY) return false;
        const manager = window.skillManager;
        if (manager?.activeEffects?.voidStones?.some(vs => vs.x === x && vs.y === y)) return false;
        return true;
    }

    applyEffect(step, targetX, targetY, selectionHistory, manager) {
        const p = currentPlayer;

        // Register the void stone — it does NOT appear on `board`
        manager.activeEffects.voidStones.push({ x: targetX, y: targetY, owner: p });

        // No stone sound / visual yet — it's hidden
        if (typeof drawBoard === 'function') drawBoard();

        const label = p === BLACK ? 'Black' : 'White';
        if (typeof addLog === 'function') {
            addLog(`${label} planted a Void Stone at ${String.fromCharCode(65 + targetX)}${BOARD_SIZE - targetY}`, p === BLACK ? 'black' : 'white');
        }
    }

    getHighlightStyle() {
        return {
            borderColor: 'rgba(150, 100, 255, 0.8)',
            glowColor: 'rgba(150, 100, 255, 0.5)'
        };
    }
}

window.VoidStoneSkill = VoidStoneSkill;
