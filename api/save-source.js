const { readLangFile, writeLangFile } = require('./_storage');

module.exports = (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { texts } = req.body;
    if (!texts) return res.status(400).json({ error: 'Missing texts' });

    const existing = readLangFile('en');
    const merged = { ...existing, ...texts };
    writeLangFile('en', merged);
    console.log(`Saved en.json (${Object.keys(texts).length} new/updated, ${Object.keys(merged).length} total)`);
    res.json({ success: true, keys: Object.keys(merged).length });
};
