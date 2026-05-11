const { put, list, getDownloadUrl } = require('@vercel/blob');

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

    // Test list + read
    try {
        const { blobs } = await list({ prefix: 'test/hello.json', limit: 1 });
        if (blobs.length > 0) {
            const signedUrl = await getDownloadUrl(blobs[0].url);
            const response = await fetch(signedUrl);
            const body = await response.json();
            results.read = { success: true, status: response.status, body };
        } else {
            results.read = { success: false, reason: 'no blobs found' };
        }
    } catch (err) {
        results.read = { success: false, error: err.message };
    }

    res.json(results);
};
