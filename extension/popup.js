function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const MOCK_COMPARISON = [
  { name: "Tokopedia", price: 18500000, color: "#42b549" },
  { name: "Shopee", price: 19200000, color: "#ee4d2d" },
  { name: "Bukalapak", price: 18900000, color: "#0e31e52" },
  { name: "Lazada", price: 19500000, color: "#0f146d" },
  { name: "Blibli", price: 18750000, color: "#0095da" },
];

/**
 * Safely render results using DOM manipulation instead of innerHTML
 * Prevents XSS attacks from malicious page titles
 */
function renderResults(productName) {
  const sorted = [...MOCK_COMPARISON].sort((a, b) => a.price - b.price);
  const lowest = sorted[0].price;
  
  const appEl = document.getElementById("app");
  
  // Clear previous content safely
  while (appEl.firstChild) {
    appEl.removeChild(appEl.firstChild);
  }

  // Create price info section
  const priceInfoDiv = document.createElement("div");
  priceInfoDiv.className = "price-info";
  
  const priceLabelDiv = document.createElement("div");
  priceLabelDiv.className = "price-label";
  priceLabelDiv.textContent = "Harga Terendah";
  
  const priceValueDiv = document.createElement("div");
  priceValueDiv.className = "price-value";
  priceValueDiv.textContent = formatRupiah(lowest);
  
  priceInfoDiv.appendChild(priceLabelDiv);
  priceInfoDiv.appendChild(priceValueDiv);
  appEl.appendChild(priceInfoDiv);

  // Create marketplace list
  const marketplaceContainer = document.createElement("div");
  
  sorted.forEach((mp) => {
    const mpDiv = document.createElement("div");
    mpDiv.className = "marketplace";
    
    const nameSpan = document.createElement("span");
    nameSpan.className = "mp-name";
    nameSpan.style.color = mp.color;
    nameSpan.textContent = mp.name; // Safe: textContent, not innerHTML
    
    const priceSpan = document.createElement("span");
    priceSpan.className = "mp-price" + (mp.price === lowest ? " cheapest" : "");
    priceSpan.textContent = formatRupiah(mp.price); // Safe: textContent
    
    mpDiv.appendChild(nameSpan);
    mpDiv.appendChild(priceSpan);
    marketplaceContainer.appendChild(mpDiv);
  });
  
  appEl.appendChild(marketplaceContainer);

  // Create link button
  const linkBtn = document.createElement("a");
  linkBtn.href = `https://pricehunt-indonesia.vercel.app/search?q=${encodeURIComponent(productName)}`;
  linkBtn.target = "_blank";
  linkBtn.className = "btn";
  linkBtn.textContent = "Lihat di PriceHunt →"; // Safe: textContent
  
  appEl.appendChild(linkBtn);
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.title) {
      // Sanitize product name: remove potentially malicious content
      const productName = tab.title.split(/[-|]/)[0].trim()
        .replace(/[<>'"]/g, ""); // Remove HTML special characters
      setTimeout(() => renderResults(productName), 800);
    } else {
      renderResults("Produk");
    }
  });

  if (!chrome.tabs) {
    setTimeout(() => renderResults("Samsung Galaxy S24 Ultra"), 800);
  }
});
