const fs = require('fs');
const path = require('path');
const { put, list, get } = require('@vercel/blob');

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
    // Always check /tmp first (fast, catches writes from same container)
    const tmpPath = path.join(TMP_DIR, `${lang}.json`);
    if (fs.existsSync(tmpPath)) {
        return JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
    }

    // In production, try Vercel Blob
    if (USE_BLOB) {
        try {
            const { blobs } = await list({ prefix: `lang/${lang}.json`, limit: 1 });
            if (blobs.length > 0) {
                const result = await get(blobs[0].url, { access: 'private' });
                // get() returns { stream, blob } — read from the blob (a Web API Blob)
                const text = await result.blob.text();
                const data = JSON.parse(text);
                // Cache to /tmp for faster subsequent reads
                ensureTmpDir();
                fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
                return data;
            }
        } catch (err) {
            console.error(`[storage] Blob read failed for ${lang}:`, err.message);
        }
    }

    // Fall back to static committed file
    return readStaticFile(lang);
}

async function writeLangFile(lang, data) {
    const json = JSON.stringify(data, null, 2);

    // Always write to /tmp for fast reads within same container
    ensureTmpDir();
    const tmpPath = path.join(TMP_DIR, `${lang}.json`);
    fs.writeFileSync(tmpPath, json, 'utf-8');

    // In production, also persist to Vercel Blob
    if (USE_BLOB) {
        try {
            await put(`lang/${lang}.json`, json, {
                access: 'private',
                addRandomSuffix: false,
                allowOverwrite: true,
                contentType: 'application/json'
            });
        } catch (err) {
            console.error(`[storage] Blob write failed for ${lang}:`, err.message);
        }
    }
}

module.exports = { readLangFile, writeLangFile };
