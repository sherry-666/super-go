class SkillManager {
    constructor() {
        this.skills = {};
        this.activeSkill = null;
        this.skillStep = 0;
        this.skillSelectedCell = null;
        this.skillUsedThisTurn = { 1: false, 2: false }; // BLACK=1, WHITE=2

        this.registerSkill(new DustStoneSkill());
        this.registerSkill(new DustStoneMediumSkill());
        this.registerSkill(new ExcuseMeSkill());
        this.registerSkill(new FlashMoveSkill());
        this.registerSkill(new YoinkSkill());
        this.registerSkill(new NoSlackingSkill());
        this.registerSkill(new OopsSkill());
        this.registerSkill(new DoubleTapSkill());
        this.registerSkill(new BlindfoldSkill());
        this.registerSkill(new MirageSkill());
        this.registerSkill(new TripleSalvoSkill());
        this.registerSkill(new JusticeFromAboveSkill());
        this.registerSkill(new DeepMistSkill());
        this.registerSkill(new VoidRealmSkill());
        this.registerSkill(new EternalNightSkill());

        this.activeEffects = {
            noSlacking: null,
            oops: null,
            blindfolds: [],
            giantStones: []
        };

        // Player hands: skills owned, ready to use
        this.playerHands = { 1: [], 2: [] }; // BLACK=1, WHITE=2
    }

    registerSkill(skill) {
        this.skills[skill.id] = skill;
    }

    // --- Hand Management ---

    addSkillToHand(player, skillId) {
        if (!this.playerHands[player]) this.playerHands[player] = [];
        this.playerHands[player].push(skillId);
    }

    removeSkillFromHand(player, skillId) {
        // In Test Mode, skills are never consumed
        if (document.getElementById('test-mode-toggle') && document.getElementById('test-mode-toggle').checked) {
            return;
        }
        const idx = this.playerHands[player].indexOf(skillId);
        if (idx !== -1) this.playerHands[player].splice(idx, 1);
    }

    playerHasSkill(player, skillId) {
        return this.playerHands[player] && this.playerHands[player].includes(skillId);
    }

    /**
     * Returns up to `count` random skill IDs that the player doesn't already own.
     */
    getDrawOptions(player, count = 3) {
        const allIds = Object.keys(this.skills);
        const owned = this.playerHands[player] || [];
        const available = allIds.filter(id => !owned.includes(id));
        // Shuffle and slice
        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }
        return available.slice(0, count);
    }

    resetTurn(playerId) {
        this.skillUsedThisTurn[playerId] = false;
        this.cancelActiveSkill();
    }

    resetHands() {
        this.playerHands = { 1: [], 2: [] };
    }

    toggleSkill(skillId, isOnlineGame, wsSendCallback) {
        if (this.activeSkill && this.activeSkill.id === skillId) {
            this.cancelActiveSkill();
            return { applied: false };
        } else {
            const skill = this.skills[skillId];
            const p = currentPlayer;
            if (skill.getTotalSteps() === 0) {
                skill.applyEffect(0, null, null, null, this);
                this.skillUsedThisTurn[p] = true;
                this.removeSkillFromHand(p, skillId);
                if (isOnlineGame && wsSendCallback) {
                    wsSendCallback('skill', { skill: skillId });
                }
                
                // Feedback for local player
                if (typeof playSkillSound === 'function') playSkillSound('impact');
                
                this.cancelActiveSkill();
                return { applied: true, skillId, endsTurn: skill.endsTurn };
            } else {
                this.activeSkill = skill;
                this.skillStep = 1;
                this.skillSelectedCell = null;
                return { applied: false };
            }
        }
    }

    cancelActiveSkill() {
        this.activeSkill = null;
        this.skillStep = 0;
        this.skillSelectedCell = null;
    }

    handleTargetClick(x, y, isOnlineGame, wsSendCallback) {
        if (!this.activeSkill) return false;

        const skill = this.activeSkill;
        if (skill.isValidTarget(x, y, this.skillStep, this.skillSelectedCell)) {
            if (this.skillStep < skill.getTotalSteps()) {
                this.skillSelectedCell = { x, y };
                this.skillStep++;
                return true;
            } else {
                const x1 = this.skillSelectedCell ? this.skillSelectedCell.x : null;
                const y1 = this.skillSelectedCell ? this.skillSelectedCell.y : null;

                const skillId = skill.id;
                const p = currentPlayer;
                skill.applyEffect(this.skillStep, x, y, this.skillSelectedCell, this);
                this.skillUsedThisTurn[p] = true;
                this.removeSkillFromHand(p, skillId);

                if (this.activeSkill) this.cancelActiveSkill();

                if (isOnlineGame) {
                    if (skill.getTotalSteps() === 1) {
                        wsSendCallback('skill', { skill: skillId, x, y });
                    } else {
                        wsSendCallback('skill', { skill: skillId, x1, y1, x2: x, y2: y });
                    }
                }
                
                // Feedback for local player
                if (typeof playSkillSound === 'function') playSkillSound('impact');
                return { applied: true, skillId, endsTurn: skill.endsTurn };
            }
        }
        return { applied: false };
    }

    applyRemoteSkill(skillId, payload) {
        const skill = this.skills[skillId];
        if (!skill) return { applied: false };

        const p = currentPlayer;
        if (skill.getTotalSteps() === 0) {
            skill.applyEffect(0, null, null, null, this);
        } else if (skill.getTotalSteps() === 1) {
            skill.applyEffect(1, payload.x, payload.y, null, this);
        } else {
            skill.applyEffect(2, payload.x2, payload.y2, { x: payload.x1, y: payload.y1 }, this);
        }
        this.skillUsedThisTurn[p] = true;
        this.removeSkillFromHand(p, skillId);
        
        // Opponent using a skill
        if (!skill.isSecret) {
            if (typeof playSkillSound === 'function') playSkillSound('impact');
            if (typeof showSkillPopup === 'function') {
                const label = getPlayerLabel(p);
                showSkillPopup(`${label}: ${t(skill.nameKey)}!`);
            }
        }
        return { applied: true, skillId, endsTurn: skill.endsTurn };
    }

    clearEffects(playerId) {
        if (this.activeEffects.noSlacking === playerId) {
            this.activeEffects.noSlacking = null;
        }
        if (this.activeEffects.oops === playerId) {
            this.activeEffects.oops = null;
        }
        // Blindfolds expire at the end of the opponent's turn (after they've suffered it)
        // Or at the end of the caster's next turn? 
        // "2 turns" usually means 2 of the opponent's response opportunities.
        // Let's decrement them when the TURN changes.
    }

    decrementEffects(finishedPlayerId) {
        if (!this.activeEffects.blindfolds) return;
        
        // If the player who just finished their turn is NOT the owner, 
        // it means they just played through one "fog turn".
        this.activeEffects.blindfolds.forEach(fog => {
            if (fog.owner !== finishedPlayerId) {
                fog.duration--;
            }
        });

        // Cleanup expired fogs
        this.activeEffects.blindfolds = this.activeEffects.blindfolds.filter(fog => fog.duration > 0);
    }

    isValidTargetHover(x, y) {
        if (!this.activeSkill) return false;
        return this.activeSkill.isValidTarget(x, y, this.skillStep, this.skillSelectedCell);
    }

    getAffectedCells(x, y) {
        if (!this.activeSkill) return [];
        return this.activeSkill.getAffectedCells(x, y, this.skillStep, this.skillSelectedCell);
    }

    getHighlightStyle() {
        if (!this.activeSkill) return null;
        return this.activeSkill.getHighlightStyle(this.skillStep);
    }

    isSkillUsable(skillId, board, player) {
        if (this.skillUsedThisTurn[player]) return false;
        if (!this.playerHasSkill(player, skillId)) return false;
        const skill = this.skills[skillId];
        if (!skill) return false;
        return skill.hasValidTargets(board, player);
    }

    getSkillById(skillId) {
        return this.skills[skillId] || null;
    }
}
