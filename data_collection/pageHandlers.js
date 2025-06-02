const { URL } = require('url');
const {
    hasAdKeywords,
    isKnownAdDomain,
    isSponsoredUrl
} = require('./helper');
const { isEasyListAd } = require('./easylist');

function calculateEntropy(str) {
    const map = {};
    for (const c of str) map[c] = (map[c] || 0) + 1;
    const len = str.length;
    return -Object.values(map)
        .map(freq => freq / len)
        .reduce((acc, p) => acc + p * Math.log2(p), 0);
}


const onRequest = (request, timingsMap) => {
    timingsMap.set(request.url(), {
        start: Date.now(),
        initiator: request.initiator()?.type,
        resourceType: request.resourceType()
    });
};

const onRequestFinished = async (request, page, timingsMap, storage, domainRules, urlPatternRules) => {
    try {
        const response = await request.response();
        if (!response) return;

        const urlObj = new URL(request.url());
        const headers = response.headers();
        const mimeType = headers['content-type'] || 'unknown';

        const isAd = isEasyListAd(request.url(), domainRules, urlPatternRules) ||
            isKnownAdDomain(urlObj.hostname) ||
            isSponsoredUrl(request.url());

        const data = {
            mainPageUrl: page.url(),
            url: request.url(),

            urlLength: urlObj.hostname.length + urlObj.pathname.length,
            queryParamsCount: urlObj.searchParams?.size || 0,
            redirectCount: request.redirectChain().length,
            tld: urlObj.hostname.split('.').pop(),
            subdomainDepth: urlObj.hostname.split('.').length - 2,
            urlEntropy: calculateEntropy(request.url()),

            status: response.status(),
            mimeType,
            sizeBytes: parseInt(headers['content-length']) || 0,

            resourceType: request.resourceType(),
            setCookies: headers['set-cookie'] ? true : false,
            headers,

            //checkup
            isEasyListAd: isAd,
            isThirdParty: !request.url().includes(new URL(page.url()).hostname),
            hasAdKeywords: hasAdKeywords(request.url().hostname + request.url().pathname),
            isKnownAdDomain: isKnownAdDomain(urlObj.hostname),
            isSponsoredUrl: isSponsoredUrl(request.url()),
            label: isAd ? 'ad' : 'non-ad'
        };

        storage.push(data);
    } catch (err) {
        console.error(`❌ Error processing request ${request.url()}:`, err.message);
    }
};


module.exports = { onRequest, onRequestFinished };
