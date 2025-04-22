const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { parse } = require('json2csv');
const { URL } = require('url');

const targetURLs = require('./urls').links();
const { downloadEasyList } = require('./easylist');
const { onRequest, onRequestFinished } = require('./pageHandlers');
const autoScroll = require('./autoScroll');
const { saveData, saveCSV } = require('./dataSaver');

const OUTPUT_DIR = "data";
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

(async () => {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

    const { domainRules, urlPatternRules } = await downloadEasyList({ fs, https, path });
    console.log(`EasyList loaded: ${domainRules.size} domains, ${urlPatternRules.size} URL patterns`);

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1366, height: 768 },
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);

    const allData = { requests: [] };
    const requestTimings = new Map();

    page.on('request', (req) => onRequest(req, requestTimings));
    page.on('requestfinished', (req) => onRequestFinished(req, page, requestTimings, allData.requests, domainRules, urlPatternRules));

    for (const url of targetURLs) {
        console.log(`Visiting ${url}`);
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            await autoScroll(page);
        } catch (err) {
            console.error(`Failed to visit ${url}:`, err.message);
        }
    }

    await saveData(allData.requests, OUTPUT_DIR);
    await saveCSV(allData.requests, OUTPUT_DIR);

    await browser.close();
    console.log('Data collection complete!');
})();
