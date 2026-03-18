// Skill Wiki Logic
document.addEventListener('DOMContentLoaded', () => {
    updateBackLink();
    renderWiki();
    
    // Setup language toggle for wiki
    const langBtn = document.getElementById('lang-toggle-wiki');
    if (langBtn) {
        langBtn.textContent = window.currentLang === 'en' ? '中文' : 'EN';
        langBtn.addEventListener('click', () => {
            window.currentLang = window.currentLang === 'en' ? 'zh' : 'en';
            langBtn.textContent = window.currentLang === 'en' ? '中文' : 'EN';
            applyLanguage();
            renderWiki();
            updateBackLink(); // Keep back link correct after re-render/lang change
        });
    }
});

function updateBackLink() {
    const backBtn = document.getElementById('back-btn-wiki');
    if (!backBtn) return;

    // Check if we came from /test
    if (document.referrer.includes('/test')) {
        backBtn.href = '/test';
    } else {
        backBtn.href = '/';
    }
}

function renderWiki() {
    const container = document.getElementById('wiki-content');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Group skills by tier
    const tiers = [1, 2, 3, 4, 5];
    const groupedSkills = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    
    // Unique skills only (ignore T2-T5 duplicates for display if they are conceptually the same, 
    // but here we show all registered IDs to be thorough)
    const processedBases = new Set();

    Object.entries(skillMeta).forEach(([id, meta]) => {
        const tier = meta.tier || 1;
        if (groupedSkills[tier]) {
            groupedSkills[tier].push({ id, ...meta });
        }
    });

    tiers.forEach(tier => {
        const skills = groupedSkills[tier];
        if (skills.length === 0) return;

        const section = document.createElement('section');
        section.className = 'tier-section';
        
        const title = document.createElement('h2');
        title.className = 'tier-title';
        title.textContent = t(`tier${tier}`);
        section.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'skills-grid';

        // Sort skills by name to be consistent
        skills.sort((a, b) => t(a.nameKey).localeCompare(t(b.nameKey)));

        skills.forEach(skill => {
            // Special handling for multi-tier skills: 
            // If it's something like gambler_1, gambler_2, etc., 
            // maybe we only show it once per tier if the name/desc are identical?
            // Actually, showing them in their respective tiers is what was requested.
            
            const card = document.createElement('div');
            card.className = 'skill-wiki-card';
            
            card.innerHTML = `
                <div class="skill-wiki-header">
                    <div class="skill-wiki-icon">${skill.icon}</div>
                    <div class="skill-wiki-name">${t(skill.nameKey)}</div>
                </div>
                <div class="skill-wiki-desc">${t(skill.descKey)}</div>
            `;
            grid.appendChild(card);
        });

        section.appendChild(grid);
        container.appendChild(section);
    });
}
