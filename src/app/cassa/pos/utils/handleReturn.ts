import { type RefundMethod } from '../components/ReturnModal'

const server = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

interface HandleReturnParams {
  orderId: number
  warehouseId: number
  refundMethod: RefundMethod
  deposit: number
  isPartialReturn: boolean
  returnQuantities: { [key: number]: number } // itemId: quantity
}

interface ReturnDependencies {
  orderId: string | number;
  returnQuantities: { [key: number]: number };
  warehouseId: number;
  refundMethod: RefundMethod;
  deposit: number;
  isPartialReturn: boolean;
  setIsProcessing: (value: boolean) => void;
  toast: (props: { title: string; description: string; variant?: string }) => void;
  router: { refresh: () => void };
}

interface OrderItem {
  id: number;
  quantity: number;
  unit_cost: number;
  total: number;
  final_cost: number;
}

export async function handleReturn({
  orderId,
  returnQuantities,
  warehouseId,
  refundMethod,
  deposit,
  isPartialReturn,
  setIsProcessing,
  toast,
  router
}: ReturnDependencies) {
  try {
    setIsProcessing(true);
    
    // 1. Recupera i dettagli dell'ordine
    const response = await fetch(`${server}/api/order-items/${orderId}`);
    if (!response.ok) throw new Error('Failed to fetch order items');
    const orderItems = await response.json();

    // Array per tenere traccia degli aggiornamenti completati
    const completedStockUpdates: { productId: number; quantity: number }[] = [];

    try {
      // 2. Calcola il nuovo totale (somma dei prodotti non resi)
      const newTotal = orderItems.reduce((total: number, item: OrderItem) => {
        const returnQuantity = returnQuantities[item.id] || 0;
        const remainingQuantity = item.quantity - returnQuantity;
        if (remainingQuantity > 0) {
          return total + (remainingQuantity * item.final_cost);
        }
        return total;
      }, 0);

      // Calcola il totale degli articoli resi
      const voucherAmount = orderItems.reduce((total: number, item: OrderItem) => {
        const returnQuantity = returnQuantities[item.id] || 0;
        if (returnQuantity > 0) {
          return total + (returnQuantity * item.final_cost);
        }
        return total;
      }, 0);

      // 3. Aggiorna l'ordine con il nuovo totale
      const updateOrderResponse = await fetch(`${server}/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          total: newTotal.toString()
        }),
      });

      if (!updateOrderResponse.ok) {
        throw new Error('Failed to update order total');
      }

      // 4. Crea il buono
      const createVoucherResponse = await fetch(`${server}/api/vouchers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: voucherAmount.toString(),
          order_id: orderId
        }),
      });

      if (!createVoucherResponse.ok) {
        throw new Error('Failed to create voucher');
      }

      // 5. Aggiorna le quantità dei prodotti
      for (const [itemId, quantityStr] of Object.entries(returnQuantities)) {
        const quantity = Number(quantityStr);
        if (quantity > 0) {
          const item = orderItems.find((i: OrderItem) => i.id === parseInt(itemId));
          if (!item) continue;

          const response = await fetch(`${server}/api/product-availability/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              product_id: item.id,
              warehouse_id: warehouseId,
              quantity: quantity,
              operation: 'add'
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to update stock for product ${item.id}`);
          }

          completedStockUpdates.push({ productId: item.id, quantity });
        }
      }

      // 6. Aggiorna le quantità nell'ordine
      for (const [itemId, quantityStr] of Object.entries(returnQuantities)) {
        const quantity = Number(quantityStr);
        if (quantity > 0) {
          const item = orderItems.find((i: OrderItem) => i.id === parseInt(itemId));
          if (!item) continue;

          const response = await fetch(`${server}/api/order-items/${item.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              quantity: item.quantity - quantity
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to update order item ${item.id}`);
          }
        }
      }

      toast({
        title: "Reso completato",
        description: "Il reso è stato registrato con successo",
      });

      router.refresh();
      setIsProcessing(false);

    } catch (error) {
      // In caso di errore, ripristina le quantità
      for (const update of completedStockUpdates) {
        await fetch(`${server}/api/product-availability/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_id: update.productId,
            warehouse_id: warehouseId,
            quantity: update.quantity,
            operation: 'subtract'
          }),
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('Errore durante il reso:', error);
    throw error;
  }
}