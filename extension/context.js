// context.js
chrome.contextMenus.create({
    id: "myMenu",
    title: "My Context Menu",
    contexts: ["selection"]
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    console.log("ContextMenu clicked");
});