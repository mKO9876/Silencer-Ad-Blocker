const { URL } = require('url');
const {
    hasAdKeywords, hasTrackingParams,
    isKnownAdDomain, getResourceCategory,
    shouldSampleContent
} = require('./helper');
const { isEasyListAd } = require('./easylist');

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
        const timing = timingsMap.get(request.url()) || {};
        const now = Date.now();
        const mimeType = headers['content-type'] || 'unknown';

        const isAd = isEasyListAd(request.url(), domainRules, urlPatternRules) ||
            isKnownAdDomain(urlObj.hostname) ||
            hasAdKeywords(urlObj.hostname + urlObj.pathname)
        hasTrackingParams(urlObj.searchParams);

        let contentSample = null;
        if (shouldSampleContent(mimeType)) {
            try {
                const text = await response.text();
                contentSample = text.slice(0, 500).replace(/\s+/g, ' ');
            } catch (e) {
                console.warn(`Could not load body for this request: ${request.url()}`);
            }
        }

        const data = {
            // timestamp: new Date().toISOString(),
            mainPageUrl: page.url(),
            url: request.url(),
            domain: urlObj.hostname,
            path: urlObj.pathname,
            queryParams: Object.fromEntries(urlObj.searchParams),
            method: request.method(),
            status: response.status(),
            mimeType,
            sizeBytes: parseInt(headers['content-length']) || 0,
            resourceType: request.resourceType(),
            isEasyListAd: isEasyListAd(request.url(), domainRules, urlPatternRules),
            resourceCategory: getResourceCategory(request.resourceType()),
            isThirdParty: !request.url().includes(new URL(page.url()).hostname),
            hasAdKeywords: hasAdKeywords(request.url()),
            hasTrackingParams: hasTrackingParams(urlObj.searchParams),
            isKnownAdDomain: isKnownAdDomain(urlObj.hostname),
            requestDurationMs: timing.start ? now - timing.start : null,
            initiatorType: timing.initiator,
            frameType: request.frame()?.parentFrame() ? 'nested' : 'top',
            headers: Object.entries(headers).reduce((acc, [key, val]) => {
                const lower = key.toLowerCase();
                if (lower.includes('ad') || lower.includes('track') || lower.includes('analytics')) {
                    acc[key] = val;
                }
                return acc;
            }, {}),
            ...(contentSample && { contentSample }),
            label: isAd ? 'ad' : 'non-ad'
        };

        storage.push(data);
    } catch (err) {
        console.error(`❌ Error processing request ${request.url()}:`, err.message);
    }
};


module.exports = { onRequest, onRequestFinished };
