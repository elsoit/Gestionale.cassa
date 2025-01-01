import { CartItem } from '@/app/cassa/pos/types';

interface Order {
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

interface OrderPayment {
  amount: number;
}

interface LoadOrderDependencies {
  setCart: (cart: CartItem[]) => void;
  setSelectedClient: (clientId: string) => void;
  setCurrentOrderId: (id: number | null) => void;
  setIsReservationsDialogOpen: (isOpen: boolean) => void;
  fetchPreviousPayments: (orderId: number) => void;
  setOrderNumber: (number: string) => void;
  toast: any;
}

export const loadOrderFromDB = async (order: Order, deps: LoadOrderDependencies) => {
  try {
    // 1. Recupera i dettagli dell'ordine con i prodotti
    const response = await fetch(`http://localhost:3003/api/order-items/${order.id}`);
    if (!response.ok) throw new Error('Failed to fetch order items');
    const orderItems = await response.json();

    // 2. Converti gli items in formato CartItem
    const cartItems: CartItem[] = orderItems.map((item: any) => ({
      id: item.product_id,
      article_code: item.product.article_code,
      variant_code: item.product.variant_code,
      size: item.product.size,
      quantity: item.quantity,
      retail_price: item.unit_cost.toString(),
      discount: item.discount,
      total: item.total,
      isFromReservation: true  // Flag per identificare che viene da una prenotazione
    }));

    // 3. Calcola il totale degli acconti
    const totalPaid = order.order_payments.reduce((sum, payment) => sum + payment.amount, 0);

    // 4. Imposta tutti i dati necessari
    deps.setCart(cartItems);
    if (order.client) {
      deps.setSelectedClient(order.client.id.toString());
    }
    deps.setCurrentOrderId(order.id);
    deps.setOrderNumber(order.code);
    deps.fetchPreviousPayments(order.id);
    deps.setIsReservationsDialogOpen(false);

    deps.toast({
      title: "Prenotazione caricata",
      description: "La prenotazione è stata caricata correttamente",
    });

  } catch (error) {
    console.error('Error loading order:', error);
    deps.toast({
      title: "Errore",
      description: "Errore nel caricamento della prenotazione",
      variant: "destructive",
    });
  }
}; 