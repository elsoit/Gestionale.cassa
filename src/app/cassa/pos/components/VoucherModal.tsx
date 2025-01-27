'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import debounce from 'lodash/debounce'

interface VoucherModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyVoucher: (amount: number, voucherId: number, originOrderId: number | null) => void
}

export function VoucherModal({
  isOpen,
  onClose,
  onApplyVoucher
}: VoucherModalProps) {
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherAmount, setVoucherAmount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [voucherData, setVoucherData] = useState<{
    id: number;
    total_amount: number;
    origin_order_id: number | null;
  } | null>(null)

  // Funzione per verificare il voucher
  const checkVoucher = async (code: string) => {
    if (!code) {
      setVoucherAmount(null)
      setVoucherData(null)
      setError('')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`${process.env.API_URL}/api/vouchers/barcode/${code}`)
      
      if (!response.ok) {
        throw new Error('Voucher non trovato')
      }

      const voucher = await response.json()
      
      if (voucher.status_id !== 23) {
        throw new Error('Voucher non valido o già utilizzato')
      }

      setVoucherAmount(parseFloat(voucher.total_amount))
      setVoucherData({
        id: voucher.id,
        total_amount: parseFloat(voucher.total_amount),
        origin_order_id: voucher.origin_order_id
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Errore durante la verifica del voucher')
      setVoucherAmount(null)
      setVoucherData(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Debounce della funzione di verifica
  const debouncedCheck = debounce(checkVoucher, 500)

  // Gestisce il cambio del codice voucher
  const handleVoucherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value
    setVoucherCode(code)
    debouncedCheck(code)
  }

  // Gestisce l'applicazione del voucher
  const handleApplyVoucher = () => {
    if (voucherAmount !== null && voucherData) {
      onApplyVoucher(voucherAmount, voucherData.id, voucherData.origin_order_id)
      onClose()
    }
  }

  // Reset dello stato quando si chiude la modale
  useEffect(() => {
    if (!isOpen) {
      setVoucherCode('')
      setVoucherAmount(null)
      setError('')
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Inserisci Buono Sconto</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="space-y-4">
            <Input
              placeholder="Inserisci codice o barcode voucher"
              value={voucherCode}
              onChange={handleVoucherChange}
              disabled={isLoading}
            />

            {isLoading && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {voucherAmount !== null && (
              <div className="text-center">
                <p className="text-green-600 font-semibold">
                  Voucher valido - Importo: € {typeof voucherAmount === 'number' ? voucherAmount.toFixed(2) : '0,00'}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button
              onClick={handleApplyVoucher}
              disabled={voucherAmount === null || isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Usa Buono Sconto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 