import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabase = createClient(
    'https://odicgtgtdifwktvmuiig.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaWNndGd0ZGlmd2t0dm11aWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NzM2MTgsImV4cCI6MjA2MTM0OTYxOH0.C9Rgx5KyCAelDjvC1e124I24Kv-E3ZrBX7wIIoIAs_4'
);

import { extractRequestData } from './helper.js';
import { classifyData } from './context.js';

const requestQueue = [];
let isProcessing = false;

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
        const requestData = await extractRequestData(details);
        console.log("requested data: ", requestData)
        const labeledData = {
            ...requestData,
            label: classifyData(requestData)
        };

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

////////////////////////////////////////////////////////////////////////////////////////////

// chrome.runtime.onInstalled.addListener(() => {
//     chrome.contextMenus.create({
//         id: "report-incorrect-block",
//         title: "Report incorrect block",
//         contexts: ["all"],
//         documentUrlPatterns: ["http://*/*", "https://*/*"]
//     });
// });

// //report missed ad
// chrome.runtime.onInstalled.addListener(() => {
//     chrome.contextMenus.create({
//         id: "report-missed-ad",
//         title: "Report missed ad",
//         contexts: ["all"],
//         documentUrlPatterns: ["http://*/*", "https://*/*"]
//     });
// });

// chrome.contextMenus.onClicked.addListener((info, tab) => {
//     if (info.menuItemId === "report-missed-ad") {
//         console.log("info: ", info)
//         console.log("tab:", tab)
//         handleMissedAdReport(tab, info);
//     }
// });

// async function handleMissedAdReport(tab, info) {
//     try {
//         const elementInfo = await chrome.scripting.executeScript({
//             target: { tabId: tab.id },
//             func: getElementInfo,
//             args: [info]
//         });

//         console.log("element: ", element)

//         // Send to your Supabase database
//         // const { error } = await supabase.from('feedback').insert([{
//         //     type: 'false_negative',
//         //     page_url: tab.url,
//         //     element_info: elementInfo[0].result.outerHTML,
//         //     element_xpath: elementInfo[0].result.xpath,
//         //     selected_text: info.selectionText,
//         //     timestamp: new Date().toISOString()
//         // }]);

//         // if (!error) {
//         //     chrome.notifications.create({
//         //         type: 'basic',
//         //         title: 'Report Submitted',
//         //         message: 'Thank you for reporting this missed ad!',
//         //         iconUrl: 'icons/icon48.png'
//         //     });
//         // }
//     } catch (error) {
//         console.error('Error reporting missed ad:', error);
//     }
// }

// // Function to get detailed element info
// function getElementInfo(info) {
//     const element = info.frameUrl ?
//         document.evaluate(info.frameUrl, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue :
//         document.elementFromPoint(info.x, info.y);

//     function getXPath(el) {
//         if (!el) return null;
//         if (el.id) return `//*[@id="${el.id}"]`;
//         const parts = [];
//         while (el.parentNode) {
//             let idx = Array.from(el.parentNode.children).indexOf(el) + 1;
//             idx = idx > 1 ? `[${idx}]` : '';
//             parts.unshift(`${el.tagName.toLowerCase()}${idx}`);
//             el = el.parentNode;
//         }
//         return `/${parts.join('/')}`;
//     }

//     return {
//         outerHTML: element?.outerHTML || 'No element found',
//         xpath: getXPath(element)
//     };
// }