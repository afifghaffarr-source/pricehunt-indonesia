function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const PRICEHUNT_API = "https://pricehunt-indonesia.vercel.app/api/search";

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
  linkBtn.href = `https://pricehunt-indonesia.vercel.app/search?q=${encodeURIComponent(productName || "")}`;
  linkBtn.target = "_blank";
  linkBtn.className = "btn";
  linkBtn.textContent = "Cari manual di PriceHunt";
  appEl.appendChild(linkBtn);
}

async function fetchPriceHuntResults(productName) {
  const response = await fetch(`${PRICEHUNT_API}?q=${encodeURIComponent(productName)}&vexo=false&limit=5`);
  if (!response.ok) {
    throw new Error("API PriceHunt belum tersedia");
  }
  return response.json();
}

function renderResults(productName, products) {
  const appEl = clearApp();

  if (!products.length) {
    renderMessage("Produk belum ditemukan", "Coba buka PriceHunt untuk mencari dengan kata kunci yang lebih pendek.", productName);
    return;
  }

  const best = products[0];
  const lowest = best.lowest_price || best.lowestPrice || 0;

  const priceInfoDiv = document.createElement("div");
  priceInfoDiv.className = "price-info";
  
  const priceLabelDiv = document.createElement("div");
  priceLabelDiv.className = "price-label";
  priceLabelDiv.textContent = "Harga terendah di PriceHunt";
  
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
    nameSpan.textContent = product.name || "Produk PriceHunt";

    const priceSpan = document.createElement("span");
    const productPrice = product.lowest_price || product.lowestPrice || 0;
    priceSpan.className = "mp-price" + (productPrice === lowest ? " cheapest" : "");
    priceSpan.textContent = productPrice ? formatRupiah(productPrice) : "Cek harga";

    mpDiv.appendChild(nameSpan);
    mpDiv.appendChild(priceSpan);
    marketplaceContainer.appendChild(mpDiv);
  });
  
  appEl.appendChild(marketplaceContainer);

  const linkBtn = document.createElement("a");
  linkBtn.href = `https://pricehunt-indonesia.vercel.app/search?q=${encodeURIComponent(productName)}`;
  linkBtn.target = "_blank";
  linkBtn.className = "btn";
  linkBtn.textContent = "Lihat rekomendasi beli/tunggu";
  
  appEl.appendChild(linkBtn);
}

document.addEventListener("DOMContentLoaded", () => {
  renderMessage("Membaca halaman produk", "PriceHunt sedang mencocokkan produk ini dengan database harga.", "");

  chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.title) {
      // Sanitize product name: remove potentially malicious content
      const productName = tab.title.split(/[-|]/)[0].trim()
        .replace(/[<>'"]/g, ""); // Remove HTML special characters
      fetchPriceHuntResults(productName)
        .then((data) => renderResults(productName, data.results || []))
        .catch(() => renderMessage("API belum bisa dihubungi", "Buka PriceHunt untuk membandingkan harga secara manual.", productName));
    } else {
      renderMessage("Tidak bisa membaca halaman", "Pastikan Anda sedang membuka halaman produk marketplace.", "Produk");
    }
  });

  if (!chrome.tabs) {
    renderMessage("Mode preview", "Extension siap mencari produk lewat API PriceHunt saat dipasang di browser.", "Produk");
  }
});
