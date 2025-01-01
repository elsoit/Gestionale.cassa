export interface Size {
  id: number;
  name: string;
}

export interface SizeGroup {
  id: number;
  name: string;
  sizes: Size[];
}

export interface Product {
  id: number;
  article_code: string;
  variant_code: string;
  size: string;
  quantity: number;
  retail_price: string;
  wholesale_price: string;
  brand_id?: number;
  status_id?: number;
  isFromReservation?: boolean;
} 