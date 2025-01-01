export interface Product {
  id: number;
  article_code: string;
  variant_code: string;
  size: string;
  quantity: number;
  retail_price: string;
  brand_id?: number;
  status_id?: number;
  isFromReservation?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  discount: number;
  total: number;
  isFromReservation?: boolean;
}

export interface Order {
  id: number;
  code: string;
  total_price: string;
  final_total: string;
  status_id: number;
  created_at: string;
  client?: {
    id: number;
    name: string;
  };
  order_payments: OrderPayment[];
}

export interface OrderPayment {
  id: number;
  internal_code: string;
  payment_code?: string;
  order_id: number;
  payment_method_id: number;
  amount: number;
  tax: number;
  payment_date: string;
  charge_date: string;
  payment_prove_document_url?: string;
  invoice_document_url?: string;
  status_id: number;
  created_at: string;
  updated_at: string;
} 