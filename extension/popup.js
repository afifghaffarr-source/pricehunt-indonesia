function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const BIJAKBELI_API = "https://www.bijakbeli.app/api/search";
const BUY_OR_WAIT_API = "https://www.bijakbeli.app/api/recommendation/buy-or-wait";
const FAKE_DISCOUNT_API = "https://www.bijakbeli.app/api/recommendation/fake-discount";

/**
 * Safely render results using DOM manipulation instead of innerHTML
 * Prevents XSS attacks from malicious page titles
 */
function clearApp() {
  const appEl = document.getElementById("app");
  while (appEl.firstChild) {
    appEl.removeChild(appEl.firstChild);
  }
  return appEl;
}

function renderMessage(title, message, productName) {
  const appEl = clearApp();

  const titleEl = document.createElement("h3");
  titleEl.textContent = title;
  appEl.appendChild(titleEl);

  const messageEl = document.createElement("p");
  messageEl.textContent = message;
  appEl.appendChild(messageEl);

  const linkBtn = document.createElement("a");
  linkBtn.href = `https://bijakbeli-app.vercel.app/search?q=${encodeURIComponent(productName || "")}`;
  linkBtn.target = "_blank";
  linkBtn.className = "btn";
  linkBtn.textContent = "Cari manual di BijakBeli";
  appEl.appendChild(linkBtn);
}

async function fetchBijakBeliResults(productName) {
  const response = await fetch(`${BIJAKBELI_API}?q=${encodeURIComponent(productName)}&vexo=false&limit=5`);
  if (!response.ok) {
    throw new Error("API BijakBeli belum tersedia");
  }
  return response.json();
}

async function fetchBuyOrWaitRecommendation(productSlug) {
  try {
    const response = await fetch(`${BUY_OR_WAIT_API}?slug=${encodeURIComponent(productSlug)}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function fetchFakeDiscountDetection(productSlug) {
  try {
    const response = await fetch(`${FAKE_DISCOUNT_API}?slug=${encodeURIComponent(productSlug)}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function renderResults(productName, products) {
  const appEl = clearApp();

  if (!products.length) {
    renderMessage("Produk belum ditemukan", "Coba buka BijakBeli untuk mencari dengan kata kunci yang lebih pendek.", productName);
    return;
  }

  const best = products[0];
  const lowest = best.lowest_price || best.lowestPrice || 0;
  const productSlug = best.slug;

  // Fetch buy/wait recommendation and fake discount detection
  let recommendation = null;
  let fakeDiscountData = null;
  
  if (productSlug) {
    [recommendation, fakeDiscountData] = await Promise.all([
      fetchBuyOrWaitRecommendation(productSlug),
      fetchFakeDiscountDetection(productSlug)
    ]);
  }

  // Render recommendation if available
  if (recommendation) {
    const recoDiv = document.createElement("div");
    recoDiv.className = "recommendation";
    recoDiv.style.cssText = "background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 12px; margin-bottom: 12px;";

    const recoIcon = document.createElement("div");
    recoIcon.style.cssText = "font-size: 24px; margin-bottom: 4px;";
    
    const recoTitle = document.createElement("div");
    recoTitle.style.cssText = "font-size: 13px; font-weight: 700; color: #1e40af; margin-bottom: 4px;";
    
    const recoDesc = document.createElement("div");
    recoDesc.style.cssText = "font-size: 11px; color: #6b7280;";

    if (recommendation.recommendation === "buy_now") {
      recoIcon.textContent = "✅";
      recoTitle.textContent = "Beli Sekarang";
      recoDesc.textContent = recommendation.reasons?.[0] || "Harga bagus untuk beli sekarang";
      recoDiv.style.background = "#f0fdf4";
      recoDiv.style.borderColor = "#22c55e";
      recoTitle.style.color = "#166534";
    } else if (recommendation.recommendation === "wait") {
      recoIcon.textContent = "⏳";
      recoTitle.textContent = "Tunggu Dulu";
      recoDesc.textContent = recommendation.reasons?.[0] || "Harga mungkin bisa lebih turun";
      recoDiv.style.background = "#fef3c7";
      recoDiv.style.borderColor = "#f59e0b";
      recoTitle.style.color = "#92400e";
    } else if (recommendation.recommendation === "watch") {
      recoIcon.textContent = "👀";
      recoTitle.textContent = "Pantau Harga";
      recoDesc.textContent = recommendation.reasons?.[0] || "Pantau dulu perkembangan harga";
      recoDiv.style.background = "#f3f4f6";
      recoDiv.style.borderColor = "#6b7280";
      recoTitle.style.color = "#374151";
    }

    recoDiv.appendChild(recoIcon);
    recoDiv.appendChild(recoTitle);
    recoDiv.appendChild(recoDesc);
    appEl.appendChild(recoDiv);
  }

  // Render fake discount warning if suspicious
  if (fakeDiscountData && fakeDiscountData.status === "suspicious") {
    const warningDiv = document.createElement("div");
    warningDiv.className = "fake-discount-warning";
    warningDiv.style.cssText = "background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; padding: 12px; margin-bottom: 12px;";

    const warningIcon = document.createElement("div");
    warningIcon.style.cssText = "font-size: 24px; margin-bottom: 4px;";
    warningIcon.textContent = "⚠️";
    
    const warningTitle = document.createElement("div");
    warningTitle.style.cssText = "font-size: 13px; font-weight: 700; color: #991b1b; margin-bottom: 4px;";
    warningTitle.textContent = "Diskon Mencurigakan";
    
    const warningDesc = document.createElement("div");
    warningDesc.style.cssText = "font-size: 11px; color: #6b7280;";
    warningDesc.textContent = fakeDiscountData.explanation || "Diskon ini terindikasi tidak asli berdasarkan riwayat harga";

    warningDiv.appendChild(warningIcon);
    warningDiv.appendChild(warningTitle);
    warningDiv.appendChild(warningDesc);
    appEl.appendChild(warningDiv);
  }

  const priceInfoDiv = document.createElement("div");
  priceInfoDiv.className = "price-info";
  
  const priceLabelDiv = document.createElement("div");
  priceLabelDiv.className = "price-label";
  priceLabelDiv.textContent = "Harga terendah di BijakBeli";
  
  const priceValueDiv = document.createElement("div");
  priceValueDiv.className = "price-value";
  priceValueDiv.textContent = formatRupiah(lowest);
  
  priceInfoDiv.appendChild(priceLabelDiv);
  priceInfoDiv.appendChild(priceValueDiv);
  appEl.appendChild(priceInfoDiv);

  const marketplaceContainer = document.createElement("div");
  products.forEach((product) => {
    const mpDiv = document.createElement("div");
    mpDiv.className = "marketplace";

    const nameSpan = document.createElement("span");
    nameSpan.className = "mp-name";
    nameSpan.textContent = product.name || "Produk BijakBeli";

    const priceSpan = document.createElement("span");
    const productPrice = product.lowest_price || product.lowestPrice || 0;
    priceSpan.className = "mp-price" + (productPrice === lowest ? " cheapest" : "");
    priceSpan.textContent = productPrice ? formatRupiah(productPrice) : "Cek harga";

    mpDiv.appendChild(nameSpan);
    mpDiv.appendChild(priceSpan);
    marketplaceContainer.appendChild(mpDiv);
  });
  
  appEl.appendChild(marketplaceContainer);

  // Action buttons container
  const actionButtonsDiv = document.createElement("div");
  actionButtonsDiv.style.cssText = "display: flex; gap: 8px; margin-top: 12px;";

  // Wishlist button
  const wishlistBtn = document.createElement("a");
  wishlistBtn.href = productSlug 
    ? `https://bijakbeli-app.vercel.app/product/${productSlug}#wishlist`
    : `https://bijakbeli-app.vercel.app/search?q=${encodeURIComponent(productName)}`;
  wishlistBtn.target = "_blank";
  wishlistBtn.style.cssText = "flex: 1; background: #10b981; color: white; padding: 10px; text-align: center; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 600; cursor: pointer;";
  wishlistBtn.textContent = "💚 Wishlist";
  wishlistBtn.title = "Simpan ke wishlist di BijakBeli";

  // Price history button
  const historyBtn = document.createElement("a");
  historyBtn.href = productSlug 
    ? `https://bijakbeli-app.vercel.app/product/${productSlug}#history`
    : `https://bijakbeli-app.vercel.app/search?q=${encodeURIComponent(productName)}`;
  historyBtn.target = "_blank";
  historyBtn.style.cssText = "flex: 1; background: #6366f1; color: white; padding: 10px; text-align: center; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 600; cursor: pointer;";
  historyBtn.textContent = "📊 Riwayat";
  historyBtn.title = "Lihat riwayat harga produk";

  actionButtonsDiv.appendChild(wishlistBtn);
  actionButtonsDiv.appendChild(historyBtn);
  appEl.appendChild(actionButtonsDiv);

  // Main detail link
  const linkBtn = document.createElement("a");
  linkBtn.href = productSlug
    ? `https://bijakbeli-app.vercel.app/product/${productSlug}`
    : `https://bijakbeli-app.vercel.app/search?q=${encodeURIComponent(productName)}`;
  linkBtn.target = "_blank";
  linkBtn.className = "btn";
  linkBtn.textContent = "Lihat detail lengkap di BijakBeli";
  
  appEl.appendChild(linkBtn);
}

document.addEventListener("DOMContentLoaded", () => {
  renderMessage("Membaca halaman produk", "BijakBeli sedang mencocokkan produk ini dengan database harga.", "");

  chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.title) {
      // Sanitize product name: remove potentially malicious content
      const productName = tab.title.split(/[-|]/)[0].trim()
        .replace(/[<>'"]/g, ""); // Remove HTML special characters
      fetchBijakBeliResults(productName)
        .then((data) => renderResults(productName, data.results || []))
        .catch(() => renderMessage("API belum bisa dihubungi", "Buka BijakBeli untuk membandingkan harga secara manual.", productName));
    } else {
      renderMessage("Tidak bisa membaca halaman", "Pastikan Anda sedang membuka halaman produk marketplace.", "Produk");
    }
  });

  if (!chrome.tabs) {
    renderMessage("Mode preview", "Extension siap mencari produk lewat API BijakBeli saat dipasang di browser.", "Produk");
  }
});
