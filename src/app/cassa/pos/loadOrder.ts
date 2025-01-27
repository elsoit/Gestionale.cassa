import type {
  CartItem,
  Order,
  LoadOrderDependencies
} from './@types'

export const loadOrderFromDB = async (order: Order, deps: LoadOrderDependencies) => {
  try {
    // 1. Recupera i dettagli dell'ordine con i prodotti
    const response = await fetch(`${process.env.API_URL}/api/order-items/${order.id}`);
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