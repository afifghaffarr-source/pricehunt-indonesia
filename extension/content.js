(() => {
  function getProductInfo() {
    const hostname = window.location.hostname;

    if (hostname.includes("tokopedia")) {
      const name = document.querySelector('[data-testid="lblPDPDetailProductName"]')?.textContent || document.title;
      const price = document.querySelector('[data-testid="lblPDPDetailProductPrice"]')?.textContent || "";
      return { name, price, marketplace: "tokopedia" };
    }

    if (hostname.includes("shopee")) {
      const name = document.querySelector(".product-briefing .attKMx")?.textContent || document.title;
      const price = document.querySelector(".product-price .pqTWkA")?.textContent || "";
      return { name, price, marketplace: "shopee" };
    }

    return { name: document.title, price: "", marketplace: "unknown" };
  }

  const info = getProductInfo();
  chrome.runtime?.sendMessage({ type: "PRODUCT_DETECTED", data: info });
})();
