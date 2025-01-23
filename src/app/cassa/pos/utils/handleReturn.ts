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

export async function handleReturn({
  orderId,
  warehouseId,
  refundMethod,
  deposit,
  isPartialReturn,
  returnQuantities
}: HandleReturnParams): Promise<void> {
  try {
    console.log('\n=== HANDLE RETURN ===');
    console.log('isPartialReturn ricevuto:', isPartialReturn);
    console.log('Status che verrà impostato:', isPartialReturn ? 26 : 20);
    
    const completedStockUpdates: Array<{ productId: number; quantity: number }> = []

    try {
      // 1. Recupera gli order items prima di fare qualsiasi modifica
      const orderItemsResponse = await fetch(`${server}/api/order-items/order/${orderId}`)
      if (!orderItemsResponse.ok) {
        throw new Error('Errore durante il recupero degli items dell\'ordine')
      }
      const orderItems = await orderItemsResponse.json()

      // 2. Aggiorna lo stato dell'ordine a "Reso" (id: 20) o "Reso Parzialmente" (id: 26)
      const updateOrderResponse = await fetch(`${server}/api/order-cancellation/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status_id: isPartialReturn ? 26 : 20, // 26 per reso parziale, 20 per reso totale
        }),
      })

      if (!updateOrderResponse.ok) {
        throw new Error('Errore durante l\'aggiornamento dello stato dell\'ordine')
      }

      // 2.5 Gestione degli order_items per il reso
      for (const item of orderItems) {
        const returnQuantity = returnQuantities[item.id] || 0;
        
        console.log('\n=== PROCESSO ITEM ===');
        console.log(`ID Item: ${item.id}`);
        console.log(`ID Prodotto: ${item.product_id}`);
        console.log(`Quantità nell'ordine: ${item.quantity}`);
        console.log(`Quantità da rendere: ${returnQuantity}`);
        console.log(`Quantità rimanente: ${item.quantity - returnQuantity}`);
        
        if (returnQuantity === 0) {
          console.log('CASO: Skip - Item non viene reso');
          continue;
        }

        if (item.quantity - returnQuantity === 0) {
          console.log('CASO: Reso Totale - Marco item come deleted');
          console.log('DATI VECCHI:', {
            quantity: item.quantity,
            total: item.total,
            deleted: false
          });
          console.log('DATI NUOVI:', {
            quantity: item.quantity,
            total: item.total,
            deleted: true
          });

          await fetch(`${server}/api/order-items/${item.id}/update`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              quantity: item.quantity,
              total: item.total,
              tax: item.tax,
              deleted: true,
            })
          });
        } else if (returnQuantity < item.quantity && item.quantity - returnQuantity > 0) {
          console.log('CASO: Reso Parziale');
          
          // 1. Aggiorna item originale
          const newTotal = parseFloat(item.final_cost) * (item.quantity - returnQuantity);
          console.log('1. AGGIORNO ITEM ORIGINALE');
          console.log('DATI VECCHI:', {
            quantity: item.quantity,
            total: item.total,
            deleted: false
          });
          console.log('DATI NUOVI:', {
            quantity: item.quantity - returnQuantity,
            total: newTotal,
            deleted: false
          });

          await fetch(`${server}/api/order-items/${item.id}/update`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              quantity: item.quantity - returnQuantity,
              total: newTotal,
              tax: item.tax,
              deleted: false
            })
          });

          // 2. Crea nuovo item per la parte resa
          const returnTotal = returnQuantity * parseFloat(item.final_cost);
          console.log('2. CREO NUOVO ITEM PER QUANTITÀ RESA');
          console.log('DATI NUOVO ITEM:', {
            order_id: orderId,
            product_id: item.product_id,
            quantity: returnQuantity,
            total: returnTotal,
            deleted: true
          });

          await fetch(`${server}/api/order-items/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order_id: orderId,
              product_id: item.product_id,
              quantity: returnQuantity,
              unit_cost: item.unit_cost,
              discount: item.discount,
              final_cost: item.final_cost,
              total: returnTotal,
              tax: item.tax,
              deleted: true,
            })
          });
        }
        console.log('------------------------');
      }

      // 3. Gestione dei pagamenti in base al tipo di reso
      if (!isPartialReturn) {
        // Per reso totale: marca tutti i pagamenti come cancelled
        const updatePaymentsResponse = await fetch(`${server}/api/order-cancellation/order-payments/${orderId}/update-status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from_status_id: 6, // Pagamenti completati
            to_status_id: 21, // Cancelled
          }),
        });

        if (!updatePaymentsResponse.ok) {
          throw new Error('Errore durante l\'aggiornamento dello stato dei pagamenti')
        }
      } else {
        // Per reso parziale:
        // 1. Marca i pagamenti esistenti come cancelled
        await fetch(`${server}/api/order-cancellation/order-payments/${orderId}/update-status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from_status_id: 6,
            to_status_id: 21,
          }),
        });

        // 2. Calcola il nuovo totale (somma dei prodotti non resi)
        const newTotal = orderItems.reduce((total, item) => {
          const returnQuantity = returnQuantities[item.id] || 0;
          const remainingQuantity = item.quantity - returnQuantity;
          if (remainingQuantity > 0) {
            return total + (parseFloat(item.final_cost) * remainingQuantity);
          }
          return total;
        }, 0);

        // 3. Calcola la nuova tax
        const newTax = (newTotal / 122 * 22).toFixed(2);

        console.log('\n=== CREO NUOVO PAGAMENTO ===');
        console.log('Nuovo totale:', newTotal);
        console.log('Nuova tax:', newTax);

        // 4. Crea nuovo pagamento per i prodotti non resi
        const paymentData = {
          internal_code: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          order_id: orderId,
          payment_method_id: 6, // Pagamento con carta
          amount: newTotal,
          tax: newTax,
          payment_date: new Date().toISOString(),
          charge_date: new Date().toISOString(),
          status_id: 6 // Pagamento completato
        };

        const createPaymentResponse = await fetch(`${server}/api/order-payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData)
        });

        if (!createPaymentResponse.ok) {
          throw new Error('Errore durante la creazione del nuovo pagamento')
        }
      }

      // 4. Aggiorna le disponibilità nel magazzino (storno)
      for (const item of orderItems) {
        const returnQuantity = returnQuantities[item.id] || 0;
        
        // Se non c'è quantità da rendere, salta l'aggiornamento del magazzino
        if (returnQuantity === 0) continue;

        console.log('\n=== AGGIORNAMENTO MAGAZZINO ===');
        console.log(`Prodotto ID: ${item.product_id}`);
        console.log(`Quantità da stornare: ${returnQuantity}`);

        const updateStockResponse = await fetch(`${server}/api/product-availability/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_id: item.product_id,
            warehouse_id: warehouseId,
            quantity: returnQuantity,
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
          quantity: returnQuantity 
        })
      }

      // 5. Se il metodo di rimborso è voucher, crea un nuovo voucher
      if (refundMethod === 'voucher') {
        const now = new Date();
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

        // Calcola il totale degli articoli resi
        const voucherAmount = orderItems.reduce((total, item) => {
          const returnQuantity = returnQuantities[item.id] || 0;
          if (returnQuantity > 0) {
            return total + (parseFloat(item.final_cost) * returnQuantity);
          }
          return total;
        }, 0);

        console.log('\n=== CREAZIONE VOUCHER ===');
        console.log('Totale articoli resi:', voucherAmount);

        const createVoucherResponse = await fetch(`${server}/api/vouchers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            origin_order_id: orderId,
            total_amount: voucherAmount, // Uso il totale degli articoli resi invece di deposit
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
    console.error('Errore durante il reso:', error)
    throw error
  }
} 