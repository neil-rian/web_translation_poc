/* ============================================================
   i18n ENGINE — v2 (selector-based, no data-i18n)
   Client-side translation using JSON language files.
   Keys in the JSON are CSS selector paths. The engine queries
   the DOM with each key and swaps content accordingly.
   English skips loading on initial page load (DOM is already
   English). en.json is only applied when restoring from another
   language.
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
    const originalTexts = {}; // stores original English DOM content
    let currentLang = 'en';
    let currentDict = {};
    let originalTitle = '';
    let translated = false;

    function detectLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && SUPPORTED_LANGS.includes(urlLang)) return urlLang;

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && SUPPORTED_LANGS.includes(stored)) return stored;

        const browserLang = navigator.language.split('-')[0];
        if (SUPPORTED_LANGS.includes(browserLang)) return browserLang;

        return 'en';
    }

    async function loadLanguage(lang) {
        if (cache[lang]) return cache[lang];

        try {
            const response = await fetch(`/api/lang?lang=${lang}`);
            if (!response.ok) return {};
            const data = await response.json();
            cache[lang] = data;
            return data;
        } catch (e) {
            return {};
        }
    }

    function saveOriginalTexts(dict) {
        for (const key of Object.keys(dict)) {
            if (key.startsWith('meta.') || originalTexts[key]) continue;
            let el;
            try { el = document.querySelector(key); } catch (e) { continue; }
            if (!el) continue;
            originalTexts[key] = el.innerHTML;
        }
    }

    function restoreOriginalTexts() {
        for (const key of Object.keys(originalTexts)) {
            let el;
            try { el = document.querySelector(key); } catch (e) { continue; }
            if (!el) continue;
            el.innerHTML = originalTexts[key];
        }
    }

    function applyTranslations(dict) {
        currentDict = dict;
        // Save original English text before first translation
        if (!translated) saveOriginalTexts(dict);

        for (const key of Object.keys(dict)) {
            if (key.startsWith('meta.')) continue;

            let el;
            try {
                el = document.querySelector(key);
            } catch (e) {
                continue;
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

        if (lang === 'en') {
            if (translated) {
                restoreOriginalTexts();
                translated = false;
            }
            updateSwitcher();
            document.documentElement.lang = 'en';
            document.title = originalTitle;
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang, dict: {} } }));
            return;
        }

        const dict = await loadLanguage(lang);
        applyTranslations(dict);
        translated = true;
        updateSwitcher();

        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang, dict } }));
    }

    function setCache(lang, data) {
        cache[lang] = data;
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

    return { init, setLanguage, setCache, t, getCurrentLang, clearCache, SUPPORTED_LANGS, LANG_LABELS };
})();

document.addEventListener('DOMContentLoaded', () => {
    I18n.init();
});
