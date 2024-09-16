const IS_LOG_ENABLED = false;

function log(...args) {
    if (IS_LOG_ENABLED) {
        console.log(...args);
    }
}

log("Loaded background.js");

chrome.contextMenus.create({
    id: "renameTabMenuItem",
    title: "Rename Tab",
    contexts: ["all"]  // "tab" didn't work
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    log("onClicked - user wants to rename the tab", info, tab);
    if (info.menuItemId === "renameTabMenuItem") {
        notifyContentScript("offerToRenameTab", tab.id);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    log("onUpdated - tab URL or title has been updated", tabId, changeInfo);
    if (changeInfo.status === "complete"  ||  changeInfo.title) {
        getStoredCustomTabTitle(tabId, (customTitle) => {
            if (customTitle && ((!changeInfo.title)  ||  customTitle !== changeInfo.title)) {
                log("Tab's title seems to have changed, and it's not the preferred one");
                notifyContentScript("displayCustomTitle", tabId, customTitle);
            }
        });
    }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    log("onTabRemoved - tab has been destroyed", tabId, removeInfo);
    // TODO - restore the page's original title
    removeStoredCustomTabTitle(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log("onMessage - received from content.js", message, sender);

    switch (message.action) {
        case "customTabTitleChosen":
            storeCustomTabTitle(message.tabId, message.title, () => {
                log("Finished storing custom title, about to tell content.js to update the page", message.tabId, message.title);
                notifyContentScript("displayCustomTitle", message.tabId, message.title);
            });
            break;
        case "customTabTitleCleared":
            removeStoredCustomTabTitle(message.tabId);
            break;
    } 
});


// Notify the content script that we know what the title should really be
function notifyContentScript(actionType, tabId, title) {
    log("Sending message to content.js with action", actionType, "for tab", tabId, "with title", title);
    chrome.tabs.sendMessage(tabId, { action: actionType, tabId: tabId, title: title }); //, function(response) {
}

//================================================
//
//  BUSINESS LOGIC
//

function localStorageKeyForTab(tabId) {
    return `tabId_${tabId}`
}

// Callback parameters are: (storedTitle).
// If no title has been stored for this tab, the `storedTitle` in the callback will be `null`.
function getStoredCustomTabTitle(tabId, callback) {
    const key = localStorageKeyForTab(tabId);
    chrome.storage.local.get([key], (result) => {
        log("Successfully retrieved data from localStorage for key", key, result);
        const storedDetails = result[key];
        let title = storedDetails ? storedDetails.title : null;
        log("Previously-stored title for this tab is:", title);
        callback(title);
    });
}

function storeCustomTabTitle(tabId, title, callback) {
    const key = localStorageKeyForTab(tabId);
    chrome.storage.local.set({ [key]: { title: title }}, () => {
        callback();
    });
}

function removeStoredCustomTabTitle(tabId) {
    const key = localStorageKeyForTab(tabId);
    chrome.storage.local.remove([key]);
}
