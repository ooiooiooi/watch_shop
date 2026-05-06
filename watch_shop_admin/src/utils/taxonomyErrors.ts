export function normalizeTaxonomyError(message: string, kind: "brand" | "model"): string {
  const text = (message || "").trim();
  if (!text) return kind === "brand" ? "品牌保存失败，请稍后重试" : "型号保存失败，请稍后重试";

  if (kind === "brand") {
    if (text.includes("品牌名称已存在")) return "这个品牌已经存在了，请直接编辑已有品牌，不要重复新增。";
    if (text.includes("品牌ID已存在")) return "这个品牌 ID 已被占用，请换一个 ID，或者直接编辑已有品牌。";
  }

  if (kind === "model") {
    if (text.includes("型号名称已存在")) return "这个品牌下已经有同名型号了，请直接编辑已有型号，不要重复新增。";
    if (text.includes("型号ID已存在")) return "这个型号 ID 已被占用，请换一个 ID，或者直接编辑已有型号。";
  }

  return text;
}
