const { readLangFile } = require('./_storage');

module.exports = (req, res) => {
    const { lang } = req.query;
    if (!lang) return res.status(400).json({ error: 'Missing lang parameter' });

    const data = readLangFile(lang);
    res.setHeader('Cache-Control', 'no-cache');
    res.json(data);
};
