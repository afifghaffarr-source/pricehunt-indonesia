/**
 * BijakBeli Side Panel — full UI with stats, history, marketplace breakdown
 */

function formatRupiah(amount) {
  if (!amount) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function sendMessage(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...payload }, (resp) => {
      void chrome.runtime.lastError;
      resolve(resp || {});
    });
  });
}

function el(tag, attrs = {}, text = null) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "style") e.style.cssText = v;
    else if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  if (text !== null) e.textContent = text;
  return e;
}

async function renderMain() {
  const app = document.getElementById("app");
  while (app.firstChild) app.removeChild(app.firstChild);

  const { ingestionSecret } = await chrome.storage.local.get("ingestionSecret");
  if (!ingestionSecret) {
    renderSetup();
    return;
  }

  const { stats = { totalSubmitted: 0, lastSubmissionAt: null, byMarketplace: {} }, recentHistory = [] } =
    await sendMessage("BIJAKBELI_GET_STATS");

  // Instructions banner if no submissions yet
  if (stats.totalSubmitted === 0) {
    const instr = el("div", { class: "instructions" });
    instr.appendChild(el("strong", null, "Cara Pakai:"));
    const ol = el("ol", { style: "padding-left:18px;margin:0" });
    ol.appendChild(el("li", null, "Buka halaman produk di Shopee/Tokopedia/Lazada/Blibli"));
    ol.appendChild(el("li", null, "Extension otomatis scrape dan kirim ke BijakBeli"));
    ol.appendChild(el("li", null, "Lihat hasilnya di history di bawah"));
    instr.appendChild(ol);
    app.appendChild(instr);
  }

  // Stats grid
  const grid = el("div", { class: "stat-grid" });
  const totalCard = el("div", { class: "stat-card" });
  totalCard.appendChild(el("div", { class: "stat-label" }, "Total Dikirim"));
  totalCard.appendChild(el("div", { class: "stat-value" }, String(stats.totalSubmitted)));
  totalCard.appendChild(el("div", { class: "stat-sublabel" }, "produk"));
  grid.appendChild(totalCard);

  const lastCard = el("div", { class: "stat-card" });
  lastCard.appendChild(el("div", { class: "stat-label" }, "Kirim Terakhir"));
  const lastVal = stats.lastSubmissionAt
    ? new Date(stats.lastSubmissionAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
    : "—";
  lastCard.appendChild(el("div", { class: "stat-value", style: "font-size:13px" }, lastVal));
  lastCard.appendChild(el("div", { class: "stat-sublabel" }, stats.lastSubmissionAt ? "" : "belum ada"));
  grid.appendChild(lastCard);
  app.appendChild(grid);

  // Marketplace breakdown
  const mpSection = el("div", { class: "section" });
  mpSection.appendChild(el("div", { class: "section-title" }, "📊 Per Marketplace"));
  if (Object.keys(stats.byMarketplace || {}).length === 0) {
    mpSection.appendChild(
      el("div", { style: "color:#9ca3af;font-size:11px;font-style:italic" }, "Belum ada data")
    );
  } else {
    for (const [mp, count] of Object.entries(stats.byMarketplace)) {
      const row = el(
        "div",
        {
          style:
            "display:flex;justify-content:space-between;padding:6px 10px;background:#f9fafb;border-radius:4px;margin-bottom:4px;font-size:12px",
        }
      );
      row.appendChild(el("span", { style: "font-weight:500" }, mp));
      row.appendChild(el("span", { style: "color:#6b7280" }, `${count} produk`));
      mpSection.appendChild(row);
    }
  }
  app.appendChild(mpSection);

  // Actions
  const actions = el("div", { class: "section" });
  actions.appendChild(el("div", { class: "section-title" }, "⚡ Aksi"));

  const scrapeBtn = el("button", { class: "btn" }, "🔄 Scrape Halaman Ini Sekarang");
  scrapeBtn.onclick = async () => {
    scrapeBtn.disabled = true;
    scrapeBtn.textContent = "⏳ Mengirim...";
    const result = await sendMessage("BIJAKBELI_MANUAL_SCRAPE");
    scrapeBtn.disabled = false;
    scrapeBtn.textContent = "🔄 Scrape Halaman Ini Sekarang";
    if (result.error) {
      alert(`Gagal: ${result.error}`);
    } else if (result.accepted > 0) {
      alert(`✓ ${result.accepted} produk terkirim${result.failed ? ` (${result.failed} gagal)` : ""}`);
      renderMain();
    } else if (result.deduplicated) {
      alert(`⏭ ${result.deduplicated} produk sudah pernah dikirim dalam 1 jam terakhir`);
    } else {
      alert("Tidak ada produk terdeteksi di halaman ini");
    }
  };
  actions.appendChild(scrapeBtn);

  const dashboardBtn = el("a", {
    href: "https://www.bijakbeli.web.id/extension",
    target: "_blank",
    class: "btn btn-secondary",
    style: "margin-top:8px;text-decoration:none;display:block",
  }, "📈 Dashboard BijakBeli");
  actions.appendChild(dashboardBtn);

  const resetBtn = el("button", {
    class: "btn btn-secondary",
    style: "margin-top:8px;font-size:11px;padding:6px",
  }, "🗑 Reset History & Settings");
  resetBtn.onclick = async () => {
    if (!confirm("Yakin hapus semua history? Data submission di BijakBeli tetap tersimpan.")) return;
    await sendMessage("BIJAKBELI_CLEAR_HISTORY");
    renderMain();
  };
  actions.appendChild(resetBtn);

  app.appendChild(actions);

  // History
  const histSection = el("div", { class: "section" });
  histSection.appendChild(el("div", { class: "section-title" }, "📜 Riwayat Terkirim"));
  if (recentHistory.length === 0) {
    histSection.appendChild(
      el("div", { class: "empty-state" },
        "Belum ada submission. Buka halaman produk marketplace untuk mulai."
      )
    );
  } else {
    recentHistory.slice(0, 20).forEach((h) => {
      const item = el("div", { class: "history-item" });
      const meta = el("div", { class: "history-meta" });
      meta.appendChild(el("div", { class: "history-title" },
        h.title?.substring(0, 60) || "(no title)"));
      const detail = el("div", { class: "history-detail" });
      detail.appendChild(el("span", null, `${h.marketplace} • ${formatRupiah(h.price)}`));
      if (h.confidence) {
        detail.appendChild(el("span", { style: "margin-left:8px" }, `conf: ${Math.round(h.confidence)}`));
      }
      meta.appendChild(detail);
      item.appendChild(meta);

      const badge = el("span", {
        class: `history-badge ${h.success ? "badge-success" : "badge-failed"}`,
      }, h.success ? "✓" : "✗");
      item.appendChild(badge);
      histSection.appendChild(item);
    });
  }
  app.appendChild(histSection);
}

function renderSetup() {
  const app = document.getElementById("app");
  while (app.firstChild) app.removeChild(app.firstChild);

  app.appendChild(
    el("h2", { style: "font-size:16px;margin-bottom:8px" }, "Setup BijakBeli Extension")
  );
  app.appendChild(
    el(
      "p",
      { style: "color:#6b7280;margin-bottom:16px;font-size:12px" },
      "Masukkan INGESTION_SECRET untuk mulai mengirim data scraping ke BijakBeli. Dapatkan di dashboard."
    )
  );

  const input = el("input", {
    type: "password",
    placeholder: "INGESTION_SECRET",
    style:
      "width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;margin-bottom:12px;box-sizing:border-box",
  });
  app.appendChild(input);

  const submitBtn = el(
    "button",
    { class: "btn btn-success" },
    "Simpan & Mulai"
  );
  submitBtn.onclick = async () => {
    if (!input.value) {
      alert("INGESTION_SECRET tidak boleh kosong");
      return;
    }
    await sendMessage("BIJAKBELI_SET_SECRET", { secret: input.value });
    renderMain();
  };
  app.appendChild(submitBtn);

  const helpLink = el(
    "a",
    {
      href: "https://www.bijakbeli.web.id/extension/setup",
      target: "_blank",
      style: "display:block;margin-top:12px;text-align:center;color:#3b82f6;font-size:12px",
    },
    "Cara mendapatkan INGESTION_SECRET →"
  );
  app.appendChild(helpLink);
}

document.addEventListener("DOMContentLoaded", renderMain);
