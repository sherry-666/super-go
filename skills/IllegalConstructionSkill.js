class IllegalConstructionSkill extends BaseSkill {
    constructor() {
        super(
            'illegal_construction',
            'skillIllegalConstruction',
            'skillIllegalConstructionDesc',
            4
        );
        this.endsTurn = false;
    }

    getTotalSteps() {
        return 1;
    }

    isValidTarget(x, y, step, selectionHistory, boardState) {
        const checkBoard = boardState || (typeof board !== 'undefined' ? board : null);
        if (!checkBoard) return false;

        // Anchor must ensure 2x2 area fits
        if (x >= checkBoard.length - 1 || y >= checkBoard.length - 1) return false;

        return true; 
    }

    hasValidTargets(boardState, currentPlayer) {
        const checkBoard = boardState || (typeof board !== 'undefined' ? board : null);
        if (!checkBoard) return false;

        // Any 2x2 anchor is fine, we allow overwriting own or enemy stones (enemy stones get evicted)
        return checkBoard.length > 1;
    }

    getAffectedCells(x, y, step, selectionHistory) {
        return [
            { x: x, y: y },
            { x: x + 1, y: y },
            { x: x, y: y + 1 },
            { x: x + 1, y: y + 1 }
        ];
    }

    async applyEffect(step, targetX, targetY, selectionHistory, manager) {
        const p = (typeof currentPlayer !== 'undefined' ? currentPlayer : 1);
        const opponentColor = p === 1 ? 2 : 1;
        const affected = this.getAffectedCells(targetX, targetY, step, selectionHistory);

        let evictedCount = 0;
        affected.forEach(cell => {
            if (board[cell.x][cell.y] === opponentColor) {
                board[cell.x][cell.y] = EMPTY;
                evictedCount++;
            }
            
            // Register the zone for each cell
            manager.activeEffects.illegalConstructions = manager.activeEffects.illegalConstructions || [];
            
            // Remove any existing zone on this specific cell regardless of owner (new one overrides)
            manager.activeEffects.illegalConstructions = manager.activeEffects.illegalConstructions.filter(
                zone => !(zone.x === cell.x && zone.y === cell.y)
            );

            manager.activeEffects.illegalConstructions.push({
                x: cell.x,
                y: cell.y,
                duration: 5,
                owner: p,
                anchorX: targetX,
                anchorY: targetY
            });
        });

        const playerLabel = (typeof getPlayerLabel === 'function' ? getPlayerLabel(p) : (p === 1 ? 'Black' : 'White'));
        const col = String.fromCharCode(65 + targetX);
        const row = (typeof BOARD_SIZE !== 'undefined' ? BOARD_SIZE : 19) - targetY;
        
        let logMsg = `${playerLabel} established an Illegal Construction Zone at ${col}${row}!`;
        if (evictedCount > 0) {
            logMsg += ` (Evicted ${evictedCount} enemy stones)`;
        }

        if (typeof addLog === 'function') {
            addLog(logMsg, 'system');
        }

        if (typeof playSkillSound === 'function') {
            playSkillSound('impact');
        }

        if (typeof drawBoard === 'function') {
            drawBoard();
        }
    }

    getHighlightStyle(step) {
        return {
            borderColor: 'rgba(255, 0, 0, 0.9)', // Red border for illegal construction
            glowColor: 'rgba(255, 0, 0, 0.6)'
        };
    }
}

if (typeof window !== 'undefined') {
    window.IllegalConstructionSkill = IllegalConstructionSkill;
}
