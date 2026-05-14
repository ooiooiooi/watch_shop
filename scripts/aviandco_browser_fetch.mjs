#!/usr/bin/env node
import process from "node:process";
import { spawn } from "node:child_process";
import { chromium } from "/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const [, , mode, rawUrl] = process.argv;
const url = rawUrl || "";
const timeout = Number(process.env.AVI_BROWSER_TIMEOUT_MS || 90000);
const waitMs = Number(process.env.AVI_BROWSER_SETTLE_MS || 1800);
const headless = String(process.env.AVI_BROWSER_HEADLESS || "false").toLowerCase() !== "false";
const storageStatePath = String(process.env.AVI_STORAGE_STATE || "").trim();
const waitForUnlockMs = Number(process.env.AVI_BROWSER_WAIT_FOR_UNLOCK_MS || 0);
const timezoneId = String(process.env.AVI_TIMEZONE_ID || "America/New_York").trim();
const userAgent =
  process.env.AVI_USER_AGENT ||
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";

async function proxyConfig() {
  const proxyUrl = String(process.env.AVI_PROXY_URL || "").trim();
  if (proxyUrl) {
    const parsed = new URL(proxyUrl.includes("://") ? proxyUrl : `http://${proxyUrl}`);
    if (parsed.protocol === "socks5:" && (parsed.username || parsed.password)) {
      return await startSocks5Bridge({
        host: parsed.hostname,
        port: Number(parsed.port || 1080),
        username: decodeURIComponent(parsed.username || ""),
        password: decodeURIComponent(parsed.password || ""),
      });
    }
    return {
      server: `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`,
      ...(parsed.username ? { username: decodeURIComponent(parsed.username) } : {}),
      ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
    };
  }

  const server = String(process.env.AVI_PROXY_SERVER || "").trim();
  if (!server) return undefined;
  const serverUrl = new URL(server.includes("://") ? server : `http://${server}`);
  if (serverUrl.protocol === "socks5:" && (process.env.AVI_PROXY_USERNAME || process.env.AVI_PROXY_PASSWORD)) {
    return await startSocks5Bridge({
      host: serverUrl.hostname,
      port: Number(serverUrl.port || 1080),
      username: process.env.AVI_PROXY_USERNAME || "",
      password: process.env.AVI_PROXY_PASSWORD || "",
    });
  }
  return {
    server: server.includes("://") ? server : `http://${server}`,
    ...(process.env.AVI_PROXY_USERNAME ? { username: process.env.AVI_PROXY_USERNAME } : {}),
    ...(process.env.AVI_PROXY_PASSWORD ? { password: process.env.AVI_PROXY_PASSWORD } : {}),
  };
}

async function startSocks5Bridge({ host, port, username, password }) {
  const bridgeScript = process.env.AVI_SOCKS5_BRIDGE_SCRIPT || "/Users/mac/workspace/watch_shop/scripts/socks5_auth_bridge.py";
  const bridge = spawn(
    "python3",
    [
      bridgeScript,
      "--upstream-host",
      host,
      "--upstream-port",
      String(port),
      "--username",
      username,
      "--password",
      password,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const localAddress = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("socks5 bridge startup timed out")), 15000);
    bridge.stdout.once("data", (chunk) => {
      clearTimeout(timer);
      const line = String(chunk || "").trim();
      const match = line.match(/^READY\s+(.+)$/);
      if (!match) {
        reject(new Error(`unexpected socks5 bridge response: ${line}`));
        return;
      }
      resolve(match[1]);
    });
    bridge.once("error", reject);
    bridge.once("exit", (code) => {
      reject(new Error(`socks5 bridge exited early with code ${code}`));
    });
  });
  return {
    server: `socks5://${localAddress}`,
    bridge,
  };
}

if (!mode || !url) {
  console.error("Usage: aviandco_browser_fetch.mjs <listing|detail> <url>");
  process.exit(2);
}

const resolvedProxy = await proxyConfig();
const browser = await chromium.launch({
  headless,
  args: ["--disable-blink-features=AutomationControlled"],
  ...(resolvedProxy ? { proxy: { server: resolvedProxy.server } } : {}),
});

try {
  const context = await browser.newContext({
    userAgent,
    viewport: { width: 1440, height: 1800 },
    locale: "en-US",
    timezoneId,
    ...(storageStatePath ? { storageState: storageStatePath } : {}),
  });

  const cookieHeader = String(process.env.AVI_COOKIE || "").trim();
  if (cookieHeader) {
    const cookies = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        if (idx < 1) return null;
        return {
          name: part.slice(0, idx).trim(),
          value: part.slice(idx + 1).trim(),
          domain: ".aviandco.com",
          path: "/",
        };
      })
      .filter(Boolean);
    if (cookies.length) {
      await context.addCookies(cookies);
    }
  }

  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout });
  await page.waitForTimeout(waitMs);

  let bodyText = await page.locator("body").innerText().catch(() => "");
  if (/access denied|forbidden|captcha|verify you are human/i.test(bodyText) && waitForUnlockMs > 0) {
    const deadline = Date.now() + waitForUnlockMs;
    while (Date.now() < deadline) {
      await page.waitForTimeout(2000);
      bodyText = await page.locator("body").innerText().catch(() => "");
      if (!/access denied|forbidden|captcha|verify you are human/i.test(bodyText)) {
        break;
      }
    }
  }
  if (/access denied|forbidden|captcha|verify you are human/i.test(bodyText)) {
    throw new Error(
      "browser page appears blocked or challenged; run once with AVI_BROWSER_HEADLESS=false AVI_BROWSER_WAIT_FOR_UNLOCK_MS=60000 AVI_SAVE_STORAGE_STATE=/path/state.json",
    );
  }

  if (mode === "listing") {
    await page.waitForSelector(".product-item, [data-product-id], .products-grid", { timeout }).catch(() => null);
    const result = await page.evaluate(() => {
      const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const priceValue = (root) => {
        const amountNode = root.querySelector("[data-price-amount]");
        if (amountNode?.getAttribute("data-price-amount")) return amountNode.getAttribute("data-price-amount");
        const priceNode = root.querySelector(".price");
        return normalize(priceNode?.textContent || "");
      };
      const cards = [...document.querySelectorAll(".product-item")];
      const products = cards
        .map((card) => {
          const link =
            card.querySelector("a.product-item-link") ||
            card.querySelector('a[href*="/"]');
          const image = card.querySelector("img.product-image-photo, img");
          return {
            url: link?.href || "",
            name: normalize(link?.textContent || image?.alt || ""),
            price: priceValue(card) || "",
            image: image?.currentSrc || image?.src || image?.getAttribute("data-src") || "",
          };
        })
        .filter((item) => item.url && item.name);
      return { products };
    });
    if (process.env.AVI_SAVE_STORAGE_STATE) {
      await context.storageState({ path: process.env.AVI_SAVE_STORAGE_STATE });
    }
    process.stdout.write(JSON.stringify(result));
  } else if (mode === "detail") {
    await page.waitForSelector("h1, [itemprop='name'], .page-title", { timeout }).catch(() => null);
    const result = await page.evaluate(() => {
      const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map((node) => {
          try {
            return JSON.parse(node.textContent || "");
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .flatMap((item) => (Array.isArray(item) ? item : [item]));
      const productDoc = jsonLd.find((item) => String(item?.["@type"] || "").toLowerCase() === "product") || {};
      const offer = Array.isArray(productDoc.offers) ? productDoc.offers[0] || {} : productDoc.offers || {};
      const meta = (selector) => document.querySelector(selector)?.getAttribute("content") || "";
      const specText = normalize(document.body?.innerText || "");
      const galleryImages = [...document.querySelectorAll(".fotorama__img, .gallery-placeholder img, img")]
        .map((img) => img.currentSrc || img.src || img.getAttribute("data-src") || "")
        .filter(Boolean);
      return {
        name:
          normalize(productDoc.name) ||
          normalize(document.querySelector("h1")?.textContent || "") ||
          meta('meta[property="og:title"]'),
        sku:
          normalize(productDoc.sku) ||
          normalize(document.querySelector("[itemprop='sku']")?.textContent || ""),
        description:
          normalize(productDoc.description) ||
          normalize(document.querySelector(".product.attribute.description")?.textContent || "") ||
          meta('meta[name="description"]'),
        price: String(offer.price || document.querySelector("[data-price-amount]")?.getAttribute("data-price-amount") || ""),
        images: [
          meta('meta[property="og:image"]'),
          ...(Array.isArray(productDoc.image) ? productDoc.image : productDoc.image ? [productDoc.image] : []),
          ...galleryImages,
        ].filter(Boolean),
        specText,
      };
    });
    if (process.env.AVI_SAVE_STORAGE_STATE) {
      await context.storageState({ path: process.env.AVI_SAVE_STORAGE_STATE });
    }
    process.stdout.write(JSON.stringify(result));
  } else {
    throw new Error(`Unsupported mode: ${mode}`);
  }
} finally {
  await browser.close();
  if (resolvedProxy?.bridge) {
    resolvedProxy.bridge.kill("SIGTERM");
  }
}
