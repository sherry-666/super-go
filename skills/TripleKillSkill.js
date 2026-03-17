class TripleKillSkill extends BaseSkill {
    constructor() {
        super('triple_kill', 'skillTripleKill', 'skillTripleKillDesc', SkillTier.TIER4);
        this.endsTurn = true;
    }

    getTotalSteps() {
        return 3;
    }

    isValidTarget(x, y, step, selectionHistory) {
        // Any empty spot is valid for any step
        // Must also not be a spot already selected in this same skill activation
        if (board[x][y] !== EMPTY) return false;
        if (selectionHistory && selectionHistory.some(pos => pos.x === x && pos.y === y)) return false;
        return true;
    }

    async applyEffect(step, targetX, targetY, selectionHistory, manager) {
        const p = currentPlayer;
        
        for (let i = 0; i < selectionHistory.length; i++) {
            const pos = selectionHistory[i];
            
            // Place stone and handle captures for each placement
            board[pos.x][pos.y] = p;
            if (typeof playStoneSound === 'function') playStoneSound();
            
            // Check for captures
            const opponentColor = p === BLACK ? WHITE : BLACK;
            const neighbors = [[pos.x-1, pos.y], [pos.x+1, pos.y], [pos.x, pos.y-1], [pos.x, pos.y+1]];
            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
                    if (board[nx][ny] === opponentColor) {
                        const group = getGroup(nx, ny, board);
                        if (group.liberties.length === 0) {
                            group.stones.forEach(([cx, cy]) => {
                                board[cx][cy] = EMPTY;
                                if (typeof captures !== 'undefined') captures[p]++;
                            });
                        }
                    }
                }
            }

            if (typeof drawBoard === 'function') drawBoard();
            if (typeof updateUI === 'function') updateUI();

            // Short delay between stones for visual/audio clarity
            if (i < selectionHistory.length - 1) {
                await new Promise(r => setTimeout(r, 200));
            }
        }

        const label = p === BLACK ? 'Black' : 'White';
        if (typeof addLog === 'function') {
            addLog(`${label} Triple Kill executed`, p === BLACK ? 'black' : 'white');
        }
    }
}

window.TripleKillSkill = TripleKillSkill;
