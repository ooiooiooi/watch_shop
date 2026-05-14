#!/usr/bin/env node
import { chromium } from "/Users/mac/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const debugHost = process.env.AVI_DEBUG_HOST || "http://127.0.0.1:62305";
const brandText = process.env.AVI_DEBUG_BRAND_TEXT || "Richard Mille";
const brandUrl = process.env.AVI_DEBUG_BRAND_URL || "";
const maxPages = Math.max(1, Number(process.env.AVI_MAX_PAGES || "1"));
const versionInfo = await fetch(`${debugHost}/json/version`).then((response) => response.json());
const browser = await chromium.connectOverCDP(versionInfo.webSocketDebuggerUrl);

try {
  const page = browser.contexts()[0].pages().find((item) => item.url().includes("aviandco.com"));
  if (!page) throw new Error("Avi & Co. tab not found");
  const brandHref = brandUrl || await page.locator("a[href]").evaluateAll((anchors, desiredText) => {
    const item = anchors.find((anchor) => (anchor.textContent || "").trim() === desiredText);
    return item ? item.href : "";
  }, brandText);
  if (!brandHref) throw new Error(`Brand link not found: ${brandText}`);
  if (brandUrl || page.url().split("?")[0] !== brandHref.split("?")[0]) {
    await page.goto(brandHref, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(3500);
  }
  const cards = [];
  const seen = new Set();
  let lastUrl = "";
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const pageCards = await page.evaluate(() => {
      const bestImage = (image) => {
        if (!image) return "";
        const candidates = [
          image.getAttribute("data-src"),
          image.getAttribute("data-original"),
          image.getAttribute("data-lazy"),
          image.getAttribute("data-srcset")?.split(/\s+/)[0],
          image.getAttribute("srcset")?.split(/\s+/)[0],
          image.currentSrc,
          image.src,
        ].filter(Boolean);
        return candidates.find((item) => !String(item).startsWith("data:")) || candidates[0] || "";
      };
      return [...document.querySelectorAll(".product-item")].map((card) => {
        const link = card.querySelector("a.product-item-link") || card.querySelector("a[href]");
        const image = card.querySelector("img");
        const price = card.querySelector("[data-price-amount], .price");
        return {
          name: (link?.textContent || "").replace(/\s+/g, " ").trim(),
          href: link?.href || "",
          price: price?.getAttribute("data-price-amount") || price?.textContent || "",
          image: bestImage(image),
        };
      });
    });
    for (const card of pageCards) {
      if (!card.href || seen.has(card.href)) continue;
      seen.add(card.href);
      cards.push(card);
    }
    lastUrl = page.url();
    const nextHref = await page.evaluate(() => {
      const next = document.querySelector("a.action.next[href], a.next[href]");
      return next ? next.href : "";
    });
    if (!nextHref || pageIndex === maxPages - 1) break;
    await page.goto(nextHref, { waitUntil: "domcontentloaded", timeout: 120000 });
  }
  const payload = {
    url: lastUrl || page.url(),
    title: await page.title(),
    cards,
  };
  await new Promise((resolve) => process.stdout.write(JSON.stringify(payload), resolve));
} finally {
  // Leave the real CDP browser alone; the Node process exit drops this client connection.
}
process.exit(0);
