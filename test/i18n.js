/* ============================================================
   i18n ENGINE — Kature Decorators
   Client-side translation using JSON language files.
   Loads lang/{code}.json, applies translations to [data-i18n]
   elements, and handles language switching without page reload.
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

        const response = await fetch(`lang/${lang}.json`);
        const data = await response.json();
        cache[lang] = data;
        return data;
    }

    function applyTranslations(dict) {
        currentDict = dict;

        // Text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key] !== undefined) {
                // Use innerHTML for keys that contain HTML tags
                if (dict[key].includes('<')) {
                    el.innerHTML = dict[key];
                } else {
                    el.textContent = dict[key];
                }
            }
        });

        // Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key] !== undefined) {
                el.placeholder = dict[key];
            }
        });

        // Update <html lang> and <title>
        document.documentElement.lang = currentLang;
        if (dict['meta.title']) {
            document.title = dict['meta.title'];
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
