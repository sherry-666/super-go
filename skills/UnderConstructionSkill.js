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
        const checkBoard = boardState || window.board;
        if (!checkBoard || !checkBoard[x] || checkBoard[x][y] === undefined) return false;
        
        // Cannot place on an existing construction site
        if (window.skillManager && window.skillManager.activeEffects.underConstruction) {
            const hasConstruction = window.skillManager.activeEffects.underConstruction.some(site => site.x === x && site.y === y);
            if (hasConstruction) return false;
        }

        return checkBoard[x][y] === EMPTY;
    }

    hasValidTargets(board, currentPlayer) {
        const checkBoard = board || window.board;
        if (!checkBoard) return false;
        for (let x = 0; x < checkBoard.length; x++) {
            if (!checkBoard[x]) continue;
            for (let y = 0; y < checkBoard[x].length; y++) {
                if (checkBoard[x][y] === EMPTY) {
                    // Check if it's already under construction
                    let hasConstruction = false;
                    if (window.skillManager && window.skillManager.activeEffects.underConstruction) {
                        hasConstruction = window.skillManager.activeEffects.underConstruction.some(site => site.x === x && site.y === y);
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
        manager.activeEffects.underConstruction = manager.activeEffects.underConstruction || [];
        
        manager.activeEffects.underConstruction.push({
            x: targetX,
            y: targetY,
            duration: 3,
            owner: window.currentPlayer
        });

        const playerLabel = window.getPlayerLabel(window.currentPlayer);
        const col = String.fromCharCode(65 + targetX);
        const row = 19 - targetY; // Assuming BOARD_SIZE = 19
        if (typeof window.addLog === 'function') {
            window.addLog(`${playerLabel} placed a Construction Marker at ${col}${row}!`, 'system');
        }

        if (typeof window.playSkillSound === 'function') {
            window.playSkillSound('impact');
        }

        if (typeof window.drawBoard === 'function') {
            window.drawBoard();
        }
    }
}

if (typeof window !== 'undefined') {
    window.UnderConstructionSkill = UnderConstructionSkill;
}
