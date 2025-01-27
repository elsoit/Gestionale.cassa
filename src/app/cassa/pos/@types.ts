export interface Product {
  id: number;
  article_code: string;
  variant_code: string;
  size: string;
  quantity: number;
  retail_price: string;
  discounted_price?: string;
  brand_id?: number;
  status_id?: number;
  isFromReservation?: boolean;
  mainPhotoUrl?: string;
  total_availability?: number;
  list_price?: string;
  brand_name?: string;
}

export interface CartItem extends Product {
  quantity: number;
  discount: number;
  total: number;
  mainPhotoUrl?: string;
  unitDiscounts?: number[];
  isExpanded?: boolean;
  rowId: string;
  unitIds?: string[];
}

export interface Brand {
  id: number;
  name: string;
}

export interface Size {
  id: number;
  name: string;
}

export interface SizeGroup {
  id: number;
  name: string;
}

export interface Status {
  id: number;
  name: string;
}

export interface Filters {
  [key: string]: number[]
}

export interface PriceRange {
  min?: number;
  max?: number;
}

export interface PriceRanges {
  wholesale_price: PriceRange;
  retail_price: PriceRange;
}

export interface AvailabilityFilter {
  type?: 'available' | 'not_available' | 'greater_than' | 'less_than';
  value?: number;
}

export interface DiscountVoucher {
  id: number;
  code: string;
  client_id?: number;
  origin_order_id?: number;
  total_amount: number;
  status_id: number;
  validity_start_date: string;
  validity_end_date: string;
  destination_order_id?: number;
  used_amount: number;
  date_of_use?: string;
  created_at: string;
  updated_at: string;
  barcode_id?: number;
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

export interface PaymentType {
  id: string;
  name: string;
}

export interface Operator {
  id: number;
  code: string;
  nome: string;
  cognome: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  description: string | null;
  icon: string;
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

export interface FrozenOrder {
  id: string;
  cart: CartItem[];
  totalDiscount: number;
  orderNumber: string;
  orderDate: Date;
  deposit: number;
  voucher: number;
  previousPayments: OrderPayment[];
  previousSuccessfulPayments: OrderPayment[];
  currentOrderId: number | null;
  isReservation: boolean;
  status_id?: number | null;
}

export interface OrderItem {
  id: number;
  product_id: number;
  article_code: string;
  variant_code: string;
  size: string;
  quantity: number;
  unit_cost: number;
  discount: number;
  final_cost: string;
  total: number;
}

export interface GroupedItems {
  [key: string]: OrderItem[];
}

export interface LoadOrderDependencies {
  setCart: (cart: CartItem[]) => void;
  setSelectedClient: (clientId: string) => void;
  setCurrentOrderId: (id: number | null) => void;
  setIsReservationsDialogOpen: (isOpen: boolean) => void;
  fetchPreviousPayments: (orderId: number) => void;
  fetchPreviousSuccessfulPayments: (orderId: number) => void;
  setOrderNumber: (number: string) => void;
  toast: any;
} 