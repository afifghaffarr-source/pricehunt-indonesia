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

  const { stats = { totalSubmitted: 0, lastSubmissionAt: null, byMarketplace: {} }, recentHistory = [], pendingCount = 0, pendingQueue = [] } =
    await sendMessage("BIJAKBELI_GET_STATS");
  const { list: watchlist = [] } = await sendMessage("BIJAKBELI_GET_WATCHLIST");

  // P3 empty-state: unified welcome for brand-new users (no data anywhere)
  if (
    (stats.totalSubmitted ?? 0) === 0 &&
    watchlist.length === 0 &&
    pendingCount === 0
  ) {
    renderNewUserWelcome(app);
    return;
  }

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

  // Pending queue (P3 sidepanel parity)
  if (pendingCount > 0) {
    const pendingSection = el("div", { class: "section" });
    pendingSection.appendChild(
      el("div", { class: "section-title", style: "color:#92400e" }, `⏳ Pending Retry: ${pendingCount}`)
    );
    pendingSection.appendChild(
      el("div", { 
        style: "background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:10px;font-size:12px" 
      }, null)
    ).appendChild(
      el("div", { style: "color:#78350f" }, "Akan di-retry otomatis setiap 5 menit (max 3x)")
    );
    
    const pendingList = pendingSection.querySelector("div div:last-child");
    pendingQueue.slice(0, 5).forEach((item) => {
      const row = el(
        "div",
        { 
          style: "padding:6px;border-bottom:1px solid #fde68a;display:flex;justify-content:space-between;gap:8px" 
        },
        null
      );
      const info = el("div", { style: "flex:1;overflow:hidden" });
      const title = item.payload?.title?.substring(0, 45) || "Unknown";
      info.appendChild(el("div", { style: "color:#451a03;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, `${title}${item.payload?.title?.length > 45 ? "..." : ""}`));
      info.appendChild(el("div", { style: "color:#92400e;font-size:10px" }, `${item.marketplace} • ${formatRupiah(item.payload?.price || 0)}`));
      row.appendChild(info);
      
      const retryBadge = el(
        "div",
        { 
          style: "background:#92400e;color:white;font-size:10px;padding:2px 6px;border-radius:3px;white-space:nowrap;font-weight:600" 
        },
        `${item.retryCount}/3`
      );
      row.appendChild(retryBadge);
      pendingList.appendChild(row);
    });
    
    // Manual retry button
    const retryBtn = el(
      "button",
      {
        class: "btn",
        style: "margin-top:10px;background:#f59e0b;color:white",
      },
      "🔄 Retry Sekarang"
    );
    retryBtn.onclick = async () => {
      retryBtn.disabled = true;
      retryBtn.textContent = "⏳ Retrying...";
      const result = await sendMessage("BIJAKBELI_FLUSH_NOW");
      if (result.succeeded > 0) {
        alert(`✓ ${result.succeeded}/${result.attempted} berhasil di-retry`);
      } else {
        alert("⏳ Tidak ada yang berhasil di-retry saat ini");
      }
      renderMain();
    };
    pendingList.appendChild(retryBtn);
    
    app.appendChild(pendingSection);
  }

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

  // Watchlist section (P5: price drop alerts)
  const watchSection = el("div", { class: "section" });
  watchSection.appendChild(
    el("div", { class: "section-title", style: "color:#92400e" }, "🎯 Pantau Harga")
  );

  // Compact add form
  const watchForm = el("div", { style: "background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:10px;font-size:12px;margin-bottom:10px" });
  const urlInput = el("input", {
    type: "text",
    placeholder: "URL produk (mis. https://shopee.co.id/...)",
    style: "width:100%;padding:6px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;margin-bottom:6px;box-sizing:border-box",
  });
  const priceInput = el("input", {
    type: "number",
    placeholder: "Target harga (IDR)",
    style: "width:100%;padding:6px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;margin-bottom:6px;box-sizing:border-box",
  });
  const addBtn = el(
    "button",
    {
      style: "width:100%;background:#f59e0b;color:white;padding:6px;border:none;border-radius:4px;font-weight:600;cursor:pointer;font-size:11px",
    },
    "+ Tambah Watch"
  );
  addBtn.onclick = async () => {
    const url = urlInput.value.trim();
    const target = parseInt(priceInput.value, 10);
    if (!url || !target) {
      alert("URL dan target harga harus diisi");
      return;
    }
    addBtn.disabled = true;
    addBtn.textContent = "⏳...";
    const result = await sendMessage("BIJAKBELI_ADD_WATCH", {
      payload: { url, targetPrice: target },
    });
    addBtn.disabled = false;
    addBtn.textContent = "+ Tambah Watch";
    if (result.ok) {
      urlInput.value = "";
      priceInput.value = "";
      renderMain();
    } else {
      alert(`Gagal: ${result.error}`);
    }
  };
  watchForm.appendChild(urlInput);
  watchForm.appendChild(priceInput);
  watchForm.appendChild(addBtn);

  // Auto-fill from active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && !urlInput.value) urlInput.value = tab.url;
  } catch (_e) { /* popup context — no active tab */ }
  watchSection.appendChild(watchForm);

  if (watchlist.length === 0) {
    watchSection.appendChild(
      el("div", { style: "color:#9ca3af;font-size:11px;font-style:italic;text-align:center;padding:8px" },
        "Belum ada watch. Tambah URL produk di atas untuk mulai pantau harga."
      )
    );
  } else {
    // Manual instant check button
    const checkBtn = el(
      "button",
      { style: "width:100%;background:#2563eb;color:white;padding:6px;border:none;border-radius:6px;font-weight:600;cursor:pointer;margin-bottom:8px;font-size:11px" },
      "🔍 Cek Sekarang (INSTANT)"
    );
    checkBtn.onclick = async () => {
      checkBtn.disabled = true;
      checkBtn.textContent = "⏳ Checking...";
      const r = await sendMessage("BIJAKBELI_CHECK_WATCHES_NOW");
      checkBtn.disabled = false;
      checkBtn.textContent = "🔍 Cek Sekarang (INSTANT)";
      alert(r.notified > 0
        ? `🎯 ${r.notified} notifikasi terkirim dari ${r.checked} watch!`
        : `✓ ${r.checked} watch dicek, tidak ada yg turun harga`
      );
      renderMain();
    };
    watchSection.appendChild(checkBtn);

    for (const item of watchlist) {
      const row = el("div", {
        style: "background:#f9fafb;border-left:3px solid #f59e0b;border-radius:4px;padding:8px;margin-bottom:6px;font-size:11px",
      });
      const titleRow = el("div", { style: "display:flex;justify-content:space-between;gap:8px;align-items:start" });
      titleRow.appendChild(
        el("span", {
          style: "flex:1;font-weight:500;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap",
          title: item.url,
        }, item.title?.substring(0, 50) || item.url.substring(0, 50))
      );
      const removeBtn = el(
        "button",
        { style: "background:#fee2e2;color:#991b1b;border:none;border-radius:3px;padding:2px 6px;font-size:10px;cursor:pointer" },
        "✗"
      );
      removeBtn.onclick = async () => {
        if (!confirm(`Hapus watch untuk ${item.title || item.url}?`)) return;
        await sendMessage("BIJAKBELI_REMOVE_WATCH", { url: item.url });
        renderMain();
      };
      titleRow.appendChild(removeBtn);
      row.appendChild(titleRow);
      row.appendChild(el("div", { style: "color:#92400e" }, `Target: Rp ${item.targetPrice.toLocaleString("id-ID")}`));
      if (item.lastSeenPrice) {
        const ratio = item.lastSeenPrice <= item.targetPrice;
        row.appendChild(el("div", { style: `color:${ratio ? "#059669" : "#6b7280"};font-weight:${ratio ? "600" : "400"}` },
          `${ratio ? "🎯 ON TARGET:" : "Last seen:"} Rp ${item.lastSeenPrice.toLocaleString("id-ID")}`));
      } else {
        row.appendChild(el("div", { style: "color:#9ca3af" }, "Belum pernah dicek"));
      }
      watchSection.appendChild(row);
    }
  }

  app.appendChild(watchSection);

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
      
      // Error message inline (P3 parity with popup)
      if (!h.success && h.message) {
        const errorMsg = el(
          "div",
          { 
            style: "margin-top:4px;color:#dc2626;font-size:10px;font-style:italic;padding-left:6px;border-left:2px solid #fca5a5" 
          },
          null
        );
        let msg = h.message;
        if (msg.length > 80) msg = msg.substring(0, 80) + "...";
        errorMsg.appendChild(el("span", null, `⚠ ${msg}`));
        meta.appendChild(errorMsg);
      }
      
      item.appendChild(meta);

      const badge = el("span", {
        class: `history-badge ${h.success ? "badge-success" : "badge-failed"}`,
      }, h.success ? "✓" : "✗");
      item.appendChild(badge);
      histSection.appendChild(item);
    });
    
    // Error summary if any (P3 parity)
    const errorCount = recentHistory.filter(h => !h.success).length;
    if (errorCount > 0) {
      const errorSummary = el(
        "div",
        { 
          style: "margin-top:12px;padding:8px;background:#fee2e2;border-radius:6px;font-size:12px;color:#991b1b;text-align:center;font-weight:500" 
        },
        `⚠️ ${errorCount} submission gagal dari ${recentHistory.length} total`
      );
      histSection.appendChild(errorSummary);
    }

    // CSV export button (P3 parity)
    const exportBtn = el(
      "button",
      {
        style:
          "display:block;width:100%;margin-top:12px;padding:8px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;font-size:12px;color:#374151;cursor:pointer;font-weight:500",
      },
      "📥 Export History (CSV)"
    );
    exportBtn.onclick = (e) => {
      e.preventDefault();
      exportHistoryCsv(recentHistory);
    };
    histSection.appendChild(exportBtn);
  }
  app.appendChild(histSection);
}

/**
 * Convert history to CSV and trigger download. Same as popup implementation.
 */
function exportHistoryCsv(history) {
  if (!history || history.length === 0) {
    alert("Tidak ada data untuk di-export");
    return;
  }

  const headers = ["Timestamp", "Marketplace", "Title", "Price (IDR)", "URL", "Status", "Confidence", "Message"];
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = history.map((h) => [
    h.submittedAt || "",
    h.marketplace || "",
    h.title || "",
    h.price || 0,
    h.url || "",
    h.success ? "Success" : "Failed",
    h.confidence ? Math.round(h.confidence) : "",
    h.message || "",
  ].map(escapeCsv).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  // UTF-8 BOM for Excel
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const date = new Date().toISOString().slice(0, 10);
  const filename = `bijakbeli-history-${date}.csv`;
  
  const a = el("a", { href: url, download: filename, style: "display:none" });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

/**
 * P3 empty-state — unified first-launch hero for brand-new users.
 * Replaces the cramped 6-section empty layout with a single clear CTA.
 */
function renderNewUserWelcome(app) {
  const hero = el("div", { style: "text-align:center;padding:36px 20px 16px" });
  hero.appendChild(el("div", { style: "font-size:48px;margin-bottom:12px" }, "🛒"));
  hero.appendChild(
    el("div", { style: "font-size:18px;font-weight:700;color:#111827;margin-bottom:6px" },
      "Selamat Datang di BijakBeli!")
  );
  hero.appendChild(
    el("div", { style: "font-size:13px;color:#6b7280;margin-bottom:24px;line-height:1.5" },
      "Buka halaman produk di Shopee, Tokopedia, Lazada, atau Blibli. " +
      "Extension otomatis scrape harga dan kirim ke dashboard komunitas.")
  );
  app.appendChild(hero);

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
      renderMain();
    } else if (result.deduplicated) {
      alert("Sudah pernah dikirim dalam 1 jam terakhir");
    } else {
      alert("Tidak ada produk di halaman ini. Buka halaman produk marketplace (Shopee/Tokopedia/Lazada/Blibli).");
    }
  };
  app.appendChild(scrapeBtn);

  const hint = el(
    "div",
    { style: "margin-top:16px;padding:10px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:12px;color:#78350f;text-align:center;line-height:1.4" },
    "💡 Tip: Setelah scrape pertama, kamu bisa tambah pantau harga di section 🎯 Pantau Harga."
  );
  app.appendChild(hint);

  const link = el("a", {
    href: "https://www.bijakbeli.web.id/extension",
    target: "_blank",
    style: "display:block;margin-top:16px;text-align:center;color:#3b82f6;font-size:12px",
  }, "📈 Lihat Dashboard BijakBeli →");
  app.appendChild(link);
}

document.addEventListener("DOMContentLoaded", renderMain);
