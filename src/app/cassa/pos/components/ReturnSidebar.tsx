'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { ReturnModal } from './ReturnModal'
import type { RefundMethod } from './ReturnModal'

interface ReturnSidebarProps {
  orderNumber: string
  orderDate: Date
  totalAmount: number
  onReturn: (refundMethod: RefundMethod, amount: number, isPartialReturn: boolean, returnQuantities: { [key: number]: number }) => Promise<void>
  onClose: () => void
  onFreeze: () => void
  currentOrderId: number
}

export function ReturnSidebar({
  orderNumber,
  orderDate,
  totalAmount,
  onReturn,
  onClose,
  onFreeze,
  currentOrderId
}: ReturnSidebarProps) {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)

  return (
    <>
      <aside className="w-96 bg-white border-l">
        <Card className="border-0 rounded-none h-full flex flex-col">
          <CardHeader className="pb-1 px-6 pt-4 border-b">
            <CardTitle className="flex flex-col">
              <div className="flex justify-between items-center">
                <span>{orderNumber}</span>
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
              <div className="bg-gray-50 -mx-6 px-6 py-2 mb-4">
                <p className="text-sm font-medium text-gray-600 mb-1">Totale ordine</p>
                <p className="text-3xl font-bold text-black">
                  {totalAmount.toFixed(2)} €
                </p>
              </div>
            </div>

            <Button
              onClick={() => setIsReturnModalOpen(true)}
              variant="destructive"
              className="w-full mt-4"
            >
              Effettua Reso
            </Button>
          </CardContent>

          <CardFooter className="mt-auto px-6 pb-4 pt-2 border-t grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="text-[#EF4444] border-[#EF4444] hover:bg-red-50 font-medium"
              onClick={onClose}
            >
              Chiudi
            </Button>
            <Button 
              variant="outline" 
              className="text-gray-600 font-medium"
              onClick={onFreeze}
            >
              Congela
            </Button>
          </CardFooter>
        </Card>
      </aside>

      <ReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onConfirm={onReturn}
        amount={totalAmount}
        orderId={currentOrderId}
      />
    </>
  )
} 