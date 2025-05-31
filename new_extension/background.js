import { extractRequestData } from './helper.js';
import { SimpleXGBoost } from "./xgb.js";
import { saveToSupabase } from './supabase.js';

let model = null;
let blockedAds = [];
const usedRuleIds = new Set();

function isValidWebsiteUrl(url) {
    try {
        console.log("Checking URL:", url);
        const urlObj = new URL(url);
        if (urlObj.hostname === 'localhost' ||
            urlObj.hostname === '127.0.0.1' ||
            urlObj.hostname.startsWith('chrome-') ||
            urlObj.hostname === 'chrome.google.com' ||
            urlObj.hostname === 'chrome-search.local' ||
            urlObj.hostname === 'search.local' ||
            urlObj.hostname === 'newtab' ||
            !urlObj.protocol.startsWith('http')) {
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error checking URL:", error);
        return false;
    }
}

async function loadModel() {
    try {
        const modelUrl = chrome.runtime.getURL("new_model.json");
        const response = await fetch(modelUrl);
        let modelDump = await response.text();

        model = new SimpleXGBoost(modelDump);
    } catch (error) {
        console.error("Error loading model:", error);
        throw error;
    }
}


// Listener za učitavanje proširenja
chrome.runtime.onInstalled.addListener(async () => {
    console.log("Extension installed/updated");
    try {
        if (!model) {
            await loadModel();
            console.log("Model loaded successfully");
        }

        await initializeRules();
        console.log("Rules initialized successfully");

        // Provjeri blokirane oglase
        await checkBlockedAds();
    } catch (error) {
        console.error("Error during extension initialization:", error);
    }
});

// Funkcija za dobivanje sljedećeg dostupnog ID-a pravila
async function getNextRuleId() {
    try {
        const rules = await chrome.declarativeNetRequest.getDynamicRules();
        rules.forEach(rule => usedRuleIds.add(rule.id));

        let nextId = 1;
        while (usedRuleIds.has(nextId)) { nextId++ }

        usedRuleIds.add(nextId);
        return nextId;
    } catch (error) {
        console.error("Error getting next rule ID:", error);
        return 1;
    }
}

// Inicijalizacija pravila za blokiranje
async function initializeRules() {
    try {
        // Očisti Set korištenih ID-jeva
        usedRuleIds.clear();

        // Dohvati sva postojeća pravila
        const rules = await chrome.declarativeNetRequest.getDynamicRules();

        if (rules.length > 0) {
            // Pripremi sve ID-jeve za brisanje
            const ruleIds = rules.map(rule => rule.id);

            // Obriši sva pravila i pričekaj da se operacija završi
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: ruleIds
            });

            // Pričekaj malo da se pravila stvarno obrišu
            await new Promise(resolve => setTimeout(resolve, 100));

            // Provjeri jesu li se pravila stvarno obrisala
            const remainingRules = await chrome.declarativeNetRequest.getDynamicRules();
            if (remainingRules.length > 0) {
                console.warn("Some rules were not deleted:", remainingRules);
                // Pokušaj ponovno obrisati preostala pravila
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: remainingRules.map(rule => rule.id)
                });
            }
        }
    } catch (error) {
        console.error("Error initializing rules:", error);
        throw error;
    }
}

// Funkcija za dodavanje pravila blokiranja
async function addBlockingRule(url) {
    let currentRuleId = null;
    try {
        // Izvuci domenu iz URL-a
        const urlObj = new URL(url);
        const domain = urlObj.hostname;

        // Pričekaj da se sva postojeća pravila učitaju
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

        // Dohvati sljedeći dostupni ID
        currentRuleId = await getNextRuleId();

        // Provjeri postoji li već pravilo s tim ID-em
        if (existingRules.some(rule => rule.id === currentRuleId)) {
            console.warn(`Rule with ID ${currentRuleId} already exists, trying to remove it first`);
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [currentRuleId]
            });
            // Pričekaj malo da se pravilo stvarno obriše
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const rule = {
            id: currentRuleId,
            priority: 1,
            action: { type: "block" },
            condition: {
                urlFilter: url,
                resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
            }
        };

        console.log("RULE: ", rule)

        // Dodaj pravilo i pričekaj da se operacija završi
        await chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [rule]
        });

        return true;
    } catch (error) {
        console.error("Error adding blocking rule:", error);
        // Ukloni ID iz Set-a ako je došlo do greške
        usedRuleIds.delete(currentRuleId);
        return false;
    }
}

async function classifyData(details) {
    if (!model) return 0;

    try {
        const features = await extractRequestData(details);
        const prediction = model.predict(features);
        //if (prediction < 0.4) console.log("LINK: ", details, "\nFEATURES: ", features, "\n PREDICTION: ", prediction)
        return prediction > 0.5 ? 1 : 0;
    } catch (error) {
        console.error("Error classifying data:", error);
        return 0;
    }
}

// Pratimo zahtjeve i dodajemo pravila za blokiranje
chrome.webRequest.onHeadersReceived.addListener(
    async (details) => {
        const prediction = await classifyData(details);

        if (prediction == 1) {
            const blockedAd = {
                url: details.url,
                timestamp: new Date().toISOString(),
                type: details.type,
                tabId: details.tabId
            };

            const success = await addBlockingRule(details.url);

            if (success) {
                blockedAds.push(blockedAd);
                console.log("Success: ", blockedAd)
                chrome.storage.local.set({ blockedAds: blockedAds }, () => {
                });
            }
            else console.log("Didn't block: ", blockedAd)
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);

// Dodaj funkciju za provjeru blokiranih oglasa
async function checkBlockedAds() {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    // console.log("Current blocking rules:", rules);
    // console.log("Total blocked ads in memory:", blockedAds.length);

    chrome.storage.local.get(['blockedAds'], (result) => {
        //console.log("Total blocked ads in storage:", (result.blockedAds || []).length);
    });
}

// Pozovi provjeru svakih 60 sekundi
setInterval(checkBlockedAds, 60000);

// Listener za popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getBlockedAds") {
        chrome.storage.local.get(['blockedAds'], (result) => {
            sendResponse({ blockedAds: result.blockedAds || [] });
        });
        return true; // Potrebno za asinkroni odgovor
    }
});


//User feedback
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "report_fp",
        title: "Report Incorrect Block",
        contexts: ["all"]
    });

    chrome.contextMenus.create({
        id: "report_fn",
        title: "Report Missed Ad",
        contexts: ["all"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "report_fp" || info.menuItemId === "report_fn") {
        try {
            // URL elementa 
            const url = info.linkUrl || info.srcUrl || info.frameUrl;

            if (!url) {
                console.error("Nije moguće dohvatiti URL elementa");
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'logos/logo.png',
                    title: 'Greška',
                    message: 'Nije moguće dohvatiti URL elementa. Molimo pokušajte ponovno.'
                });
                return;
            }

            const label = info.menuItemId === "report_fn" ? true : false;


            // Pripremi podatke za Supabase
            const data = {
                url: url,
                label: label
            };

            // Spremi u Supabase
            const success = await saveToSupabase(data);

            if (success) {
                console.log(`Report successfully saved for ${url} with label ${label}`);
                // Prikaži notifikaciju korisniku
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'logos/logo.png',
                    title: 'Report saved',
                    message: "Thank you for reporting!"
                });
            } else {
                console.error("Error saving report");
            }
        } catch (error) {
            console.error("Error processing report:", error);
        }
    }
});
