const { put, list } = require('@vercel/blob');

module.exports = async (req, res) => {
    const results = {};

    // Test write
    try {
        const blob = await put('test/hello.json', JSON.stringify({ hello: 'world' }), {
            access: 'private',
            addRandomSuffix: false,
            contentType: 'application/json'
        });
        results.write = { success: true, url: blob.url, blobKeys: Object.keys(blob) };
    } catch (err) {
        results.write = { success: false, error: err.message };
    }

    // Test list
    try {
        const { blobs } = await list({ prefix: 'test/hello.json', limit: 1 });
        if (blobs.length > 0) {
            const blob = blobs[0];
            results.list = { success: true, blobKeys: Object.keys(blob), url: blob.url, downloadUrl: blob.downloadUrl };

            // Test read via url
            try {
                const r1 = await fetch(blob.url);
                results.readViaUrl = { status: r1.status, ok: r1.ok };
            } catch (err) {
                results.readViaUrl = { error: err.message };
            }

            // Test read via downloadUrl
            if (blob.downloadUrl) {
                try {
                    const r2 = await fetch(blob.downloadUrl);
                    results.readViaDownloadUrl = { status: r2.status, ok: r2.ok, body: await r2.text() };
                } catch (err) {
                    results.readViaDownloadUrl = { error: err.message };
                }
            }
        } else {
            results.list = { success: true, count: 0 };
        }
    } catch (err) {
        results.list = { success: false, error: err.message };
    }

    res.json(results);
};
