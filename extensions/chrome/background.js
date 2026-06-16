// BijakBeli Product Collector - Background Service Worker

console.log('🚀 BijakBeli Extension background service worker started');

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHOW_NOTIFICATION') {
    showNotification(message.title, message.message);
  } else if (message.type === 'API_CALL') {
    // Handle API calls from content script (fixes CORS issue)
    handleAPICall(message.payload)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// Make API call to BijakBeli (has host_permissions, no CORS issue)
async function handleAPICall(payload) {
  console.log('📤 Background worker: Sending to BijakBeli API...', payload);
  
  // Get API config from storage
  const config = await chrome.storage.sync.get(['apiUrl', 'ingestionSecret']);
  const apiUrl = config.apiUrl || 'https://www.bijakbeli.web.id';
  const secret = config.ingestionSecret;
  
  if (!secret) {
    throw new Error('INGESTION_SECRET not configured. Please set it in extension settings.');
  }
  
  // Send to API (matches /api/ingestion/offer-snapshot schema)
  const response = await fetch(`${apiUrl}/api/ingestion/offer-snapshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secret}`,
    },
    body: JSON.stringify({
      marketplace: payload.marketplace,
      product_url: payload.product_url,
      title: payload.title,
      price: payload.price,
      image_url: payload.image_url || undefined,
      source: 'extension_snapshot',
      captured_at: new Date().toISOString(),
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }
  
  const result = await response.json();
  console.log('✅ Background worker: API response:', result);
  
  return result;
}

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

