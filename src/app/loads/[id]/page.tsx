'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { SelectWithNullOption } from '@/components/SelectWithNullOption'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { X, Plus, Minus, Search, ScanBarcode, Trash2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

interface Load {
  id: number
  code: string
  supply_id: number | null
  status_id: number
  warehouse_id: number
}

interface Supply {
  id: number
  name: string
}

interface Status {
  id: number
  name: string
}

interface Warehouse {
  id: number
  name: string
}

interface Product {
  id: number
  article_code: string
  variant_code: string
  size_id: number
  wholesale_price: number
  size: string
  barcode?: string
  availability?: {
    warehouse_id: number
    quantity: number
    warehouse_name: string
  }[]
}

interface Size {
  id: number
  name: string
}

interface LoadProduct extends Omit<Product, 'size_id'> {
  load_product_id?: number
  cost: number
  quantity: number
  size: string
}

interface WarehouseData {
  id: number
  name: string
}

interface AvailabilityData {
  warehouse_id: number
  quantity: number
  product_id: number
}

interface LoadProductData {
  id: number;
  product_id: number;
}

export default function LoadDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const id = params.id as string

  const [load, setLoad] = useState<Load | null>(null)
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loadProducts, setLoadProducts] = useState<LoadProduct[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isChanged, setIsChanged] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [removedProductIds, setRemovedProductIds] = useState<number[]>([])
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [animatedRowIndex, setAnimatedRowIndex] = useState<number | null>(null)
  const tableRef = useRef<HTMLTableSectionElement>(null)

  const [selectedAction, setSelectedAction] = useState<'confirm' | 'revoke' | 'delete' | null>(null)

  useEffect(() => {
    if (id) {
      fetchLoadDetails()
      fetchSupplies()
      fetchStatuses()
      fetchWarehouses()
      fetchLoadProducts()
      fetchAllProducts()
    }
  }, [id])

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [loadProducts])

  const fetchLoadDetails = async () => {
    try {
      const response = await fetch(`http://localhost:3003/api/loads/${id}`)
      if (!response.ok) throw new Error('Failed to fetch load details')
      const data = await response.json()
      setLoad(data)
    } catch (error) {
      console.error('Error fetching load details:', error)
      toast({
        title: "Error",
        description: "Failed to fetch load details. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchSupplies = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/supplies/')
      if (!response.ok) throw new Error('Failed to fetch supplies')
      const data = await response.json()
      setSupplies(data)
    } catch (error) {
      console.error('Error fetching supplies:', error)
      toast({
        title: "Error",
        description: "Failed to fetch supplies. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchStatuses = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/statuses/')
      if (!response.ok) throw new Error('Failed to fetch statuses')
      const data = await response.json()
      setStatuses(data)
    } catch (error) {
      console.error('Error fetching statuses:', error)
      toast({
        title: "Error",
        description: "Failed to fetch statuses. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/warehouses/')
      if (!response.ok) throw new Error('Failed to fetch warehouses')
      const data = await response.json()
      setWarehouses(data)
    } catch (error) {
      console.error('Error fetching warehouses:', error)
      toast({
        title: "Error",
        description: "Failed to fetch warehouses. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchLoadProducts = async () => {
    try {
      const response = await fetch(`http://localhost:3003/api/load-products/load/${id}`)
      if (!response.ok) throw new Error('Failed to fetch load products')
      const data = await response.json()
      
      const productsWithDetails = await Promise.all(data.map(async (loadProduct: LoadProductData) => {
        const productResponse = await fetch(`http://localhost:3003/api/products/${loadProduct.product_id}`)
        if (!productResponse.ok) throw new Error(`Failed to fetch product details for product ${loadProduct.product_id}`)
        const productData = await productResponse.json()
        
        const sizeResponse = await fetch(`http://localhost:3003/api/sizes/${productData.size_id}`)
        if (!sizeResponse.ok) throw new Error(`Failed to fetch size name for size ${productData.size_id}`)
        const sizeData = await sizeResponse.json()
        
        return {
          ...loadProduct,
          ...productData,
          load_product_id: loadProduct.id,
          size: sizeData.name
        }
      }))
      
      setLoadProducts(productsWithDetails)
    } catch (error) {
      console.error('Error fetching load products:', error)
      toast({
        title: "Error",
        description: "Failed to fetch load products. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchAllProducts = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/products/')
      if (!response.ok) throw new Error('Failed to fetch all products')
      const data = await response.json()
      
      const products = data.products || []
      
      const productsWithDetails = await Promise.all(products.map(async (product: Product) => {
        try {
          const sizeResponse = await fetch(`http://localhost:3003/api/sizes/${product.size_id}`)
          if (!sizeResponse.ok) throw new Error(`Failed to fetch size name for size ${product.size_id}`)
          const sizeData = await sizeResponse.json()
          
          const availabilityResponse = await fetch(`http://localhost:3003/api/product-availability/product/${product.id}`)
          if (!availabilityResponse.ok) throw new Error(`Failed to fetch availability for product ${product.id}`)
          const availabilityData = await availabilityResponse.json()

          // Fetch warehouse names for each availability entry
          const availabilityWithNames = await Promise.all(availabilityData.map(async (av: AvailabilityData) => {
            const warehouseResponse = await fetch(`http://localhost:3003/api/warehouses/${av.warehouse_id}`)
            if (!warehouseResponse.ok) throw new Error(`Failed to fetch warehouse name for warehouse ${av.warehouse_id}`)
            const warehouseData: WarehouseData = await warehouseResponse.json()
            return {
              warehouse_id: av.warehouse_id,
              quantity: av.quantity,
              warehouse_name: warehouseData.name
            }
          }))
          
          return {
            id: product.id,
            article_code: product.article_code,
            variant_code: product.variant_code,
            size_id: product.size_id,
            wholesale_price: product.wholesale_price,
            size: sizeData.name,
            barcode: product.barcode,
            availability: availabilityWithNames
          }
        } catch (error) {
          console.error(`Error fetching details for product ${product.id}:`, error)
          return {
            ...product,
            size: 'N/A',
            availability: []
          }
        }
      }))
      
      setAllProducts(productsWithDetails)
    } catch (error) {
      console.error('Error fetching all products:', error)
      toast({
        title: "Error",
        description: "Failed to fetch all products. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLoadChange = (field: keyof Load, value: string | number | null) => {
    if (load) {
      setLoad({ ...load, [field]: value })
      setIsChanged(true)
    }
  }

  const handleProductChange = (index: number, field: keyof LoadProduct, value: string | number) => {
    const updatedProducts = [...loadProducts]
    updatedProducts[index] = { ...updatedProducts[index], [field]: value }
    setLoadProducts(updatedProducts)
    setIsChanged(true)
  }

  const handleAnimate = (index: number) => {
    setAnimatedRowIndex(index)
    setTimeout(() => setAnimatedRowIndex(null), 820)
  
    if (tableRef.current) {
      const rowElement = tableRef.current.children[index] as HTMLTableRowElement
      if (rowElement) {
        rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const handleAddProduct = (product: Product & { size: string }) => {
    const isLoadConfirmed = load?.status_id === 10
    if (isLoadConfirmed) return

    const existingProductIndex = loadProducts.findIndex(
      (p) => p.id === product.id && p.size === product.size
    )
  
    if (existingProductIndex !== -1) {
      const updatedProducts = [...loadProducts]
      updatedProducts[existingProductIndex].quantity += 1
      setLoadProducts(updatedProducts)
      handleAnimate(existingProductIndex)
    } else {
      const newLoadProduct: LoadProduct = {
        ...product,
        cost: product.wholesale_price || 0,
        quantity: 1
      }
      setLoadProducts([newLoadProduct, ...loadProducts])
      handleAnimate(0)
    }
    setIsProductDialogOpen(false)
    setIsChanged(true)
  }

  const handleQuantityChange = (index: number, change: number) => {
    const updatedProducts = [...loadProducts]
    updatedProducts[index].quantity = Math.max(1, updatedProducts[index].quantity + change)
    setLoadProducts(updatedProducts)
    setIsChanged(true)
  }

  const handleRemoveProduct = (index: number) => {
    const isLoadConfirmed = load?.status_id === 10
    if (isLoadConfirmed) return

    const productToRemove = loadProducts[index]
    if (productToRemove.load_product_id) {
      setRemovedProductIds(prev => [...prev, productToRemove.load_product_id!])
    }
    const updatedProducts = loadProducts.filter((_, i) => i !== index)
    setLoadProducts(updatedProducts)
    setIsChanged(true)
  }

  const handleSave = async () => {
    try {
      if (!load) throw new Error('No load data to save')

      const loadResponse = await fetch(`http://localhost:3003/api/loads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(load)
      })
      if (!loadResponse.ok) throw new Error('Failed to update load details')

      for (const product of loadProducts) {
        const productData = {
          load_id: parseInt(id),
          product_id: product.id,
          cost: parseFloat(product.cost.toString()),
          quantity: product.quantity
        }

        let response;
        if (product.load_product_id) {
          response = await fetch(`http://localhost:3003/api/load-products/${product.load_product_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
          })
        } else {
          response = await fetch(`http://localhost:3003/api/load-products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
          })
        }

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || `Failed to update/create product ${product.id}`)
        }
      }

      // Delete removed products
      for (const removedId of removedProductIds) {
        const deleteResponse = await fetch(`http://localhost:3003/api/load-products/${removedId}`, {
          method: 'DELETE'
        })
        if (!deleteResponse.ok) {
          throw new Error(`Failed to delete product with ID ${removedId}`)
        }
      }

      setIsChanged(false)
      setRemovedProductIds([])
      toast({
        title: "Success",
        description: "Changes saved successfully",
      })

      fetchLoadProducts()
    } catch (error) {
      console.error('Error saving changes:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSearch = async (term: string) => {
    setSearchTerm(term)
    if (term.trim() === '') return;

    try {
      const response = await fetch(`http://localhost:3003/api/barcode/barcodes/${term}/product`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const product = await response.json();
        const sizeResponse = await fetch(`http://localhost:3003/api/sizes/${product.size_id}`)
          if (!sizeResponse.ok) throw new Error(`Failed to fetch size name for size ${product.size_id}`)
          const sizeData = await sizeResponse.json()
          
          const productWithSize = { ...product, size: sizeData.name }
          handleAddProduct(productWithSize)
        setSearchTerm('');
      } else if (response.status === 404) {
        toast({
          title: "Product not found",
          description: "No product found for this barcode.",
          variant: "destructive",
        });
      } else {
        throw new Error('Failed to fetch product');
      }
    } catch (error) {
      console.error('Error searching product:', error);
      toast({
        title: "Error",
        description: "Failed to search for the product. Please try again.",
        variant: "destructive",
      });
    }
  }

  const handleConfirmAction = async () => {
    if (!selectedAction) return

    switch (selectedAction) {
      case 'confirm':
        await handleConfirmLoad()
        break
      case 'revoke':
        await handleRevokeLoad()
        break
      case 'delete':
        await handleDeleteLoad()
        break
    }
    setSelectedAction(null)
  }

  const handleConfirmLoad = async () => {
    if (!load || isConfirming) return

    try {
      setIsConfirming(true)
      const response = await fetch(`http://localhost:3003/api/loads/${id}/confirm`, {
        method: 'PUT',
      })

      if (!response.ok) {
        throw new Error('Failed to confirm load')
      }

      toast({
        title: "Successo",
        description: "Carico confermato con successo",
      })

      // Refresh load details to get updated status
      await fetchLoadDetails()
    } catch (error) {
      console.error(error)
      toast({
        title: "Errore",
        description: "Errore durante la conferma del carico",
        variant: "destructive",
      })
    } finally {
      setIsConfirming(false)
    }
  }

  const handleRevokeLoad = async () => {
    if (!load || isRevoking) return

    try {
      setIsRevoking(true)
      const response = await fetch(`http://localhost:3003/api/loads/${id}/revoke`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to revoke load')
      }

      toast({
        title: "Successo",
        description: "Carico revocato con successo",
      })

      // Refresh load details to get updated status
      await fetchLoadDetails()
    } catch (error) {
      console.error(error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante la revoca del carico",
        variant: "destructive",
      })
    } finally {
      setIsRevoking(false)
    }
  }

  const handleDeleteLoad = async () => {
    if (!load || isDeleting) return

    try {
      setIsDeleting(true)
      const response = await fetch(`http://localhost:3003/api/loads/${id}/delete`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete load')
      }

      toast({
        title: "Successo",
        description: "Carico cancellato con successo",
      })

      // Refresh load details to get updated status
      await fetchLoadDetails()
    } catch (error) {
      console.error(error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante la cancellazione del carico",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const getStatusBadgeStyle = (statusId: number) => {
    switch (statusId) {
      case 9: // bozza
        return "bg-gray-100 text-gray-800 border-gray-200"
      case 10: // caricato
        return "bg-green-100 text-green-800 border-green-200"
      case 11: // revocato
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case 12: // cancellato
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const summary = useMemo(() => {
    const totalCost = loadProducts.reduce((sum, product) => sum + product.cost * product.quantity, 0)
    const totalItems = loadProducts.reduce((sum, product) => sum + product.quantity, 0)
    const uniqueModels = new Set(loadProducts.map(product => product.article_code)).size
    return { totalCost, totalItems, uniqueModels }
  }, [loadProducts])

  // Controlla se il carico è confermato o cancellato
  const isLoadConfirmed = load?.status_id === 10
  const isLoadCancelled = load?.status_id === 12
  const isLoadDisabled = isLoadConfirmed || isLoadCancelled

  if (!load) return <div>Loading...</div>

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white p-o mb-0">
        <div className="grid grid-cols-4 gap-4 mb-0">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice</label>
            <Input
              value={load.code}
              disabled={isLoadDisabled}
              onChange={(e) => handleLoadChange('code', e.target.value)}
            />
          </div>
          <SelectWithNullOption
            options={supplies.map(supply => ({ value: supply.id.toString(), label: supply.name }))}
            value={load.supply_id?.toString() ?? null}
            onValueChange={(value: string | number | null) => handleLoadChange('supply_id', value ? (typeof value === 'string' ? parseInt(value) : value) : null)}
            placeholder="Seleziona fornitura"
            label="Fornitura"
            nullOptionLabel="Nessuna fornitura"
          />
          <div>
            <label className="text-sm font-medium">Stato</label>
            <div className="mt-1">
              <span className={`inline-flex items-center rounded-md border px-2 py-1 text-sm font-medium ${getStatusBadgeStyle(load?.status_id || 0)}`}>
                {statuses.find(s => s.id === load?.status_id)?.name || ''}
              </span>
            </div>
          </div>
          <SelectWithNullOption
            options={warehouses.map(warehouse => ({ value: warehouse.id.toString(), label: warehouse.name }))}
            value={load.warehouse_id?.toString() ?? null}
            onValueChange={(value: string | number | null) => handleLoadChange('warehouse_id', value ? (typeof value === 'string' ? parseInt(value) : value) : null)}
            placeholder="Seleziona magazzino"
            label="Magazzino"
            nullOptionLabel="Seleziona un magazzino"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-1">
          <Card className="shadow-sm h-[70px]">
            <CardContent className="pt-2 ">
              <h3 className="text-xs font-semibold mb-2">Totale Carico</h3>
              <p className="text-xl font-bold">€{summary.totalCost.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-xs h-[70px]">
            <CardContent className="pt-2">
              <h3 className="text-sm font-semibold mb-2">Articoli Caricati</h3>
              <p className="text-xl font-bold">{summary.totalItems}</p>
            </CardContent>
          </Card>
          <Card className="shadow-xs h-[70px]">
            <CardContent className="pt-2">
              <h3 className="text-sm font-semibold mb-2">Numero Modelli</h3>
              <p className="text-xl font-bold">{summary.uniqueModels}</p>
            </CardContent>
          </Card>
        </div>


        </div>
        <div className="sticky top-0 bg-white z-10 py-4">
        <div className="flex  justify-between items-center mb-4">
          <div className="relative flex items-center space-x-2 gap-4 w-3/5">
            <ScanBarcode className="absolute left-4 top-2.5 h-4 w-4 text-muted-foreground " />
            <Input
              type="search"
              placeholder="Type a barcode or search product..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearch(e.target.value);
              }}
              onBlur={() => setSearchTerm('')}
              ref={searchInputRef}
              className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-3/3"
              disabled={isLoadDisabled}
            />
           </div>
          <div className="flex items-center space-x-2">
            <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={isLoadDisabled}>
                  <Plus className="mr-2 h-4 w-4" /> Aggiungi Prodotti
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                  <DialogTitle>Aggiungi Prodotto</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
                  {/* Search Bar */}
                  <div className="flex items-center space-x-2 sticky top-0 bg-white pb-4">
                    <Input
                      placeholder="Cerca per codice articolo, variante o barcode..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      disabled={isLoadDisabled}
                      ref={searchInputRef}
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon" disabled={isLoadDisabled}>
                      <Search className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" disabled={isLoadDisabled}>
                      <ScanBarcode className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Table Container */}
                  <div className="flex-1 overflow-auto border rounded-md">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white">
                        <TableRow>
                          <TableHead>Articolo</TableHead>
                          <TableHead>Variante</TableHead>
                          <TableHead>Taglia</TableHead>
                          <TableHead className="text-right">Prezzo Wholesale</TableHead>
                          <TableHead className="text-right">Disponibilità</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allProducts
                          .filter(product => 
                            searchTerm ? (
                              product.article_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              product.variant_code?.toLowerCase().includes(searchTerm.toLowerCase())
                            ) : true
                          )
                          .map((product) => (
                            <TableRow
                              key={product.id}
                              onClick={() => handleAddProduct(product)}
                              className="cursor-pointer hover:bg-gray-100"
                            >
                              <TableCell>{product.article_code}</TableCell>
                              <TableCell>{product.variant_code}</TableCell>
                              <TableCell>{product.size}</TableCell>
                              <TableCell className="text-right">
                                {(Number(product.wholesale_price) || 0).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  {product.availability?.map((av) => (
                                    <div key={av.warehouse_id} className="text-xs flex justify-between">
                                      <span className="font-medium">{av.warehouse_name}:</span>
                                      <span className={`${av.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {av.quantity}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t">
                  <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                    Chiudi
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="flex justify-end space-x-4">
              <Button
                onClick={handleSave}
                disabled={!isChanged || isLoadDisabled}
              >
                Salva
              </Button>
              {load.status_id === 9 && (
                <>
                  <Button
                    onClick={() => setSelectedAction('confirm')}
                    disabled={isConfirming || loadProducts.length === 0}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isConfirming ? "Confermando..." : "Conferma Carico"}
                  </Button>
                  <Button
                    onClick={() => setSelectedAction('delete')}
                    disabled={isDeleting}
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </>
              )}
              {load.status_id === 11 && (
                <>
                  <Button
                    onClick={() => setSelectedAction('confirm')}
                    disabled={isConfirming || loadProducts.length === 0}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isConfirming ? "Confermando..." : "Riconferma Carico"}
                  </Button>
                  <Button
                    onClick={() => setSelectedAction('delete')}
                    disabled={isDeleting}
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </>
              )}
              {load.status_id === 10 && (
                <Button
                  onClick={() => setSelectedAction('revoke')}
                  disabled={isRevoking}
                  variant="destructive"
                >
                  {isRevoking ? "Revocando..." : "Revoca Carico"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog di conferma */}
      <Dialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma operazione</DialogTitle>
            <DialogDescription>
              {selectedAction === 'confirm' && (load?.status_id === 11 ? "Sei sicuro di voler riconfermare questo carico?" : "Sei sicuro di voler confermare questo carico?")}
              {selectedAction === 'revoke' && "Sei sicuro di voler revocare questo carico?"}
              {selectedAction === 'delete' && "Sei sicuro di voler cancellare questo carico?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAction(null)}>Annulla</Button>
            <Button 
              onClick={handleConfirmAction}
              variant={selectedAction === 'confirm' ? 'default' : 'destructive'}
              className={selectedAction === 'confirm' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Articolo</TableHead>
            <TableHead>Variante</TableHead>
            <TableHead>Taglia</TableHead>
            <TableHead>Prezzo Wholesale</TableHead>
            <TableHead>Costo</TableHead>
            <TableHead>Quantità</TableHead>
            <TableHead>Totale Costo</TableHead>
            <TableHead>Azione</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody ref={tableRef}>
          {loadProducts.map((product, index) => (
            <TableRow key={index}
            className={animatedRowIndex === index ? 'animate-shake' : ''}>
              <TableCell>{product.article_code}</TableCell>
              <TableCell>{product.variant_code}</TableCell>
              <TableCell>{product.size}</TableCell>
              <TableCell>{(Number(product.wholesale_price) || 0).toFixed(2)}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={product.cost.toString()}
                  disabled={isLoadDisabled}
                  onChange={(e) => handleProductChange(index, 'cost', parseFloat(e.target.value))}
                />
              </TableCell>
              <TableCell className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isLoadDisabled}
                  onClick={() => handleQuantityChange(index, -1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={product.quantity.toString()}
                  disabled={isLoadDisabled}
                  onChange={(e) => handleProductChange(index, 'quantity', parseInt(e.target.value))}
                  className="w-16 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isLoadDisabled}
                  onClick={() => handleQuantityChange(index, 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TableCell>
              <TableCell>€{(product.cost * product.quantity).toFixed(2)}</TableCell>
              <TableCell>
                <Button variant="destructive" disabled={isLoadDisabled} onClick={() => handleRemoveProduct(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { 
            transform: translateX(0);
            background-color: transparent;
          }
          25% { 
            transform: translateX(-8px);
            background-color: rgba(59, 130, 246, 0.1);
          }
          75% { 
            transform: translateX(8px);
            background-color: rgba(59, 130, 246, 0.1);
          }
        }
        .animate-shake {
          animation: shake 0.8s ease-in-out;
        }
      `}</style>
    </div>
  )
}