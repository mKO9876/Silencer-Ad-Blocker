const EASYLIST_URL = 'https://easylist.to/easylist/easylist.txt';

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

    if (!fs.existsSync(EASYLIST_PATH)) {
        console.log('Downloading EasyList...');
        const file = fs.createWriteStream(EASYLIST_PATH);
        await new Promise((resolve) => {
            https.get(EASYLIST_URL, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log('✅ EasyList downloaded');
                    resolve();
                });
            });
        });
    }

    const easyListText = fs.readFileSync(EASYLIST_PATH, 'utf-8');
    const parsed = parseEasyListRules(easyListText);

    return { ...parsed };
}

function isEasyListAd(url, domainRules, urlPatternRules) {
    const urlObj = new URL(url);

    if (domainRules.has(urlObj.hostname)) return true; // Return true if it's on EasyList

    for (const pattern of urlPatternRules) {    // Check against URL patterns (e.g., '/banner.js')
        if (url.includes(pattern)) return true;
    }
    return false;
}


module.exports = { downloadEasyList, isEasyListAd };
