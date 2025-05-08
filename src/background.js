// Chrome extension background script
chrome.runtime.onInstalled.addListener(() => {
  console.log('USYD Auto Login extension installed');
});

// Add listener for tab updates to inject the content script at the right time
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('https://sso.sydney.edu.au/')) {
    // We'll rely on the manifest's content_scripts to inject our script
    // This is just to help with debugging
    console.log('USYD login page detected');
  }
}); 