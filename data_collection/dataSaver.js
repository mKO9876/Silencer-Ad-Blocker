const fs = require('fs');
const path = require('path');
const { parse } = require('json2csv');

const saveData = (requests, dir) => {
    fs.writeFileSync(path.join(dir, 'dataset.json'), JSON.stringify({ requests }, null, 2));
};

const saveCSV = (requests, dir) => {
    const simplified = requests.map(r => ({
        timestamp: r.timestamp,
        pageUrl: r.pageUrl,
        domain: r.domain,
        resourceType: r.resourceType,
        isThirdParty: r.isThirdParty,
        hasAdKeywords: r.hasAdKeywords,
        isKnownAdDomain: r.isKnownAdDomain,
        sizeKB: Math.round(r.sizeBytes / 1024 * 100) / 100,
        durationMs: r.requestDurationMs,
        status: r.status
    }));
    const csv = parse(simplified);
    fs.writeFileSync(path.join(dir, 'requests.csv'), csv);
};

module.exports = { saveData, saveCSV };
