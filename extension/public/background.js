// Apna Box service worker: clicking the toolbar icon opens the side panel. Nothing else runs here.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
