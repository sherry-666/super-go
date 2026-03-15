class DoubleTapSkill extends BaseSkill {
    constructor() {
        super('double_tap', 'skillDoubleTap', 'skillDoubleTapDesc', 1);
    }

    getTotalSteps() {
        return 2;
    }

    hasValidTargets(board, currentPlayer) {
        // Find if there is at least one empty cell with an adjacent empty cell
        for (let i = 0; i < board.length; i++) {
            for (let j = 0; j < board.length; j++) {
                if (board[i][j] === EMPTY) {
                    const neighbors = [[i-1, j], [i+1, j], [i, j-1], [i, j+1]];
                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
                            if (board[nx][ny] === EMPTY) return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    isValidTarget(x, y, step, selectedCell) {
        if (board[x][y] !== EMPTY) return false;

        if (step === 2) {
            // Second stone must be strictly adjacent to the first
            const dx = Math.abs(x - selectedCell.x);
            const dy = Math.abs(y - selectedCell.y);
            if (dx + dy !== 1) return false;
        }

        return true;
    }

    applyEffect(step, targetX, targetY, selectedCell, manager) {
        const p = currentPlayer;

        const placeAndCapture = (px, py) => {
            board[px][py] = p;
            const opponentColor = p === BLACK ? WHITE : BLACK;
            const neighbors = [[px-1, py], [px+1, py], [px, py-1], [px, py+1]];
            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < board.length && ny >= 0 && ny < board.length) {
                    if (board[nx][ny] === opponentColor) {
                        const group = getGroup(nx, ny, board);
                        if (group.liberties.length === 0) {
                            group.stones.forEach(([cx, cy]) => {
                                board[cx][cy] = EMPTY;
                                captures[p]++;
                            });
                        }
                    }
                }
            }
        };

        // Place the first stone
        placeAndCapture(selectedCell.x, selectedCell.y);
        // Place the second stone
        placeAndCapture(targetX, targetY);

        // End the turn without placing a third stone
        const label = p === BLACK ? 'Black' : 'White';
        const c1 = String.fromCharCode(65 + selectedCell.x);
        const r1 = BOARD_SIZE - selectedCell.y;
        const c2 = String.fromCharCode(65 + targetX);
        const r2 = BOARD_SIZE - targetY;
        finalizeTurn(`${label} Double Tap → ${c1}${r1} + ${c2}${r2}`, p === BLACK ? 'black' : 'white');
    }

    getHighlightStyle(step) {
        if (step === 1) {
            return {
                borderColor: 'rgba(255, 100, 0, 0.8)', // Orange for step 1
                glowColor: 'rgba(255, 100, 0, 0.6)'
            };
        } else {
            return {
                borderColor: 'rgba(255, 50, 50, 0.8)', // Red/Orange for contiguous step 2
                glowColor: 'rgba(255, 50, 50, 0.6)'
            };
        }
    }
}

// Make globally available
window.DoubleTapSkill = DoubleTapSkill;
