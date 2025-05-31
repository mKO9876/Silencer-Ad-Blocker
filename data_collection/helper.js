const AD_KEYWORDS = ['ad', 'ads', 'banner', 'doubleclick', 'adservice', 'adsystem', 'adclick',
    'oglas', 'reklama', 'sponzorirano', 'sponzor', 'promocija',
    'plaćeni oglas', 'marketinški sadržaj', 'advertorial', 'banner', 'promo'
];
const KNOWN_AD_DOMAINS = [
    'doubleclick.net', 'googleads.com', 'googlesyndication.com',
    'adsrvr.org', 'adnxs.com', 'amazon-adsystem.com',
    'advertising.com', 'adform.net', 'adtech.com',
    'criteo.com', 'taboola.com', 'outbrain.com',
    'revcontent.com', 'zemanta.com', 'quantserve.com'
];

const SPONSORED = [
    "sponsored", "promo", "advertisement", "paid", "partner", "brought",
    "collaboration", "brandvoice", "presented", "powered",
    "brand", "oglas", "sponzor"
]

const hasAdKeywords = (url) => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase();
    return AD_KEYWORDS.some(kw => cleanUrl.includes(kw.toLowerCase()));
};

function isSponsoredUrl(url) {
    const cleanUrl = url.toLowerCase();
    return SPONSORED.some(kw => cleanUrl.includes(kw.toLowerCase()));
}

const isKnownAdDomain = (domain) => KNOWN_AD_DOMAINS.some(adDomain => domain.includes(adDomain));
// const getResourceCategory = (type) => ['script', 'image', 'stylesheet', 'font', 'xhr'].includes(type) ? type : 'other';
const shouldSampleContent = (mimeType) => mimeType && (
    mimeType.includes('text') ||
    mimeType.includes('json') ||
    mimeType.includes('javascript')
);

module.exports = {
    hasAdKeywords,
    isKnownAdDomain,
    // getResourceCategory,
    shouldSampleContent,
    isSponsoredUrl
};