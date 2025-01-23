export interface Product {
  id: number;
  name: string;
  description: string;
  article_code: string;
  variant_code: string;
  size: string;
  retail_price: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


export interface CartItem extends Product {
  quantity: number;
  discount: number;
  total: number;
  mainPhotoUrl?: string;
  unitDiscounts?: number[];
  isExpanded?: boolean;
  rowId: string;           // ID univoco per la riga principale
  unitIds?: string[];     // Array di ID univoci per le sottorighe
  id: number;
  isFromReservation?: boolean;
}

export interface Order {
  id: number;
  internal_code: string;
  order_code: string;
  customer_id: number;
  store_id: number;
  status_id: number;
  final_total: string;
  tax: number;
  order_date: string;
  created_at: string;
  updated_at: string;
  order_payments: OrderPayment[];
}

export interface OrderPayment {
  id: number;
  internal_code: string;
  payment_code: string;
  order_id: number;
  payment_method_id: number;
  amount: number;
  tax: number;
  payment_date: string;
  charge_date: string;
  status_id: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  icon: string;
}

export interface Payment {
  id: number;
  internal_code: string;
  payment_code: string;
  order_id: number;
  payment_method_id: number;
  amount: number;
  tax: number;
  payment_date: string;
  charge_date: string;
  status_id: number;
  created_at: string;
  updated_at: string;
}

export interface Operator {
  id: number;
  nome: string;
  cognome: string;
  code: string;
} 