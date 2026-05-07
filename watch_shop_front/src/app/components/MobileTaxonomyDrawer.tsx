import { ArrowLeft, ArrowRight, X } from "lucide-react";

type DrawerBrand = {
  id: string;
  name: string;
};

type DrawerModel = {
  id: string;
  brandId: string;
  name: string;
};

type MobileTaxonomyDrawerProps = {
  open: boolean;
  onClose: () => void;
  onNavigateHome: () => void;
  onNavigateAbout: () => void;
  brands: DrawerBrand[];
  models: DrawerModel[];
  viewBrandId: string | null;
  onViewBrandChange: (brandId: string | null) => void;
  selectedBrandId?: string | null;
  selectedModelId?: string | null;
  onSelectModel: (brandId: string, modelId: string | null) => void;
  allBrandsLabel: string;
  allModelsLabel: string;
  homeLabel: string;
  aboutLabel: string;
  shopByBrandLabel: string;
  brandLabel: string;
};

export function MobileTaxonomyDrawer({
  open,
  onClose,
  onNavigateHome,
  onNavigateAbout,
  brands,
  models,
  viewBrandId,
  onViewBrandChange,
  selectedBrandId,
  selectedModelId,
  onSelectModel,
  allBrandsLabel,
  allModelsLabel,
  homeLabel,
  aboutLabel,
  shopByBrandLabel,
  brandLabel,
}: MobileTaxonomyDrawerProps) {
  if (!open) return null;

  const showingModels = viewBrandId !== null;
  const sortedBrands = [...brands].sort((a, b) => a.name.localeCompare(b.name));
  const activeBrandModels = viewBrandId
    ? models.filter((item) => item.brandId === viewBrandId).sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const activeBrandName = viewBrandId
    ? brands.find((item) => item.id === viewBrandId)?.name ?? viewBrandId
    : brandLabel;

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <button onClick={onClose} className="absolute inset-0 bg-black/45" aria-label="close collections drawer" />
      <div className="absolute inset-y-0 left-0 w-[82%] max-w-[340px] overflow-hidden bg-[#121212] text-white shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
        <div className="flex h-full min-w-0 flex-1 flex-col bg-[linear-gradient(180deg,#171717_0%,#101010_100%)]">
          <div className="flex items-center justify-between px-4 pb-5 pt-5">
            <button
              onClick={onNavigateHome}
              className="text-left text-[14px] uppercase tracking-[0.22em] text-primary transition-colors hover:text-primary/80"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {homeLabel}
            </button>
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400 transition-colors hover:border-primary/40 hover:text-primary"
            >
              <X size={14} />
            </button>
          </div>

          <div className="border-b border-white/8 px-4 pb-3">
            <div className="text-[9px] uppercase tracking-[0.26em] text-zinc-500">{shopByBrandLabel}</div>
            <div className="mt-2 text-[30px] leading-none text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              {showingModels ? activeBrandName : brandLabel}
            </div>
          </div>

          {showingModels ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <button
                onClick={() => onViewBrandChange(null)}
                className="flex items-center gap-2 border-b border-white/8 px-4 py-3 text-left text-[12px] uppercase tracking-[0.14em] text-zinc-400 transition-colors hover:bg-white/[0.02] hover:text-primary"
              >
                <ArrowLeft size={14} />
                {allBrandsLabel}
              </button>
              <button
                onClick={() => onSelectModel(viewBrandId, null)}
                className={[
                  "flex w-full items-center justify-between border-b border-white/8 px-4 py-4 text-left transition-colors",
                  selectedBrandId === viewBrandId && (!selectedModelId || selectedModelId === "all")
                    ? "bg-white/[0.03] text-primary"
                    : "text-white hover:bg-white/[0.02]",
                ].join(" ")}
              >
                <span className="truncate text-[14px]">{allModelsLabel}</span>
                <ArrowRight size={14} className={selectedBrandId === viewBrandId && (!selectedModelId || selectedModelId === "all") ? "text-primary/70" : "text-zinc-500"} />
              </button>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {activeBrandModels.map((item) => {
                  const active = selectedBrandId === viewBrandId && selectedModelId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectModel(viewBrandId, item.id)}
                      className={[
                        "flex w-full items-center justify-between border-b border-white/8 px-4 py-4 text-left transition-colors",
                        active ? "bg-white/[0.03] text-primary" : "text-white hover:bg-white/[0.02]",
                      ].join(" ")}
                    >
                      <span className="truncate text-[14px]">{item.name}</span>
                      <ArrowRight size={14} className={active ? "text-primary/70" : "text-zinc-500"} />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {sortedBrands.map((brand) => {
                const active = selectedBrandId === brand.id;
                return (
                  <button
                    key={brand.id}
                    onClick={() => onViewBrandChange(brand.id)}
                    className={[
                      "flex w-full items-center justify-between border-b border-white/8 px-4 py-4 text-left transition-colors",
                      active ? "bg-white/[0.03] text-primary" : "text-white hover:bg-white/[0.02]",
                    ].join(" ")}
                  >
                    <span className="truncate text-[14px]">{brand.name}</span>
                    <ArrowRight size={14} className={active ? "text-primary/70" : "text-zinc-500"} />
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-t border-white/8 px-4 py-5">
            <button
              onClick={onNavigateAbout}
              className="text-left text-[14px] uppercase tracking-[0.22em] text-primary transition-colors hover:text-primary/80"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {aboutLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
