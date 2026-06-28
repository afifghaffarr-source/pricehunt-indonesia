/**
 * BijakBeli Extension — Shared Helpers
 *
 * Pure functions used by both popup.js and sidepanel.js.
 * Loaded as ES module (Vitest) and as global script (Chrome extension).
 */

export function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function historyToCsv(history) {
  const headers = ["Timestamp", "Marketplace", "Title", "Price (IDR)", "URL", "Status", "Confidence", "Message"];
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
  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsv(history, filenamePrefix = "bijakbeli-history") {
  const csv = historyToCsv(history);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${filenamePrefix}-${date}.csv`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

/**
 * Plain-JS dual export: when loaded as plain script in Chrome extension,
 * bind helpers to window so popup.js/sidepanel.js can access them.
 */
const _globalThis = typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : null);
if (_globalThis) {
  _globalThis.BijakBeliShared = {
    escapeCsv,
    historyToCsv,
    downloadCsv,
  };
}
