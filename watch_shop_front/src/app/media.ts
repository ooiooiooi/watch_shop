export function resolveMediaUrl(input?: string | null): string {
  const value = (input ?? "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
  if (value.startsWith("/api/uploads/")) return value;
  if (value.startsWith("/uploads/")) return `/api${value}`;
  if (value.startsWith("/")) return value;
  return value;
}
