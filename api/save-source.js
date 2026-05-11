const { readLangFile, writeLangFile } = require('./_storage');

const TARGET_LANGS = ['hi', 'mr', 'bn', 'ta'];

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { texts } = req.body;
    if (!texts) return res.status(400).json({ error: 'Missing texts' });

    // Find stale keys (exist in old en.json but not in current page content)
    const existing = await readLangFile('en');
    const staleKeys = Object.keys(existing).filter(k => !(k in texts));

    // Replace en.json entirely with current page content (not merge)
    await writeLangFile('en', texts);

    // Remove stale keys from all translation files
    if (staleKeys.length > 0) {
        for (const lang of TARGET_LANGS) {
            const langData = await readLangFile(lang);
            let changed = false;
            for (const key of staleKeys) {
                if (key in langData) {
                    delete langData[key];
                    changed = true;
                }
            }
            if (changed) {
                await writeLangFile(lang, langData);
            }
        }
    }

    console.log(`Saved en.json (${Object.keys(texts).length} keys, ${staleKeys.length} stale removed)`);
    res.json({ success: true, keys: Object.keys(texts).length, removedCount: staleKeys.length });
};
