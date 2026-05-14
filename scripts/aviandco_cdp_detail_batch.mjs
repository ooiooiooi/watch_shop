#!/usr/bin/env node
const debugHost = process.env.AVI_DEBUG_HOST || "http://127.0.0.1:62305";
const input = JSON.parse(await new Promise((resolve, reject) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => data += chunk);
  process.stdin.on("end", () => resolve(data || "[]"));
  process.stdin.on("error", reject);
}));
const workers = Math.max(1, Number(process.env.AVI_BATCH_WORKERS || 4));
const itemTimeoutMs = Math.max(15000, Number(process.env.AVI_ITEM_TIMEOUT_MS || 90000));

async function openTarget(url) {
  const response = await fetch(`${debugHost}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`open target failed: ${response.status}`);
  return response.json();
}

async function closeTarget(id) {
  await fetch(`${debugHost}/json/close/${id}`).catch(() => null);
}

async function call(ws, method, params = {}, timeoutMs = 60000) {
  const id = ++call.nextId;
  ws.send(JSON.stringify({ id, method, params }));
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${method} timeout`)), timeoutMs);
    function onMessage(event) {
      const data = JSON.parse(String(event.data));
      if (data.id !== id) return;
      clearTimeout(timeout);
      ws.removeEventListener("message", onMessage);
      if (data.error) reject(new Error(`${method}: ${data.error.message || JSON.stringify(data.error)}`));
      else resolve(data.result || {});
    }
    ws.addEventListener("message", onMessage);
  });
}
call.nextId = 0;

function waitOpen(ws) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("websocket open timeout")), 30000);
    ws.addEventListener("open", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
}

async function waitForLoad(ws) {
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 10000);
    function onMessage(event) {
      const data = JSON.parse(String(event.data));
      if (data.method === "Page.loadEventFired" || data.method === "Page.domContentEventFired") {
        clearTimeout(timeout);
        ws.removeEventListener("message", onMessage);
        resolve();
      }
    }
    ws.addEventListener("message", onMessage);
  });
  await new Promise((resolve) => setTimeout(resolve, 600));
}

const expression = `(() => {
  const normalize = (value) => String(value || "").replace(/\\s+/g, " ").trim();
  const meta = (selector) => document.querySelector(selector)?.getAttribute("content") || "";
  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
  const docs = scripts.flatMap((node) => {
    try {
      const parsed = JSON.parse(node.textContent || "");
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  });
  const product = docs.find((item) => String(item?.["@type"] || "").toLowerCase() === "product") || {};
  const offer = Array.isArray(product.offers) ? product.offers[0] || {} : product.offers || {};
  const imgs = [
    meta('meta[property="og:image"]'),
    ...(Array.isArray(product.image) ? product.image : product.image ? [product.image] : []),
    ...[...document.querySelectorAll(".product.media img, .fotorama img, img")]
      .map((image) =>
        image.getAttribute("data-src") ||
        image.getAttribute("data-large") ||
        image.getAttribute("data-full") ||
        image.getAttribute("srcset")?.split(/\\s+/)[0] ||
        image.currentSrc ||
        image.src ||
        ""
      )
      .filter((src) => src && !String(src).startsWith("data:")),
  ];
  return {
    url: location.href,
    title: document.title,
    name: normalize(product.name) || normalize(document.querySelector("h1")?.textContent || ""),
    sku: normalize(product.sku) || normalize(document.querySelector("[itemprop='sku']")?.textContent || ""),
    description: normalize(product.description) || normalize(document.querySelector(".product.attribute.description")?.textContent || "") || meta('meta[name="description"]'),
    price: String(offer.price || document.querySelector("[data-price-amount]")?.getAttribute("data-price-amount") || ""),
    images: [...new Set(imgs.filter(Boolean))],
    specText: normalize(document.body?.innerText || ""),
  };
})()`;

async function createPage() {
  const target = await openTarget("about:blank");
  if (!target.webSocketDebuggerUrl) throw new Error("target websocket missing");
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await waitOpen(ws);
  await call(ws, "Page.enable");
  await call(ws, "Runtime.enable");
  return { target, ws };
}

async function fetchOnPage(page, item) {
  const { ws } = page;
  const id = item.id || "";
  const url = item.url || "";
  try {
    await call(ws, "Page.navigate", { url }, 60000);
    await waitForLoad(ws);
    const result = await call(ws, "Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, 60000);
    process.stdout.write(JSON.stringify({ id, ok: true, payload: result.result?.value || {} }) + "\n");
  } catch (error) {
    process.stdout.write(JSON.stringify({ id, ok: false, error: String(error.message || error).slice(0, 600) }) + "\n");
  }
}

async function withTimeout(promise, ms, label) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} hard timeout`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

const pages = [];
let cursor = 0;
try {
  for (let i = 0; i < Math.min(workers, input.length || 1); i += 1) {
    pages.push(await createPage());
  }
  await Promise.all(pages.map(async (page) => {
    while (cursor < input.length) {
      const item = input[cursor++];
      try {
        await withTimeout(fetchOnPage(page, item), itemTimeoutMs, item.id || item.url || "item");
      } catch (error) {
        process.stdout.write(JSON.stringify({
          id: item.id || "",
          ok: false,
          error: String(error.message || error).slice(0, 600),
        }) + "\n");
      }
    }
  }));
} finally {
  for (const page of pages) {
    if (page.ws) page.ws.close();
    if (page.target?.id) await closeTarget(page.target.id);
  }
}
