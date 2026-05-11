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
        results.write = { success: true, url: blob.url };
    } catch (err) {
        results.write = { success: false, error: err.message };
    }

    // Test read via get()
    try {
        const { blobs } = await list({ prefix: 'test/hello.json', limit: 1 });
        if (blobs.length > 0) {
            const blob = await get(blobs[0].url, { access: 'private' });
            results.read = { success: true, type: typeof blob, keys: Object.keys(blob), hasBody: !!blob.body, constructor: blob.constructor?.name };
        } else {
            results.read = { success: false, reason: 'no blobs found' };
        }
    } catch (err) {
        results.read = { success: false, error: err.message };
    }

    res.json(results);
};
