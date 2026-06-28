/**
 * BijakBeli Popup v2 — quick actions + stats
 */

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function clearApp() {
  const appEl = document.getElementById("app");
  while (appEl.firstChild) appEl.removeChild(appEl.firstChild);
  return appEl;
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

function renderSetup() {
  const app = clearApp();
  app.appendChild(
    el("h3", { style: "font-size:14px;margin:0 0 8px 0" }, "Setup Extension")
  );
  app.appendChild(
    el(
      "p",
      { style: "font-size:11px;color:#6b7280;margin:0 0 12px 0" },
      "Masukkan INGESTION_SECRET untuk mulai mengirim data scraping ke BijakBeli."
    )
  );

  const input = el("input", {
    type: "password",
    placeholder: "INGESTION_SECRET",
    style:
      "width:100%;padding:8px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;box-sizing:border-box",
  });
  app.appendChild(input);

  const submitBtn = el(
    "button",
    {
      style:
        "margin-top:8px;width:100%;background:#10b981;color:white;padding:10px;border:none;border-radius:4px;font-weight:600;cursor:pointer",
    },
    "Simpan"
  );
  submitBtn.onclick = async () => {
    if (!input.value) return;
    await sendMessage("BIJAKBELI_SET_SECRET", { secret: input.value });
    renderMain();
  };
  app.appendChild(submitBtn);

  const helpLink = el(
    "a",
    {
      href: "https://www.bijakbeli.web.id/extension/setup",
      target: "_blank",
      style:
        "display:block;margin-top:8px;font-size:11px;color:#3b82f6;text-align:center;text-decoration:none",
    },
    "Dapatkan INGESTION_SECRET →"
  );
  app.appendChild(helpLink);
}

async function renderMain() {
  const { stats, recentHistory, pendingCount, pendingQueue } = await sendMessage("BIJAKBELI_GET_STATS");
  const app = clearApp();

  // Header
  const header = el(
    "div",
    { style: "padding:0 0 12px 0;border-bottom:1px solid #e5e7eb;margin-bottom:12px" },
    null
  );
  header.appendChild(
    el(
      "h3",
      { style: "margin:0 0 4px 0;font-size:14px" },
      "🛒 BijakBeli Scraper"
    )
  );
  header.appendChild(
    el(
      "p",
      { style: "margin:0;font-size:11px;color:#6b7280" },
      stats.totalSubmitted > 0
        ? `Telah mengirim ${stats.totalSubmitted} data produk ke BijakBeli`
        : "Belum ada data terkirim"
    )
  );
  app.appendChild(header);

  // Stats by marketplace
  if (Object.keys(stats.byMarketplace || {}).length > 0) {
    const statsDiv = el("div", {
      style:
        "background:#f9fafb;border-radius:6px;padding:8px;margin-bottom:12px;font-size:11px",
    });
    statsDiv.appendChild(el("div", { style: "font-weight:600;margin-bottom:4px" }, "📊 Per Marketplace"));
    for (const [mp, count] of Object.entries(stats.byMarketplace)) {
      const row = el(
        "div",
        { style: "display:flex;justify-content:space-between;padding:2px 0" },
        null
      );
      row.appendChild(el("span", null, mp));
      row.appendChild(el("span", { style: "font-weight:600" }, `${count} produk`));
      statsDiv.appendChild(row);
    }
    app.appendChild(statsDiv);
  }

  // Pending queue section (P2 visibility)
  if (pendingCount > 0) {
    const queueDiv = el("div", {
      style:
        "background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:8px;margin-bottom:12px;font-size:11px",
    });
    queueDiv.appendChild(
      el("div", { style: "font-weight:600;margin-bottom:4px;color:#92400e" }, `⏳ Pending Retry: ${pendingCount}`)
    );
    queueDiv.appendChild(
      el("div", { style: "color:#78350f;margin-bottom:6px" }, "Akan di-retry otomatis setiap 5 menit (max 3x)")
    );
    
    // Show first 3 pending items
    for (const item of (pendingQueue || []).slice(0, 3)) {
      const row = el(
        "div",
        { style: "padding:2px 0;border-top:1px solid #fde68a;font-size:10px" },
        null
      );
      const title = item.payload?.title?.substring(0, 30) || "Unknown product";
      row.appendChild(el("div", { style: "color:#451a03" }, `${title}${item.payload?.title?.length > 30 ? "..." : ""}`));
      row.appendChild(el("div", { style: "color:#92400e;font-size:9px" }, `Retry: ${item.retryCount}/3 • ${item.marketplace}`));
      queueDiv.appendChild(row);
    }
    
    // Manual retry button
    const retryBtn = el(
      "button",
      {
        style:
          "width:100%;background:#f59e0b;color:white;padding:6px;border:none;border-radius:4px;font-weight:600;cursor:pointer;margin-top:6px;font-size:11px",
      },
      "🔄 Retry Sekarang"
    );
    retryBtn.onclick = async () => {
      retryBtn.disabled = true;
      retryBtn.textContent = "⏳ Retrying...";
      await sendMessage("BIJAKBELI_FLUSH_NOW");
      setTimeout(renderMain, 1500); // Refresh after delay
    };
    queueDiv.appendChild(retryBtn);
    
    app.appendChild(queueDiv);
  }

  // Quick action: scrape current tab
  const scrapeBtn = el(
    "button",
    {
      style:
        "width:100%;background:#3b82f6;color:white;padding:10px;border:none;border-radius:6px;font-weight:600;cursor:pointer;margin-bottom:8px",
    },
    "🔄 Scrape Halaman Ini"
  );
  scrapeBtn.onclick = async () => {
    scrapeBtn.disabled = true;
    scrapeBtn.textContent = "⏳ Scraping...";
    const result = await sendMessage("BIJAKBELI_MANUAL_SCRAPE");
    if (result.error) {
      alert(`Gagal: ${result.error}`);
    } else if (result.accepted > 0) {
      alert(`✓ ${result.accepted} produk berhasil dikirim${result.failed ? `, ${result.failed} gagal` : ""}`);
      renderMain();
    } else if (result.deduplicated) {
      alert(`⏭ ${result.deduplicated} produk sudah pernah dikirim dalam 1 jam terakhir`);
    } else {
      alert("Tidak ada produk terdeteksi di halaman ini");
    }
    scrapeBtn.disabled = false;
    scrapeBtn.textContent = "🔄 Scrape Halaman Ini";
  };
  app.appendChild(scrapeBtn);

  // Compare with BijakBeli DB
  const compareBtn = el(
    "button",
    {
      style:
        "width:100%;background:#8b5cf6;color:white;padding:10px;border:none;border-radius:6px;font-weight:600;cursor:pointer;margin-bottom:12px",
    },
    "🔍 Bandingkan dengan Database"
  );
  compareBtn.onclick = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || "";
    if (!url) return;
    chrome.tabs.create({
      url: `https://www.bijakbeli.web.id/extension/compare?url=${encodeURIComponent(url)}`,
    });
  };
  app.appendChild(compareBtn);

  // Recent history
  if (recentHistory && recentHistory.length > 0) {
    const histTitle = el(
      "div",
      { style: "font-size:11px;font-weight:600;margin:12px 0 4px 0;color:#374151" },
      "📜 Riwayat Terkirim"
    );
    app.appendChild(histTitle);

    const histList = el("div", { style: "max-height:200px;overflow-y:auto" });
    
    // Count errors for summary
    const errorCount = recentHistory.filter(h => !h.success).length;
    
    recentHistory.slice(0, 8).forEach((h) => {
      const row = el(
        "div",
        {
          style:
            "padding:6px;border-bottom:1px solid #f3f4f6;font-size:10px",
        },
        null
      );
      const topRow = el("div", { style: "display:flex;justify-content:space-between;align-items:center" });
      const left = el("div", { style: "flex:1;overflow:hidden;text-overflow:ellipsis" });
      left.appendChild(
        el("div", { style: "font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" }, h.title?.substring(0, 40) || "(no title)")
      );
      left.appendChild(
        el("div", { style: "color:#6b7280" }, `${h.marketplace} • ${formatRupiah(h.price || 0)}`)
      );
      topRow.appendChild(left);

      const badge = el(
        "span",
        {
          style: `font-size:9px;padding:2px 6px;border-radius:3px;color:white;background:${
            h.success ? "#10b981" : "#ef4444"
          }`,
        },
        h.success ? `✓${h.confidence ? " " + Math.round(h.confidence) : ""}` : "✗"
      );
      topRow.appendChild(badge);
      row.appendChild(topRow);
      
      // Show error message inline for failed items (P2 better error visibility)
      if (!h.success && h.message) {
        const errorMsg = el(
          "div",
          { 
            style: "margin-top:3px;color:#dc2626;font-size:9px;font-style:italic;padding-left:4px;border-left:2px solid #fca5a5" 
          },
          null
        );
        // Simplify common error messages
        let msg = h.message;
        if (msg.length > 80) msg = msg.substring(0, 80) + "...";
        errorMsg.appendChild(el("span", null, `⚠ ${msg}`));
        row.appendChild(errorMsg);
      }
      
      histList.appendChild(row);
    });
    
    // Error summary footer
    if (errorCount > 0) {
      const errorSummary = el(
        "div",
        { 
          style: "margin-top:6px;padding:6px;background:#fee2e2;border-radius:4px;font-size:10px;color:#991b1b;text-align:center" 
        },
        null
      );
      errorSummary.appendChild(
        el("span", { style: "font-weight:600" }, `⚠️ ${errorCount} submission gagal`)
      );
      histList.appendChild(errorSummary);
    }
    
    app.appendChild(histList);
  }

  // Export CSV button (P2)
  if (recentHistory.length > 0) {
    const exportBtn = el(
      "button",
      {
        style:
          "display:block;width:100%;margin-top:8px;padding:6px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;font-size:11px;color:#374151;cursor:pointer;font-weight:500",
      },
      "📥 Export History (CSV)"
    );
    exportBtn.onclick = async (e) => {
      e.preventDefault();
      exportHistoryCsv(recentHistory);
    };
    app.appendChild(exportBtn);
  }

  // Settings link
  const settingsLink = el(
    "a",
    {
      href: "#",
      style:
        "display:block;margin-top:12px;font-size:11px;color:#6b7280;text-align:center;text-decoration:underline",
    },
    "Reset / Ubah Pengaturan"
  );
  settingsLink.onclick = async (e) => {
    e.preventDefault();
    await sendMessage("BIJAKBELI_CLEAR_HISTORY");
    renderSetup();
  };
  app.appendChild(settingsLink);
}

/**
 * Convert history array to CSV and trigger browser download.
 * CSV escapes commas/quotes properly per RFC 4180.
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
    // Quote if contains comma, quote, or newline
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
  // Add BOM so Excel reads UTF-8 correctly
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const date = new Date().toISOString().slice(0, 10);
  const filename = `bijakbeli-history-${date}.csv`;
  
  // Trigger download
  const a = el("a", { href: url, download: filename, style: "display:none" });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.addEventListener("DOMContentLoaded", async () => {
  const { ingestionSecret } = await chrome.storage.local.get("ingestionSecret");
  if (!ingestionSecret) {
    renderSetup();
  } else {
    renderMain();
  }
});
