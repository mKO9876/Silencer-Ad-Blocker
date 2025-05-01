import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabase = createClient(
    'https://odicgtgtdifwktvmuiig.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaWNndGd0ZGlmd2t0dm11aWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NzM2MTgsImV4cCI6MjA2MTM0OTYxOH0.C9Rgx5KyCAelDjvC1e124I24Kv-E3ZrBX7wIIoIAs_4'
);

chrome.webRequest.onCompleted.addListener(
    async (details) => {
        if (!isAdRequest(details.url)) return;

        const requestData = await extractRequestData(details);
        await saveToSupabase(requestData);
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders", "extraHeaders"]
);

async function extractRequestData(details) {
    const url = new URL(details.url);

    return {
        url: details.url,
        domain: url.hostname,
        path: url.pathname,
        queryParams: Object.fromEntries(url.searchParams.entries()),
        status: details.statusCode,
        mimeType: getMimeType(details),
        sizeBytes: getResponseSize(details),
        resourceType: details.type,
        resourceCategory: categorizeResource(details.type),
        headers: JSON.stringify(details.responseHeaders),
        contentSample: await getContentSample(details)
    };
}

async function getContentSample(details) {
    try {
        const response = await fetch(details.url);
        if (!shouldSampleContent(response.headers.get('content-type'))) return null;

        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        return decoder.decode(buffer.slice(0, 500));
    } catch (e) {
        return null;
    }
}

function getResponseSize(details) {
    const contentLength = details.responseHeaders?.find(
        h => h.name.toLowerCase() === 'content-length'
    )?.value;
    return contentLength ? parseInt(contentLength) : null;
}

async function processAndSaveRequest(details) {
    const rawData = await extractRequestData(details);
    const labeledData = {
        ...rawData,
        label: classifyRequest(rawData) // Add classification
    };

    await saveToSupabase(labeledData);
}

chrome.webRequest.onCompleted.addListener(
    processAndSaveRequest,
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);

// Save to Supabase
async function saveToSupabase(data) {
    const { error } = await supabase
        .from('url_data')
        .insert(data);

    if (error) console.error('Supabase error:', error);
}