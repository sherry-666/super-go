class UnderConstructionSkill extends BaseSkill {
    constructor() {
        super(
            'under_construction',
            'skillUnderConstruction',
            'skillUnderConstructionDesc',
            2
        );
        this.endsTurn = false;
    }

    isValidTarget(x, y, step, selectionHistory, boardState) {
        const checkBoard = boardState || (typeof board !== 'undefined' ? board : null);
        if (!checkBoard || !checkBoard[x] || checkBoard[x][y] === undefined) return false;
        
        // Cannot place on an existing construction site
        const manager = (typeof skillManager !== 'undefined' ? skillManager : window.skillManager);
        if (manager && manager.activeEffects.underConstruction) {
            const hasConstruction = manager.activeEffects.underConstruction.some(site => site.x === x && site.y === y);
            if (hasConstruction) return false;
        }

        return checkBoard[x][y] === EMPTY;
    }

    hasValidTargets(boardState, currentPlayer) {
        const checkBoard = boardState || (typeof board !== 'undefined' ? board : null);
        if (!checkBoard) return false;
        
        const manager = (typeof skillManager !== 'undefined' ? skillManager : window.skillManager);
        for (let x = 0; x < checkBoard.length; x++) {
            if (!checkBoard[x]) continue;
            for (let y = 0; y < checkBoard[x].length; y++) {
                if (checkBoard[x][y] === EMPTY) {
                    // Check if it's already under construction
                    let hasConstruction = false;
                    if (manager && manager.activeEffects.underConstruction) {
                        hasConstruction = manager.activeEffects.underConstruction.some(site => site.x === x && site.y === y);
                    }
                    if (!hasConstruction) return true;
                }
            }
        }
        return false;
    }

    getHighlightStyle(step) {
        return {
            borderColor: 'rgba(255, 165, 0, 0.9)', // Orange border for construction
            glowColor: 'rgba(255, 165, 0, 0.6)'
        };
    }

    async applyEffect(step, targetX, targetY, selectionHistory, manager) {
        const p = (typeof currentPlayer !== 'undefined' ? currentPlayer : 1);
        manager.activeEffects.underConstruction = manager.activeEffects.underConstruction || [];
        
        manager.activeEffects.underConstruction.push({
            x: targetX,
            y: targetY,
            duration: 3,
            owner: p
        });

        const playerLabel = (typeof getPlayerLabel === 'function' ? getPlayerLabel(p) : (p === 1 ? 'Black' : 'White'));
        const col = String.fromCharCode(65 + targetX);
        const row = (typeof BOARD_SIZE !== 'undefined' ? BOARD_SIZE : 19) - targetY;
        
        if (typeof addLog === 'function') {
            addLog(`${playerLabel} placed a Construction Marker at ${col}${row}!`, 'system');
        }

        if (typeof playSkillSound === 'function') {
            playSkillSound('impact');
        }

        if (typeof drawBoard === 'function') {
            drawBoard();
        }
    }
}

if (typeof window !== 'undefined') {
    window.UnderConstructionSkill = UnderConstructionSkill;
}
