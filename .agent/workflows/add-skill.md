---
description: How to add a new skill to the game with full integration
---

Follow these steps to add a new skill to Super Go:

1. **Create the Skill Class**
   - Create a new file `skills/{SkillName}.js`.
   - Implement `isValidTarget`, `applyEffect`, and `getAffectedCells`.
   - Export to window: `window.{SkillName} = {SkillName};`.

2. **Register in SkillManager**
   - Open `skills/SkillManager.js`.
   - Add `this.registerSkill(new {SkillName}());` to the constructor.

3. **Add Global Script Tag**
   - Open `index.html`.
   - Add `<script src="skills/{SkillName}.js"></script>` before the `SkillManager.js` script tag.

4. **Add Translations**
   - Open `i18n.js`.
   - Add keys for the skill name and description in both `en` and `zh` sections.

5. **Define Metadata**
   - Open `game.js`.
   - Search for `const skillMeta = {`.
   - Add an entry for the skill: `{ icon: '...', nameKey: '...', descKey: '...', tier: SkillTier.TIER... }`.

6. **Add Instruction Messages**
   - Open `game.js`.
   - Search for `function updateSkillUI()`.
   - Find the `stepMsgs` object and add human-readable instructions for each step of the skill application.

7. **Verification**
   - Run the game and enable **Test Mode**.
   - Verify the icon, tier, name, and description appear correctly.
   - Verify the instruction box shows the correct text when the skill is selected.
