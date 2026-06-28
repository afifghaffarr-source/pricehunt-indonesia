// Mobile Lighthouse-style audit using Chrome DevTools Protocol
// Captures: FCP, LCP, TBT, CLS, INP, total bytes, by-resource breakdown
// Mobile emulation: 360x640, 4G, 4x CPU throttle, viewport DPR 2.625

import { writeFile } from "node:fs/promises";
import { execSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const CHROME_PATH = "/tmp/chrome-audit/chrome-linux64/chrome";
const CHROME_PORT = 9222;
const URL = process.argv[2] || "https://www.bijakbeli.web.id/";
const MOBILE = true;

async function startChrome() {
  const userDataDir = `/tmp/chrome-audit-profile-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const args = [
    `--headless=new`,
    `--no-sandbox`,
    `--disable-gpu`,
    `--disable-dev-shm-usage`,
    `--remote-debugging-port=${CHROME_PORT}`,
    `--user-data-dir=${userDataDir}`,
    `--disable-extensions`,
    `--disable-component-extensions-with-background-pages`,
    `--disable-background-networking`,
    `--disable-background-timer-throttling`,
    `--disable-backgrounding-occluded-windows`,
    `--disable-renderer-backgrounding`,
    `--mute-audio`,
    `--no-first-run`,
  ];

  const proc = spawn(CHROME_PATH, args, { stdio: ["ignore", "pipe", "pipe"] });

  // Wait for Chrome to be ready
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

async function audit(url) {
  const { proc, wsUrl, userDataDir } = await startChrome();

  const WebSocket = (await import("ws")).default;
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.once("open", r));

  let msgId = 0;
  const pending = new Map();
  const sessionEvents = [];

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    } else if (msg.method) {
      sessionEvents.push(msg);
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
  const attach = await send("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: true,
  });
  const sid = attach.sessionId;

  function sendSession(method, params = {}) {
    const id = ++msgId;
    return new Promise((resolve) => {
      pending.set(id, { resolve });
      ws.send(JSON.stringify({ id, sessionId: sid, method, params }));
    });
  }

  // Set up listeners for this session
  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.sessionId === sid && msg.method) {
      sessionEvents.push(msg);
    }
  });

  await sendSession("Page.enable");
  await sendSession("Network.enable");
  await sendSession("Performance.enable");
  await sendSession("Emulation.setDeviceMetricsOverride", MOBILE ? {
    width: 360,
    height: 640,
    deviceScaleFactor: 2.625,
    mobile: true,
  } : {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sendSession("Emulation.setUserAgentOverride", MOBILE ? {
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  } : {
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  await sendSession("Network.emulateNetworkConditions", MOBILE ? {
    offline: false,
    downloadThroughput: (10 * 1024 * 1024) / 8,
    uploadThroughput: (2 * 1024 * 1024) / 8,
    latency: 40,
  } : {
    offline: false,
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: 0,
  });
  await sendSession("Emulation.setCPUThrottlingRate", MOBILE ? 4 : 1);

  // Inject performance observer script that runs BEFORE any page script
  await sendSession("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__perf = {
        fcp: 0,
        lcp: 0,
        cls: 0,
        longTasks: [],
        resources: [],
        lcpEl: null,
        lcpSize: null,
        navStart: 0,
      };
      window.__perf.navStart = performance.timing ? performance.timing.navigationStart : Date.now();

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            window.__perf.fcp = entry.startTime;
          }
        }
      }).observe({ type: 'paint', buffered: true });

      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) {
          window.__perf.lcp = last.startTime;
          try {
            const el = last.element;
            if (el) {
              window.__perf.lcpEl = el.tagName + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0,2).join('.') : '');
              const r = el.getBoundingClientRect();
              window.__perf.lcpSize = { w: Math.round(r.width), h: Math.round(r.height) };
            }
          } catch(e){}
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      let cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) cls += entry.value;
        }
        window.__perf.cls = cls;
      }).observe({ type: 'layout-shift', buffered: true });

      new PerformanceObserver((list) => {
        window.__perf.longTasks.push(...list.getEntries().map(e => ({
          duration: e.duration,
          startTime: e.startTime,
        })));
      }).observe({ type: 'longtask', buffered: true });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__perf.resources.push({
            name: entry.name,
            duration: Math.round(entry.duration),
            size: entry.transferSize,
            type: entry.initiatorType,
            start: Math.round(entry.startTime),
          });
        }
      }).observe({ type: 'resource', buffered: true });
    `,
  });

  // Navigate
  await sendSession("Page.navigate", { url });
  // Wait for load + 6s extra for LCP stabilization & late tasks
  await delay(8000);

  // Collect metrics
  const metrics = await sendSession("Runtime.evaluate", {
    expression: "JSON.stringify(window.__perf)",
    returnByValue: true,
  });
  const perfData = JSON.parse(metrics.result.value);

  const totalBytes = perfData.resources.reduce((a, b) => a + (b.size || 0), 0);
  const byType = perfData.resources.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + (r.size || 0);
    return acc;
  }, {});

  // Navigation timing
  const navTiming = await sendSession("Runtime.evaluate", {
    expression: `JSON.stringify({
      ttfb: performance.timing.responseEnd - performance.timing.requestStart,
      dom: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      load: performance.timing.loadEventEnd - performance.timing.navigationStart,
    })`,
    returnByValue: true,
  });
  const nav = JSON.parse(navTiming.result.value);

  // TBT: long tasks during the FCP → TTI window (approx; we use FCP → load)
  const tbt = perfData.longTasks
    .filter((t) => t.startTime >= perfData.fcp && t.startTime <= nav.load)
    .reduce((a, t) => a + Math.max(0, t.duration - 50), 0);

  ws.close();
  proc.kill();
  try { execSync(`rm -rf ${userDataDir}`); } catch {}

  return {
    url,
    mobile: MOBILE,
    metrics: {
      ttfb_ms: nav.ttfb,
      fcp_ms: Math.round(perfData.fcp),
      lcp_ms: Math.round(perfData.lcp),
      cls: Number(perfData.cls.toFixed(3)),
      tbt_ms: Math.round(tbt),
      dom_ms: nav.dom,
      load_ms: nav.load,
    },
    lcp_element: perfData.lcpEl,
    lcp_size: perfData.lcpSize,
    long_tasks: perfData.longTasks.length,
    bytes: {
      total_kb: Math.round(totalBytes / 1024),
      by_type_kb: Object.fromEntries(
        Object.entries(byType).map(([k, v]) => [k, Math.round(v / 1024)])
      ),
    },
    resource_count: perfData.resources.length,
    top_resources: perfData.resources
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map((r) => ({
        name: r.name.replace(/^https?:\/\/[^/]+/, "").slice(0, 70),
        kb: Math.round((r.size || 0) / 1024),
        type: r.type,
      })),
  };
}

const url = process.argv[2];
const result = await audit(url);
console.log(JSON.stringify(result, null, 2));
