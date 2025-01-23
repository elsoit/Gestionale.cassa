'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, Eye, Euro, CreditCard, FileText, Wallet, Link2, Banknote, QrCode, Smartphone, TicketIcon, X, Receipt, ReceiptText, Ban } from "lucide-react"
import { CartItem, PaymentMethod, Operator } from "../types"

interface DefaultSidebarProps {
  operators: Operator[]
  selectedOperator: string
  orderNumber: string
  orderDate: Date
  currentOrderId: number | null
  deposit: number
  totalToPay: number
  cart: CartItem[]
  selectedPaymentTypes: string[]
  paymentMethodsData: PaymentMethod[]
  paymentAmounts: Record<string, number>
  totalSelected: number
  remainingToPay: number
  selectedDocumentType: string
  isPartialPayment: boolean
  allDocumentTypes: any[]
  isCurrentOrderReservation: boolean
  isSaldato: boolean
  onOperatorChange: (value: string) => void
  onPaymentTypeChange: (code: string) => void
  onPaymentAmountChange: (code: string, isDecimal: boolean, value: string) => void
  onPaymentAmountBlur: (code: string) => void
  onDocumentTypeChange: (value: string) => void
  onConfirm: () => void
  onClose: () => void
  onFreeze: () => void
  onShowPayments: () => void
  onShowVoucherModal: () => void
  onRemovePaymentType: (code: string) => void
  onCancelReservation: () => void
  hasInsufficientStock: () => boolean
}

export function DefaultSidebar({
  operators,
  selectedOperator,
  orderNumber,
  orderDate,
  currentOrderId,
  deposit,
  totalToPay,
  cart,
  selectedPaymentTypes,
  paymentMethodsData,
  paymentAmounts,
  totalSelected,
  remainingToPay,
  selectedDocumentType,
  isPartialPayment,
  allDocumentTypes,
  isCurrentOrderReservation,
  isSaldato,
  onOperatorChange,
  onPaymentTypeChange,
  onPaymentAmountChange,
  onPaymentAmountBlur,
  onDocumentTypeChange,
  onConfirm,
  onClose,
  onFreeze,
  onShowPayments,
  onShowVoucherModal,
  onRemovePaymentType,
  onCancelReservation,
  hasInsufficientStock
}: DefaultSidebarProps) {
  // Prendi l'operatore dal localStorage
  const loggedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const isOperator = loggedUser.operator_id !== undefined;

  console.log('DefaultSidebar - loggedUser:', loggedUser);
  console.log('DefaultSidebar - isOperator:', isOperator);

  // Imposta l'operatore immediatamente al primo render
  useEffect(() => {
    const initOperator = () => {
      console.log('initOperator - Checking operator:', {
        isOperator,
        loggedUserId: loggedUser.operator_id,
        selectedOperator,
        shouldUpdate: isOperator && loggedUser.operator_id && (!selectedOperator || selectedOperator !== loggedUser.operator_id.toString())
      });

      if (isOperator && loggedUser.operator_id && (!selectedOperator || selectedOperator !== loggedUser.operator_id.toString())) {
        console.log('initOperator - Setting operator to:', loggedUser.operator_id.toString());
        onOperatorChange(loggedUser.operator_id.toString());
      }
    };
    initOperator();
  }, [isOperator, loggedUser.operator_id, selectedOperator, onOperatorChange]);

  // Disabilita il Select se l'utente è un operatore
  const isSelectDisabled = isOperator;

  return (
    <aside className="w-96 bg-white border-l">
      <Card className="border-0 rounded-none h-full flex flex-col">
        <CardHeader className="pb-1 px-6 pt-4 border-b">
          <CardTitle className="flex flex-col">
            <Select 
              value={selectedOperator} 
              onValueChange={onOperatorChange}
              disabled={isSelectDisabled}
            >
              <SelectTrigger className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md mb-2 font-medium">
                <SelectValue>
                  {operators.find(op => op.id.toString() === selectedOperator)?.nome} {operators.find(op => op.id.toString() === selectedOperator)?.cognome} ({operators.find(op => op.id.toString() === selectedOperator)?.code})
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem 
                    key={op.id} 
                    value={op.id.toString()}
                    disabled={isOperator && op.id.toString() !== loggedUser.operator_id?.toString()}
                  >
                    {op.nome} {op.cognome} ({op.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-between items-center">
              <span>{orderNumber || 'CASSA 1'}</span>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ChevronDown className="h-5 w-5 text-gray-400" />
              </Button>
            </div>
            <span className="text-sm text-gray-500 font-normal">
              {orderDate.toLocaleDateString('it-IT', { 
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-grow px-6 py-3 space-y-3">
          <div className="space-y-3">
            {currentOrderId && (
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-600">Acconti</span>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-semibold text-lg">{deposit} €</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={onShowPayments}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="bg-gray-50 -mx-6 px-6 py-2 mb-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Totale da pagare</p>
              <p className={`text-3xl font-bold ${paymentAmounts['BSC'] >= totalToPay ? 'text-green-600' : 'text-[#EF4444]'}`}>
                {totalToPay.toFixed(2)} €
              </p>
              {paymentAmounts['BSC'] >= totalToPay && (
                <p className="text-sm text-green-600 font-medium">Coperto da voucher</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Modalità pagamento</p>
              <div className="flex gap-2 mb-4">
                {paymentMethodsData.filter(method => method.code !== 'OTHR').map((method: PaymentMethod) => {
                  const voucherAmount = paymentAmounts['BSC'] || 0;
                  const isVoucherCoveringTotal = voucherAmount >= totalToPay;
                  const isVoucherActive = selectedPaymentTypes.includes('BSC');
                  const isDisabled = cart.length === 0 || 
                                    totalToPay === 0 || 
                                    (isVoucherCoveringTotal && method.code !== 'BSC') ||
                                    (selectedPaymentTypes.length >= 2 && !selectedPaymentTypes.includes(method.code));

                  return (
                    <Button
                      key={method.code}
                      variant={selectedPaymentTypes.includes(method.code) ? 'default' : 'outline'}
                      onClick={() => {
                        if (method.code === 'BSC') {
                          if (isVoucherActive) {
                            onRemovePaymentType('BSC');
                          } else {
                            onShowVoucherModal();
                          }
                        } else {
                          if (selectedPaymentTypes.includes(method.code)) {
                            onRemovePaymentType(method.code);
                          } else {
                            onPaymentTypeChange(method.code);
                          }
                        }
                      }}
                      disabled={isDisabled}
                      className={`h-10 w-10 p-0 relative group transition-colors ${
                        selectedPaymentTypes.includes(method.code)
                          ? 'bg-[#1E1E1E] text-white hover:bg-red-500 hover:border-red-500' 
                          : ''
                      }`}
                    >
                      {selectedPaymentTypes.includes(method.code) ? (
                        <>
                          <div className="group-hover:hidden">
                            {method.icon === 'Euro' && <Euro className="h-4 w-4" />}
                            {method.icon === 'CreditCard' && <CreditCard className="h-4 w-4" />}
                            {method.icon === 'FileText' && <FileText className="h-4 w-4" />}
                            {method.icon === 'Wallet' && <Wallet className="h-4 w-4" />}
                            {method.icon === 'Link2' && <Link2 className="h-4 w-4" />}
                            {method.icon === 'Banknote' && <Banknote className="h-4 w-4" />}
                            {method.icon === 'QrCode' && <QrCode className="h-4 w-4" />}
                            {method.icon === 'Smartphone' && <Smartphone className="h-4 w-4" />}
                            {method.icon === 'Ticket' && <TicketIcon className="h-4 w-4" />}
                          </div>
                          <X className="h-4 w-4 absolute inset-0 m-auto hidden group-hover:block" />
                        </>
                      ) : (
                        <>
                          {method.icon === 'Euro' && <Euro className="h-4 w-4" />}
                          {method.icon === 'CreditCard' && <CreditCard className="h-4 w-4" />}
                          {method.icon === 'FileText' && <FileText className="h-4 w-4" />}
                          {method.icon === 'Wallet' && <Wallet className="h-4 w-4" />}
                          {method.icon === 'Link2' && <Link2 className="h-4 w-4" />}
                          {method.icon === 'Banknote' && <Banknote className="h-4 w-4" />}
                          {method.icon === 'QrCode' && <QrCode className="h-4 w-4" />}
                          {method.icon === 'Smartphone' && <Smartphone className="h-4 w-4" />}
                          {method.icon === 'Ticket' && <TicketIcon className="h-4 w-4" />}
                        </>
                      )}
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {method.name}
                      </span>
                    </Button>
                  );
                })}
              </div>
              
              <div className="space-y-2">
                {selectedPaymentTypes.map((type) => {
                  const paymentMethod = paymentMethodsData.find((pm: PaymentMethod) => pm.code === type);
                  const value = paymentAmounts[type] || 0;
                  const [intPart, decPart] = value.toFixed(2).split('.');
                  
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        {paymentMethod?.icon === 'Euro' && <Euro className="h-4 w-4" />}
                        {paymentMethod?.icon === 'CreditCard' && <CreditCard className="h-4 w-4" />}
                        {paymentMethod?.icon === 'FileText' && <FileText className="h-4 w-4" />}
                        {paymentMethod?.icon === 'Wallet' && <Wallet className="h-4 w-4" />}
                        {paymentMethod?.icon === 'Link2' && <Link2 className="h-4 w-4" />}
                        {paymentMethod?.icon === 'Banknote' && <Banknote className="h-4 w-4" />}
                        {paymentMethod?.icon === 'QrCode' && <QrCode className="h-4 w-4" />}
                        {paymentMethod?.icon === 'Smartphone' && <Smartphone className="h-4 w-4" />}
                        {paymentMethod?.icon === 'Ticket' && <TicketIcon className="h-4 w-4" />}
                        {paymentMethod?.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex relative w-40">
                          <div className={`flex h-10 rounded-md border overflow-hidden ${type === 'BSC' ? 'bg-gray-100' : 'bg-white'} relative`}>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={intPart}
                              onChange={(e) => onPaymentAmountChange(type, false, e.target.value)}
                              onBlur={() => onPaymentAmountBlur(type)}
                              disabled={type === 'BSC'}
                              className={`w-[70%] text-right focus:outline-none px-3 h-full text-base font-medium ${type === 'BSC' ? 'bg-gray-100' : ''}`}
                              placeholder="0"
                            />
                            <span className={`text-gray-400 flex items-center text-base font-medium ${type === 'BSC' ? 'bg-gray-100' : ''}`}>,</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={decPart}
                              onChange={(e) => onPaymentAmountChange(type, true, e.target.value)}
                              onBlur={() => onPaymentAmountBlur(type)}
                              disabled={type === 'BSC'}
                              className={`w-[30%] focus:outline-none px-1 h-full text-base font-medium ${type === 'BSC' ? 'bg-gray-100' : ''}`}
                              placeholder="00"
                            />
                          </div>
                        </div>
                        <span className="text-lg font-medium text-gray-600">€</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600 mb-2">Totale pagamento</span>
              <span className="font-bold text-lg">
                {totalSelected.toFixed(2).replace('.', ',')} €
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-600">
                {totalSelected > remainingToPay ? 'Resto da dare' : 'Resto da pagare'}
              </span>
              <span className={`font-bold text-lg ${Math.abs(totalSelected - remainingToPay) === 0 ? 'text-gray-400' : totalSelected > remainingToPay ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(totalSelected - remainingToPay).toFixed(2).replace('.', ',')} €
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Tipo documento</p>
              <div className="flex gap-2 mb-4">
                {allDocumentTypes
                  .filter(type => {
                    if (isPartialPayment) {
                      return ['no_document', 'payment_receipt', 'invoice'].includes(type.id);
                    }
                    return type.id !== 'payment_receipt';
                  })
                  .map((type) => (
                    <Button
                      key={type.id}
                      variant={selectedDocumentType === type.id ? 'default' : 'outline'}
                      onClick={() => onDocumentTypeChange(type.id)}
                      disabled={cart.length === 0 || selectedPaymentTypes.length === 0}
                      className={`h-10 w-10 p-0 relative group transition-colors ${
                        selectedDocumentType === type.id
                          ? 'bg-[#1E1E1E] text-white hover:bg-red-500 hover:border-red-500' 
                          : ''
                      }`}
                      title={type.name}
                    >
                      {type.icon === 'Receipt' && <Receipt className="h-4 w-4" />}
                      {type.icon === 'ReceiptText' && <ReceiptText className="h-4 w-4" />}
                      {type.icon === 'FileText' && <FileText className="h-4 w-4" />}
                      {type.icon === 'Ban' && <Ban className="h-4 w-4" />}
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {type.name} - {type.description}
                      </span>
                    </Button>
                  ))}
              </div>
            </div>
          </div>

          {isCurrentOrderReservation && (
            <Button
              onClick={onCancelReservation}
              variant="destructive"
              className="w-full mt-4"
            >
              {isSaldato ? "Effettua Reso" : "Annulla Prenotazione"}
            </Button>
          )}
        </CardContent>

        <CardFooter className="mt-auto px-6 pb-4 pt-2 border-t grid grid-cols-4 gap-3">
          <div className="col-span-4">
            {!cart.some(item => item.isFromReservation) && 
             (hasInsufficientStock() || cart.some(item => item.quantity === 0)) && (
              <div className="bg-red-50 text-red-600 p-2 rounded mb-2 text-sm text-center">
                Controlla le quantità nel carrello. Alcuni prodotti superano la disponibilità o non sono disponibili.
              </div>
            )}
          </div>
          <Button 
            className="col-span-2 bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium"
            onClick={onConfirm}
            disabled={cart.length === 0 || totalSelected === 0 || (!cart.some(item => item.isFromReservation) && hasInsufficientStock()) || !selectedDocumentType}
          >
            {isPartialPayment ? 'Conferma Acconto' : 'Conferma'}
          </Button>
          <Button 
            variant="outline" 
            className="text-[#EF4444] border-[#EF4444] hover:bg-red-50 font-medium"
            onClick={onClose}
            disabled={cart.length === 0}
          >
            {cart.some(item => item.isFromReservation) ? 'Chiudi' : 'Annulla'}
          </Button>
          <Button 
            variant="outline" 
            className="text-gray-600 font-medium"
            onClick={onFreeze}
            disabled={cart.length === 0}
          >
            Congela
          </Button>
        </CardFooter>
      </Card>
    </aside>
  )
} 