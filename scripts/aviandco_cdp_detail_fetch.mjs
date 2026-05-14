#!/usr/bin/env node
const [, , targetUrl = ""] = process.argv;
const debugHost = process.env.AVI_DEBUG_HOST || "http://127.0.0.1:62305";
if (!targetUrl) throw new Error("detail url required");

async function openTarget(url) {
  const response = await fetch(`${debugHost}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`open target failed: ${response.status}`);
  return response.json();
}

async function closeTarget(id) {
  await fetch(`${debugHost}/json/close/${id}`).catch(() => null);
}

async function call(ws, method, params = {}) {
  const id = ++call.nextId;
  ws.send(JSON.stringify({ id, method, params }));
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${method} timeout`)), 60000);
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
    const timeout = setTimeout(resolve, 45000);
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
  await new Promise((resolve) => setTimeout(resolve, 2500));
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

let target;
let ws;
try {
  target = await openTarget(targetUrl);
  if (!target.webSocketDebuggerUrl) throw new Error("target websocket missing");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await waitOpen(ws);
  await call(ws, "Page.enable");
  await call(ws, "Runtime.enable");
  await waitForLoad(ws);
  const result = await call(ws, "Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  await new Promise((resolve) => process.stdout.write(JSON.stringify(result.result?.value || {}), resolve));
} finally {
  if (ws) ws.close();
  if (target?.id) await closeTarget(target.id);
}
process.exit(0);
