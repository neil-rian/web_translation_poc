const { put, list, get } = require('@vercel/blob');

module.exports = async (req, res) => {
    const results = {};

    // Test write
    try {
        const blob = await put('test/hello.json', JSON.stringify({ hello: 'world' }), {
            access: 'private',
            addRandomSuffix: false,
            allowOverwrite: true,
            contentType: 'application/json'
        });
        results.write = { success: true };
    } catch (err) {
        results.write = { success: false, error: err.message };
    }

    // Test read
    try {
        const { blobs } = await list({ prefix: 'test/hello.json', limit: 1 });
        if (blobs.length > 0) {
            const result = await get(blobs[0].url, { access: 'private' });
            const text = await result.blob.text();
            results.read = { success: true, body: JSON.parse(text) };
        }
    } catch (err) {
        results.read = { success: false, error: err.message };
    }

    res.json(results);
};
