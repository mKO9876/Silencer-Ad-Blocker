const AD_KEYWORDS = ['ad', 'ads', 'banner', 'track', 'pixel', 'doubleclick', 'adservice', 'adsystem'];
const TRACKING_PARAMS = ['utm_', 'fbclid', 'gclid', 'yclid', 'msclkid'];
const KNOWN_AD_DOMAINS = [
    'doubleclick.net', 'googleads.com', 'googlesyndication.com',
    'scorecardresearch.com', 'facebook.com/tr', 'adsrvr.org',
    'adnxs.com', 'amazon-adsystem.com'
];

const hasAdKeywords = (url) => AD_KEYWORDS.some(kw => url.toLowerCase().includes(kw));
const hasTrackingParams = (params) => [...params.keys()].some(k => TRACKING_PARAMS.some(tp => k.startsWith(tp)));
const isKnownAdDomain = (domain) => KNOWN_AD_DOMAINS.some(adDomain => domain.includes(adDomain));
const getResourceCategory = (type) => ['script', 'image', 'stylesheet', 'font', 'xhr'].includes(type) ? type : 'other';
const shouldSampleContent = (mimeType) => mimeType && (
    mimeType.includes('text') ||
    mimeType.includes('json') ||
    mimeType.includes('javascript')
);

module.exports = {
    hasAdKeywords,
    hasTrackingParams,
    isKnownAdDomain,
    getResourceCategory,
    shouldSampleContent
};
