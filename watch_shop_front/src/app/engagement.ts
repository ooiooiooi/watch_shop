type InquiryPayload = {
  pagePath?: string | null;
  referrer?: string | null;
  source: string;
  productId?: string | null;
};

function sendJson(url: string, payload: InquiryPayload) {
  const body = JSON.stringify(payload);
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const sent = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    if (sent) return;
  }

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function recordInquiry(source: string, options?: { productId?: string | null; pagePath?: string | null }) {
  if (typeof window === "undefined") return;
  sendJson("/api/public/visits/inquiries", {
    source,
    productId: options?.productId ?? null,
    pagePath: options?.pagePath ?? `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || null,
  });
}
