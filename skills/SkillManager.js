class SkillManager {
    constructor() {
        this.skills = {};
        this.activeSkill = null;
        this.skillStep = 0;
        this.skillHistory = [];
        this.skillUsedThisTurn = { 1: false, 2: false }; // BLACK=1, WHITE=2
        this.lastSkillUsed = { 1: null, 2: null };
        this.isApplyingEffect = false; // Lock clicks during async skill animations

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
        this.registerSkill(new CopycatSkill());
        this.registerSkill(new SurpriseSkill());
        this.registerSkill(new VoidStoneSkill());
        this.registerSkill(new UnderConstructionSkill());
        this.registerSkill(new IllegalConstructionSkill());
        this.registerSkill(new KOHunterSkill(1));
        this.registerSkill(new KOHunterSkill(2));
        this.registerSkill(new KOHunterSkill(3));
        this.registerSkill(new KOHunterSkill(4));
        this.registerSkill(new KOHunterSkill(5));

        this.activeEffects = {
            noSlacking: null,
            oops: null,
            blindfolds: [],
            giantStones: [],
            squatters: [],
            surpriseStones: [],
            voidStones: [],
            underConstruction: [],
            illegalConstructions: []
        };

        // Player hands: skills owned, ready to use
        this.playerHands = { 1: [], 2: [] }; // BLACK=1, WHITE=2

        this.transientHighlights = [];

        // KO Hunter state
        this.koCaptures = { 1: 0, 2: 0 };
        this.koHunterLevel = { 1: 1, 2: 1 };
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
        
        let idToAdd = skillId;
        if (skillId === 'ko_hunter' || skillId.startsWith('ko_hunter_')) {
            idToAdd = `ko_hunter_${this.koHunterLevel[player] || 1}`;
        }
        
        this.playerHands[player].push(idToAdd);
    }

    removeSkillFromHand(player, skillId) {
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

    /**
     * Called when a player captures stones.
     * We define a KO capture as capturing exactly 1 stone, where that stone was a single-stone group.
     */
    notifyCapture(player, count, isKoCandidate) {
        if (count === 1 && isKoCandidate) {
            this.koCaptures[player]++;
            
            const currentLevel = this.koHunterLevel[player];
            if (currentLevel < 5 && this.koCaptures[player] >= 3) {
                this.koCaptures[player] = 0;
                this.upgradeKOHunter(player);
            } else if (this.playerHasSkillPrefix(player, 'ko_hunter_')) {
                // Show progress if they actually have the skill
                if (typeof addLog === 'function') {
                    addLog(t('koHunterProgress').replace('{count}', this.koCaptures[player]), 'system');
                }
            }
        }
    }

    upgradeKOHunter(player) {
        const oldLevel = this.koHunterLevel[player];
        const newLevel = oldLevel + 1;
        this.koHunterLevel[player] = newLevel;

        const oldId = `ko_hunter_${oldLevel}`;
        const newId = `ko_hunter_${newLevel}`;

        // Upgrade all in hand
        if (this.playerHands[player]) {
            for (let i = 0; i < this.playerHands[player].length; i++) {
                if (this.playerHands[player][i] === oldId) {
                    this.playerHands[player][i] = newId;
                }
            }
        }

        if (typeof addLog === 'function') {
            addLog(t('koHunterUpgrade').replace('{tier}', t(`tier${newLevel}`)), 'system');
        }
        if (typeof updateSkillUI === 'function') updateSkillUI();
    }

    playerHasSkillPrefix(player, prefix) {
        return this.playerHands[player] && this.playerHands[player].some(id => id.startsWith(prefix));
    }

    resetTurn(playerId) {
        this.skillUsedThisTurn[playerId] = false;
        this.lastSkillUsed[playerId] = null; // Clear so Copycat only sees *this turn's* usage
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
            squatters: [],
            surpriseStones: [],
            voidStones: [],
            underConstruction: [],
            illegalConstructions: []
        };
        this.lastSkillUsed = { 1: null, 2: null };
        this.koCaptures = { 1: 0, 2: 0 };
        this.koHunterLevel = { 1: 1, 2: 1 };
    }
    async toggleSkill(skillId, isOnlineGame, wsSendCallback) {
        if (this.activeSkill && this.activeSkill.id === skillId) {
            this.cancelActiveSkill();
            return { applied: false };
        } else {
            const skill = this.skills[skillId];
            const p = currentPlayer;
            
            // Special handling for Copycat to redirect to the copied skill
            let targetSkill = skill;
            if (skillId === 'copycat') {
                const opponent = p === 1 ? 2 : 1;
                const lastId = this.lastSkillUsed[opponent];
                if (!lastId || lastId === 'copycat') return { applied: false };
                targetSkill = this.skills[lastId];
                if (!targetSkill || !targetSkill.isCopyable) return { applied: false };
            }

            if (targetSkill.getTotalSteps() === 0) {
                this.isApplyingEffect = true;
                try {
                    await targetSkill.applyEffect(0, null, null, null, this);
                } finally {
                    this.isApplyingEffect = false;
                }
                this.skillUsedThisTurn[p] = true;
                if (skillId !== 'copycat') {
                    this.lastSkillUsed[p] = skillId;
                }
                this.removeSkillFromHand(p, skillId);
                if (isOnlineGame && wsSendCallback) {
                    wsSendCallback('skill', { skill: skillId });
                }
                
                // Feedback for local player
                if (typeof playSkillSound === 'function') playSkillSound('impact');
                
                this.cancelActiveSkill();
                return { applied: true, skillId, endsTurn: targetSkill.endsTurn };
            } else {
                this.activeSkill = targetSkill;
                // If the user triggered copycat, we still store that we are technically using copycat in some way? 
                // No, SkillManager needs to know the original ID for hand removal eventually, but handleTargetClick 
                // uses this.activeSkill. Let's store the 'source' skill ID.
                this.activeSkillSourceId = skillId; 
                this.skillStep = 1;
                this.skillHistory = [];
                return { applied: false };
            }
        }
    }

    cancelActiveSkill() {
        this.activeSkill = null;
        this.activeSkillSourceId = null;
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
                    this.isApplyingEffect = true;
                    await skill.applyEffect(this.skillStep, x, y, finalHistory, this);
                } catch(err) {
                    console.error(`[SkillManager] Error in ${skillId}.applyEffect:`, err);
                } finally {
                    this.isApplyingEffect = false;
                    this.skillUsedThisTurn[p] = true;
                    if (this.activeSkillSourceId !== 'copycat') {
                        this.lastSkillUsed[p] = this.activeSkillSourceId;
                    }
                    this.removeSkillFromHand(p, this.activeSkillSourceId);
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
        let skill = this.skills[skillId];
        if (!skill) return { applied: false };

        const p = currentPlayer;
        const opponent = p === 1 ? 2 : 1;

        // Special handling for Copycat redirection
        if (skillId === 'copycat') {
            const lastId = this.lastSkillUsed[opponent];
            if (lastId && lastId !== 'copycat') {
                skill = this.skills[lastId];
            } else {
                console.error("[SkillManager] Remote Copycat failed: no valid skill to copy");
                return { applied: false };
            }
        }

        try {
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
        } catch (err) {
            console.error(`[SkillManager] Error applying remote skill ${skillId}:`, err);
            return { applied: false };
        }
        this.skillUsedThisTurn[p] = true;
        if (skillId !== 'copycat') {
            this.lastSkillUsed[p] = skillId;
        }
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

        // Decrement under construction Duration
        if (this.activeEffects.underConstruction) {
            this.activeEffects.underConstruction.forEach(site => {
                if (site.owner !== finishedPlayerId) {
                    site.duration--;
                }
            });
            this.activeEffects.underConstruction = this.activeEffects.underConstruction.filter(site => site.duration > 0);
        }
        // Decrement illegal construction Duration
        if (this.activeEffects.illegalConstructions) {
            this.activeEffects.illegalConstructions.forEach(site => {
                if (site.owner !== finishedPlayerId) {
                    site.duration--;
                }
            });
            this.activeEffects.illegalConstructions = this.activeEffects.illegalConstructions.filter(site => site.duration > 0);
        }
    }

    isPointBlockedByIllegalConstruction(x, y, playerColor) {
        if (!this.activeEffects.illegalConstructions) return false;
        
        // EXCEPTION: The Squatter skill can override illegal construction zones.
        if (this.activeSkill && this.activeSkill.id === 'the_squatter') return false;

        // If an illegal construction zone exists at (x,y) and is NOT owned by playerColor, they are blocked.
        return this.activeEffects.illegalConstructions.some(zone => 
            zone.x === x && zone.y === y && zone.owner !== playerColor
        );
    }

    isAreaBlocked(x, y, playerColor) {
        // 1. Check global Under Construction (neither player can play)
        if (this.activeEffects.underConstruction?.some(site => site.x === x && site.y === y)) {
            return true;
        }
        // 2. Check Illegal Construction (unilateral blockade)
        if (this.isPointBlockedByIllegalConstruction(x, y, playerColor)) {
            return true;
        }
        return false;
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
