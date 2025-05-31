const EASYLIST_URL = 'https://easylist.to/easylist/easylist.txt';
const EASYPRIVACY_URL = "https://easylist.to/easylist/easyprivacy.txt";
const FANBOY_URL = "https://easylist.to/easylist/fanboy-annoyance.txt";

const fs = require('fs');
const path = require('path');

function parseEasyListRules(easyListText) {
    const rules = easyListText.split('\n');
    const domainRules = new Set();
    const urlPatternRules = new Set();

    rules.forEach((rule) => {
        if (rule.startsWith('!') || rule.includes('##') || rule.includes('#@#')) return;
        if (rule.startsWith('||') && rule.endsWith('^')) {
            const domain = rule.slice(2, -1);
            domainRules.add(domain);
        } else if (rule.startsWith('/') && rule.endsWith('/')) {
            const pattern = rule.slice(1, -1);
            urlPatternRules.add(pattern);
        }
    });

    return { domainRules, urlPatternRules };
}

async function downloadEasyList({ fs, https, path }) {
    const EASYLIST_PATH = path.join(__dirname, 'easylist.txt');
    const EASYPRIVACY_PATH = path.join(__dirname, 'easyprivacy.txt');
    const FANBOY_PATH = path.join(__dirname, 'fanboy.txt');

    // Initialize combined rules
    const combinedRules = {
        domainRules: new Set(),
        urlPatternRules: new Set()
    };

    async function downloadAndParse(url, path) {
        console.log(`Downloading ${path}...`);
        const file = fs.createWriteStream(path); // Overwrites by default
        await new Promise((resolve, reject) => {
            https.get(url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`✅ ${path} downloaded`);
                    resolve();
                });
            }).on('error', (err) => {
                console.error(`❌ Failed to download ${url}:`, err);
                reject(err);
            });
        });

        const text = fs.readFileSync(path, 'utf-8');
        const parsed = parseEasyListRules(text);

        // Merge the rules
        parsed.domainRules.forEach(domain => combinedRules.domainRules.add(domain));
        parsed.urlPatternRules.forEach(pattern => combinedRules.urlPatternRules.add(pattern));
    }

    // Process all lists
    await downloadAndParse(EASYLIST_URL, EASYLIST_PATH);
    await downloadAndParse(EASYPRIVACY_URL, EASYPRIVACY_PATH);
    await downloadAndParse(FANBOY_URL, FANBOY_PATH);

    console.log("Combined parsed rules: ", combinedRules);
    return combinedRules;
}

function isCroatianListAd(urlObj) {
    try {
        const serboCroatianPath = path.join(__dirname, 'SerboCroatianList.txt');
        const serboCroatianRules = fs.readFileSync(serboCroatianPath, 'utf-8').split('\n');

        for (const rule of serboCroatianRules) {
            // Preskoči komentare i prazne linije
            if (rule.startsWith('!') || rule.trim() === '' || rule.includes('##') || rule.includes('#@#')) continue;

            // Provjeri domene (||domain^)
            if (rule.startsWith('||') && rule.endsWith('^')) {
                const domain = rule.slice(2, -1);
                if (urlObj.hostname === domain) return true;
            }
            // Provjeri uzorke URL-a (/pattern/)
            else if (rule.startsWith('/') && rule.endsWith('/')) {
                const pattern = rule.slice(1, -1);
                if (urlObj.href.includes(pattern)) return true;
            }
            // Provjeri direktne URL-ove
            else if (rule.includes(urlObj.hostname)) {
                return true;
            }
        }
    } catch (err) {
        console.error('❌ Greška pri čitanju SerboCroatianList.txt:', err);
    }

    return false;
}

function isEasyListAd(url, domainRules, urlPatternRules) {
    const urlObj = new URL(url);

    if (domainRules.has(urlObj.hostname)) return true;

    for (const pattern of urlPatternRules) {
        if (url.includes(pattern)) return true;
    }

    if (isCroatianListAd(urlObj)) return true;

    return false;
}

module.exports = { downloadEasyList, isEasyListAd };