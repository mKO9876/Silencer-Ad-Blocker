const AD_KEYWORDS_REGEX = /\b(ad|ads|banner|doubleclick|adservice|adsystem|adclick|oglas|reklama|sponzorirano|sponzor|promocija|adserver|plaćeni\soglas|marketinški\ssadržaj|advertorial|banners|promo|advertisement|click|clicks|clk|impression|impr|tracking|track|trk|tr|redirect|redir|serve|delivery|delivery_ads|sponsored|affiliate|aff|promo|promotion|campaign|analytics|pixel|tag|stats|media|content_ads|googlesyndication)\b/gi;

const KNOWN_AD_DOMAINS = [
    'doubleclick.net', 'googleads.com', 'googlesyndication.com',
    'adsrvr.org', 'adnxs.com', 'amazon-adsystem.com',
    'advertising.com', 'adform.net', 'adtech.com',
    'criteo.com', 'taboola.com', 'outbrain.com',
    'revcontent.com', 'zemanta.com', 'quantserve.com',
    "googleadservices.com", "adsafeprotected.com",
    "adroll.com", "rubiconproject.com", "openx.net",
    "facebook.com", "yieldlab.net", "pubmatic.com",
    "criteo.net"
];

const SPONSORED_KEY_WORDS = [
    "sponsored", "promo", "advertisement", "paid", "partner", "brought",
    "collaboration", "brandvoice", "presented", "powered",
    "brand", "oglas", "sponzor"
]

const hasAdKeywords = (url) => {
    return typeof url === 'string' && AD_KEYWORDS_REGEX.test(url);
};

function isSponsoredUrl(url) {
    const cleanUrl = url.toLowerCase();
    return SPONSORED_KEY_WORDS.some(kw => cleanUrl.includes(kw.toLowerCase()));
}

const isKnownAdDomain = (domain) => KNOWN_AD_DOMAINS.some(adDomain => domain.includes(adDomain));

module.exports = {
    hasAdKeywords,
    isKnownAdDomain,
    isSponsoredUrl
};