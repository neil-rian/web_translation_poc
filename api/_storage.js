const fs = require('fs');
const path = require('path');

const TMP_DIR = '/tmp/lang';
const STATIC_DIR = path.join(process.cwd(), 'lang');

function ensureTmpDir() {
    if (!fs.existsSync(TMP_DIR)) {
        fs.mkdirSync(TMP_DIR, { recursive: true });
    }
}

function readLangFile(lang) {
    // Try /tmp first (runtime updates)
    const tmpPath = path.join(TMP_DIR, `${lang}.json`);
    if (fs.existsSync(tmpPath)) {
        return JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
    }
    // Fall back to static committed file
    const staticPath = path.join(STATIC_DIR, `${lang}.json`);
    if (fs.existsSync(staticPath)) {
        return JSON.parse(fs.readFileSync(staticPath, 'utf-8'));
    }
    return {};
}

function writeLangFile(lang, data) {
    ensureTmpDir();
    const tmpPath = path.join(TMP_DIR, `${lang}.json`);
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { readLangFile, writeLangFile };
