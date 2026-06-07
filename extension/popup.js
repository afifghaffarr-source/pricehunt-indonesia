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
  { name: "Bukalapak", price: 18900000, color: "#e31e52" },
  { name: "Lazada", price: 19500000, color: "#0f146d" },
  { name: "Blibli", price: 18750000, color: "#0095da" },
];

function renderResults(productName) {
  const sorted = [...MOCK_COMPARISON].sort((a, b) => a.price - b.price);
  const lowest = sorted[0].price;

  const html = `
    <div class="price-info">
      <div class="price-label">Harga Terendah</div>
      <div class="price-value">${formatRupiah(lowest)}</div>
    </div>
    <div>
      ${sorted
        .map(
          (mp) => `
        <div class="marketplace">
          <span class="mp-name" style="color:${mp.color}">${mp.name}</span>
          <span class="mp-price ${mp.price === lowest ? "cheapest" : ""}">${formatRupiah(mp.price)}</span>
        </div>`
        )
        .join("")}
    </div>
    <a href="https://pricehunt-indonesia.vercel.app/search?q=${encodeURIComponent(productName)}" target="_blank" class="btn">
      Lihat di PriceHunt →
    </a>
  `;

  document.getElementById("app").innerHTML = html;
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.title) {
      const productName = tab.title.split(/[-|]/)[0].trim();
      setTimeout(() => renderResults(productName), 800);
    } else {
      renderResults("Produk");
    }
  });

  if (!chrome.tabs) {
    setTimeout(() => renderResults("Samsung Galaxy S24 Ultra"), 800);
  }
});
