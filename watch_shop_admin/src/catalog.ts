export const IMAGES = {
  banner:
    "https://images.unsplash.com/photo-1772949400107-f35fd026ab77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBnb2xkJTIwd2F0Y2glMjBkYXJrJTIwYmFja2dyb3VuZHxlbnwxfHx8fDE3NzYxNzMxMTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  wrist:
    "https://images.unsplash.com/photo-1770216533493-a25ce4224123?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjB3YXRjaCUyMHdyaXN0JTIwY2xvc2V1cHxlbnwxfHx8fDE3NzYxNzMxMTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  chronograph:
    "https://images.unsplash.com/photo-1611353384046-8a02bac0f14d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwY2hyb25vZ3JhcGglMjB3YXRjaHxlbnwxfHx8fDE3NzYxNzMxMTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  collection:
    "https://images.unsplash.com/photo-1759910546811-8d9df1501688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjB3YXRjaCUyMGNvbGxlY3Rpb24lMjBkaXNwbGF5fGVufDF8fHx8MTc3NjE3MzExN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  minimal:
    "https://images.unsplash.com/photo-1758887952896-8491d393afe2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwd2F0Y2glMjB3aGl0ZSUyMGRpYWx8ZW58MXx8fHwxNzc2MTczMTE3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  leather:
    "https://images.unsplash.com/photo-1769240186303-d7fb5cf4a8be?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwd2F0Y2glMjBsZWF0aGVyJTIwc3RyYXB8ZW58MXx8fHwxNzc2MTczMTE4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  mechanism:
    "https://images.unsplash.com/photo-1763226015334-9a2d3fb11ea5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBhdXRvbWF0aWMlMjB3YXRjaCUyMG1lY2hhbmlzbXxlbnwxfHx8fDE3NzYxNzMxMTh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  goldFace:
    "https://images.unsplash.com/photo-1772793384358-27b46e587bee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkJTIwd2F0Y2glMjBmYWNlJTIwbWFjcm98ZW58MXx8fHwxNzc2MTczMTE4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  sport:
    "https://images.unsplash.com/photo-1700650109006-1741e917a6bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydCUyMGRpdmluZyUyMHdhdGNoJTIwc3RlZWx8ZW58MXx8fHwxNzc2MTczMTE5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  store:
    "https://images.unsplash.com/photo-1774110073583-2475ab5ed8b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjB3YXRjaCUyMGJyYW5kJTIwc3RvcmV8ZW58MXx8fHwxNzc2MTczMTE5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
};

export interface Product {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  reference?: string;
  brandId?: string;
  modelId?: string;
  collection: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  tag?: string;
  category: string;
  description?: string;
  status?: "on" | "off";
  sortOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  specGroups?: SpecGroup[];
  skus?: ProductSku[];
}

export interface SpecGroup {
  name: string;
  options: string[];
}

export interface ProductSku {
  id: string;
  specs: Record<string, string>;
  price: number;
  originalPrice?: number;
  stock: number;
  enabled: boolean;
}

export interface Category {
  id: string;
  name: string;
  image: string;
}

export interface Brand {
  id: string;
  name: string;
  image?: string;
}

export interface WatchModel {
  id: string;
  brandId: string;
  name: string;
  image?: string;
}
