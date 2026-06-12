// BijakBeli Product Collector - Background Service Worker

console.log('🚀 BijakBeli Extension background service worker started');

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHOW_NOTIFICATION') {
    showNotification(message.title, message.message);
  }
});

// Show browser notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 2
  });
}

// Badge counter for successful collections
chrome.storage.local.get(['history'], (result) => {
  const count = (result.history || []).length;
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
  }
});

// Update badge when history changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.history) {
    const count = (changes.history.newValue || []).length;
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
  }
});
