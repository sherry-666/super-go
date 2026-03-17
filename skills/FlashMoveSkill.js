class FlashMoveSkill extends BaseSkill {
    constructor() {
        super('flash_move', 'skillFlashMove', 'skillFlashMoveDesc', SkillTier.TIER1);
    }

    getTotalSteps() {
        return 2;
    }

    getHighlightStyle(step) {
        if (step === 1) {
            return {
                borderColor: 'rgba(100, 180, 255, 0.9)', // Blue for selecting own stone
                glowColor: 'rgba(100, 180, 255, 0.6)'
            };
        }
        return super.getHighlightStyle(step);
    }

    isValidTarget(x, y, step, selectionHistory) {
        if (window.isSquatter(x, y)) return false;
        if (step === 1) {
            return board[x][y] === currentPlayer;
        } else if (step === 2 && selectionHistory && selectionHistory[0]) {
            const selectedCell = selectionHistory[0];
            if (board[x][y] !== EMPTY) return false;
            
            // Blocked by Illegal Construction
            if (window.skillManager && window.skillManager.isPointBlockedByIllegalConstruction(x, y, currentPlayer)) {
                return false;
            }

            if (!this.isInFlashRange(selectedCell.x, selectedCell.y, x, y)) return false;

            // Simulate the move on a scratch board to check for 禁点 (suicide)
            const testBoard = board.map(col => col.slice());
            testBoard[selectedCell.x][selectedCell.y] = EMPTY;
            testBoard[x][y] = currentPlayer;

            const opponentColor = currentPlayer === BLACK ? WHITE : BLACK;

            // First, resolve any opponent captures that would occur
            let anyCaptures = false;
            const neighbors = [[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < testBoard.length && ny >= 0 && ny < testBoard.length) {
                    if (testBoard[nx][ny] === opponentColor) {
                        const group = getGroup(nx, ny, testBoard);
                        if (group.liberties.length === 0) {
                            anyCaptures = true;
                            group.stones.forEach(([cx, cy]) => {
                                testBoard[cx][cy] = EMPTY;
                            });
                        }
                    }
                }
            }

            // If any captures happened, the move is valid (captures always give liberty)
            if (anyCaptures) return true;

            // Otherwise check if the moved stone itself would have any liberties (suicide rule)
            const movedGroup = getGroup(x, y, testBoard);
            return movedGroup.liberties.length > 0;
        }
        return false;
    }

    async applyEffect(step, targetX, targetY, selectionHistory, manager) {
        const selectedCell = selectionHistory[0];
        const x1 = selectedCell.x, y1 = selectedCell.y;
        const x2 = targetX, y2 = targetY;
        const p = currentPlayer;
        const opponentColor = p === BLACK ? WHITE : BLACK;

        board[x2][y2] = board[x1][y1];
        board[x1][y1] = EMPTY;
        playStoneSound();

        // Resolve captures: remove opponent groups with no liberties
        const allCaptured = [];
        const neighbors = [[x2-1,y2],[x2+1,y2],[x2,y2-1],[x2,y2+1]];
        for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
                if (board[nx][ny] === opponentColor) {
                    const group = getGroup(nx, ny, board);
                    if (group.liberties.length === 0) {
                        group.stones.forEach(([cx, cy]) => {
                            allCaptured.push({ x: cx, y: cy });
                            board[cx][cy] = EMPTY;
                            captures[p]++;
                        });
                    }
                }
            }
        }

        // Immediately redraw board so the opponent sees the skill effect right away
        if (typeof drawBoard === 'function') {
            drawBoard();
        }

        // Highlight the stone's new location
        if (manager && typeof manager.addTransientHighlight === 'function') {
            manager.addTransientHighlight(x2, y2, {
                borderColor: 'rgba(100, 180, 255, 0.9)',
                glowColor: 'rgba(100, 180, 255, 0.6)'
            });
            // Highlight captured stones with dotted circle
            allCaptured.forEach(({ x, y }) => {
                manager.addTransientHighlight(x, y, {
                    borderColor: 'rgba(0, 100, 255, 0.9)',
                    glowColor: 'rgba(0, 100, 255, 0.6)',
                    isDotted: true
                });
            });
        }
    }

    isInFlashRange(fromX, fromY, toX, toY) {
        return Math.abs(toX - fromX) <= 2 && Math.abs(toY - fromY) <= 2;
    }
}

window.FlashMoveSkill = FlashMoveSkill;
