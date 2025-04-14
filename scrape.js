const puppeteer = require('puppeteer');
const fs = require('fs');
const { URL } = require('url');
const { parse } = require('json2csv');

(async () => {
    const urls = [
        'https://example.com',
        'https://cnn.com',
        'https://nytimes.com'
    ];

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const allData = [];

    for (const targetURL of urls) {
        console.log(`📡 Visiting: ${targetURL}`);

        const pageData = [];

        page.removeAllListeners('requestfinished'); // remove old listeners
        page.on('requestfinished', async (request) => {
            try {
                const response = await request.response();
                const urlObj = new URL(request.url());

                const data = {
                    page: targetURL,
                    url: request.url(),
                    domain: urlObj.hostname,
                    path: urlObj.pathname,
                    queryParams: urlObj.searchParams.toString(),
                    method: request.method(),
                    status: response.status(),
                    mimeType: response.headers()['content-type'] || 'unknown',
                    responseSize: parseInt(response.headers()['content-length']) || 0,
                };

                pageData.push(data);
            } catch (err) {
                console.error('Error processing request:', err.message);
            }
        });

        await page.goto(targetURL, { waitUntil: 'networkidle2' });

        allData.push(...pageData);
    }

    await browser.close();

    // Save to JSON
    fs.writeFileSync('all_http_requests.json', JSON.stringify(allData, null, 2));
    console.log('✅ Saved all_http_requests.json');

    // Save to CSV
    const csv = parse(allData);
    fs.writeFileSync('all_http_requests.csv', csv);
    console.log('✅ Saved all_http_requests.csv');
})();
