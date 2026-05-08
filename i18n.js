/* ============================================================
   i18n ENGINE — v2 (selector-based, no data-i18n)
   Client-side translation using JSON language files.
   Keys in the JSON are CSS selector paths. The engine queries
   the DOM with each key and swaps content accordingly.
   All languages (including English) load from their JSON file.
   ============================================================ */

const I18n = (() => {
    const SUPPORTED_LANGS = ['en', 'hi', 'mr', 'bn', 'ta'];
    const LANG_LABELS = {
        en: 'English',
        hi: 'हिन्दी',
        mr: 'मराठी',
        bn: 'বাংলা',
        ta: 'தமிழ்'
    };
    const STORAGE_KEY = 'kature-lang';
    const cache = {};
    let currentLang = 'en';
    let currentDict = {};
    let originalTitle = '';

    function detectLanguage() {
        // 1. URL param ?lang=
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && SUPPORTED_LANGS.includes(urlLang)) return urlLang;

        // 2. localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && SUPPORTED_LANGS.includes(stored)) return stored;

        // 3. Browser language
        const browserLang = navigator.language.split('-')[0];
        if (SUPPORTED_LANGS.includes(browserLang)) return browserLang;

        // 4. Default
        return 'en';
    }

    async function loadLanguage(lang) {
        if (cache[lang]) return cache[lang];

        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) return {};
            const data = await response.json();
            cache[lang] = data;
            return data;
        } catch (e) {
            return {}; // file may not exist yet on first load
        }
    }

    function applyTranslations(dict) {
        currentDict = dict;

        for (const key of Object.keys(dict)) {
            // Handle meta keys separately
            if (key.startsWith('meta.')) continue;

            let el;
            try {
                el = document.querySelector(key);
            } catch (e) {
                continue; // invalid selector — skip
            }
            if (!el) continue;

            const value = dict[key];
            if (value !== undefined) {
                if (value.includes('<')) {
                    el.innerHTML = value;
                } else {
                    el.textContent = value;
                }
            }
        }

        // Update <html lang> and <title>
        document.documentElement.lang = currentLang;
        if (dict['meta.title']) {
            document.title = dict['meta.title'];
        } else {
            document.title = originalTitle;
        }
    }

    function updateSwitcher() {
        const switcher = document.getElementById('langSwitcher');
        if (switcher) {
            switcher.value = currentLang;
        }
    }

    async function setLanguage(lang) {
        if (!SUPPORTED_LANGS.includes(lang)) lang = 'en';
        currentLang = lang;
        localStorage.setItem(STORAGE_KEY, lang);

        const dict = await loadLanguage(lang);
        applyTranslations(dict);
        updateSwitcher();

        // Dispatch event so other scripts can react
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang, dict } }));
    }

    function t(key) {
        return currentDict[key] || key;
    }

    function getCurrentLang() {
        return currentLang;
    }

    async function init() {
        originalTitle = document.title;
        const lang = detectLanguage();
        await setLanguage(lang);

        // Bind switcher
        const switcher = document.getElementById('langSwitcher');
        if (switcher) {
            switcher.addEventListener('change', (e) => {
                setLanguage(e.target.value);
            });
        }
    }

    function clearCache() {
        Object.keys(cache).forEach(k => delete cache[k]);
    }

    return { init, setLanguage, t, getCurrentLang, clearCache, SUPPORTED_LANGS, LANG_LABELS };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    I18n.init();
});
