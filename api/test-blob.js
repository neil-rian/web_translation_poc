const { put, list } = require('@vercel/blob');

module.exports = async (req, res) => {
    const results = { token: !!process.env.BLOB_READ_WRITE_TOKEN };

    // Test write
    try {
        const blob = await put('test/hello.json', JSON.stringify({ hello: 'world' }), {
            access: 'private',
            addRandomSuffix: false,
            contentType: 'application/json'
        });
        results.write = { success: true, url: blob.url };
    } catch (err) {
        results.write = { success: false, error: err.message, stack: err.stack };
    }

    // Test list
    try {
        const { blobs } = await list({ prefix: 'test/' });
        results.list = { success: true, count: blobs.length, blobs: blobs.map(b => b.url) };
    } catch (err) {
        results.list = { success: false, error: err.message, stack: err.stack };
    }

    res.json(results);
};
