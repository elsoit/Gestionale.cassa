'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CreditCard, Banknote, Ticket, Loader2, Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type RefundMethod = 'electronic' | 'cash' | 'voucher'

interface ReturnModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (
    refundMethod: RefundMethod, 
    amount: number, 
    isPartialReturn: boolean,
    returnQuantities: ReturnQuantity
  ) => Promise<void>
  amount: number
  orderId: number
}

interface OrderItem {
  id: number
  product_id: number
  order_id: number
  quantity: number
  unit_cost: string
  discount: string
  final_cost: string
  total: string
  tax: string
  deleted: boolean
  article_code: string
  variant_code: string
  retail_price: string
  size: string
  color: string
}

interface ReturnQuantity {
  [key: number]: number // itemId: quantity
}

export function ReturnModal({ isOpen, onClose, onConfirm, amount, orderId }: ReturnModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<RefundMethod | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [returnQuantities, setReturnQuantities] = useState<ReturnQuantity>({})

  // Determina se mostrare la colonna "Da Rendere"
  const showReturnQuantityColumn = orderItems.length > 1 || (orderItems.length === 1 && orderItems[0]?.quantity > 1);

  // Calcola il totale del rimborso basato sulle quantità selezionate
  const calculateRefundTotal = () => {
    if (!showReturnQuantityColumn) return amount;

    return orderItems.reduce((total, item) => {
      const itemQuantity = returnQuantities[item.id] || 0;
      const itemPrice = parseFloat(item.final_cost) || 0;
      const itemTotal = (itemQuantity * itemPrice);
      return total + itemTotal;
    }, 0);
  };

  const refundTotal = calculateRefundTotal();

  // Calcola il totale dei pezzi da rendere
  const totalPiecesToReturn = Object.values(returnQuantities).reduce((sum, quantity) => sum + quantity, 0);

  useEffect(() => {
    const fetchOrderItems = async () => {
      if (!orderId) return;
      
      setIsLoadingItems(true);
      try {
        const response = await fetch(`${process.env.API_URL}/api/order-items/order/${orderId}`);
        if (!response.ok) throw new Error('Errore nel recupero degli items');
        const data = await response.json();
        setOrderItems(data);
        
        // Inizializza le quantità di reso a 0 per ogni item
        const initialQuantities: ReturnQuantity = {};
        data.forEach((item: OrderItem) => {
          initialQuantities[item.id] = 0;
        });
        setReturnQuantities(initialQuantities);
      } catch (error) {
        console.error('Errore durante il recupero degli items:', error);
      } finally {
        setIsLoadingItems(false);
      }
    };

    if (isOpen) {
      fetchOrderItems();
    }
  }, [orderId, isOpen]);

  // Determina se è un reso parziale
  const isPartialReturn = () => {
    console.log('\n=== RIEPILOGO QUANTITÀ ===');
    let totalItemsToReturn = 0;
    let totalItemsInOrder = 0;

    orderItems.forEach(item => {
      const returnQuantity = returnQuantities[item.id] || 0;
      totalItemsToReturn += returnQuantity;
      totalItemsInOrder += item.quantity;
      
      console.log(`Articolo: ${item.article_code} (${item.variant_code})`);
      console.log(`- Quantità nell'ordine: ${item.quantity}`);
      console.log(`- Quantità da rendere: ${returnQuantity}`);
      console.log('------------------------');
    });

    console.log('Totale pezzi nell\'ordine:', totalItemsInOrder);
    console.log('Totale pezzi da rendere:', totalItemsToReturn);
    
    // È un reso parziale se stiamo rendendo MENO pezzi del totale
    const isPartial = totalItemsToReturn < totalItemsInOrder;
    console.log('È un reso parziale?', isPartial);
    
    return isPartial; // true = reso parziale (status 26), false = reso totale (status 20)
  };

  const handleConfirm = async () => {
    if (!selectedMethod) return
    
    setIsLoading(true)
    try {
      // Se c'è un solo prodotto con quantità 1, imposta automaticamente i valori
      if (orderItems.length === 1 && orderItems[0].quantity === 1) {
        const singleItem = orderItems[0];
        const returnQuantities = {
          [singleItem.id]: 1
        };
        const refundTotal = parseFloat(singleItem.final_cost);
        
        console.log('Reso singolo prodotto:', {
          quantità: 1,
          totale: refundTotal,
          prodotto_id: singleItem.id
        });
        
        await onConfirm(
          selectedMethod,
          refundTotal,
          false, // non è un reso parziale
          returnQuantities
        );
      } else {
        const isPartial = isPartialReturn();
        console.log('ReturnModal - isPartial prima di onConfirm:', isPartial);
        
        await onConfirm(
          selectedMethod,
          refundTotal,
          isPartial,
          returnQuantities
        );
      }
      onClose();
    } catch (error) {
      console.error('Errore durante il reso:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleQuantityChange = (itemId: number, quantity: number) => {
    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  const refundOptions = [
    {
      id: 'electronic',
      label: 'Pagamento Elettronico',
      icon: <CreditCard className="h-6 w-6" />
    },
    {
      id: 'cash',
      label: 'Contanti',
      icon: <Banknote className="h-6 w-6" />
    },
    {
      id: 'voucher',
      label: 'Buono Spesa',
      icon: <Ticket className="h-6 w-6" />
    }
  ]

  // Calcola se c'è almeno un pezzo selezionato per il reso
  const hasSelectedItems = Object.values(returnQuantities).some(quantity => quantity > 0);

  // Determina se il pulsante deve essere disabilitato
  const isConfirmDisabled = !selectedMethod || 
    (showReturnQuantityColumn && !hasSelectedItems); // Disabilita se è un ordine multiplo e non ci sono pezzi selezionati

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Effettua Reso</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-6 max-h-[300px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Articolo</TableHead>
                  <TableHead>Variante</TableHead>
                  <TableHead>Taglia</TableHead>
                  <TableHead>Colore</TableHead>
                  <TableHead className="text-right">Quantità</TableHead>
                  {showReturnQuantityColumn && (
                    <TableHead className="text-right">Da Rendere</TableHead>
                  )}
                  <TableHead className="text-right">Prezzo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingItems ? (
                  <TableRow>
                    <TableCell colSpan={showReturnQuantityColumn ? 7 : 6} className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : orderItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showReturnQuantityColumn ? 7 : 6} className="text-center py-4 text-gray-500">
                      Nessun articolo trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  orderItems.map((item) => {
                    const price = parseFloat(item.retail_price) || 0;
                    const total = parseFloat(item.total) || 0;
                    const quantityOptions = Array.from({ length: item.quantity + 1 }, (_, i) => i);
                    const returnQuantity = returnQuantities[item.id] || 0;
                    
                    return (
                      <TableRow 
                        key={item.id}
                        className={cn(
                          returnQuantity > 0 && "bg-red-50"
                        )}
                      >
                        <TableCell>{item.article_code}</TableCell>
                        <TableCell>{item.variant_code}</TableCell>
                        <TableCell>{item.size}</TableCell>
                        <TableCell>{item.color}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        {showReturnQuantityColumn && (
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (returnQuantity > 0) {
                                    handleQuantityChange(item.id, returnQuantity - 1);
                                  }
                                }}
                                disabled={!returnQuantity}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className={cn(
                                "w-8 text-center",
                                returnQuantity > 0 && "text-red-500 font-bold"
                              )}>
                                {returnQuantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  const currentQuantity = returnQuantities[item.id] || 0;
                                  if (currentQuantity < item.quantity) {
                                    handleQuantityChange(item.id, currentQuantity + 1);
                                  }
                                }}
                                disabled={returnQuantities[item.id] === item.quantity}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          {(parseFloat(item.final_cost) || 0).toFixed(2)} €
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-gray-600 mb-4">
            Seleziona il metodo di rimborso per € <span className="font-bold">{refundTotal.toFixed(2)}</span>
            {totalPiecesToReturn > 0 && (
              <span> ({totalPiecesToReturn} {totalPiecesToReturn === 1 ? 'pezzo' : 'pezzi'} da rendere)</span>
            )}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {refundOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedMethod(option.id as RefundMethod)}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all",
                  selectedMethod === option.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                {option.icon}
                <span className="mt-2 text-sm text-center">{option.label}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Elaborazione...
                </>
              ) : (
                'Conferma Reso e Rimborso'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 