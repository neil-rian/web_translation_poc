const { put, list, get } = require('@vercel/blob');

async function streamToText(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
}

module.exports = async (req, res) => {
    const results = {};

    try {
        await put('test/hello.json', JSON.stringify({ hello: 'world' }), {
            access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json'
        });
        results.write = { success: true };
    } catch (err) {
        results.write = { success: false, error: err.message };
    }

    try {
        const { blobs } = await list({ prefix: 'test/hello.json', limit: 1 });
        if (blobs.length > 0) {
            const result = await get(blobs[0].url, { access: 'private' });
            const text = await streamToText(result.stream);
            results.read = { success: true, body: JSON.parse(text) };
        }
    } catch (err) {
        results.read = { success: false, error: err.message };
    }

    res.json(results);
};
