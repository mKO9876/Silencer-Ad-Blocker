// import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import { extractRequestData } from './helper.js';
import { SimpleXGBoost } from "./xgb.js";

// // Initialize Supabase client
// const supabase = createClient(
//     'https://odicgtgtdifwktvmuiig.supabase.co',
//     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaWNndGd0ZGlmd2t0dm11aWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NzM2MTgsImV4cCI6MjA2MTM0OTYxOH0.C9Rgx5KyCAelDjvC1e124I24Kv-E3ZrBX7wIIoIAs_4'
// );

// Global variables
let model = null;
let blockedAds = [];
const usedRuleIds = new Set(); // Set za praćenje korištenih ID-jeva
const requestQueue = [];

async function loadModel() {
    try {
        // Učitaj new_model.json kroz fetch
        const modelUrl = chrome.runtime.getURL("new_model.json");
        const response = await fetch(modelUrl);
        let modelDump = await response.text();

        // Ako je model spremljen kao JSON string, parsiraj ga
        try {
            modelDump = JSON.parse(modelDump);
        } catch (e) {
            // Ako nije JSON, koristi tekst direktno
            console.log("Model nije u JSON formatu, koristim direktno tekst");
        }

        console.log("Model dump:", modelDump);

        // Kreiraj model
        model = new SimpleXGBoost(modelDump);
        // console.log("Parsed model:", JSON.stringify(model.trees, null, 2));
    } catch (error) {
        console.error("Error loading model:", error);
        throw error;
    }
}


// Dodaj listener za učitavanje proširenja
chrome.runtime.onInstalled.addListener(async () => {
    console.log("Extension installed/updated");
    try {
        await initializeRules();
        console.log("Rules initialized successfully");

        // Pričekaj da se model učita
        while (!model) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log("Extension ready to use with loaded model");

        // Provjeri blokirane oglase
        await checkBlockedAds();
    } catch (error) {
        console.error("Error during extension initialization:", error);
    }
});

// Funkcija za dobivanje sljedećeg dostupnog ID-a pravila
async function getNextRuleId() {
    try {
        // Dohvati sva postojeća pravila
        const rules = await chrome.declarativeNetRequest.getDynamicRules();

        // Dodaj postojeće ID-jeve u Set
        rules.forEach(rule => usedRuleIds.add(rule.id));

        // Pronađi prvi slobodan ID
        let nextId = 1;
        while (usedRuleIds.has(nextId)) {
            nextId++;
        }

        // Dodaj novi ID u Set
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
        throw error; // Propagiramo grešku da znamo ako inicijalizacija nije uspjela
    }
}

loadModel()

// Funkcija za dodavanje pravila blokiranja
async function addBlockingRule(url) {
    try {
        // Pričekaj da se sva postojeća pravila učitaju
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

        // Dohvati sljedeći dostupni ID
        const currentRuleId = await getNextRuleId();

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

// Function to classify data using the model
async function classifyData(details) {
    if (!model) return 0;

    try {
        const features = await extractRequestData(details);
        // console.log("DATA: ", features)

        // Napravi predikciju
        const prediction = model.predict(features);
        // console.log("PREDIKCIJA: ", prediction)
        // Vrati 1 ako je predikcija veća od 0.5, inače 0
        return prediction > 0.5 ? 1 : 0;
    } catch (error) {
        console.error("Error classifying data:", error);
        return 0;
    }
}

// Pratimo zahtjeve i dodajemo pravila za blokiranje
chrome.webRequest.onHeadersReceived.addListener(
    async (details) => {
        console.log("Checking request:", details.url);
        const prediction = await classifyData(details);
        console.log("Prediction for", details.url, ":", prediction);

        if (prediction == 1) {
            console.log("Attempting to block:", details.url);
            const blockedAd = {
                url: details.url,
                timestamp: new Date().toISOString(),
                type: details.type,
                tabId: details.tabId
            };

            // Dodaj pravilo za blokiranje
            const success = await addBlockingRule(details.url);
            console.log("Blocking rule added:", success ? "success" : "failed");

            if (success) {
                blockedAds.push(blockedAd);
                console.log("Successfully blocked ad:", blockedAd);

                // Spremi u chrome.storage za perzistenciju
                chrome.storage.local.set({ blockedAds: blockedAds }, () => {
                    console.log("Updated blocked ads in storage, total count:", blockedAds.length);
                });
            }
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);

// Dodaj funkciju za provjeru blokiranih oglasa
async function checkBlockedAds() {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    console.log("Current blocking rules:", rules);
    console.log("Total blocked ads in memory:", blockedAds.length);

    chrome.storage.local.get(['blockedAds'], (result) => {
        console.log("Total blocked ads in storage:", (result.blockedAds || []).length);
    });
}

// Pozovi provjeru svakih 30 sekundi
setInterval(checkBlockedAds, 30000);

// Listener for popup messages
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     if (message.action === "getBlockedAds") {
//         // Dohvati blokirane oglase iz storage-a
//         chrome.storage.local.get(['blockedAds'], (result) => {
//             sendResponse({ blockedAds: result.blockedAds || [] });
//         });
//         return true; // Potrebno za asinkroni odgovor
//     }
// });

// Save to Supabase
async function saveToSupabase(data) {
    try {
        // Direct fetch without import (because we cannot import modules in service workers)
        const response = await fetch("https://odicgtgtdifwktvmuiig.supabase.co/rest/v1/url_data", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaWNndGd0ZGlmd2t0dm11aWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NzM2MTgsImV4cCI6MjA2MTM0OTYxOH0.C9Rgx5KyCAelDjvC1e124I24Kv-E3ZrBX7wIIoIAs_4",
                "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kaWNndGd0ZGlmd2t0dm11aWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NzM2MTgsImV4cCI6MjA2MTM0OTYxOH0.C9Rgx5KyCAelDjvC1e124I24Kv-E3ZrBX7wIIoIAs_4"
            },
            body: JSON.stringify([data])
        });

        if (!response.ok) {
            console.error("Supabase save error:", await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.error("Supabase save error:", error);
        return false;
    }
}
