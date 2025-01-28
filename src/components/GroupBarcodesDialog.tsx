import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Trash2, Copy, Check, Tag, PlusCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"

// Array di taglie standard per l'ordinamento
const STANDARD_SIZES = [
  "2XS", "XXS", 
  "XS", 
  "S", 
  "M", 
  "L", 
  "XL", 
  "2XL", "XXL",
  "3XL", "XXXL",
  "4XL", "XXXXL",
  // Taglie numeriche
  "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50"
];

// Funzione di utilità per ottenere l'indice di ordinamento
const getSizeIndex = (size: string): number => {
  const normalizedSize = size.toUpperCase().trim();
  const index = STANDARD_SIZES.indexOf(normalizedSize);
  return index === -1 ? 999 : index; // Se la taglia non è nell'elenco, la mettiamo alla fine
};

interface Product {
  id: number;
  article_code: string;
  variant_code: string;
  size_id: number;
  size_name: string;
  status_id: number;
  wholesale_price: string;
  retail_price: string;
}

interface GroupBarcodesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddBarcode: (productId: number, barcodeCode: string) => Promise<void>;
  onDeleteBarcode: (productId: number, barcodeId: number) => Promise<void>;
}

interface ProductBarcode {
  product_id: number;
  size_name: string;
  barcodes: Array<{
    id: number;
    code: string;
  }>;
}

export default function GroupBarcodesDialog({
  isOpen,
  onClose,
  products,
  onAddBarcode,
  onDeleteBarcode
}: GroupBarcodesDialogProps) {
  const [productsWithBarcodes, setProductsWithBarcodes] = useState<ProductBarcode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [generatingForProduct, setGeneratingForProduct] = useState<number | null>(null);
  const [manualBarcode, setManualBarcode] = useState<string>("");
  const [manualBarcodeProductId, setManualBarcodeProductId] = useState<number | null>(null);
  const { toast } = useToast();

  const loadGroupBarcodes = async () => {
    if (!products?.length) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const productIds = products.map(p => p.id);
      const params = new URLSearchParams({
        productIds: JSON.stringify(productIds)
      });

      const response = await fetch(`${process.env.API_URL}/api/barcode/group-barcodes?${params}`, {
        mode: 'cors',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to load group barcodes');
      }
      
      const data = await response.json();
      console.log('Barcode data:', data);
      // Ordina i prodotti per taglia
      const sortedData = data.sort((a: ProductBarcode, b: ProductBarcode) => {
        return getSizeIndex(a.size_name) - getSizeIndex(b.size_name);
      });
      setProductsWithBarcodes(sortedData);
    } catch (error) {
      console.error('Error loading group barcodes:', error);
      setError('Failed to load barcodes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && products?.length) {
      console.log('Loading barcodes for products:', products);
      loadGroupBarcodes();
    }
  }, [isOpen, products]);

  const handleCopy = async (code: string, id: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast({
        title: "Copied to clipboard",
        description: `Barcode ${code} has been copied to your clipboard.`,
        duration: 3000,
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Copy failed",
        description: "Failed to copy barcode to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateBarcode = async (productId: number) => {
    setGeneratingForProduct(productId);
    try {
      const response = await fetch(`${process.env.API_URL}/api/barcode/last-barcode`, {
        mode: 'cors',
        credentials: 'include'
      });
      const data = await response.json();
      
      const lastBarcode = parseInt(data.lastBarcode, 10);
      if (isNaN(lastBarcode)) {
        throw new Error('Invalid barcode number received');
      }
      
      const nextBarcode = (lastBarcode + 1).toString();
      await onAddBarcode(productId, nextBarcode);
      await loadGroupBarcodes();
      
      toast({
        title: "Success",
        description: "New barcode generated and added successfully.",
      });
    } catch (error) {
      console.error('Failed to generate barcode:', error);
      toast({
        title: "Error",
        description: "Failed to generate barcode. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingForProduct(null);
    }
  };

  const handleDelete = async (productId: number, barcodeId: number) => {
    try {
      await onDeleteBarcode(productId, barcodeId);
      await loadGroupBarcodes();
      toast({
        title: "Success",
        description: "Barcode deleted successfully.",
      });
    } catch (error) {
      console.error('Failed to delete barcode:', error);
      toast({
        title: "Error",
        description: "Failed to delete barcode. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManualAdd = async () => {
    if (!manualBarcode || !manualBarcodeProductId) {
      toast({
        title: "Error",
        description: "Please enter a barcode",
        variant: "destructive",
      });
      return;
    }

    try {
      await onAddBarcode(manualBarcodeProductId, manualBarcode);
      await loadGroupBarcodes();
      setManualBarcode("");
      setManualBarcodeProductId(null);
      toast({
        title: "Success",
        description: "Barcode added successfully.",
      });
    } catch (error) {
      console.error('Failed to add barcode:', error);
      toast({
        title: "Error",
        description: "Failed to add barcode. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderManualBarcodeDialog = () => (
    <Dialog 
      open={manualBarcodeProductId !== null} 
      onOpenChange={(open) => {
        if (!open) {
          setManualBarcodeProductId(null);
          setManualBarcode("");
        }
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Manual Barcode</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Enter barcode..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleManualAdd();
                }
              }}
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setManualBarcodeProductId(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleManualAdd}>
              Add Barcode
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">Manage Barcodes</DialogTitle>
              <Button variant="outline" size="sm" onClick={loadGroupBarcodes} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            {products.length > 0 && (
              <div className="flex gap-4 items-center mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  <span>Article: {products[0].article_code}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  <span>Variant: {products[0].variant_code}</span>
                </div>
              </div>
            )}
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive" className="mx-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="p-6 pt-2">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : productsWithBarcodes.length > 0 ? (
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-2 gap-4">
                  {productsWithBarcodes.map((product) => (
                    <div key={product.product_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">Size: {product.size_name}</h4>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateBarcode(product.product_id)}
                            disabled={generatingForProduct === product.product_id}
                          >
                            {generatingForProduct === product.product_id ? (
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Generate
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setManualBarcodeProductId(product.product_id)}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {product.barcodes.length > 0 ? (
                        <ul className="space-y-2">
                          {product.barcodes.map((barcode) => (
                            <li key={barcode.id} className="flex items-center justify-between bg-secondary p-2 rounded text-sm">
                              <span className="font-mono">{barcode.code}</span>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleCopy(barcode.code, barcode.id)}
                                >
                                  {copiedId === barcode.id ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDelete(product.product_id, barcode.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No barcodes</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No products found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {renderManualBarcodeDialog()}
    </>
  );
}
