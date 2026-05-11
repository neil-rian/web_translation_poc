const { readLangFile } = require('./_storage');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { texts } = req.body;
    if (!texts) return res.status(400).json({ error: 'Missing texts' });

    const existing = await readLangFile('en');
    const changed = {};
    const removed = {};

    for (const key of Object.keys(texts)) {
        if (existing[key] === undefined || existing[key] !== texts[key]) {
            changed[key] = texts[key];
        }
    }

    for (const key of Object.keys(existing)) {
        if (texts[key] === undefined) {
            removed[key] = existing[key];
        }
    }

    res.json({
        changed,
        removed,
        changedCount: Object.keys(changed).length,
        removedCount: Object.keys(removed).length,
        totalCurrent: Object.keys(texts).length,
        totalExisting: Object.keys(existing).length
    });
};
