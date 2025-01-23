import { type RefundMethod } from '../components/CancelReservationModal'

const server = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

interface CancelReservationParams {
  orderId: number
  warehouseId: number
  refundMethod: RefundMethod
  deposit: number
}

export async function cancelReservation({
  orderId,
  warehouseId,
  refundMethod,
  deposit
}: CancelReservationParams): Promise<void> {
  try {
    // 1. Ottieni gli items dell'ordine prima di qualsiasi modifica
    const orderItemsResponse = await fetch(`${server}/api/order-items/order/${orderId}`)
    if (!orderItemsResponse.ok) throw new Error('Errore nel recupero degli items dell\'ordine')
    const orderItems = await orderItemsResponse.json()

    // Array per tenere traccia delle operazioni di magazzino completate
    const completedStockUpdates: { productId: number, quantity: number }[] = []

    try {
      // 2. Aggiorna lo stato dell'ordine a "Annullato" (id: 19)
      const updateOrderResponse = await fetch(`${server}/api/order-cancellation/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status_id: 19, // Annullato
        }),
      })

      if (!updateOrderResponse.ok) {
        throw new Error('Errore durante l\'aggiornamento dello stato dell\'ordine')
      }

      // 2.5 Imposta deleted = true per tutti gli order_items
      const updateItemsResponse = await fetch(`${server}/api/order-cancellation/order-items/${orderId}/update-deleted`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!updateItemsResponse.ok) {
        throw new Error('Errore durante l\'aggiornamento degli items dell\'ordine')
      }

      // 3. Aggiorna lo stato di tutti i pagamenti dell'ordine a "Cancelled" (id: 21)
      const updatePaymentsResponse = await fetch(`${server}/api/order-cancellation/order-payments/${orderId}/update-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_status_id: 6, // Pagamenti completati
          to_status_id: 21, // Cancelled
        }),
      })

      if (!updatePaymentsResponse.ok) {
        throw new Error('Errore durante l\'aggiornamento dello stato dei pagamenti')
      }

      // 4. Aggiorna le disponibilità nel magazzino (storno)
      for (const item of orderItems) {
        const updateStockResponse = await fetch(`${server}/api/product-availability/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_id: item.product_id,
            warehouse_id: warehouseId,
            quantity: item.quantity,
            operation: 'add'
          }),
        })

        if (!updateStockResponse.ok) {
          // Se l'aggiornamento del magazzino fallisce, ripristina le quantità già aggiornate
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
            })
          }
          throw new Error('Errore durante l\'aggiornamento del magazzino')
        }

        completedStockUpdates.push({ 
          productId: item.product_id, 
          quantity: item.quantity 
        })
      }

      // 5. Se il metodo di rimborso è voucher, crea un nuovo voucher
      if (refundMethod === 'voucher') {
        const now = new Date();
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

        const createVoucherResponse = await fetch(`${server}/api/vouchers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            origin_order_id: orderId,
            total_amount: deposit,
            validity_start_date: now.toISOString(),
            validity_end_date: oneYearFromNow.toISOString()
          }),
        })

        if (!createVoucherResponse.ok) {
          throw new Error('Errore durante la creazione del voucher')
        }
      }

    } catch (error) {
      // Se qualsiasi operazione fallisce dopo l'aggiornamento del magazzino,
      // ripristina le quantità
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
        })
      }
      throw error
    }

  } catch (error) {
    console.error('Errore durante l\'annullamento della prenotazione:', error)
    throw error
  }
} 