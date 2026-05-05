/* ============================================================
   SCRAPE & TRANSLATE — POC
   Extracts [data-i18n] text, diffs against en.json,
   sends only changed keys to GPT-4o-mini via backend.
   Runs automatically on every page load (silently).
   Manual button triggers the full modal UI.
   ============================================================ */

const Scraper = (() => {
    const TARGET_LANGS = ['hi', 'mr', 'bn', 'ta'];
    const LANG_NAMES = { hi: 'Hindi', mr: 'Marathi', bn: 'Bengali', ta: 'Tamil' };

    // Fetch the raw HTML source and parse it to get the original text
    // before i18n.js overwrites the DOM with en.json values
    async function extractTexts() {
        const response = await fetch(window.location.pathname + '?_=' + Date.now());
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const texts = {};
        doc.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const value = el.innerHTML.trim();
            if (value && !texts[key]) {
                texts[key] = value;
            }
        });
        return texts;
    }

    async function fetchExistingEN() {
        try {
            const response = await fetch(`lang/en.json?_=${Date.now()}`);
            if (response.ok) return await response.json();
        } catch (e) { /* file may not exist */ }
        return {};
    }

    function diffTexts(current, existing) {
        const changed = {};
        for (const key of Object.keys(current)) {
            if (existing[key] === undefined || existing[key] !== current[key]) {
                changed[key] = current[key];
            }
        }
        return changed;
    }

    // ─── Toast notification (for auto-scan) ───────────────────────

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `scrape-toast scrape-toast--${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('active'));
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ─── Silent auto-scan (runs on page load) ─────────────────────

    async function autoScan() {
        try {
            const currentTexts = await extractTexts();
            const existingEN = await fetchExistingEN();
            const changed = diffTexts(currentTexts, existingEN);
            const changedCount = Object.keys(changed).length;

            if (changedCount === 0) return; // nothing to do

            // Save updated en.json (merge current page keys into existing)
            const merged = { ...existingEN, ...currentTexts };
            await fetch('/api/save-source', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: merged })
            });

            // Translate only changed keys
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: changed, targetLangs: TARGET_LANGS })
            });

            const data = await response.json();

            if (data.error) {
                showToast(`Translation error: ${data.error}`, 'error');
                return;
            }

            const successCount = data.results.filter(r => r.success).length;
            showToast(`${changedCount} key(s) translated to ${successCount} language(s)`);

            // Refresh current language to pick up new translations
            if (typeof I18n !== 'undefined') {
                I18n.clearCache();
                I18n.setLanguage(I18n.getCurrentLang());
            }
        } catch (err) {
            console.error('[Scraper] Auto-scan failed:', err.message);
        }
    }

    // ─── Modal UI (for manual trigger) ────────────────────────────

    function createModal() {
        const overlay = document.createElement('div');
        overlay.className = 'scrape-modal-overlay';
        overlay.innerHTML = `
            <div class="scrape-modal">
                <h3 class="scrape-modal__title">Scrape & Translate</h3>
                <p class="scrape-modal__subtitle">Checking for content changes...</p>
                <div class="scrape-modal__progress">
                    <div class="scrape-modal__log" id="scrapeLog"></div>
                    <div class="scrape-modal__bar-track">
                        <div class="scrape-modal__bar-fill" id="scrapeBarFill"></div>
                    </div>
                    <p class="scrape-modal__status" id="scrapeStatus">Starting...</p>
                </div>
                <button class="btn btn--primary scrape-modal__close" id="scrapeClose" style="display:none;">Done</button>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));

        return {
            overlay,
            log: document.getElementById('scrapeLog'),
            bar: document.getElementById('scrapeBarFill'),
            status: document.getElementById('scrapeStatus'),
            closeBtn: document.getElementById('scrapeClose')
        };
    }

    function addLog(log, message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `scrape-modal__log-entry scrape-modal__log-entry--${type}`;
        entry.textContent = message;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    function showClose(modal) {
        modal.closeBtn.style.display = '';
        modal.closeBtn.addEventListener('click', () => {
            modal.overlay.classList.remove('active');
            setTimeout(() => modal.overlay.remove(), 300);
            if (typeof I18n !== 'undefined') {
                I18n.clearCache();
                I18n.setLanguage(I18n.getCurrentLang());
            }
        });
    }

    function setProgress(modal, percent, message) {
        modal.bar.style.width = `${percent}%`;
        modal.status.textContent = message;
    }

    async function run() {
        const modal = createModal();

        // Step 1: Extract
        addLog(modal.log, 'Scanning page source for translatable content...');
        const currentTexts = await extractTexts();
        const totalKeys = Object.keys(currentTexts).length;
        addLog(modal.log, `Found ${totalKeys} text elements on page.`, 'success');
        setProgress(modal, 15, `Extracted ${totalKeys} keys`);

        // Step 2: Diff
        addLog(modal.log, 'Comparing against existing translations...');
        const existingEN = await fetchExistingEN();
        const changed = diffTexts(currentTexts, existingEN);
        const changedCount = Object.keys(changed).length;

        if (changedCount === 0) {
            addLog(modal.log, 'No changes detected. All content is already up to date.', 'success');
            setProgress(modal, 100, 'No changes found');
            showClose(modal);
            return;
        }

        addLog(modal.log, `${changedCount} new/changed key(s) found:`, 'success');
        for (const key of Object.keys(changed)) {
            addLog(modal.log, `  + ${key}`);
        }

        // Step 3: Save updated en.json (merge)
        setProgress(modal, 25, 'Saving updated English content...');
        try {
            const merged = { ...existingEN, ...currentTexts };
            await fetch('/api/save-source', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: merged })
            });
            addLog(modal.log, 'English source file updated.', 'success');
        } catch (err) {
            addLog(modal.log, `Failed to save English source: ${err.message}`, 'error');
        }

        // Step 4: Translate changed keys to all languages at once
        setProgress(modal, 40, 'Translating via GPT-4o-mini...');
        addLog(modal.log, `Sending ${changedCount} key(s) to GPT-4o-mini for ${TARGET_LANGS.length} languages...`);

        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: changed, targetLangs: TARGET_LANGS })
            });

            const data = await response.json();

            if (data.error) {
                addLog(modal.log, `Error: ${data.error}`, 'error');
                setProgress(modal, 100, 'Translation failed');
                showClose(modal);
                return;
            }

            // Log results per language
            for (const result of data.results) {
                const name = LANG_NAMES[result.lang] || result.lang;
                if (result.success) {
                    addLog(modal.log, `${name} — ${result.newKeys} key(s) translated, ${result.totalKeys} total in file.`, 'success');
                } else {
                    addLog(modal.log, `${name} — Failed: ${result.error}`, 'error');
                }
            }
        } catch (err) {
            addLog(modal.log, `Request failed: ${err.message}`, 'error');
            setProgress(modal, 100, 'Translation failed');
            showClose(modal);
            return;
        }

        // Done
        setProgress(modal, 100, 'All translations complete!');
        addLog(modal.log, `Done! ${changedCount} key(s) translated across ${TARGET_LANGS.length} languages.`, 'success');
        showClose(modal);
    }

    // ─── Init ─────────────────────────────────────────────────────

    function init() {
        // Auto-scan on every page load (silent)
        autoScan();

        // Manual button still available
        const btn = document.getElementById('scrapeBtn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                run();
            });
        }
    }

    return { init, run, autoScan };
})();

document.addEventListener('DOMContentLoaded', () => {
    Scraper.init();
});
