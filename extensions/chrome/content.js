// BijakBeli Product Collector - Content Script
// Runs on Tokopedia, Shopee, and Bukalapak product pages

console.log('🚀 BijakBeli Collector loaded');

// Detect marketplace
const MARKETPLACE = detectMarketplace();

function detectMarketplace() {
  const hostname = window.location.hostname;
  if (hostname.includes('tokopedia.com')) return 'tokopedia';
  if (hostname.includes('shopee.co.id')) return 'shopee';
  if (hostname.includes('bukalapak.com')) return 'bukalapak';
  return null;
}

// Check if this is a product page
function isProductPage() {
  if (MARKETPLACE === 'tokopedia') {
    // Tokopedia product pages: /store-name/product-slug
    return window.location.pathname.split('/').length >= 3 && 
           !window.location.pathname.includes('/find/') &&
           !window.location.pathname.includes('/search');
  }
  if (MARKETPLACE === 'shopee') {
    // Shopee product pages: /Product-Name-i.123.456
    return window.location.pathname.match(/-i\.\d+\.\d+/);
  }
  if (MARKETPLACE === 'bukalapak') {
    // Bukalapak product pages: /p/category/product-name/id
    return window.location.pathname.startsWith('/p/');
  }
  return false;
}

// Only inject button on product pages
if (MARKETPLACE && isProductPage()) {
  injectCollectorButton();
}

function injectCollectorButton() {
  // Create floating button
  const button = document.createElement('div');
  button.id = 'bijakbeli-collector-btn';
  button.innerHTML = `
    <div class="bijakbeli-btn-content">
      <span class="bijakbeli-icon">📦</span>
      <span class="bijakbeli-text">Add to BijakBeli</span>
    </div>
  `;
  
  button.addEventListener('click', handleCollect);
  document.body.appendChild(button);
  
  console.log('✅ BijakBeli button injected');
}

async function handleCollect() {
  const button = document.getElementById('bijakbeli-collector-btn');
  
  // Show loading state
  button.classList.add('loading');
  button.innerHTML = `
    <div class="bijakbeli-btn-content">
      <span class="bijakbeli-icon">⏳</span>
      <span class="bijakbeli-text">Collecting...</span>
    </div>
  `;
  
  try {
    // Extract product data based on marketplace
    let productData;
    if (MARKETPLACE === 'tokopedia') {
      productData = await extractTokopediaData();
    } else if (MARKETPLACE === 'shopee') {
      productData = await extractShopeeData();
    } else if (MARKETPLACE === 'bukalapak') {
      productData = await extractBukalapakData();
    }
    
    if (!productData) {
      throw new Error('Failed to extract product data');
    }
    
    // Send to BijakBeli API
    await sendToAPI(productData);
    
    // Success state
    button.classList.remove('loading');
    button.classList.add('success');
    button.innerHTML = `
      <div class="bijakbeli-btn-content">
        <span class="bijakbeli-icon">✅</span>
        <span class="bijakbeli-text">Saved!</span>
      </div>
    `;
    
    // Show browser notification
    chrome.runtime.sendMessage({
      type: 'SHOW_NOTIFICATION',
      title: 'Product Added!',
      message: `${productData.name} saved to BijakBeli`
    });
    
    // Reset button after 3 seconds
    setTimeout(() => {
      button.classList.remove('success');
      button.innerHTML = `
        <div class="bijakbeli-btn-content">
          <span class="bijakbeli-icon">📦</span>
          <span class="bijakbeli-text">Add to BijakBeli</span>
        </div>
      `;
    }, 3000);
    
  } catch (error) {
    console.error('❌ Collection failed:', error);
    
    // Error state
    button.classList.remove('loading');
    button.classList.add('error');
    button.innerHTML = `
      <div class="bijakbeli-btn-content">
        <span class="bijakbeli-icon">❌</span>
        <span class="bijakbeli-text">Failed</span>
      </div>
    `;
    
    chrome.runtime.sendMessage({
      type: 'SHOW_NOTIFICATION',
      title: 'Collection Failed',
      message: error.message
    });
    
    // Reset button after 3 seconds
    setTimeout(() => {
      button.classList.remove('error');
      button.innerHTML = `
        <div class="bijakbeli-btn-content">
          <span class="bijakbeli-icon">📦</span>
          <span class="bijakbeli-text">Add to BijakBeli</span>
        </div>
      `;
    }, 3000);
  }
}

// Tokopedia data extraction
async function extractTokopediaData() {
  console.log('🔍 Extracting Tokopedia data...');
  
  // Wait for Apollo data to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Try to get data from Apollo cache (faster)
  const apolloCache = window.__APOLLO_STATE__ || window.__NEXT_DATA__;
  
  // Fallback: DOM scraping
  const name = document.querySelector('[data-testid="lblPDPDetailProductName"]')?.textContent ||
               document.querySelector('h1')?.textContent;
  
  const priceText = document.querySelector('[data-testid="lblPDPDetailProductPrice"]')?.textContent ||
                    document.querySelector('[class*="price"]')?.textContent;
  
  const price = priceText ? parseInt(priceText.replace(/\D/g, '')) : null;
  
  const imageUrl = document.querySelector('[data-testid="PDPImageMain"] img')?.src ||
                   document.querySelector('img[class*="product"]')?.src;
  
  const description = document.querySelector('[data-testid="lblPDPDescriptionProduk"]')?.textContent ||
                      document.querySelector('[class*="description"]')?.textContent;
  
  return {
    name: name?.trim(),
    price,
    url: window.location.href,
    imageUrl,
    description: description?.trim(),
    marketplace: 'tokopedia'
  };
}

// Shopee data extraction
async function extractShopeeData() {
  console.log('🔍 Extracting Shopee data...');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const name = document.querySelector('[class*="product-title"]')?.textContent ||
               document.querySelector('h1')?.textContent;
  
  const priceText = document.querySelector('[class*="product-price"]')?.textContent;
  const price = priceText ? parseInt(priceText.replace(/\D/g, '')) : null;
  
  const imageUrl = document.querySelector('[class*="product-image"] img')?.src;
  
  return {
    name: name?.trim(),
    price,
    url: window.location.href,
    imageUrl,
    marketplace: 'shopee'
  };
}

// Bukalapak data extraction
async function extractBukalapakData() {
  console.log('🔍 Extracting Bukalapak data...');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const name = document.querySelector('[class*="product-title"]')?.textContent ||
               document.querySelector('h1')?.textContent;
  
  const priceText = document.querySelector('[class*="product-price"]')?.textContent;
  const price = priceText ? parseInt(priceText.replace(/\D/g, '')) : null;
  
  const imageUrl = document.querySelector('[class*="product-image"] img')?.src;
  
  return {
    name: name?.trim(),
    price,
    url: window.location.href,
    imageUrl,
    marketplace: 'bukalapak'
  };
}

// Send data to BijakBeli API
async function sendToAPI(productData) {
  console.log('📤 Sending to BijakBeli API...', productData);
  
  // Get API config from storage
  const config = await chrome.storage.sync.get(['apiUrl', 'ingestionSecret']);
  const apiUrl = config.apiUrl || 'https://www.bijakbeli.app';
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
      marketplace: MARKETPLACE,
      product_url: productData.url,
      title: productData.name,
      price: productData.price,
      image_url: productData.image || undefined,
      source: 'chrome-extension',
      captured_at: new Date().toISOString(),
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }
  
  const result = await response.json();
  console.log('✅ API response:', result);
  
  // Save to history
  await saveToHistory(productData, result);
  
  return result;
}

// Save to local history
async function saveToHistory(productData, apiResult) {
  const history = await chrome.storage.local.get(['history']) || { history: [] };
  const historyArray = history.history || [];
  
  historyArray.unshift({
    timestamp: Date.now(),
    product: productData,
    result: apiResult,
    success: true
  });
  
  // Keep last 50 items
  if (historyArray.length > 50) {
    historyArray.pop();
  }
  
  await chrome.storage.local.set({ history: historyArray });
}
