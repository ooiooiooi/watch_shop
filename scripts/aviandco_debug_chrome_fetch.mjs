#!/usr/bin/env node
import process from "node:process";
import { chromium } from "/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const [, , mode, targetUrl = ""] = process.argv;
const debugHost = process.env.AVI_DEBUG_HOST || "http://127.0.0.1:62305";
const versionResponse = await fetch(`${debugHost}/json/version`);
if (!versionResponse.ok) {
  throw new Error(`Failed to read Chrome debug version: ${versionResponse.status}`);
}
const versionInfo = await versionResponse.json();
const wsEndpoint = versionInfo.webSocketDebuggerUrl;
if (!wsEndpoint) {
  throw new Error("Chrome debug websocket endpoint missing");
}
const browser = await chromium.connectOverCDP(wsEndpoint);

try {
  const context = browser.contexts()[0];
  if (!context) throw new Error("No browser context found");
  let page = context.pages().find((item) => item.url().includes("aviandco.com"));
  if (!page) {
    const createTargetResponse = await fetch(
      `${debugHost}/json/new?${encodeURIComponent(targetUrl || "https://www.aviandco.com/shop-by-brand")}`,
      { method: "PUT" },
    );
    if (!createTargetResponse.ok) {
      throw new Error(`Failed to open VS FACTORY debug target: ${createTargetResponse.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1800));
    page = context.pages().find((item) => item.url().includes("aviandco.com"));
    if (!page) {
      throw new Error("Chrome target opened, but VS FACTORY page was not attached");
    }
  } else if (targetUrl && page.url() !== targetUrl) {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForLoadState("domcontentloaded", { timeout: 120000 }).catch(() => null);
  }
  await page.waitForTimeout(2500);

  const text = await page.locator("body").innerText().catch(() => "");
  if (/access denied|forbidden|captcha|verify you are human/i.test(text)) {
    throw new Error("VS FACTORY page is still on a challenge screen");
  }

  if (mode === "listing") {
    const result = await page.evaluate(() => {
      const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
      return {
        products: [...document.querySelectorAll(".product-item")]
          .map((card) => {
            const link = card.querySelector("a.product-item-link") || card.querySelector("a[href]");
            const image = card.querySelector("img.product-image-photo, img");
            const priceNode = card.querySelector("[data-price-amount], .price");
            return {
              url: link?.href || "",
              name: normalize(link?.textContent || image?.alt || ""),
              price: priceNode?.getAttribute("data-price-amount") || normalize(priceNode?.textContent || ""),
              image: image?.currentSrc || image?.src || image?.getAttribute("data-src") || "",
            };
          })
          .filter((item) => item.url && item.name),
      };
    });
    await new Promise((resolve) => process.stdout.write(JSON.stringify(result), resolve));
  } else if (mode === "detail") {
    const result = await page.evaluate(() => {
      const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
      const docs = scripts
        .map((node) => {
          try {
            return JSON.parse(node.textContent || "");
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .flatMap((item) => (Array.isArray(item) ? item : [item]));
      const product = docs.find((item) => String(item?.["@type"] || "").toLowerCase() === "product") || {};
      const offer = Array.isArray(product.offers) ? product.offers[0] || {} : product.offers || {};
      const meta = (selector) => document.querySelector(selector)?.getAttribute("content") || "";
      return {
        name: normalize(product.name) || normalize(document.querySelector("h1")?.textContent || ""),
        sku: normalize(product.sku) || normalize(document.querySelector("[itemprop='sku']")?.textContent || ""),
        description:
          normalize(product.description) ||
          normalize(document.querySelector(".product.attribute.description")?.textContent || "") ||
          meta('meta[name="description"]'),
        price: String(offer.price || document.querySelector("[data-price-amount]")?.getAttribute("data-price-amount") || ""),
        images: [
          meta('meta[property="og:image"]'),
          ...(Array.isArray(product.image) ? product.image : product.image ? [product.image] : []),
          ...[...document.querySelectorAll(".product.media img, .fotorama img, img")]
            .map((image) =>
              image.getAttribute("data-src") ||
              image.getAttribute("data-large") ||
              image.getAttribute("data-full") ||
              image.getAttribute("srcset")?.split(/\s+/)[0] ||
              image.currentSrc ||
              image.src ||
              "",
            )
            .filter((src) => src && !String(src).startsWith("data:")),
        ].filter(Boolean),
        specText: normalize(document.body?.innerText || ""),
      };
    });
    await new Promise((resolve) => process.stdout.write(JSON.stringify(result), resolve));
  } else {
    throw new Error(`Unsupported mode: ${mode}`);
  }
} finally {
  // Leave the real CDP browser alone; the Node process exit drops this client connection.
}
process.exit(0);
