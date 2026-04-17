export const IMAGES = {
  banner: "https://images.unsplash.com/photo-1772949400107-f35fd026ab77?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBnb2xkJTIwd2F0Y2glMjBkYXJrJTIwYmFja2dyb3VuZHxlbnwxfHx8fDE3NzYxNzMxMTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  wrist: "https://images.unsplash.com/photo-1770216533493-a25ce4224123?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjB3YXRjaCUyMHdyaXN0JTIwY2xvc2V1cHxlbnwxfHx8fDE3NzYxNzMxMTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  chronograph: "https://images.unsplash.com/photo-1611353384046-8a02bac0f14d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwY2hyb25vZ3JhcGglMjB3YXRjaHxlbnwxfHx8fDE3NzYxNzMxMTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  collection: "https://images.unsplash.com/photo-1759910546811-8d9df1501688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjB3YXRjaCUyMGNvbGxlY3Rpb24lMjBkaXNwbGF5fGVufDF8fHx8MTc3NjE3MzExN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  minimal: "https://images.unsplash.com/photo-1758887952896-8491d393afe2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwd2F0Y2glMjB3aGl0ZSUyMGRpYWx8ZW58MXx8fHwxNzc2MTczMTE3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  leather: "https://images.unsplash.com/photo-1769240186303-d7fb5cf4a8be?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwd2F0Y2glMjBsZWF0aGVyJTIwc3RyYXB8ZW58MXx8fHwxNzc2MTczMTE4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  mechanism: "https://images.unsplash.com/photo-1763226015334-9a2d3fb11ea5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBhdXRvbWF0aWMlMjB3YXRjaCUyMG1lY2hhbmlzbXxlbnwxfHx8fDE3NzYxNzMxMTh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  goldFace: "https://images.unsplash.com/photo-1772793384358-27b46e587bee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb2xkJTIwd2F0Y2glMjBmYWNlJTIwbWFjcm98ZW58MXx8fHwxNzc2MTczMTE4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  sport: "https://images.unsplash.com/photo-1700650109006-1741e917a6bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydCUyMGRpdmluZyUyMHdhdGNoJTIwc3RlZWx8ZW58MXx8fHwxNzc2MTczMTE5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  store: "https://images.unsplash.com/photo-1774110073583-2475ab5ed8b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjB3YXRjaCUyMGJyYW5kJTIwc3RvcmV8ZW58MXx8fHwxNzc2MTczMTE5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
};

export interface Product {
  id: string;
  name: string;
  collection: string;
  price: number;
  originalPrice?: number;
  image: string;
  tag?: string;
  category: string;
  description?: string;
  status: "on" | "off";
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

export const products: Product[] = [
  {
    id: "1",
    name: "Royal Chronograph",
    collection: "Heritage Collection",
    price: 12800,
    originalPrice: 15600,
    image: IMAGES.chronograph,
    tag: "Best Seller",
    category: "chronograph",
    description:
      "A masterpiece of Swiss engineering, the Royal Chronograph combines timeless elegance with precision mechanics. Featuring a 42mm rose gold case, sapphire crystal, and an automatic movement with 72-hour power reserve.",
    status: "on",
    specGroups: [
      { name: "Color", options: ["Rose Gold", "Silver", "Black"] },
      { name: "Case Size", options: ["38mm", "40mm", "42mm"] },
    ],
    skus: [
      { id: "1-rg-38", specs: { Color: "Rose Gold", "Case Size": "38mm" }, price: 12800, originalPrice: 15600, stock: 6, enabled: true },
      { id: "1-rg-40", specs: { Color: "Rose Gold", "Case Size": "40mm" }, price: 12800, originalPrice: 15600, stock: 10, enabled: true },
      { id: "1-rg-42", specs: { Color: "Rose Gold", "Case Size": "42mm" }, price: 13200, originalPrice: 15600, stock: 4, enabled: true },
      { id: "1-s-38", specs: { Color: "Silver", "Case Size": "38mm" }, price: 12400, originalPrice: 14800, stock: 3, enabled: true },
      { id: "1-s-40", specs: { Color: "Silver", "Case Size": "40mm" }, price: 12400, originalPrice: 14800, stock: 0, enabled: true },
      { id: "1-s-42", specs: { Color: "Silver", "Case Size": "42mm" }, price: 12900, originalPrice: 14800, stock: 2, enabled: true },
      { id: "1-b-38", specs: { Color: "Black", "Case Size": "38mm" }, price: 12100, originalPrice: 14500, stock: 1, enabled: true },
      { id: "1-b-40", specs: { Color: "Black", "Case Size": "40mm" }, price: 12100, originalPrice: 14500, stock: 5, enabled: true },
      { id: "1-b-42", specs: { Color: "Black", "Case Size": "42mm" }, price: 12600, originalPrice: 14500, stock: 0, enabled: false },
    ],
  },
  {
    id: "2",
    name: "Midnight Gold",
    collection: "Signature Series",
    price: 9600,
    image: IMAGES.goldFace,
    category: "classic",
    description:
      "Crafted from 18k gold with a deep midnight dial, this timepiece embodies understated luxury. The sunray-finished dial catches light from every angle.",
    status: "on",
    specGroups: [
      { name: "Strap", options: ["Leather", "Metal"] },
      { name: "Case Size", options: ["38mm", "40mm"] },
    ],
    skus: [
      { id: "2-l-38", specs: { Strap: "Leather", "Case Size": "38mm" }, price: 9600, stock: 12, enabled: true },
      { id: "2-l-40", specs: { Strap: "Leather", "Case Size": "40mm" }, price: 9800, stock: 7, enabled: true },
      { id: "2-m-38", specs: { Strap: "Metal", "Case Size": "38mm" }, price: 10200, stock: 2, enabled: true },
      { id: "2-m-40", specs: { Strap: "Metal", "Case Size": "40mm" }, price: 10400, stock: 0, enabled: true },
    ],
  },
  {
    id: "3",
    name: "Ocean Master",
    collection: "Sport Line",
    price: 7800,
    originalPrice: 8900,
    image: IMAGES.sport,
    tag: "Limited",
    category: "sport",
    description:
      "Engineered for the depths, water-resistant to 300m. Features a unidirectional rotating bezel, luminescent markers, and a titanium case.",
    status: "on",
    specGroups: [
      { name: "Dial", options: ["Black", "Blue"] },
      { name: "Case Size", options: ["40mm", "42mm"] },
    ],
    skus: [
      { id: "3-bk-40", specs: { Dial: "Black", "Case Size": "40mm" }, price: 7800, originalPrice: 8900, stock: 5, enabled: true },
      { id: "3-bk-42", specs: { Dial: "Black", "Case Size": "42mm" }, price: 8100, originalPrice: 8900, stock: 3, enabled: true },
      { id: "3-bl-40", specs: { Dial: "Blue", "Case Size": "40mm" }, price: 7900, originalPrice: 8900, stock: 0, enabled: true },
      { id: "3-bl-42", specs: { Dial: "Blue", "Case Size": "42mm" }, price: 8200, originalPrice: 8900, stock: 1, enabled: true },
    ],
  },
  {
    id: "4",
    name: "Elegance Pure",
    collection: "Minimalist",
    price: 5200,
    image: IMAGES.minimal,
    category: "minimal",
    description:
      "Less is more. The Elegance Pure features an ultra-thin 7mm profile, a pristine white dial, and a refined mesh bracelet.",
    status: "off",
    specGroups: [{ name: "Case Size", options: ["38mm", "40mm"] }],
    skus: [
      { id: "4-38", specs: { "Case Size": "38mm" }, price: 5200, stock: 8, enabled: true },
      { id: "4-40", specs: { "Case Size": "40mm" }, price: 5400, stock: 5, enabled: true },
    ],
  },
  {
    id: "5",
    name: "Heritage Leather",
    collection: "Classic",
    price: 6800,
    image: IMAGES.leather,
    tag: "New",
    category: "classic",
    description:
      "Handcrafted Italian leather strap paired with a polished steel case. The Heritage Leather is a tribute to traditional watchmaking.",
    status: "on",
    specGroups: [
      { name: "Color", options: ["Brown", "Black"] },
      { name: "Case Size", options: ["38mm", "40mm"] },
    ],
    skus: [
      { id: "5-br-38", specs: { Color: "Brown", "Case Size": "38mm" }, price: 6800, stock: 9, enabled: true },
      { id: "5-br-40", specs: { Color: "Brown", "Case Size": "40mm" }, price: 7000, stock: 4, enabled: true },
      { id: "5-bk-38", specs: { Color: "Black", "Case Size": "38mm" }, price: 6800, stock: 2, enabled: true },
      { id: "5-bk-40", specs: { Color: "Black", "Case Size": "40mm" }, price: 7000, stock: 0, enabled: true },
    ],
  },
  {
    id: "6",
    name: "Tourbillon Skeleton",
    collection: "Haute Horlogerie",
    price: 28500,
    image: IMAGES.mechanism,
    tag: "Exclusive",
    category: "chronograph",
    description:
      "The pinnacle of our craft. A hand-finished tourbillon movement visible through the skeleton dial, housed in a platinum case.",
    status: "on",
    specGroups: [
      { name: "Case", options: ["Platinum", "Rose Gold"] },
      { name: "Strap", options: ["Rubber", "Leather"] },
    ],
    skus: [
      { id: "6-p-r", specs: { Case: "Platinum", Strap: "Rubber" }, price: 28500, stock: 2, enabled: true },
      { id: "6-p-l", specs: { Case: "Platinum", Strap: "Leather" }, price: 29200, stock: 1, enabled: true },
      { id: "6-r-r", specs: { Case: "Rose Gold", Strap: "Rubber" }, price: 27600, stock: 0, enabled: true },
      { id: "6-r-l", specs: { Case: "Rose Gold", Strap: "Leather" }, price: 28400, stock: 1, enabled: true },
    ],
  },
];

export const categories = [
  { id: "chronograph", name: "Chronograph", image: IMAGES.chronograph },
  { id: "classic", name: "Classic", image: IMAGES.goldFace },
  { id: "sport", name: "Sport", image: IMAGES.sport },
  { id: "minimal", name: "Minimalist", image: IMAGES.minimal },
];
