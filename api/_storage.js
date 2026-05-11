const fs = require('fs');
const path = require('path');
const { put, list } = require('@vercel/blob');

const STATIC_DIR = path.join(process.cwd(), 'lang');
const TMP_DIR = '/tmp/lang';
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

function ensureTmpDir() {
    if (!fs.existsSync(TMP_DIR)) {
        fs.mkdirSync(TMP_DIR, { recursive: true });
    }
}

function readStaticFile(lang) {
    const staticPath = path.join(STATIC_DIR, `${lang}.json`);
    if (fs.existsSync(staticPath)) {
        return JSON.parse(fs.readFileSync(staticPath, 'utf-8'));
    }
    return {};
}

async function readLangFile(lang) {
    if (USE_BLOB) {
        try {
            const { blobs } = await list({ prefix: `lang/${lang}.json` });
            if (blobs.length > 0) {
                const response = await fetch(blobs[0].url);
                return await response.json();
            }
        } catch (err) {
            console.error(`[storage] Blob read failed for ${lang}:`, err.message);
        }
        // Fall back to static committed file
        return readStaticFile(lang);
    }

    // Local dev: try /tmp first, then static
    const tmpPath = path.join(TMP_DIR, `${lang}.json`);
    if (fs.existsSync(tmpPath)) {
        return JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
    }
    return readStaticFile(lang);
}

async function writeLangFile(lang, data) {
    const json = JSON.stringify(data, null, 2);

    if (USE_BLOB) {
        await put(`lang/${lang}.json`, json, {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'application/json'
        });
        return;
    }

    // Local dev: write to /tmp
    ensureTmpDir();
    const tmpPath = path.join(TMP_DIR, `${lang}.json`);
    fs.writeFileSync(tmpPath, json, 'utf-8');
}

module.exports = { readLangFile, writeLangFile };
