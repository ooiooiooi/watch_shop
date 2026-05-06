import type { Product } from "../data";

function normalizeLabel(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/watch(?:es)?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getDisplayTag(product: Pick<Product, "tag" | "name" | "brand" | "model" | "collection" | "category">): string | null {
  const rawTag = product.tag?.trim();
  if (!rawTag) return null;

  const normalizedTag = normalizeLabel(rawTag);
  if (!normalizedTag) return null;

  const normalizedName = normalizeLabel(product.name);
  const normalizedBrand = normalizeLabel(product.brand);
  const normalizedModel = normalizeLabel(product.model);
  const normalizedCollection = normalizeLabel(product.collection);
  const normalizedCategory = normalizeLabel(product.category);

  if (
    normalizedTag === normalizedBrand ||
    normalizedTag === normalizedModel ||
    normalizedTag === normalizedCollection ||
    normalizedTag === normalizedCategory
  ) {
    return null;
  }

  if (
    (normalizedBrand && normalizedTag.includes(normalizedBrand)) ||
    (normalizedModel && normalizedTag.includes(normalizedModel)) ||
    (normalizedName && (normalizedName.includes(normalizedTag) || normalizedTag.includes(normalizedName)))
  ) {
    return null;
  }

  return rawTag;
}

export function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-[158px] rounded-[18px] border border-[#d6b36a]/28 bg-[linear-gradient(135deg,rgba(12,12,12,0.92),rgba(28,25,18,0.82))] px-3 py-2 text-[9px] font-medium uppercase leading-[1.45] tracking-[0.24em] text-[#e2c27c] shadow-[0_16px_36px_rgba(0,0,0,0.28)] ring-1 ring-white/6 backdrop-blur-md md:max-w-[186px] md:px-3.5 md:py-2.5 md:text-[10px]">
      <span className="line-clamp-2">{label}</span>
    </span>
  );
}
