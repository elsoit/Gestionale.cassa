'use client'

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Shirt, ShoppingBag, ArrowLeft, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import { toast } from "sonner"
import { useParams, useRouter } from 'next/navigation'
import { motion, PanInfo } from "framer-motion"

interface Product {
  id: number
  article_code: string
  variant_code: string
  brand_name: string
  size_id: number
  size_name: string
  wholesale_price: number
  retail_price: number
  attributes: Array<{
    parameter_name: string
    attribute_name: string
  }>
  mainPhotoUrl?: string
  brand_id: number
}

interface LoadProduct extends Product {
  quantity: number
  cost: number
  sizes?: Array<{
    id: number
    size_name: string
    quantity: number
    cost: number
  }>
}

interface Load {
  id: number
  code: string
  supply_id: number | null
  status_id: number
  warehouse_id: number
  created_time: string
  updated_time: string
  total_cost: number
  total_items: number
}

// Aggiungi questa interfaccia per i prodotti raggruppati
interface GroupedLoadProduct {
  brand_name: string
  article_code: string
  variant_code: string
  mainPhotoUrl?: string
  brand_id: number
  sizes: Array<{
    id: number
    size_name: string
    quantity: number
    cost: number
  }>
}

// Aggiungi l'interfaccia per il tipo di availableSize
interface AvailableSize {
  id: number
  size_name: string
  wholesale_price: number
  retail_price: number
}

// Aggiungi queste funzioni helper per lo stato
const getStatusColor = (statusId: number) => {
  switch (statusId) {
    case 9: return 'bg-yellow-100 text-yellow-800' // bozza
    case 10: return 'bg-green-100 text-green-800' // confermato
    case 11: return 'bg-orange-100 text-orange-800' // revocato
    case 12: return 'bg-red-100 text-red-800' // cancellato
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (statusId: number) => {
  switch (statusId) {
    case 9: return 'bozza'
    case 10: return 'confermato'
    case 11: return 'revocato'
    case 12: return 'cancellato'
    default: return 'sconosciuto'
  }
}

export default function MobileLoadPage() {
  const params = useParams()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [availableSizes, setAvailableSizes] = useState<Product[]>([])
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [loadProducts, setLoadProducts] = useState<GroupedLoadProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [load, setLoad] = useState<Load | null>(null)
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
  const [isChanged, setIsChanged] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [costs, setCosts] = useState<Record<number, number>>({})
  const [removedProductIds, setRemovedProductIds] = useState<number[]>([])

  // Carica i dettagli del carico e i prodotti esistenti
  useEffect(() => {
    const fetchLoadDetails = async () => {
      try {
        const response = await fetch(`${process.env.API_URL}/api/loads/${params.id}`, {
          credentials: 'include'
        })
        if (!response.ok) throw new Error('Failed to fetch load details')
        const data = await response.json()
        setLoad(data)
      } catch (error) {
        console.error('Error fetching load details:', error)
        toast.error("Errore nel caricamento dei dettagli del carico")
      }
    }

    fetchLoadDetails()
  }, [params.id])

  // Modifica l'useEffect per il caricamento e raggruppamento dei prodotti
  useEffect(() => {
    const fetchLoadProducts = async () => {
      try {
        // Carica i prodotti del carico
        const loadProductsResponse = await fetch(`${process.env.API_URL}/api/load-products/load/${params.id}`, {
          credentials: 'include'
        })
        if (!loadProductsResponse.ok) throw new Error('Failed to fetch load products')
        const loadProductsData = await loadProductsResponse.json()

        // Per ogni prodotto del carico, carica i dettagli completi
        const productsWithDetails = await Promise.all(
          loadProductsData.map(async (loadProduct: any) => {
            const productResponse = await fetch(`${process.env.API_URL}/api/products/${loadProduct.product_id}`, {
              credentials: 'include'
            })
            const productData = await productResponse.json()
            
            return {
              ...productData,
              quantity: loadProduct.quantity,
              cost: loadProduct.cost,
              id: loadProduct.id // mantieni l'id del load_product
            }
          })
        )

        // Raggruppa i prodotti per brand + articolo + variante
        const groupedProducts = productsWithDetails.reduce((acc: Record<string, GroupedLoadProduct>, product: any) => {
          const key = `${product.brand_name}-${product.article_code}-${product.variant_code}`
          
          if (!acc[key]) {
            acc[key] = {
              brand_name: product.brand_name,
              article_code: product.article_code,
              variant_code: product.variant_code,
              mainPhotoUrl: product.mainPhotoUrl,
              brand_id: product.brand_id,
              sizes: []
            }
          }

          acc[key].sizes.push({
            id: product.id,
            size_name: product.size_name,
            quantity: product.quantity,
            cost: product.cost
          })

          return acc
        }, {})

        setLoadProducts(Object.values(groupedProducts))
      } catch (error) {
        console.error('Error fetching load products:', error)
        toast.error("Errore nel caricamento dei prodotti")
      }
    }

    fetchLoadProducts()
  }, [params.id])

  // Funzione per cercare i prodotti
  const searchProducts = async (term: string) => {
    if (!term) {
      setSuggestions([])
      return
    }

    try {
      const response = await fetch(`${process.env.API_URL}/api/products?search=${term}`, {
        credentials: 'include'
      })
      const data = await response.json()
      
      // Raggruppa i prodotti per articolo/variante
      const groupedProducts = data.products.reduce((acc: Record<string, Product>, product: Product) => {
        const key = `${product.article_code}-${product.variant_code}`
        if (!acc[key]) {
          acc[key] = product
        }
        return acc
      }, {})

      setSuggestions(Object.values(groupedProducts))
    } catch (error) {
      console.error('Error searching products:', error)
      toast.error('Errore nella ricerca dei prodotti')
    }
  }

  // Funzione per caricare le taglie di un prodotto
  const loadSizes = async (product: Product) => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/products?article_code=${product.article_code}&variant_code=${product.variant_code}&brand_id=${product.brand_id}`,
        { credentials: 'include' }
      )
      const data = await response.json()
      
      const filteredSizes = data.products.filter((size: Product) => 
        size.article_code === product.article_code &&
        size.variant_code === product.variant_code &&
        size.brand_id === product.brand_id
      )
      
      const sizesWithPrices = filteredSizes.map((size: Product) => ({
        ...size,
        wholesale_price: Number(size.wholesale_price || 0),
        retail_price: Number(size.retail_price || 0)
      }))
      
      setAvailableSizes(sizesWithPrices)
      return sizesWithPrices // Ritorna le taglie
    } catch (error) {
      console.error('Error loading sizes:', error)
      toast.error('Errore nel caricamento delle taglie')
      return []
    }
  }

  // Gestione della selezione del prodotto
  const handleProductSelect = async (product: Product) => {
    setSelectedProduct(product)
    await loadSizes(product)
    setIsModalOpen(true)
    setSuggestions([])
    setSearchTerm('')
  }

  // Gestione delle quantità
  const handleQuantityChange = (sizeId: number, delta: number) => {
    setQuantities(prev => {
      const current = prev[sizeId] || 0
      const newQuantity = Math.max(0, current + delta)
      setIsChanged(true)
      return {
        ...prev,
        [sizeId]: newQuantity
      }
    })
  }

  // Aggiungi questa funzione per gestire il click sulla card
  const handleProductCardClick = async (product: GroupedLoadProduct) => {
    // Imposta il prodotto selezionato
    setSelectedProduct({
      brand_name: product.brand_name,
      article_code: product.article_code,
      variant_code: product.variant_code,
      brand_id: product.brand_id,
      mainPhotoUrl: product.mainPhotoUrl
    } as Product)

    // Carica le taglie e usa DIRETTAMENTE il risultato
    const loadedSizes = await loadSizes({
      article_code: product.article_code,
      variant_code: product.variant_code,
      brand_id: product.brand_id
    } as Product)

    // Usa loadedSizes invece di availableSizes che non è ancora aggiornato
    const newQuantities: Record<number, number> = {}
    const newCosts: Record<number, number> = {}
    loadedSizes.forEach((availableSize: AvailableSize) => {
      // Trova la taglia corrispondente nel prodotto del carico
      const loadedSize = product.sizes.find(s => s.size_name === availableSize.size_name)
      if (loadedSize) {
        newQuantities[availableSize.id] = loadedSize.quantity
        newCosts[availableSize.id] = loadedSize.cost
      } else {
        newCosts[availableSize.id] = availableSize.wholesale_price
      }
    })

    // Imposta le quantità e apri la modale
    setQuantities(newQuantities)
    setCosts(newCosts)
    setIsModalOpen(true)
    setIsChanged(true)
  }

  // Modifica la funzione handleAddToLoad per gestire sia l'aggiunta che l'aggiornamento
  const handleAddToLoad = () => {
    if (!selectedProduct) return

    // Crea il nuovo oggetto prodotto raggruppato
    const updatedProduct: GroupedLoadProduct = {
      brand_name: selectedProduct.brand_name,
      article_code: selectedProduct.article_code,
      variant_code: selectedProduct.variant_code,
      brand_id: selectedProduct.brand_id,
      mainPhotoUrl: selectedProduct.mainPhotoUrl,
      sizes: availableSizes
      .filter(size => quantities[size.id] > 0)
      .map(size => ({
          id: size.id,  // Usa l'ID del prodotto, non del load_product
          size_name: size.size_name,
        quantity: quantities[size.id],
          cost: costs[size.id] || size.wholesale_price
        }))
    }

    // Aggiorna lo stato locale
    setLoadProducts(prev => {
      const index = prev.findIndex(p => 
        p.article_code === updatedProduct.article_code && 
        p.variant_code === updatedProduct.variant_code &&
        p.brand_id === updatedProduct.brand_id
      )

      if (index >= 0) {
        // Aggiorna il prodotto esistente mantenendo gli ID dei load_products
        const newProducts = [...prev]
        const existingSizes = prev[index].sizes
        
        // Mappa le nuove quantità mantenendo gli ID dei load_products esistenti
        const updatedSizes = updatedProduct.sizes.map(newSize => {
          const existingSize = existingSizes.find(s => s.size_name === newSize.size_name)
          return existingSize 
            ? { ...existingSize, quantity: newSize.quantity, cost: newSize.cost }
            : newSize
        })

        newProducts[index] = { ...updatedProduct, sizes: updatedSizes }
        return newProducts
      } else {
        return [...prev, updatedProduct]
      }
    })

    setIsModalOpen(false)
    setQuantities({})
    toast.success('Prodotto aggiornato')
    setIsChanged(true)
  }

  // Aggiungi questa funzione di utilità
  const sortSizes = (sizes: Array<{ size_name: string }>) => {
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL']
    
    return [...sizes].sort((a, b) => {
      const sizeA = a.size_name.toUpperCase()
      const sizeB = b.size_name.toUpperCase()

      // Gestisce taglie numeriche
      const numA = parseInt(sizeA)
      const numB = parseInt(sizeB)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }

      // Gestisce taglie standard (S, M, L, ecc.)
      const indexA = sizeOrder.indexOf(sizeA)
      const indexB = sizeOrder.indexOf(sizeB)
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }

      // Se non trova corrispondenze, usa l'ordine alfabetico
      return sizeA.localeCompare(sizeB)
    })
  }

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.y < -50) {
      setIsDetailsExpanded(true)
    } else if (info.offset.y > 50) {
      setIsDetailsExpanded(false)
    }
  }

  // Funzione per confermare il carico
  const handleConfirmLoad = async () => {
    try {
      setIsConfirming(true)
      const response = await fetch(`${process.env.API_URL}/api/loads/${params.id}/confirm`, {
        method: 'PUT',
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to confirm load')
      
      toast.success('Carico confermato con successo')
      router.refresh()
    } catch (error) {
      console.error('Error confirming load:', error)
      toast.error('Errore nella conferma del carico')
    } finally {
      setIsConfirming(false)
    }
  }

  // Funzione per revocare il carico
  const handleRevokeLoad = async () => {
    try {
      setIsRevoking(true)
      const response = await fetch(`${process.env.API_URL}/api/loads/${params.id}/revoke`, {
        method: 'PUT',
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to revoke load')
      
      toast.success('Carico revocato con successo')
      router.refresh()
    } catch (error) {
      console.error('Error revoking load:', error)
      toast.error('Errore nella revoca del carico')
    } finally {
      setIsRevoking(false)
    }
  }

  // Funzione per cancellare il carico
  const handleDeleteLoad = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`${process.env.API_URL}/api/loads/${params.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to delete load')
      
      toast.success('Carico cancellato con successo')
      router.push('/loads')
    } catch (error) {
      console.error('Error deleting load:', error)
      toast.error('Errore nella cancellazione del carico')
    } finally {
      setIsDeleting(false)
    }
  }

  // Aggiungi questa funzione per gestire l'annullamento delle modifiche
  const handleCancelChanges = async () => {
    try {
      // Ricarica i prodotti dal server
      const response = await fetch(`${process.env.API_URL}/api/load-products/load/${params.id}`, {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch load products')
      const data = await response.json()
      
      const productsWithDetails = await Promise.all(data.map(async (loadProduct: any) => {
        const productResponse = await fetch(`${process.env.API_URL}/api/products/${loadProduct.product_id}`, {
          credentials: 'include'
        })
        const productData = await productResponse.json()
        
        return {
          ...productData,
          quantity: loadProduct.quantity,
          cost: loadProduct.cost,
          id: loadProduct.id // mantieni l'id del load_product
        }
      }))

      // Raggruppa i prodotti per brand + articolo + variante
      const groupedProducts = productsWithDetails.reduce((acc: Record<string, GroupedLoadProduct>, product: any) => {
        const key = `${product.brand_name}-${product.article_code}-${product.variant_code}`
        
        if (!acc[key]) {
          acc[key] = {
            brand_name: product.brand_name,
            article_code: product.article_code,
            variant_code: product.variant_code,
            mainPhotoUrl: product.mainPhotoUrl,
            brand_id: product.brand_id,
            sizes: []
          }
        }

        acc[key].sizes.push({
          id: product.id,
          size_name: product.size_name,
          quantity: product.quantity,
          cost: product.cost
        })

        return acc
      }, {})

      setLoadProducts(Object.values(groupedProducts))
      setIsChanged(false)
      toast.success('Modifiche annullate')
    } catch (error) {
      console.error('Error canceling changes:', error)
      toast.error('Errore durante l\'annullamento delle modifiche')
    }
  }

  // Modifico la funzione handleSave
  const handleSave = async () => {
    try {
      if (!load) throw new Error('No load data to save')

      // Prima eliminiamo i prodotti rimossi
      for (const removedId of removedProductIds) {
        const deleteResponse = await fetch(`${process.env.API_URL}/api/load-products/${removedId}`, {
          method: 'DELETE',
          credentials: 'include'
        })
        if (!deleteResponse.ok) {
          throw new Error(`Failed to delete product with ID ${removedId}`)
        }
      }

      // Prepariamo i dati per l'aggiornamento/creazione
      for (const product of loadProducts) {
        for (const size of product.sizes) {
          // Carica i dettagli del prodotto per ottenere il product_id corretto
          const productResponse = await fetch(
            `${process.env.API_URL}/api/products?article_code=${product.article_code}&variant_code=${product.variant_code}&size_name=${size.size_name}`,
            { credentials: 'include' }
          )
          if (!productResponse.ok) throw new Error('Failed to fetch product details')
          const productData = await productResponse.json()
          
          // Trova il prodotto corretto
          const actualProduct = productData.products.find((p: any) => 
            p.article_code === product.article_code &&
            p.variant_code === product.variant_code &&
            p.size_name === size.size_name
          )
          
          if (!actualProduct) {
            throw new Error(`Product not found: ${product.article_code} - ${product.variant_code} - ${size.size_name}`)
          }

          const loadProductData = {
            load_id: parseInt(params.id as string),
            product_id: actualProduct.id, // Usa l'ID effettivo del prodotto
            cost: size.cost,
            quantity: size.quantity
          }

          let response;
          // Se la taglia ha un ID esistente (load_product_id), aggiorniamo
          if (size.id) {
            response = await fetch(`${process.env.API_URL}/api/load-products/${size.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(loadProductData)
            })
          } else {
            // Altrimenti creiamo un nuovo record
            response = await fetch(`${process.env.API_URL}/api/load-products`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(loadProductData)
            })

            if (response.ok) {
              const newLoadProduct = await response.json()
              size.id = newLoadProduct.id
            }
          }

          if (!response.ok) {
            throw new Error(`Failed to save product ${size.id}`)
          }
        }
      }

      // Reset degli stati
      setRemovedProductIds([])
      setIsChanged(false)
      toast.success('Modifiche salvate con successo')

    } catch (error) {
      console.error('Error saving changes:', error)
      toast.error('Errore nel salvataggio delle modifiche')
    }
  }

  // Modifico la funzione che rimuove i prodotti per tracciare gli ID rimossi
  const handleRemoveProduct = (product: GroupedLoadProduct) => {
    // Aggiungi gli ID delle taglie rimosse alla lista
    product.sizes.forEach(size => {
      if (size.id) {
        setRemovedProductIds(prev => [...prev, size.id])
      }
    })

    // Rimuovi il prodotto dallo stato
    setLoadProducts(prev => prev.filter(p => 
      p.article_code !== product.article_code || 
      p.variant_code !== product.variant_code
    ))

    setIsChanged(true)
    toast.success('Prodotto rimosso')
  }

  // Aggiungi questa funzione per gestire il cambio del costo
  const handleCostChange = (sizeId: number, value: string) => {
    const newCost = Number(value.replace(',', '.'))
    if (!isNaN(newCost)) {
      setCosts(prev => {
        setIsChanged(true)
        return {
          ...prev,
          [sizeId]: newCost
        }
      })
    }
  }

  // Funzione per ordinare le taglie disponibili
  const sortAvailableSizes = (sizes: AvailableSize[]) => {
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL']
    
    return [...sizes].sort((a, b) => {
      const sizeA = a.size_name.toUpperCase()
      const sizeB = b.size_name.toUpperCase()

      // Gestisce taglie numeriche
      const numA = parseInt(sizeA)
      const numB = parseInt(sizeB)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }

      // Gestisce taglie standard (S, M, L, ecc.)
      const indexA = sizeOrder.indexOf(sizeA)
      const indexB = sizeOrder.indexOf(sizeB)
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }

      // Se non trova corrispondenze, usa l'ordine alfabetico
      return sizeA.localeCompare(sizeB)
    })
  }

  // Funzione per ordinare le taglie dei prodotti nel carico
  const sortLoadSizes = (sizes: Array<{ size_name: string }>) => {
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL']
    
    return [...sizes].sort((a, b) => {
      const sizeA = a.size_name.toUpperCase()
      const sizeB = b.size_name.toUpperCase()

      // Gestisce taglie numeriche
      const numA = parseInt(sizeA)
      const numB = parseInt(sizeB)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }

      // Gestisce taglie standard (S, M, L, ecc.)
      const indexA = sizeOrder.indexOf(sizeA)
      const indexB = sizeOrder.indexOf(sizeB)
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }

      // Se non trova corrispondenze, usa l'ordine alfabetico
      return sizeA.localeCompare(sizeB)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header con stato e info carico */}
      <div className="bg-white shadow-sm px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.back()}
            className="h-7 w-7"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">#{load?.code}</span>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500">
            {new Date(load?.created_time || '').toLocaleDateString('it-IT', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <Badge 
            variant="secondary" 
            className={`${getStatusColor(load?.status_id || 0)} capitalize text-xs px-2 py-0.5`}
          >
            {getStatusText(load?.status_id || 0)}
          </Badge>
        </div>
      </div>

      {/* Barra di ricerca */}
      <div className="bg-white shadow-sm z-50 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Cerca codice articolo, variante..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              searchProducts(e.target.value)
            }}
            className="pl-10"
          />

        {/* Suggerimenti */}
        {suggestions.length > 0 && (
            <div className="bg-white border-t">
            {suggestions.map((product) => (
              <div
                key={`${product.article_code}-${product.variant_code}`}
                  className="p-4 border-b flex items-center gap-4 active:bg-gray-100"
                onClick={() => handleProductSelect(product)}
              >
                {/* Foto prodotto */}
                <div className="relative w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  {product.mainPhotoUrl ? (
                    <Image
                      src={product.mainPhotoUrl}
                      alt={product.article_code}
                      fill
                      className="object-cover rounded-lg"
                    />
                  ) : (
                    <Shirt className="w-8 h-8 text-gray-400" />
                  )}
                </div>

                {/* Dettagli prodotto */}
                <div className="flex-1">
                    <div className="text-lg font-bold">
                      {product.brand_name}
                    </div>
                    <div className="text-sm text-gray-600">
                    {product.article_code} - {product.variant_code}
                  </div>
                  <div className="text-xs text-gray-400 flex flex-wrap gap-1 mt-1">
                    {product.attributes?.map((attr, idx) => (
                      <span key={idx} className="bg-gray-100 px-2 py-0.5 rounded">
                        {attr.attribute_name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Lista prodotti nella pagina principale */}
      <div className="p-4 space-y-4">
        {loadProducts.map((product, index) => (
          <div 
            key={index} 
            className="bg-white rounded-lg shadow-sm cursor-pointer active:bg-gray-50"
            onClick={() => handleProductCardClick(product)}
          >
            <div className="flex gap-2 p-3">
              {/* Foto più piccola */}
              <div className="relative w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0">
                {product.mainPhotoUrl ? (
                  <Image
                    src={product.mainPhotoUrl}
                    alt={product.article_code}
                    fill
                    className="object-cover rounded-lg"
                  />
                ) : (
                  <Shirt className="w-5 h-5 text-gray-400 m-auto" />
                )}
              </div>

              {/* Dettagli e taglie */}
              <div className="flex-1 min-w-0">
                {/* Codici più piccoli */}
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-sm font-medium">
                      {product.article_code} - {product.variant_code}
                    </div>
                    <div className="text-xs text-gray-500">
                      {product.brand_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Totale</div>
                    <div className="text-sm font-bold">
                      €{product.sizes.reduce((sum, size) => sum + (size.cost * size.quantity), 0).toFixed(2)}
                    </div>
                  </div>
      </div>
                
                {/* Taglie ordinate */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {sortLoadSizes(product.sizes).map((sortedSize) => {
                    const size = product.sizes.find(s => s.size_name === sortedSize.size_name)
                    if (!size) return null
                    return (
                      <div key={size.id} className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                        <span className="text-xs text-gray-600">{size.size_name}</span>
                        <span className="text-xs font-medium text-gray-900">x{size.quantity}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab fissa in basso solo con i dettagli del carico */}
      <motion.div
        initial={{ y: window.innerHeight - 80 }}
        animate={{ y: isDetailsExpanded ? 0 : window.innerHeight - 80 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: window.innerHeight - 80 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="fixed bottom-0 left-0 right-0 bg-white shadow-lg z-50 rounded-t-xl"
      >
        {/* Tab sempre visibile */}
        <div className="h-20 px-4 flex items-center justify-between border-b">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-gray-500">Totale Pezzi</p>
              <p className="text-xl font-bold">
                {loadProducts.reduce((total, product) => 
                  total + product.sizes.reduce((sum, size) => sum + size.quantity, 0)
                , 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Totale Importo</p>
              <p className="text-xl font-bold">
                €{loadProducts.reduce((total, product) => 
                  total + product.sizes.reduce((sum, size) => 
                    sum + (size.cost * size.quantity)
                  , 0)
                , 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Bottoni Salva/Annulla se ci sono modifiche */}
          {isChanged && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelChanges}
                className="text-[#EF4444] border-[#EF4444] hover:bg-red-50"
              >
                Annulla
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-[#22C55E] hover:bg-[#16A34A] text-white"
              >
                Salva
              </Button>
            </div>
          )}
        </div>

        {/* Contenuto espandibile con solo i dettagli */}
        <div className="h-[calc(100vh-80px)] overflow-y-auto bg-gray-50">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <h4 className="text-sm text-gray-500 mb-1">Fornitore</h4>
                <p className="text-lg font-semibold">{load?.supply_id || 'Nessun fornitore'}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <h4 className="text-sm text-gray-500 mb-1">Magazzino</h4>
                <p className="text-lg font-semibold">{load?.warehouse_id || 'N/D'}</p>
              </div>
            </div>

            {/* Azioni */}
            <div className="sticky bottom-0 bg-white p-4 border-t">
              <div className="flex flex-col gap-2">
                {/* Prima riga di bottoni */}
                <div className="flex gap-2">
                  {load?.status_id === 9 && ( // Bozza
                    <>
                      <Button 
                        className="flex-1 bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium"
                        onClick={handleConfirmLoad}
                        disabled={loadProducts.length === 0 || isConfirming}
                      >
                        {isConfirming ? 'Caricamento...' : 'Carica'}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 text-[#EF4444] border-[#EF4444] hover:bg-red-50 font-medium"
                        onClick={handleDeleteLoad}
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Cancellamento...' : 'Cancella'}
                      </Button>
                    </>
                  )}

                  {load?.status_id === 10 && ( // Confermato
                    <Button 
                      variant="destructive"
                      className="flex-1"
                      onClick={handleRevokeLoad}
                      disabled={isRevoking}
                    >
                      {isRevoking ? 'Revocando...' : 'Revoca'}
                    </Button>
                  )}

                  {load?.status_id === 11 && ( // Revocato
                    <>
                      <Button 
                        className="flex-1 bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium"
                        onClick={handleConfirmLoad}
                        disabled={loadProducts.length === 0 || isConfirming}
                      >
                        {isConfirming ? 'Ricaricando...' : 'Ricarica'}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 text-[#EF4444] border-[#EF4444] hover:bg-red-50 font-medium"
                        onClick={handleDeleteLoad}
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Cancellamento...' : 'Cancella'}
                      </Button>
                    </>
                  )}
                </div>

                {/* Bottone Annulla Modifiche - mostralo solo se ci sono modifiche */}
                {isChanged && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleCancelChanges}
                  >
                    Annulla Modifiche
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modale selezione taglie */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[90vw] h-[90vh] p-0 flex flex-col">
          {/* Header */}
          <div className="p-3 border-b">
            <div className="flex items-center gap-2">
              {/* Foto più piccola */}
              <div className="relative w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0">
                {selectedProduct?.mainPhotoUrl ? (
                  <Image
                    src={selectedProduct.mainPhotoUrl}
                    alt={selectedProduct.article_code}
                    fill
                    className="object-cover rounded-lg"
                  />
                ) : (
                  <Shirt className="w-6 h-6 text-gray-400 m-auto" />
                )}
              </div>
              
              {/* Codici più piccoli */}
              <div>
                <h2 className="text-base font-medium">
              {selectedProduct?.article_code} - {selectedProduct?.variant_code}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedProduct?.brand_name}
                </p>
              </div>
            </div>
          </div>

          {/* Lista taglie - scrollabile */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {sortAvailableSizes(availableSizes).map((size) => {
                // Trova il costo esistente per questa taglia nel carico
                const existingSize = selectedProduct && loadProducts.find(p => 
                  p.article_code === selectedProduct.article_code && 
                  p.variant_code === selectedProduct.variant_code
                )?.sizes.find(s => s.size_name === size.size_name)

                return (
                  <div key={size.id} className="bg-gray-50 rounded-lg p-3">
                    {/* Prima riga: Taglia e Wholesale */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-medium">
                        {size.size_name}
                      </span>
                      <span className="text-sm text-gray-500">
                        €{Number(size.wholesale_price || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Seconda riga: Costo e Quantità */}
                <div className="flex items-center justify-between">
                      {/* Input Costo */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Costo</span>
                        <Input
                          type="text"
                          value={costs[size.id]?.toFixed(2) || size.wholesale_price?.toFixed(2) || "0.00"}
                          onChange={(e) => handleCostChange(size.id, e.target.value)}
                          className="w-24 h-8 text-right"
                        />
                        <span className="text-sm">€</span>
                      </div>

                      {/* Controlli Quantità */}
                      <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                          className="h-8 w-8"
                    onClick={() => handleQuantityChange(size.id, -1)}
                    disabled={!quantities[size.id]}
                  >
                    -
                  </Button>
                        <span className="text-base font-medium w-8 text-center">
                    {quantities[size.id] || 0}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                          className="h-8 w-8"
                    onClick={() => handleQuantityChange(size.id, 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-4 bg-white">
            <div className="flex justify-between text-sm mb-4">
              <span className="text-gray-600">Totale Quantità</span>
              <span className="font-medium">
                {Object.values(quantities).reduce((sum, qty) => sum + (qty || 0), 0)}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsModalOpen(false)}
              >
              Annulla
            </Button>
              <Button 
                className="flex-1"
                onClick={handleAddToLoad}
                disabled={!Object.values(quantities).some(q => q > 0)}
              >
              Aggiungi al Carico
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 