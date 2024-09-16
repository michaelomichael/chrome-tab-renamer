const IS_LOG_ENABLED = false;

function log(...args) {
    if (IS_LOG_ENABLED) {
        console.log(...args);
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log("onMessage - received from background.js", message);

    switch (message.action) {
        case "offerToRenameTab":
            promptForNewTitle(message.tabId);
            break;
        case "displayCustomTitle":
            document.title = message.title;
            break;
    }
});

function storeCustomTabTitle(tabId, newTitle) {
    chrome.runtime.sendMessage({
        action: "customTabTitleChosen",
        tabId: tabId,
        title: newTitle,
    });

    // We'll receive back a notification telling us to amend the title on the current document.
}

function clearCustomTabTitle(tabId) {
    chrome.runtime.sendMessage({
        action: "customTabTitleCleared",
        tabId: tabId
    });
}

function promptForNewTitle(tabId) {
    const answer = prompt("New tab title:");

    if (answer !== null) {
        if (answer !== "") {
            storeCustomTabTitle(tabId, answer);
        } else {
            clearCustomTabTitle(tabId);
        }
    }
}
