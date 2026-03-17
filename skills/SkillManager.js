class SkillManager {
    constructor() {
        this.skills = {};
        this.activeSkill = null;
        this.skillStep = 0;
        this.skillHistory = [];
        this.skillUsedThisTurn = { 1: false, 2: false }; // BLACK=1, WHITE=2

        this.registerSkill(new DustStoneSkill());
        this.registerSkill(new DustStoneMediumSkill());
        this.registerSkill(new DustStoneLargeSkill());
        this.registerSkill(new DustStoneGiantSkill());
        this.registerSkill(new DustStoneAnnihilationSkill());
        this.registerSkill(new ExcuseMeSkill());
        this.registerSkill(new FlashMoveSkill());
        this.registerSkill(new YoinkSkill());
        this.registerSkill(new NoSlackingSkill());
        this.registerSkill(new OopsSkill());
        this.registerSkill(new DoubleTapSkill());
        this.registerSkill(new BlindfoldSkill());
        this.registerSkill(new MirageSkill());
        this.registerSkill(new TripleSalvoSkill());
        this.registerSkill(new DibsSkill());
        this.registerSkill(new DeepMistSkill());
        this.registerSkill(new VoidRealmSkill());
        this.registerSkill(new ComingThroughSkill());
        this.registerSkill(new EternalNightSkill());
        this.registerSkill(new TheSquatterSkill());
        this.registerSkill(new TripleKillSkill());
        this.registerSkill(new PentaKillSkill());

        this.activeEffects = {
            noSlacking: null,
            oops: null,
            blindfolds: [],
            giantStones: [],
            squatters: []
        };

        // Player hands: skills owned, ready to use
        this.playerHands = { 1: [], 2: [] }; // BLACK=1, WHITE=2

        this.transientHighlights = [];
    }

    addTransientHighlight(x, y, style, durationMs = 2500) {
        const id = Date.now() + Math.random();
        this.transientHighlights.push({ id, x, y, style });
        
        // Remove after duration
        setTimeout(() => {
            this.transientHighlights = this.transientHighlights.filter(h => h.id !== id);
            if (typeof drawBoard === 'function') drawBoard();
        }, durationMs);
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

    resetAll() {
        this.resetTurn(1);
        this.resetTurn(2);
        this.resetHands();
        this.activeEffects = {
            noSlacking: null,
            oops: null,
            blindfolds: [],
            giantStones: [],
            squatters: []
        };
    }
    async toggleSkill(skillId, isOnlineGame, wsSendCallback) {
        if (this.activeSkill && this.activeSkill.id === skillId) {
            this.cancelActiveSkill();
            return { applied: false };
        } else {
            const skill = this.skills[skillId];
            const p = currentPlayer;
            if (skill.getTotalSteps() === 0) {
                await skill.applyEffect(0, null, null, null, this);
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
                this.skillHistory = [];
                return { applied: false };
            }
        }
    }

    cancelActiveSkill() {
        this.activeSkill = null;
        this.skillStep = 0;
        this.skillHistory = [];
    }

    async handleTargetClick(x, y, isOnlineGame, wsSendCallback) {
        if (!this.activeSkill) return false;

        const skill = this.activeSkill;
        if (skill.isValidTarget(x, y, this.skillStep, this.skillHistory)) {
            if (this.skillStep < skill.getTotalSteps()) {
                this.skillHistory.push({ x, y });
                this.skillStep++;
                return true;
            } else {
                const skillId = skill.id;
                const p = currentPlayer;
                const finalHistory = [...this.skillHistory, { x, y }];
                
                try {
                    // Pass the full history to the skill
                    await skill.applyEffect(this.skillStep, x, y, finalHistory, this);
                } catch(err) {
                    console.error(`[SkillManager] Error in ${skillId}.applyEffect:`, err);
                } finally {
                    this.skillUsedThisTurn[p] = true;
                    this.removeSkillFromHand(p, skillId);
                    if (this.activeSkill) this.cancelActiveSkill();
                }

                if (isOnlineGame) {
                    // Send full history for multi-step skills
                    wsSendCallback('skill', { skill: skillId, history: finalHistory });
                }
                
                // Feedback for local player
                if (typeof playSkillSound === 'function') playSkillSound('impact');
                return { applied: true, skillId, endsTurn: skill.endsTurn };
            }
        }
        return { applied: false };
    }

    async applyRemoteSkill(skillId, payload) {
        const skill = this.skills[skillId];
        if (!skill) return { applied: false };

        const p = currentPlayer;
        if (skill.getTotalSteps() === 0) {
            await skill.applyEffect(0, null, null, null, this);
        } else if (payload.history) {
            const last = payload.history[payload.history.length - 1];
            await skill.applyEffect(skill.getTotalSteps(), last.x, last.y, payload.history, this);
        } else if (skill.getTotalSteps() === 1) {
            await skill.applyEffect(1, payload.x, payload.y, [{ x: payload.x, y: payload.y }], this);
        } else {
            const h = [{ x: payload.x1, y: payload.y1 }, { x: payload.x2, y: payload.y2 }];
            await skill.applyEffect(2, payload.x2, payload.y2, h, this);
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
        return this.activeSkill.isValidTarget(x, y, this.skillStep, this.skillHistory);
    }

    getAffectedCells(x, y) {
        if (!this.activeSkill) return [];
        return this.activeSkill.getAffectedCells(x, y, this.skillStep, this.skillHistory);
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
