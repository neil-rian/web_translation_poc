const { readLangFile, writeLangFile } = require('./_storage');

const LANG_NAMES = {
    hi: 'Hindi',
    mr: 'Marathi',
    bn: 'Bengali',
    ta: 'Tamil'
};

async function translateWithOpenAI(texts, targetLang) {
    const langName = LANG_NAMES[targetLang] || targetLang;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.1,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are a professional translator. Translate the JSON values from English to ${langName}. Return a JSON object with the exact same keys but translated values. Rules:
- Preserve all HTML tags like <br>, <span class="text-gold"> exactly as-is
- Keep proper nouns (company names, person names, city names) in English
- Keep numbers like "500+", "55+", "300k+" as-is
- Translate naturally, not literally
- Return ONLY valid JSON, nothing else`
                },
                {
                    role: 'user',
                    content: JSON.stringify(texts)
                }
            ]
        })
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(`OpenAI API error: ${data.error.message}`);
    }

    return JSON.parse(data.choices[0].message.content);
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { texts, targetLangs } = req.body;

    if (!texts || !targetLangs) {
        return res.status(400).json({ error: 'Missing texts or targetLangs' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
        return res.status(500).json({ error: 'OpenAI API key not configured.' });
    }

    const keys = Object.keys(texts);
    console.log(`Translating ${keys.length} key(s) to ${targetLangs.join(', ')} via GPT-4o-mini...`);

    const results = await Promise.all(
        targetLangs.map(async (lang) => {
            try {
                const translated = await translateWithOpenAI(texts, lang);
                const existing = readLangFile(lang);
                const merged = { ...existing, ...translated };
                writeLangFile(lang, merged);

                console.log(`  ${lang}: ${keys.length} keys translated, ${Object.keys(merged).length} total`);
                return { lang, success: true, newKeys: keys.length, totalKeys: Object.keys(merged).length };
            } catch (err) {
                console.error(`  ${lang}: Error — ${err.message}`);
                return { lang, success: false, error: err.message };
            }
        })
    );

    res.json({ success: true, results });
};
