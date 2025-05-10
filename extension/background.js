import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabase = createClient(
    'https://odicgtgtdifwktvmuiig.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaWNndGd0ZGlmd2t0dm11aWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NzM2MTgsImV4cCI6MjA2MTM0OTYxOH0.C9Rgx5KyCAelDjvC1e124I24Kv-E3ZrBX7wIIoIAs_4'
);

import { extractRequestData } from './helper.js';

const requestQueue = [];
let isProcessing = false;

//insert data into requestedQueue
chrome.webRequest.onCompleted.addListener(
    (details) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && details.tabId === tabs[0].id) {
                requestQueue.push(details);
                processQueue();
            }
        });
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);

async function processQueue() {
    if (isProcessing || requestQueue.length === 0) return;

    isProcessing = true;
    const details = requestQueue.shift();

    try {
        console.log(details)
        const requestData = await extractRequestData(details);
        // const labeledData = {
        //     ...requestData,
        //     label: classifyRequest(requestData)
        // };

        // await saveToSupabase(labeledData);
    } catch (error) {
        console.error('Error processing request:', error);
    } finally {
        // if (labeledData.label) blockContent(labeledData)
        isProcessing = false;
        processQueue();
    }
}

async function saveToSupabase(data) {
    try {
        const { error } = await supabase
            .from('url_data')
            .insert([data]);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Supabase save error:', error);
        return false;
    }
}

async function blockContent(data) {
    console.log(data)
}