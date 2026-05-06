export function buildWhatsAppHref(whatsapp: string, text?: string): string | null {
  const raw = whatsapp.trim();
  if (!raw) return null;

  const message = text?.trim() ? text.trim() : null;
  const lower = raw.toLowerCase();

  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    try {
      const u = new URL(raw);
      if (message) u.searchParams.set("text", message);
      
      // Ensure phone parameter has a '+' sign
      const phone = u.searchParams.get("phone");
      if (phone && /^\d+$/.test(phone)) {
        u.searchParams.set("phone", "+" + phone);
      }
      
      return u.toString();
    } catch {
      return raw;
    }
  }

  // If it's just a number, format it properly with api.whatsapp.com
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  
  const u = new URL("https://api.whatsapp.com/send/");
  u.searchParams.set("phone", "+" + digits);
  if (message) u.searchParams.set("text", message);
  return u.toString();
}

export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m));
}
