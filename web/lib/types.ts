export interface ProductSize {
  size_code: string;
  article_code: number;
  quantity: number;
  price: number | null;
}

export interface Product {
  id: string;
  brand: string;
  model_name: string;
  category: string;
  price: number | null;
  sizes: ProductSize[];
  colors: string[];
  images: string[];
  specs: Record<string, string>;
  matched: boolean;
}
