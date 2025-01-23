'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CreditCard, Banknote, Ticket, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RefundMethod = 'electronic' | 'cash' | 'voucher'

interface CancelReservationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (refundMethod: RefundMethod, deposit: number) => Promise<void>
  deposit: number
}

export function CancelReservationModal({
  isOpen,
  onClose,
  onConfirm,
  deposit
}: CancelReservationModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<RefundMethod | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    if (!selectedMethod) return
    
    setIsLoading(true)
    try {
      await onConfirm(selectedMethod, deposit)
      onClose()
    } catch (error) {
      console.error('Errore durante l\'annullamento:', error)
    } finally {
      setIsLoading(false)
    }
  }

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Annulla Prenotazione</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            Seleziona il metodo di rimborso per € <span className="font-bold">{typeof deposit === 'number' ? deposit.toFixed(2) : "0,00"}</span>
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
              disabled={!selectedMethod || isLoading}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Elaborazione...
                </>
              ) : (
                'Conferma Annullamento e Rimborso'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 