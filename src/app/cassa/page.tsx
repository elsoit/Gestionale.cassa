'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function OrdersPage() {
  const [selectedPuntoVendita, setSelectedPuntoVendita] = useState<string>('')
  const [expandedOrders, setExpandedOrders] = useState<number[]>([])

  // Query per ottenere i punti vendita
  const { data: puntiVendita } = useQuery({
    queryKey: ['puntiVendita'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3003/api/punti-vendita')
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json()
    }
  })

  // Query per ottenere gli ordini con i dettagli dei prodotti e pagamenti
  const { data: orders = [] } = useQuery({
    queryKey: ['orders', selectedPuntoVendita],
    queryFn: async () => {
      const url = selectedPuntoVendita && selectedPuntoVendita !== 'all'
        ? `http://localhost:3003/api/orders/punto-vendita/${selectedPuntoVendita}`
        : 'http://localhost:3003/api/orders'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Network response was not ok')
      const orders = await response.json()

      // Recupera i dettagli dei prodotti e pagamenti per ogni ordine
      const ordersWithDetails = await Promise.all(orders.map(async (order: any) => {
        const [detailsResponse, paymentsResponse] = await Promise.all([
          fetch(`http://localhost:3003/api/order-items/order/${order.id}`),
          fetch(`http://localhost:3003/api/order-payments/order/${order.id}`)
        ]);
        const details = await detailsResponse.json();
        const payments = await paymentsResponse.json();
        
        // Calcola i totali senza arrotondamenti intermedi
        const totalPaid = payments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0);
        const discountedTotal = Number(order.final_total);  // Questo è già il totale scontato
        const remainingAmount = discountedTotal - totalPaid;  // Calcola quanto resta da pagare
        
        // Formatta il remaining amount per gestire i ±5 centesimi
        const formatRemainingAmount = (amount: number) => {
          return Math.abs(amount) <= 0.05 ? 0 : amount;
        };
        
        return { 
          ...order, 
          items: details, 
          payments,
          totalPaid: Math.round(totalPaid * 100) / 100,
          remainingAmount: formatRemainingAmount(Math.round(remainingAmount * 100) / 100)
        };
      }));

      return ordersWithDetails;
    }
  });

  const toggleOrderExpansion = (orderId: number) => {
    setExpandedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  // Funzione per formattare lo stato dell'ordine
  const getStatusColor = (statusId: number) => {
    switch (statusId) {
      case 1: return 'text-yellow-600 bg-yellow-50'
      case 2: return 'text-blue-600 bg-blue-50'
      case 3: return 'text-orange-600 bg-orange-50'
      case 4: return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (statusId: number) => {
    switch (statusId) {
      case 1: return 'In attesa'
      case 2: return 'In elaborazione'
      case 3: return 'Pagato parzialmente'
      case 4: return 'Saldato'
      default: return 'Sconosciuto'
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Select value={selectedPuntoVendita} onValueChange={setSelectedPuntoVendita}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Seleziona punto vendita" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i punti vendita</SelectItem>
            {puntiVendita?.map((pv: any) => (
              <SelectItem key={pv.id} value={pv.id.toString()}>
                {pv.name || `${pv.channel_name} - ${pv.warehouse_name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Codice Ordine</TableHead>
              <TableHead>Data e Ora</TableHead>
              <TableHead>Punto Vendita</TableHead>
              <TableHead>Totale Pezzi</TableHead>
              <TableHead>Totale</TableHead>
              <TableHead>Sconto</TableHead>
              <TableHead>Totale Scontato</TableHead>
              <TableHead>IVA</TableHead>
              <TableHead>Totale Pagato</TableHead>
              <TableHead>Da Pagare</TableHead>
              <TableHead>Stato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((order: any) => (
              <>
                <TableRow 
                  key={order.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleOrderExpansion(order.id)}
                >
                  <TableCell>
                    {expandedOrders.includes(order.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </TableCell>
                  <TableCell className="font-medium">{order.code}</TableCell>
                  <TableCell>
                    {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: it })}
                  </TableCell>
                  <TableCell>
                    {puntiVendita?.find((pv: any) => pv.id === order.punto_vendita_id)?.name || 
                     `PV-${order.punto_vendita_id}`}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {Array.isArray(order.items) ? order.items.reduce((sum: number, item: any) => sum + item.quantity, 0) : 0}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {Number(order.total_price).toFixed(2)} €
                  </TableCell>
                  <TableCell>
                    {Number(order.discount).toFixed(2)}%
                  </TableCell>
                  <TableCell className="font-semibold">
                    {Number(order.final_total).toFixed(2)} €
                  </TableCell>
                  <TableCell className="font-semibold">
                    {Number(order.tax).toFixed(2)} €
                  </TableCell>
                  <TableCell className="font-semibold">
                    {Number(order.totalPaid).toFixed(2)} €
                  </TableCell>
                  <TableCell className={`font-semibold ${order.remainingAmount === 0 ? 'text-gray-400' : 'text-red-500'}`}>
                    {order.remainingAmount === 0 ? '0.00 €' : `-${Math.abs(order.remainingAmount).toFixed(2)} €`}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status_id)}`}>
                      {getStatusText(order.status_id)}
                    </span>
                  </TableCell>
                </TableRow>
                {expandedOrders.includes(order.id) && (
                  <TableRow>
                    <TableCell colSpan={12} className="bg-gray-50 p-4">
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold mb-2">Dettagli Articoli</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Articolo</TableHead>
                                <TableHead>Quantità</TableHead>
                                <TableHead>Prezzo Unitario</TableHead>
                                <TableHead>Sconto</TableHead>
                                <TableHead>Prezzo Scontato</TableHead>
                                <TableHead>IVA</TableHead>
                                <TableHead>Totale</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array.isArray(order.items) && order.items.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.product_id}</TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>{parseFloat(item.unit_cost).toFixed(2)} €</TableCell>
                                  <TableCell>{parseFloat(item.discount).toFixed(2)}%</TableCell>
                                  <TableCell>{parseFloat(item.final_cost).toFixed(2)} €</TableCell>
                                  <TableCell>{parseFloat(item.tax).toFixed(2)} €</TableCell>
                                  <TableCell>{parseFloat(item.total).toFixed(2)} €</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Dettagli Pagamenti</h3>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data Pagamento</TableHead>
                                <TableHead>Modalità</TableHead>
                                <TableHead>Importo</TableHead>
                                <TableHead>IVA</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array.isArray(order.payments) && order.payments.map((payment: any) => (
                                <TableRow key={payment.id}>
                                  <TableCell>
                                    {format(new Date(payment.payment_date), 'dd/MM/yyyy HH:mm', { locale: it })}
                                  </TableCell>
                                  <TableCell>
                                    {payment.payment_method_id === 4 ? 'CARTA' : 
                                     payment.payment_method_id === 2 ? 'CONTANTI' : 
                                     payment.payment_method_id === 3 ? 'BONIFICO BANCARIO' : 
                                     'ALTRO'}
                                  </TableCell>
                                  <TableCell className="font-semibold">
                                    {parseFloat(payment.amount).toFixed(2)} €
                                  </TableCell>
                                  <TableCell>
                                    {parseFloat(payment.tax).toFixed(2)} €
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(!Array.isArray(order.payments) || order.payments.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-gray-500">
                                    Nessun pagamento registrato
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
