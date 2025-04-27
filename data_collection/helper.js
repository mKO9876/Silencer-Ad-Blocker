const AD_KEYWORDS = ['ad', 'ads', 'banner', 'doubleclick', 'adservice', 'adsystem'];
const KNOWN_AD_DOMAINS = [
    'doubleclick.net', 'googleads.com', 'googlesyndication.com',
    'adsrvr.org', 'adnxs.com', 'amazon-adsystem.com',
    'advertising.com', 'adform.net', 'adtech.com',
    'criteo.com', 'taboola.com', 'outbrain.com',
    'revcontent.com', 'zemanta.com', 'quantserve.com'
];

const hasAdKeywords = (url) => AD_KEYWORDS.some(kw => url.toLowerCase().includes(kw));
const isKnownAdDomain = (domain) => KNOWN_AD_DOMAINS.some(adDomain => domain.includes(adDomain));
const getResourceCategory = (type) => ['script', 'image', 'stylesheet', 'font', 'xhr'].includes(type) ? type : 'other';
const shouldSampleContent = (mimeType) => mimeType && (
    mimeType.includes('text') ||
    mimeType.includes('json') ||
    mimeType.includes('javascript')
);

module.exports = {
    hasAdKeywords,
    isKnownAdDomain,
    getResourceCategory,
    shouldSampleContent
};