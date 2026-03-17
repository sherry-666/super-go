---
description: how to add a new skill to the game
---

Follow these steps to implement a new skill in Super Go. The implementation must support both **Local Play** and **Online Sync**.

### 1. Create the Skill Class
Create a new file in `skills/YourNewSkill.js`. It must extend `BaseSkill`.

```javascript
class YourNewSkill extends BaseSkill {
    constructor() {
        super('your_skill_id', 'skillNameKey', 'skillDescKey', 3 /* tier */);
    }

    getTotalSteps() { return 1; /* Number of clicks required */ }

    isValidTarget(x, y, step, history) {
        return board[x][y] === EMPTY; // Example validation
    }

    async applyEffect(step, x, y, history, manager) {
        // Shared logic: This runs on both caster and opponent (online) sides.
        board[x][y] = currentPlayer; 
        
        // Use showSkillPopup for notifications that should appear for both players
        if (typeof showSkillPopup === 'function') {
            showSkillPopup(t('skillSuccessMsg'));
        }
    }
}
```

### 2. Register with SkillManager
Modify `skills/SkillManager.js`:
1. **Import**: Add `<script src="skills/YourNewSkill.js"></script>` to `index.html`.
2. **Register**: In `SkillManager` constructor, add `this.registerSkill(new YourNewSkill());`.
3. **State (Optional)**: If the skill has a duration (e.g., a "Zone" for 5 turns), add a tracking array to `this.activeEffects` in both the `constructor` and `resetAll()`.
4. **Decrement (Optional)**: Update `decrementEffects(finishedPlayerId)` to reduce durations at the end of turns.

### 3. Localization & UI Metadata
- **Directives**: Add your `skillNameKey` and `skillDescKey` to both `en` and `zh` sections in `i18n.js`.
- **Metadata**: In `game.js`, add an entry to the `skillMeta` object:
  ```javascript
  your_skill_id: { icon: '✨', nameKey: 'skillNameKey', descKey: 'skillDescKey', tier: SkillTier.TIER3 },
  ```
- **Instructions**: Add your click-by-click instructions to `stepMsgs` in `game.js`.

### 4. Ensure Online Synchronization
The `SkillManager` automatically handles network broadcasting via `handleTargetClick`. However, you must ensure `applyRemoteSkill` can parse your payload:

- If your skill uses standard 1-step or 2-step history, it's usually handled automatically.
- If your skill has custom payload requirements, update the switch/if-else logic in `SkillManager.applyRemoteSkill`.

### 5. Interception & Rendering
- **Interception**: If your skill blocks standard moves (like "Under Construction"), update `tryPlaceStone` in `game.js`.
- **Rendering**: If your skill has a persistent visual effect, add a dedicated drawing block inside `drawBoard()` in `game.js` (usually before/after the stones loop).

### 6. Verification
- **Local Test Mode**: Enable "Test Mode" in the UI to quickly draw and test your skill without luck.
- **Online Test**: Open two browser windows, host a game, and verify the effect (stones removed, markers placed, notifications shown) appears correctly on the opponent's screen.
