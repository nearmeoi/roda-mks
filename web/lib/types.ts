export interface ProductSize {
  size_code: string | null;
  article_code: number;
  quantity: number;
  ordered_quantity: number | null;
  price: number | null;
}

export interface Product {
  id: string;
  brand: string;
  model_name: string;
  category: string;
  warehouse: string;
  variant_extra: string | null;
  wheel_size: string | null;
  color_label: string | null;
  price: number | null;
  sizes: ProductSize[];
  colors: string[];
  images: string[];
  specs: Record<string, string>;
  matched: boolean;
}

export interface StockCount {
  productId: string;
  productName: string;
  countedQty: number;
  countedAt: string; // ISO timestamp
}

export type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

export interface GuideArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  tags?: string[];
  blocks: ContentBlock[];
}
