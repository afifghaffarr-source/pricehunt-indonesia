// Cold cache audit (disable cache) + better resource size tracking
import { execSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { writeFileSync } from "node:fs";

const CHROME_PATH = "/tmp/chrome-audit/chrome-linux64/chrome";
const CHROME_PORT = 9223;
const URL = process.argv[2];
const MOBILE = true;

async function startChrome() {
  const userDataDir = `/tmp/chrome-cold-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const proc = spawn(CHROME_PATH, [
    `--headless=new`,
    `--no-sandbox`,
    `--disable-gpu`,
    `--disable-dev-shm-usage`,
    `--remote-debugging-port=${CHROME_PORT}`,
    `--user-data-dir=${userDataDir}`,
    `--disable-extensions`,
    `--disable-background-networking`,
    `--mute-audio`,
    `--no-first-run`,
    `--disk-cache-size=1`,  // Tiny cache to force cold loads
  ], { stdio: ["ignore", "pipe", "pipe"] });

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${CHROME_PORT}/json/version`);
      if (res.ok) {
        const data = await res.json();
        return { proc, wsUrl: data.webSocketDebuggerUrl, userDataDir };
      }
    } catch {}
    await delay(300);
  }
  throw new Error("Chrome did not start");
}

const url = process.argv[2];
const { proc, wsUrl, userDataDir } = await startChrome();
const WebSocket = (await import("ws")).default;
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.once("open", r));

let msgId = 0;
const pending = new Map();
const events = [];
const resources = [];

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id).resolve(msg.result);
    pending.delete(msg.id);
  } else if (msg.method) {
    events.push(msg);
    // Capture responseReceived for resource sizes
    if (msg.method === "Network.responseReceived" && msg.params?.type !== "EventSource") {
      resources.push({
        url: msg.params.response.url,
        type: msg.params.type,
        status: msg.params.response.status,
        mime: msg.params.response.mimeType,
        encodedSize: msg.params.response.encodedDataLength,
        decodedSize: msg.params.response.dataLength,
      });
    }
    if (msg.method === "Network.loadingFinished" && msg.params) {
      const r = resources.find((x) => x.url === msg.params.requestId || resources[resources.length - 1]?.url === msg.params.requestId);
      // Can't always match; collect all encodedDataLength from finished events
    }
  }
});

function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve) => {
    pending.set(id, { resolve });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const target = await send("Target.createTarget", { url: "about:blank" });
const attach = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
const sid = attach.sessionId;

function sendSession(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve) => {
    pending.set(id, { resolve });
    ws.send(JSON.stringify({ id, sessionId: sid, method, params }));
  });
}

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.sessionId === sid && msg.method) {
    if (msg.method === "Network.responseReceived" && msg.params?.type !== "EventSource") {
      resources.push({
        url: msg.params.response.url,
        type: msg.params.type,
        status: msg.params.response.status,
        mime: msg.params.response.mimeType,
        encodedSize: msg.params.response.encodedDataLength,
        decodedSize: msg.params.response.dataLength,
      });
    }
  }
});

await sendSession("Page.enable");
await sendSession("Network.enable");
await sendSession("Network.setCacheDisabled", { cacheDisabled: true });
await sendSession("Performance.enable");
await sendSession("Emulation.setDeviceMetricsOverride", {
  width: 360, height: 640, deviceScaleFactor: 2.625, mobile: true,
});
await sendSession("Emulation.setUserAgentOverride", {
  userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
});
await sendSession("Network.emulateNetworkConditions", {
  offline: false,
  downloadThroughput: (10 * 1024 * 1024) / 8,
  uploadThroughput: (2 * 1024 * 1024) / 8,
  latency: 40,
});
await sendSession("Emulation.setCPUThrottlingRate", 4);

await sendSession("Page.addScriptToEvaluateOnNewDocument", {
  source: `
    window.__perf = { fcp: 0, lcp: 0, cls: 0, longTasks: [], resources: [], lcpEl: null };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__perf.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
    new PerformanceObserver((l) => { const e = l.getEntries(); const last = e[e.length-1]; if (last) { window.__perf.lcp = last.startTime; try { const el = last.element; if (el) window.__perf.lcpEl = el.tagName + (el.id ? '#'+el.id : ''); } catch(_){} } }).observe({ type: 'largest-contentful-paint', buffered: true });
    let cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; window.__perf.cls = cls; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => { window.__perf.longTasks.push(...l.getEntries().map(e => ({ d: e.duration, s: e.startTime }))); }).observe({ type: 'longtask', buffered: true });
  `,
});

const navStart = Date.now();
await sendSession("Page.navigate", { url });
await delay(8000);

const m = await sendSession("Runtime.evaluate", { expression: "JSON.stringify(window.__perf)", returnByValue: true });
const perf = JSON.parse(m.result.value);
const nav = await sendSession("Runtime.evaluate", { expression: `JSON.stringify({ ttfb: performance.timing.responseEnd - performance.timing.requestStart, dom: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart, load: performance.timing.loadEventEnd - performance.timing.navigationStart })`, returnByValue: true });
const nt = JSON.parse(nav.result.value);
const tbt = perf.longTasks.filter(t => t.s >= perf.fcp && t.s <= nt.load).reduce((a,t) => a + Math.max(0, t.d - 50), 0);

ws.close();
proc.kill();
try { execSync(`rm -rf ${userDataDir}`); } catch {}

const totalEncoded = resources.reduce((a, r) => a + r.encodedSize, 0);
const byType = resources.reduce((acc, r) => {
  acc[r.type] = acc[r.type] || { count: 0, encoded: 0 };
  acc[r.type].count++;
  acc[r.type].encoded += r.encodedSize;
  return acc;
}, {});

const result = {
  url: URL,
  cold_cache: true,
  total_time_s: ((Date.now() - navStart) / 1000).toFixed(2),
  metrics: {
    ttfb_ms: nt.ttfb,
    fcp_ms: Math.round(perf.fcp),
    lcp_ms: Math.round(perf.lcp),
    cls: Number(perf.cls.toFixed(3)),
    tbt_ms: Math.round(tbt),
    dom_ms: nt.dom,
    load_ms: nt.load,
  },
  lcp_element: perf.lcpEl,
  long_tasks: perf.longTasks.length,
  bytes: {
    total_encoded_kb: Math.round(totalEncoded / 1024),
    by_type: Object.fromEntries(
      Object.entries(byType).map(([k, v]) => [k, { count: v.count, kb: Math.round(v.encoded / 1024) }])
    ),
  },
  resource_count: resources.length,
  top_resources: resources
    .sort((a, b) => b.encodedSize - a.encodedSize)
    .slice(0, 15)
    .map((r) => ({
      url: r.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 80),
      kb: Math.round(r.encodedSize / 1024),
      type: r.type,
    })),
};

console.log(JSON.stringify(result, null, 2));
