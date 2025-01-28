import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Trash2, Copy, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AddBarcodePopupProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  onAddBarcode: (productId: number, barcodeCode: string) => Promise<void>;
  onDeleteBarcode: (productId: number, barcodeId: number) => Promise<void>;
  fetchProductBarcodes: (productId: number) => Promise<Barcode[]>;
}

interface Barcode {
  id: number;
  code: string;
  img_link: string;
}

export default function AddBarcodePopup({
  isOpen,
  onClose,
  productId,
  onAddBarcode,
  onDeleteBarcode,
  fetchProductBarcodes
}: AddBarcodePopupProps) {
  const [newBarcodeCode, setNewBarcodeCode] = useState('')
  const [barcodes, setBarcodes] = useState<Barcode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const loadBarcodes = async () => {
    if (!productId) {
      setError('No product selected. Please select a product first.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      console.log(`Loading barcodes for product ID: ${productId}`);
      const fetchedBarcodes = await fetchProductBarcodes(productId)
      console.log('Fetched barcodes:', fetchedBarcodes);
      setBarcodes(fetchedBarcodes)
    } catch (error) {
      console.error('Failed to fetch barcodes:', error)
      setError('Failed to load barcodes. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && productId) {
      loadBarcodes()
    }
  }, [isOpen, productId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newBarcodeCode.trim() && productId) {
      setIsLoading(true)
      setError(null)
      try {
        await onAddBarcode(productId, newBarcodeCode.trim())
        setNewBarcodeCode('')
        await loadBarcodes()
      } catch (error) {
        console.error('Failed to add barcode:', error)
        if (error instanceof Error) {
          if (error.message.includes('already exists')) {
            setError('This barcode code already exists. Please use a unique code.')
          } else if (error.message.includes('already associated')) {
            setError('This barcode is already associated with another product.')
          } else {
            setError('Failed to add barcode. Please try again.')
          }
        } else {
          setError('An unexpected error occurred. Please try again.')
        }
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleDelete = async (barcodeId: number) => {
    setIsLoading(true)
    setError(null)
    try {
      await onDeleteBarcode(productId, barcodeId)
      await loadBarcodes()
    } catch (error) {
      console.error('Failed to delete barcode:', error)
      setError('Failed to delete barcode. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async (code: string, id: number) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(id)
      toast({
        title: "Copied to clipboard",
        description: `Barcode ${code} has been copied to your clipboard.`,
        duration: 3000,
      })
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
      toast({
        title: "Copy failed",
        description: "Failed to copy barcode to clipboard. Please try again.",
        variant: "destructive",
      })
    }
  }

  const generateBarcode = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`${process.env.API_URL}/api/barcode/last-barcode`, {
        mode: 'cors',
        credentials: 'include'
      });
      const data = await response.json();
      
      // Convertiamo in numero e verifichiamo che sia valido
      const lastBarcode = parseInt(data.lastBarcode, 10);
      if (isNaN(lastBarcode)) {
        throw new Error('Invalid barcode number received');
      }
      
      // Incrementiamo e formattiamo il nuovo barcode
      const nextBarcode = lastBarcode + 1;
      setNewBarcodeCode(nextBarcode.toString());
    } catch (error) {
      console.error('Failed to generate barcode:', error);
      toast({
        title: "Error",
        description: "Failed to generate barcode. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false)
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Barcodes</DialogTitle>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="py-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Existing Barcodes</h3>
            <Button variant="outline" size="sm" onClick={loadBarcodes} disabled={isLoading || !productId}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          {isLoading ? (
            <p>Loading barcodes...</p>
          ) : barcodes.length > 0 ? (
            <ul className="space-y-2">
              {barcodes.map((barcode) => (
                <li key={barcode.id} className="flex items-center justify-between bg-secondary p-2 rounded">
                  <span>{barcode.code}</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(barcode.code, barcode.id)}
                      disabled={isLoading}
                    >
                      {copiedId === barcode.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span className="sr-only">Copy barcode {barcode.code}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(barcode.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete barcode {barcode.code}</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>No barcodes found for this product.</p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="newBarcodeCode" className="text-right">
              New Barcode
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="newBarcodeCode"
                value={newBarcodeCode}
                onChange={(e) => setNewBarcodeCode(e.target.value)}
                placeholder="Enter new barcode code"
                disabled={!productId || isLoading}
              />
              <Button 
                type="button"
                variant="outline"
                onClick={generateBarcode}
                disabled={isGenerating || !productId || isLoading}
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  "Generate"
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !productId}>
              Add Barcode
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}