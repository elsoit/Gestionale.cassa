'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { ChevronDown, ChevronRight, CreditCard, Copy, Check, Ticket, Package } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

const fetchMainPhoto = async (article_code: string, variant_code: string) => {
  try {
    // Normalizza i codici per la ricerca
    const normalizedArticleCode = article_code.replace(/\s+/g, '').toLowerCase();
    const normalizedVariantCode = variant_code.replace(/\s+/g, '').toLowerCase();
    
    const response = await fetch(`${process.env.API_URL}/api/products/photos/${normalizedArticleCode}/${normalizedVariantCode}/main`);
    if (!response.ok) return null;
    const photo = await response.json();
    
    // Verifica che la foto corrisponda effettivamente al prodotto
    if (photo && 
        photo.article_code === normalizedArticleCode && 
        photo.variant_code === normalizedVariantCode) {
      return photo;
    }
    return null;
  } catch (error) {
    console.error('Error fetching main photo:', error);
    return null;
  }
};

export default function OrdersPage() {
  const [selectedPuntoVendita, setSelectedPuntoVendita] = useState<string>('')
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null)
  const [copiedOrderCode, setCopiedOrderCode] = useState<string | null>(null)

  // Query per ottenere i punti vendita
  const { data: puntiVendita } = useQuery({
    queryKey: ['puntiVendita'],
    queryFn: async () => {
      const response = await fetch(`${process.env.API_URL}/api/punti-vendita`)
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json()
    }
  })

  // Query per ottenere gli ordini con i dettagli dei prodotti e pagamenti
  const { data: orders = [] } = useQuery({
    queryKey: ['orders', selectedPuntoVendita],
    queryFn: async () => {
      const url = selectedPuntoVendita && selectedPuntoVendita !== 'all'
        ? `${process.env.API_URL}/api/orders/punto-vendita/${selectedPuntoVendita}`
        : `${process.env.API_URL}/api/orders`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Network response was not ok')
      const orders = await response.json()

      // Recupera i dettagli dei prodotti e pagamenti per ogni ordine
      const ordersWithDetails = await Promise.all(orders.map(async (order: any) => {
        const [detailsResponse, paymentsResponse, vouchersResponse] = await Promise.all([
          fetch(`${process.env.API_URL}/api/order-items/order/${order.id}`),
          fetch(`${process.env.API_URL}/api/order-payments/order/${order.id}`),
          fetch(`${process.env.API_URL}/api/vouchers/order/${order.id}`)
        ]);
        const details = await detailsResponse.json();
        const payments = await paymentsResponse.json();
        const vouchers = await vouchersResponse.json();
        
        // Recupera i dettagli completi dei prodotti e le foto
        const itemsWithDetails = await Promise.all(details.map(async (item: any) => {
          const [productResponse, mainPhoto] = await Promise.all([
            fetch(`${process.env.API_URL}/api/products/${item.product_id}`),
            fetchMainPhoto(item.article_code, item.variant_code)
          ]);
          
          const productDetails = await productResponse.json();
          
          return {
            ...item,
            main_photo: mainPhoto,
            article_code: productDetails.article_code,
            variant_code: productDetails.variant_code,
            size_name: productDetails.size_name
          };
        }));
        
        // Calcola il totale degli articoli non resi
        const calculateNonReturnedTotal = (items: any[]) => {
          return items
            .filter(item => !item.deleted)
            .reduce((sum, item) => sum + parseFloat(item.total), 0);
        };
        
        // Calcola i totali senza arrotondamenti intermedi
        const totalPaid = payments.reduce((sum: number, payment: any) => 
          payment.status_id !== 21 ? sum + Number(payment.amount) : sum
        , 0);

        // Per resi parziali usa nonReturnedTotal, altrimenti usa final_total
        const effectiveTotal = order.status_id === 26 
          ? calculateNonReturnedTotal(itemsWithDetails)
          : Number(order.final_total);

        // Se l'ordine è reso o annullato, remainingAmount è sempre 0
        const remainingAmount = order.status_id === 20 || order.status_id === 19 
          ? 0 
          : effectiveTotal - totalPaid;

        const formatRemainingAmount = (amount: number) => {
          return Math.abs(amount) <= 0.05 ? 0 : amount;
        };
        
        // Calcola l'IVA totale dai pagamenti non cancellati
        const calculateActiveTax = (payments: any[]) => {
          return payments
            .filter(payment => payment.status_id !== 21)
            .reduce((sum, payment) => sum + parseFloat(payment.tax), 0);
        };
        
        return { 
          ...order, 
          items: itemsWithDetails,
          payments,
          vouchers,
          totalPaid: Math.round(totalPaid * 100) / 100,
          remainingAmount: formatRemainingAmount(Math.round(remainingAmount * 100) / 100),
          nonReturnedTotal: calculateNonReturnedTotal(itemsWithDetails),
          activeTax: calculateActiveTax(payments)
        };
      }));

      return ordersWithDetails;
    }
  });

  const toggleOrderExpansion = (orderId: number) => {
    setExpandedOrder(prev => prev === orderId ? null : orderId)
  }

  // Funzione per formattare lo stato dell'ordine
  // ... existing code ...
  const getStatusColor = (statusId: number) => {
    switch (statusId) {
      case 16: return 'text-gray-600 bg-gray-50'      // Bozza
      case 17: return 'bg-green-100 text-green-800' // Pagato parzialmente
      case 18: return 'bg-green-800 text-green-100'   // Saldato
      case 19: return 'bg-red-800 text-red-100'       // Annullato
      case 20: return 'bg-red-100 text-red-800'       // Reso
      case 26: return 'bg-orange-100 text-orange-800' // Reso Parzialmente
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (statusId: number) => {
    switch (statusId) {
      case 16: return 'Bozza'
      case 17: return 'PRENOTAZIONE'
      case 18: return 'VENDITA'
      case 19: return 'ANNULLATO'
      case 20: return 'RESO'
      case 26: return 'RESO PARZIALE'
      default: return 'Sconosciuto'
    }
  }

  const getBorderColor = (statusId: number) => {
    switch (statusId) {
      case 16: return 'border-gray-300/50 ring-gray-300/50'      // Bozza
      case 17: return 'border-green-300/50 ring-green-300/50'    // Pagato parzialmente
      case 18: return 'border-green-600/50 ring-green-600/50'    // Saldato
      case 19: return 'border-red-600/50 ring-red-600/50'        // Annullato
      case 20: return 'border-red-300/50 ring-red-300/50'        // Reso
      case 26: return 'border-orange-300/50 ring-orange-300/50'  // Reso Parzialmente
      default: return 'border-gray-300/50 ring-gray-300/50'
    }
  }

  const getBackgroundColor = (statusId: number, isExpanded: boolean) => {
    switch (statusId) {
      case 16: return isExpanded ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50/50 hover:bg-gray-100/70'              // Bozza
      case 17: return isExpanded ? 'bg-green-100 hover:bg-green-200' : 'bg-green-50/50 hover:bg-green-100/70'          // Pagato parzialmente
      case 18: return isExpanded ? 'bg-green-100 hover:bg-green-200' : 'bg-green-50/50 hover:bg-green-100/70'          // Saldato
      case 19: return isExpanded ? 'bg-red-100 hover:bg-red-200' : 'bg-red-50/50 hover:bg-red-100/70'                  // Annullato
      case 20: return isExpanded ? 'bg-red-100 hover:bg-red-200' : 'bg-red-50/50 hover:bg-red-100/70'                  // Reso
      case 26: return isExpanded ? 'bg-orange-100 hover:bg-orange-200' : 'bg-orange-50/50 hover:bg-orange-100/70'      // Reso Parzialmente
      default: return isExpanded ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50/50 hover:bg-gray-100/70'
    }
  }

  // Funzione per copiare il barcode
  const copyBarcode = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(barcode);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  // Funzione per copiare il codice ordine
  const copyOrderCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedOrderCode(code);
    setTimeout(() => setCopiedOrderCode(null), 2000);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
        <Link href="/cassa/pos">
            <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <CreditCard className="w-5 h-5" />
            Cassa
          </Button>
        </Link>
          <h1 className="text-2xl font-semibold text-gray-800">Storico Ordini</h1>
        </div>
        <Select value={selectedPuntoVendita} onValueChange={setSelectedPuntoVendita}>
          <SelectTrigger className="w-[300px] border-gray-200">
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="w-8"></TableHead>
              <TableHead className="font-semibold">Codice Ordine</TableHead>
              <TableHead className="font-semibold">Data e Ora</TableHead>
              <TableHead className="font-semibold">Punto Vendita</TableHead>
              <TableHead className="font-semibold">Totale Pezzi</TableHead>
              <TableHead className="font-semibold">Totale</TableHead>
              <TableHead className="font-semibold">Sconto</TableHead>
              <TableHead className="font-semibold">Totale Scontato</TableHead>
              <TableHead className="font-semibold">IVA</TableHead>
              <TableHead className="font-semibold">Totale Pagato</TableHead>
              <TableHead className="font-semibold">Da Pagare</TableHead>
              <TableHead className="font-semibold">Stato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((order: any) => (
              <React.Fragment key={order.id}>
                <TableRow 
                  className={`cursor-pointer transition-all duration-200 ${getBackgroundColor(order.status_id, expandedOrder === order.id)} ${
                    expandedOrder === order.id 
                      ? `relative z-10 shadow-[0_-12px_24px_-12px_rgba(0,0,0,0.1)] border-x border-t ring-1 ${getBorderColor(order.status_id)}` 
                      : expandedOrder !== null 
                        ? 'opacity-50 hover:opacity-75'
                        : ''
                  }`}
                  onClick={() => toggleOrderExpansion(order.id)}
                >
                  <TableCell>
                    {expandedOrder === order.id ? 
                      <ChevronDown className="w-4 h-4 text-gray-500" /> : 
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    }
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">{order.code}</TableCell>
                  <TableCell className="text-gray-600">
                    {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: it })}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {puntiVendita?.find((pv: any) => pv.id === order.punto_vendita_id)?.name || 
                     `PV-${order.punto_vendita_id}`}
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    {Array.isArray(order.items) ? order.items.reduce((sum: number, item: any) => sum + item.quantity, 0) : 0}
                  </TableCell>
                  <TableCell className={`font-semibold ${
                    order.status_id === 19 || order.status_id === 20 || order.status_id === 26 ? 'line-through text-gray-400' : 
                    Number(order.total_price) === 0 ? 'text-gray-400' : 'text-gray-900'
                  }`}>
                    {Number(order.total_price).toFixed(2)} €
                  </TableCell>
                  <TableCell className={
                    order.status_id === 19 || order.status_id === 20 || order.status_id === 26 ? 'line-through text-gray-400' : 
                    Number(order.discount) === 0 ? 'text-gray-400' : 'text-gray-600'
                  }>
                    {Number(order.discount).toFixed(2)}%
                  </TableCell>
                  <TableCell className={`font-semibold ${
                    order.status_id === 19 || order.status_id === 20 ? 'line-through text-gray-400' : 
                    order.status_id === 26 ? '' :
                    Number(order.final_total) === 0 ? 'text-gray-400' : 'text-gray-900'
                  }`}>
                    {order.status_id === 26 ? (
                      <div>
                        <span className="line-through text-gray-400">{Number(order.final_total).toFixed(2)} €</span>
                        <span className={`ml-2 ${Number(order.nonReturnedTotal) === 0 ? 'text-gray-400' : ''}`}>
                          {Number(order.nonReturnedTotal).toFixed(2)} €
                        </span>
                      </div>
                    ) : (
                      `${Number(order.final_total).toFixed(2)} €`
                    )}
                  </TableCell>
                  <TableCell className={`font-semibold ${Number(order.activeTax) === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                    {Number(order.activeTax).toFixed(2)} €
                  </TableCell>
                  <TableCell className={`font-semibold ${
                    order.status_id === 19 ? 'line-through text-gray-400' : 
                    Number(order.totalPaid) === 0 ? 'text-gray-400' : 'text-gray-900'
                  }`}>
                    {Number(order.totalPaid).toFixed(2)} €
                    {order.vouchers?.some((v: any) => v.status_id === 23) && (
                      <span className="ml-2">
                        <Ticket className="inline-block w-4 h-4 text-gray-600" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={`font-semibold ${order.remainingAmount === 0 || order.status_id === 19 || order.status_id === 20 ? 'text-gray-400' : 'text-red-500'}`}>
                    {order.status_id === 19 || order.status_id === 20 ? '0.00 €' : 
                     order.remainingAmount === 0 ? '0.00 €' : 
                     `-${Math.abs(order.remainingAmount).toFixed(2)} €`}
                  </TableCell>
                  <TableCell>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status_id)}`}>
                      {getStatusText(order.status_id)}
                    </span>
                  </TableCell>
                </TableRow>
                {expandedOrder === order.id && (
                  <TableRow>
                    <TableCell colSpan={12} className={`bg-white p-6 space-y-6 relative z-10 shadow-[0_12px_24px_-12px_rgba(0,0,0,0.1)] border-x border-b ring-1 ${getBorderColor(order.status_id)} -mt-[1px]`}>
                      <div className="space-y-6">
                        {/* Sezione Dettagli Articoli */}
                        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Package className="w-5 h-5 text-gray-600" />
                              <h3 className="font-semibold text-gray-800">Dettagli Articoli</h3>
                            </div>
                            {order.items.some((item: { deleted: boolean }) => item.deleted) && (
                              <div className="text-sm text-red-600 font-medium">
                                Articoli Resi: {order.items
                                  .filter((item: { deleted: boolean }) => item.deleted)
                                  .reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0)}
                              </div>
                            )}
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="font-semibold">Articolo</TableHead>
                                <TableHead className="font-semibold">Quantità</TableHead>
                                <TableHead className="font-semibold">Prezzo Unitario</TableHead>
                                <TableHead className="font-semibold">Sconto</TableHead>
                                <TableHead className="font-semibold">Prezzo Scontato</TableHead>
                                <TableHead className="font-semibold">IVA</TableHead>
                                <TableHead className="font-semibold">Totale</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array.isArray(order.items) && order.items.map((item: any) => (
                                <TableRow 
                                  key={item.id} 
                                  className={`${
                                    item.deleted 
                                      ? 'bg-red-50 hover:bg-red-100' 
                                      : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <TableCell className={item.deleted ? '' : ''}>
                                    <div className="flex items-center gap-4">
                                      {item.main_photo?.url && (
                                        <div className="relative w-12 h-12 flex-shrink-0">
                                          <Image
                                            src={item.main_photo.url}
                                            alt={`${item.article_code} ${item.variant_code}`}
                                            fill
                                            className={`object-cover rounded-md ${item.deleted ? 'opacity-50' : ''}`}
                                          />
                                        </div>
                                      )}
                                      <div className="flex flex-col gap-1">
                                        <div className={`flex items-center gap-2 ${item.deleted ? 'line-through text-gray-400' : ''}`}>
                                          <span className="font-medium text-gray-900">{item.article_code?.toUpperCase()}</span>
                                        <span className="text-gray-400">-</span>
                                          <span className="font-medium text-gray-900">{item.variant_code?.toUpperCase()}</span>
                                        <span className="text-gray-400">-</span>
                                          <span className="font-medium text-gray-900">{item.size_name}</span>
                                        </div>
                                        {item.deleted && item.updated_at && (
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs text-red-600">
                                              Reso il {format(new Date(item.updated_at), 'dd/MM/yyyy HH:mm', { locale: it })}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className={`text-center ${
                                    item.deleted ? 'line-through text-gray-400' : 
                                    Number(item.quantity) === 0 ? 'text-gray-400' : 'text-gray-900'
                                  }`}>
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell className={
                                    item.deleted ? 'line-through text-gray-400' : 
                                    Number(item.unit_cost) === 0 ? 'text-gray-400' : 'text-gray-900'
                                  }>
                                    {parseFloat(item.unit_cost).toFixed(2)} €
                                  </TableCell>
                                  <TableCell className={
                                    item.deleted ? 'line-through text-gray-400' : 
                                    Number(item.discount) === 0 ? 'text-gray-400' : 'text-gray-600'
                                  }>
                                    {parseFloat(item.discount).toFixed(2)}%
                                  </TableCell>
                                  <TableCell className={
                                    item.deleted ? 'line-through text-gray-400' : 
                                    Number(item.final_cost) === 0 ? 'text-gray-400' : 'text-gray-900'
                                  }>
                                    {parseFloat(item.final_cost).toFixed(2)} €
                                  </TableCell>
                                  <TableCell className={
                                    item.deleted ? 'line-through text-gray-400' : 
                                    Number(item.tax) === 0 ? 'text-gray-400' : 'text-gray-900'
                                  }>
                                    {parseFloat(item.tax).toFixed(2)} €
                                  </TableCell>
                                  <TableCell className={`font-semibold ${
                                    item.deleted ? 'line-through text-gray-400' : 
                                    Number(item.total) === 0 ? 'text-gray-400' : 'text-gray-900'
                                  }`}>
                                    {parseFloat(item.total).toFixed(2)} €
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Sezione Pagamenti */}
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <div className="flex items-center gap-2 mb-4">
                            <CreditCard className="w-5 h-5 text-gray-600" />
                            <h3 className="font-semibold text-gray-800">Dettagli Pagamenti</h3>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50 hover:bg-gray-50">
                                <TableHead className="font-semibold">Data Pagamento</TableHead>
                                <TableHead className="font-semibold">Modalità</TableHead>
                                <TableHead className="font-semibold">Importo</TableHead>
                                <TableHead className="font-semibold">IVA</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array.isArray(order.payments) && order.payments.map((payment: any) => (
                                <TableRow key={payment.id} className={`hover:bg-gray-50 ${payment.status_id === 21 ? 'line-through decoration-2 text-gray-400 bg-gray-50' : ''}`}>
                                  <TableCell>
                                    {format(new Date(payment.payment_date), 'dd/MM/yyyy HH:mm', { locale: it })}
                                  </TableCell>
                                  <TableCell>
                                    {payment.payment_method_id === 4 ? 'CARTA' : 
                                     payment.payment_method_id === 2 ? 'CONTANTI' : 
                                     payment.payment_method_id === 3 ? 'BONIFICO BANCARIO' : 
                                     'ALTRO'}
                                  </TableCell>
                                  <TableCell className={`font-semibold ${Number(payment.amount) === 0 ? 'text-gray-400' : ''}`}>
                                    {parseFloat(payment.amount).toFixed(2)} €
                                  </TableCell>
                                  <TableCell className={`font-semibold ${Number(payment.tax) === 0 ? 'text-gray-400' : ''}`}>
                                    {parseFloat(payment.tax).toFixed(2)} €
                                  </TableCell>
                                </TableRow>
                              ))}
                              {(!Array.isArray(order.payments) || order.payments.length === 0) && (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                    Nessun pagamento registrato
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Sezione Voucher */}
                        {Array.isArray(order.vouchers) && order.vouchers.length > 0 && (
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                              <Ticket className="w-5 h-5 text-gray-600" />
                              <h3 className="font-semibold text-gray-800">Voucher Associati</h3>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50">
                                  <TableHead className="font-semibold">Codice</TableHead>
                                  <TableHead className="font-semibold">Codice a Barre</TableHead>
                                  <TableHead className="font-semibold">Importo</TableHead>
                                  <TableHead className="font-semibold">Validità</TableHead>
                                  <TableHead className="font-semibold">Stato</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {order.vouchers.map((voucher: any) => {
                                  const isUsed = voucher.status_id === 24 || voucher.status_id === 25;
                                  return (
                                    <TableRow key={voucher.id} className={`hover:bg-gray-50 ${isUsed ? 'text-gray-400 bg-gray-50/80' : ''}`}>
                                      <TableCell>
                                        {voucher.code}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono">
                                            {voucher.barcode}
                                          </span>
                                          <button
                                            onClick={() => copyBarcode(voucher.barcode)}
                                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                            title="Copia codice a barre"
                                          >
                                            {copiedBarcode === voucher.barcode ? (
                                              <Check className="w-4 h-4 text-emerald-600" />
                                            ) : (
                                              <Copy className="w-4 h-4 text-gray-500" />
                                            )}
                                          </button>
                                        </div>
                                      </TableCell>
                                      <TableCell className={`font-semibold ${!isUsed && Number(voucher.total_amount) !== 0 ? 'text-emerald-600' : ''}`}>
                                        {parseFloat(voucher.total_amount).toFixed(2)} €
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex flex-col text-sm">
                                          <span>Valido dal: {format(new Date(voucher.validity_start_date), 'dd/MM/yyyy', { locale: it })}</span>
                                          <span>Scade il: {format(new Date(voucher.validity_end_date), 'dd/MM/yyyy', { locale: it })}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="space-y-2">
                                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                            voucher.status_id === 23 ? 'bg-emerald-100 text-emerald-800' :  // Attivo
                                            voucher.status_id === 24 ? 'bg-gray-100 text-gray-800' :    // Usato
                                            voucher.status_id === 25 ? 'bg-amber-100 text-amber-800' : // Parzialmente usato
                                            'bg-red-100 text-red-800'                                    // Scaduto o altro
                                          }`}>
                                            {voucher.status_id === 23 ? 'Attivo' :
                                             voucher.status_id === 24 ? 'Usato' :
                                             voucher.status_id === 25 ? 'Parzialmente Usato' :
                                             'Scaduto'}
                                          </span>
                                          <div className="text-xs text-gray-600 space-y-1">
                                            {voucher.date_of_use && (
                                              <p>Utilizzato il: {format(new Date(voucher.date_of_use), 'dd/MM/yyyy HH:mm', { locale: it })}</p>
                                            )}
                                            {voucher.destination_order_id && (
                                              <div className="flex items-center gap-2">
                                                <p>Ordine: {orders.find((o: any) => o.id === voucher.destination_order_id)?.code || `CS${voucher.destination_order_id}`}</p>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const orderCode = orders.find((o: any) => o.id === voucher.destination_order_id)?.code || `CS${voucher.destination_order_id}`;
                                                    copyOrderCode(orderCode);
                                                  }}
                                                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                                  title="Copia codice ordine"
                                                >
                                                  {copiedOrderCode === (orders.find((o: any) => o.id === voucher.destination_order_id)?.code || `CS${voucher.destination_order_id}`) ? (
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                  ) : (
                                                    <Copy className="w-3 h-3 text-gray-500" />
                                                  )}
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
