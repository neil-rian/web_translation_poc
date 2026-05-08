/* ============================================================
   SCRAPE & TRANSLATE — v2 (selector-based, no data-i18n)
   Fetches raw HTML, parses with DOMParser, walks text nodes
   via TreeWalker, auto-generates CSS selector keys, diffs
   against en.json on the server, sends only changed keys to
   GPT-4o-mini via backend.
   Runs automatically on every page load (silently).
   Manual button triggers the full modal UI.
   ============================================================ */

const Scraper = (() => {
    const TARGET_LANGS = ['hi', 'mr', 'bn', 'ta'];
    const LANG_NAMES = { hi: 'Hindi', mr: 'Marathi', bn: 'Bengali', ta: 'Tamil' };

    // Tags to skip entirely
    const SKIP_TAGS = new Set([
        'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'IFRAME', 'SELECT',
        'OPTION', 'TEXTAREA', 'CODE', 'PRE', 'INPUT', 'LINK',
        'META', 'HEAD', 'BR', 'HR', 'IMG'
    ]);

    // Inline wrapper tags — bubble past these when they are the only child
    const INLINE_TAGS = new Set(['SPAN', 'A', 'STRONG', 'EM', 'B', 'I', 'U']);

    // Tags whose presence inside an element means we capture innerHTML
    const INLINE_HTML_CHILDREN = new Set(['BR', 'SPAN', 'STRONG', 'EM', 'A', 'B', 'I']);

    // Utility classes to skip when building selector keys
    const UTILITY_CLASSES = new Set([
        'active', 'open', 'visible', 'hidden', 'show', 'fade',
        'animate', 'reveal', 'scrolled'
    ]);

    // ─── Ancestor inside a skip tag? ──────────────────────────

    function insideSkipTag(node) {
        let el = node.parentElement;
        while (el) {
            if (SKIP_TAGS.has(el.tagName)) return true;
            el = el.parentElement;
        }
        return false;
    }

    // ─── Simple visibility check (works on parsed DOM) ────────

    function isHidden(el) {
        let current = el;
        while (current && current.tagName !== 'BODY') {
            if (current.hidden) return true;
            const style = (current.getAttribute('style') || '').toLowerCase();
            if (style.includes('display:none') || style.includes('display: none')) return true;
            if (style.includes('visibility:hidden') || style.includes('visibility: hidden')) return true;
            current = current.parentElement;
        }
        return false;
    }

    // ─── Bubble to meaningful parent ──────────────────────────

    function meaningfulParent(textNode) {
        let el = textNode.parentElement;
        while (el && el.parentElement &&
               INLINE_TAGS.has(el.tagName) &&
               el.parentElement.childNodes.length === 1) {
            el = el.parentElement;
        }
        return el;
    }

    // ─── Has inline HTML children? ────────────────────────────

    function hasInlineHTMLChildren(el) {
        for (const child of el.children) {
            if (INLINE_HTML_CHILDREN.has(child.tagName)) return true;
        }
        return false;
    }

    // ─── CSS selector key generation ──────────────────────────

    function firstMeaningfulClass(el) {
        for (const cls of el.classList) {
            if (!UTILITY_CLASSES.has(cls)) return cls;
        }
        return null;
    }

    function nthIndex(el) {
        const tag = el.tagName;
        let idx = 0;
        let count = 0;
        let sibling = el.parentElement && el.parentElement.firstElementChild;
        while (sibling) {
            if (sibling.tagName === tag) {
                count++;
                if (sibling === el) idx = count;
            }
            sibling = sibling.nextElementSibling;
        }
        if (count > 1) return idx;
        return 0; // no disambiguation needed
    }

    function selectorSegment(el) {
        const tag = el.tagName.toLowerCase();
        const cls = firstMeaningfulClass(el);
        const nth = nthIndex(el);
        let seg = tag;
        if (cls) seg += '.' + cls;
        if (nth > 0) seg += ':nth-of-type(' + nth + ')';
        return seg;
    }

    function buildSelectorKey(el) {
        const parts = [];
        let current = el;
        while (current && current.tagName !== 'BODY' && current.tagName !== 'HTML') {
            if (current.id) {
                parts.unshift('#' + current.id);
                break;
            }
            parts.unshift(selectorSegment(current));
            current = current.parentElement;
        }
        // If we didn't hit an id, prefix with body
        if (parts.length > 0 && !parts[0].startsWith('#')) {
            parts.unshift('body');
        }
        return parts.join(' > ');
    }

    // ─── Extract texts from raw HTML via DOMParser ────────────

    async function extractTexts() {
        const response = await fetch(window.location.pathname + '?_=' + Date.now());
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const texts = {};
        const seen = new Set();

        const walker = doc.createTreeWalker(
            doc.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const text = node.textContent.trim();
                    if (text.length < 2) return NodeFilter.FILTER_REJECT;
                    if (insideSkipTag(node)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        while (walker.nextNode()) {
            const textNode = walker.currentNode;
            const el = meaningfulParent(textNode);
            if (!el || el.tagName === 'BODY') continue;
            if (SKIP_TAGS.has(el.tagName)) continue;
            if (isHidden(el)) continue;

            // Avoid processing the same element twice
            if (seen.has(el)) continue;
            seen.add(el);

            const key = buildSelectorKey(el);
            if (!key || texts[key]) continue;

            const value = hasInlineHTMLChildren(el)
                ? el.innerHTML.trim()
                : el.textContent.trim();

            if (value.length >= 2) {
                texts[key] = value;
            }
        }

        return texts;
    }

    // ─── Server-side diff ─────────────────────────────────────

    async function fetchDiff(texts) {
        const response = await fetch('/api/diff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts })
        });
        return await response.json();
    }

    // ─── Toast notification (for auto-scan) ───────────────────

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

    // ─── Silent auto-scan (runs on page load) ─────────────────

    async function autoScan() {
        try {
            const currentTexts = await extractTexts();
            const diff = await fetchDiff(currentTexts);

            if (diff.changedCount === 0) return; // nothing to do

            // Save updated en.json (full current texts)
            await fetch('/api/save-source', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: currentTexts })
            });

            // Translate only changed keys
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: diff.changed, targetLangs: TARGET_LANGS })
            });

            const data = await response.json();

            if (data.error) {
                showToast(`Translation error: ${data.error}`, 'error');
                return;
            }

            const successCount = data.results.filter(r => r.success).length;
            showToast(`${diff.changedCount} key(s) translated to ${successCount} language(s)`);

            // Refresh current language to pick up new translations
            if (typeof I18n !== 'undefined') {
                I18n.clearCache();
                I18n.setLanguage(I18n.getCurrentLang());
            }
        } catch (err) {
            console.error('[Scraper] Auto-scan failed:', err.message);
        }
    }

    // ─── Modal UI (for manual trigger) ────────────────────────

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
        addLog(modal.log, 'Walking DOM for translatable content...');
        const currentTexts = await extractTexts();
        const totalKeys = Object.keys(currentTexts).length;
        addLog(modal.log, `Found ${totalKeys} text elements on page.`, 'success');
        setProgress(modal, 15, `Extracted ${totalKeys} keys`);

        // Step 2: Diff (server-side)
        addLog(modal.log, 'Comparing against existing translations...');
        const diff = await fetchDiff(currentTexts);
        const changedCount = diff.changedCount;

        if (changedCount === 0) {
            addLog(modal.log, 'No changes detected. All content is already up to date.', 'success');
            if (diff.removedCount > 0) {
                addLog(modal.log, `${diff.removedCount} stale key(s) found in en.json (no longer on page).`);
            }
            setProgress(modal, 100, 'No changes found');
            showClose(modal);
            return;
        }

        addLog(modal.log, `${changedCount} new/changed key(s) found:`, 'success');
        for (const key of Object.keys(diff.changed)) {
            addLog(modal.log, `  + ${key}`);
        }
        if (diff.removedCount > 0) {
            addLog(modal.log, `${diff.removedCount} stale key(s) no longer on page.`);
        }

        // Step 3: Save updated en.json (full current texts)
        setProgress(modal, 25, 'Saving updated English content...');
        try {
            await fetch('/api/save-source', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: currentTexts })
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
                body: JSON.stringify({ texts: diff.changed, targetLangs: TARGET_LANGS })
            });

            const data = await response.json();

            if (data.error) {
                addLog(modal.log, `Error: ${data.error}`, 'error');
                setProgress(modal, 100, 'Translation failed');
                showClose(modal);
                return;
            }

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

    // ─── Init ─────────────────────────────────────────────────

    function init() {
        autoScan();

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
