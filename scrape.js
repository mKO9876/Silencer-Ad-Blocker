const puppeteer = require('puppeteer');
const fs = require('fs');
const { URL } = require('url');
const { parse } = require('json2csv');
const path = require('path');

// Import URLs from external file
const { links } = require('./urls.js');
const targetURLs = links();

// Configuration
const OUTPUT_DIR = 'data';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
const AD_KEYWORDS = ['ad', 'ads', 'banner', 'track', 'pixel', 'doubleclick', 'adservice', 'adsystem'];
const TRACKING_PARAMS = ['utm_', 'fbclid', 'gclid', 'yclid', 'msclkid'];
const KNOWN_AD_DOMAINS = [
    'doubleclick.net', 'googleads.com', 'googlesyndication.com',
    'scorecardresearch.com', 'facebook.com/tr', 'adsrvr.org',
    'adnxs.com', 'amazon-adsystem.com'
];

// Ensure directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

(async () => {
    console.log('🚀 Launching browser...');
    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1366, height: 768 },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security'
        ]
    });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setJavaScriptEnabled(true);

    // Prepare data collection
    const allData = {
        metadata: {
            startTime: new Date().toISOString(),
            userAgent: USER_AGENT,
            targetURLs: targetURLs
        },
        requests: [],
        domElements: [],
        pageStats: []
    };

    // Helper functions
    const hasAdKeywords = (url) => AD_KEYWORDS.some(kw => url.toLowerCase().includes(kw));
    const hasTrackingParams = (params) => [...params.keys()].some(k => TRACKING_PARAMS.some(tp => k.startsWith(tp)));
    const isKnownAdDomain = (domain) => KNOWN_AD_DOMAINS.some(adDomain => domain.includes(adDomain));
    const getResourceCategory = (type) => ['script', 'image', 'stylesheet', 'font', 'xhr'].includes(type) ? type : 'other';
    const shouldSampleContent = (mimeType) => mimeType && (
        mimeType.includes('text') ||
        mimeType.includes('json') ||
        mimeType.includes('javascript')
    );

    // Request tracking
    const requestTimings = new Map();

    // Set up listeners
    page.on('request', request => {
        requestTimings.set(request.url(), {
            start: Date.now(),
            initiator: request.initiator()?.type,
            resourceType: request.resourceType()
        });
    });

    page.on('requestfinished', async (request) => {
        try {
            const response = await request.response();
            if (!response) return;

            const urlObj = new URL(request.url());
            const headers = response.headers();
            const timing = requestTimings.get(request.url()) || {};
            const now = Date.now();
            const mimeType = headers['content-type'] || 'unknown';

            const data = {
                timestamp: new Date().toISOString(),
                pageUrl: page.url(),
                url: request.url(),
                domain: urlObj.hostname,
                path: urlObj.pathname,
                queryParams: Object.fromEntries(urlObj.searchParams),
                method: request.method(),
                status: response.status(),
                mimeType: mimeType,
                sizeBytes: parseInt(headers['content-length']) || 0,
                resourceType: request.resourceType(),
                resourceCategory: getResourceCategory(request.resourceType()),
                isThirdParty: !request.url().includes(new URL(page.url()).hostname),
                hasAdKeywords: hasAdKeywords(request.url()),
                hasTrackingParams: hasTrackingParams(urlObj.searchParams),
                isKnownAdDomain: isKnownAdDomain(urlObj.hostname),
                requestDurationMs: timing.start ? now - timing.start : null,
                initiatorType: timing.initiator,
                frameType: request.frame()?.parentFrame() ? 'nested' : 'top',
                headers: Object.entries(headers).reduce((acc, [key, val]) => {
                    const lowerKey = key.toLowerCase();
                    if (lowerKey.includes('ad') || lowerKey.includes('track') || lowerKey.includes('analytics')) {
                        acc[key] = val;
                    }
                    return acc;
                }, {}),
                ...(shouldSampleContent(mimeType) && {
                    contentSample: (await response.text()).slice(0, 500).replace(/\s+/g, ' ')
                })
            };

            allData.requests.push(data);
        } catch (err) {
            console.error(`Error processing request ${request.url()}:`, err.message);
        }
    });

    // Main crawling loop
    for (const url of targetURLs) {
        console.log(`🌐 Visiting ${url}`);

        try {
            const navigationStart = Date.now();
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            await autoScroll(page);
            // DOM Analysis
            const adElements = await page.evaluate((adKeywords) => {
                const results = [];
                const selectors = [
                    '[id*="ad"]', '[class*="ad"]', '[data*="ad"]',
                    'iframe', 'ins', 'div[data-google-query-id]',
                    '[id*="banner"]', '[class*="banner"]',
                    '[id*="track"]', '[class*="track"]'
                ];

                selectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 10 && rect.height > 10) {
                            const styles = window.getComputedStyle(el);
                            results.push({
                                selector,
                                textContent: el.textContent?.slice(0, 200).trim(),
                                width: rect.width,
                                height: rect.height,
                                top: rect.top,
                                left: rect.left,
                                isVisible: styles.display !== 'none' && styles.visibility !== 'hidden',
                                hasIframe: el.tagName === 'IFRAME',
                                hasAdText: new RegExp(adKeywords.join('|'), 'i').test(el.textContent),
                                computedStyles: {
                                    position: styles.position,
                                    zIndex: styles.zIndex,
                                    opacity: styles.opacity
                                }
                            });
                        }
                    });
                });
                return results;
            }, AD_KEYWORDS);

            allData.domElements.push({
                pageUrl: url,
                elements: adElements,
                loadTimeMs: Date.now() - navigationStart
            });

            // Scroll to trigger lazy-loaded ads
            await page.waitForTimeout(2000);

        } catch (err) {
            console.error(`Error visiting ${url}:`, err.message);
        }
    }

    // Save data
    allData.metadata.endTime = new Date().toISOString();
    allData.metadata.totalRequests = allData.requests.length;
    allData.metadata.totalDomElements = allData.domElements.reduce((sum, de) => sum + de.elements.length, 0);

    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'full_dataset.json'),
        JSON.stringify(allData, null, 2)
    );

    // Save simplified CSV
    const simplifiedRequests = allData.requests.map(r => ({
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

    const csv = parse(simplifiedRequests);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'requests.csv'), csv);

    console.log('✅ Data collection complete!');
    console.log(`📊 Collected ${allData.requests.length} requests and ${allData.metadata.totalDomElements} DOM elements`);
    await browser.close();

    async function autoScroll(page) {
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight - window.innerHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
    }
})();