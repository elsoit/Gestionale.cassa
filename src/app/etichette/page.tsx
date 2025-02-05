'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Search } from "lucide-react"
import Image from "next/image"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LAYOUTS, LayoutType } from './layouts'
import { Shirt } from 'lucide-react'

const formatPrice = (price: number | string | null | undefined): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  return typeof numPrice === 'number' && !isNaN(numPrice)
    ? `${numPrice.toFixed(2)} €`
    : '0.00 €'
}

interface Product {
  id: number
  article_code: string
  variant_code: string
  retail_price: number
  brand_id: number | null
  size_id: number | null
  total_availability?: number
  warehouse_availability?: number
}

interface Brand {
  id: number
  name: string
  description: string | null
}

interface Size {
  id: number
  name: string
}

interface PriceList {
  id: number
  name: string
}

interface DiscountList {
  id: number
  name: string
  description: string | null
}

interface Warehouse {
  id: number
  name: string
  code: string
}

export default function LabelPrinting() {
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Record<number, Brand>>({})
  const [sizes, setSizes] = useState<Record<number, Size>>({})
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true)
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [mainPhotos, setMainPhotos] = useState<Record<string, string>>({})
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([])
  const [warehousesAvailability, setWarehousesAvailability] = useState<Record<string, Record<number, number>>>({})
  
  // Stati per le opzioni di stampa
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('standard')
  const [quantityType, setQuantityType] = useState('fixed')
  const [fixedQuantity, setFixedQuantity] = useState('1')
  const [selectedLabelFormat, setSelectedLabelFormat] = useState('')
  const [selectedBasePriceList, setSelectedBasePriceList] = useState('')
  const [selectedDiscountPriceList, setSelectedDiscountPriceList] = useState('')
  const [listPrices, setListPrices] = useState<Record<number, number>>({})
  const [discountLists, setDiscountLists] = useState<DiscountList[]>([])
  const [discountPrices, setDiscountPrices] = useState<Record<number, number>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch brands
        const brandsResponse = await fetch(`${process.env.API_URL}/api/brands`)
        if (!brandsResponse.ok) throw new Error('Failed to fetch brands')
        const brandsData = await brandsResponse.json()
        const brandsMap: Record<number, Brand> = {}
        brandsData.forEach((brand: Brand) => {
          brandsMap[brand.id] = brand
        })
        setBrands(brandsMap)

        // Fetch sizes
        const sizesResponse = await fetch(`${process.env.API_URL}/api/sizes`)
        if (!sizesResponse.ok) throw new Error('Failed to fetch sizes')
        const sizesData = await sizesResponse.json()
        const sizesMap: Record<number, Size> = {}
        sizesData.forEach((size: Size) => {
          sizesMap[size.id] = size
        })
        setSizes(sizesMap)

        // Fetch products
        const productsResponse = await fetch(`${process.env.API_URL}/api/products`)
        if (!productsResponse.ok) throw new Error('Failed to fetch products')
        const productsData = await productsResponse.json()
        
        if (productsData && Array.isArray(productsData.products)) {
          setProducts(productsData.products)
          
          // Fetch main photos for each product
          const photosMap: Record<string, string> = {}
          await Promise.all(
            productsData.products.map(async (product: Product) => {
              try {
                const photoResponse = await fetch(
                  `${process.env.API_URL}/api/products/photos/${product.article_code}/${product.variant_code}/main`
                )
                if (photoResponse.ok) {
                  const photoData = await photoResponse.json()
                  if (photoData.url) {
                    photosMap[`${product.article_code}-${product.variant_code}`] = photoData.url
                  }
                }
              } catch (error) {
                console.error('Error fetching photo:', error)
              }
            })
          )
          setMainPhotos(photosMap)

          // Fetch delle disponibilità totali
          const availabilityResponse = await fetch(`${process.env.API_URL}/api/product-availability`)
          if (!availabilityResponse.ok) throw new Error('Failed to fetch availability')
          const availabilityData = await availabilityResponse.json()
          
          const availabilityMap = availabilityData.reduce((acc: {[key: number]: number}, item: { product_id: number, quantity: number }) => {
            acc[item.product_id] = (acc[item.product_id] || 0) + item.quantity
            return acc
          }, {})

          let productsWithAvailability = productsData.products.map((product: Product) => ({
            ...product,
            total_availability: availabilityMap[product.id] || 0
          }))

          // Filtra i prodotti se showOnlyAvailable è true
          if (showOnlyAvailable) {
            productsWithAvailability = productsWithAvailability.filter((product: Product) => 
              (product.total_availability || 0) > 0
            )
          }

          setProducts(productsWithAvailability)
        }

        // Fetch price lists
        const priceListsResponse = await fetch(`${process.env.API_URL}/api/price-lists`)
        if (!priceListsResponse.ok) throw new Error('Failed to fetch price lists')
        const priceListsData = await priceListsResponse.json()
        setPriceLists(priceListsData || [])

        // Fetch discount lists
        const discountListsResponse = await fetch(`${process.env.API_URL}/api/discount-lists`)
        if (!discountListsResponse.ok) throw new Error('Failed to fetch discount lists')
        const discountListsData = await discountListsResponse.json()
        setDiscountLists(discountListsData || [])

        // Fetch warehouses
        const warehousesResponse = await fetch(`${process.env.API_URL}/api/warehouses`)
        if (!warehousesResponse.ok) throw new Error('Failed to fetch warehouses')
        const warehousesData = await warehousesResponse.json()
        setWarehouses(warehousesData)

      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Errore nel caricamento dei dati')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [showOnlyAvailable])

  // Aggiorno l'useEffect per gestire disponibilità di più magazzini
  useEffect(() => {
    const fetchWarehousesAvailability = async () => {
      if (selectedWarehouses.length === 0) {
        setWarehousesAvailability({})
        return
      }

      try {
        const availabilityPromises = selectedWarehouses.map(warehouseId =>
          fetch(`${process.env.API_URL}/api/product-availability/warehouse/${warehouseId}`)
            .then(res => res.json())
            .then(data => ({ warehouseId, data }))
        )

        const results = await Promise.all(availabilityPromises)
        
        const newAvailability: Record<string, Record<number, number>> = {}
        results.forEach(({ warehouseId, data }) => {
          newAvailability[warehouseId] = data.reduce((acc: Record<number, number>, item: { product_id: number, quantity: number }) => {
            acc[item.product_id] = item.quantity
            return acc
          }, {})
        })

        setWarehousesAvailability(newAvailability)
      } catch (error) {
        console.error('Error fetching warehouses availability:', error)
        toast.error('Errore nel caricamento delle disponibilità per magazzini')
      }
    }

    fetchWarehousesAvailability()
  }, [selectedWarehouses])

  // Nuovo useEffect per caricare i prezzi del listino selezionato
  useEffect(() => {
    const fetchListPrices = async () => {
      if (!selectedBasePriceList) {
        setListPrices({})
        return
      }

      try {
        const response = await fetch(`${process.env.API_URL}/api/price-lists/${selectedBasePriceList}/prices`)
        if (!response.ok) throw new Error('Failed to fetch list prices')
        const data = await response.json()
        
        const pricesMap = data.reduce((acc: Record<number, number>, item: { product_id: number, price: number }) => {
          acc[item.product_id] = item.price
          return acc
        }, {})

        setListPrices(pricesMap)
      } catch (error) {
        console.error('Error fetching list prices:', error)
        toast.error('Errore nel caricamento dei prezzi del listino')
      }
    }

    fetchListPrices()
  }, [selectedBasePriceList])

  // Nuovo useEffect per caricare i prezzi scontati del listino selezionato
  useEffect(() => {
    const fetchDiscountPrices = async () => {
      if (!selectedDiscountPriceList || selectedDiscountPriceList === 'none') {
        setDiscountPrices({})
        return
      }

      try {
        const response = await fetch(`${process.env.API_URL}/api/discount-lists/${selectedDiscountPriceList}/discounts`)
        if (!response.ok) throw new Error('Failed to fetch discount prices')
        const data = await response.json()
        
        const pricesMap = data.reduce((acc: Record<number, number>, item: { product_id: number, discounted_price: number }) => {
          acc[item.product_id] = item.discounted_price
          return acc
        }, {})

        setDiscountPrices(pricesMap)
      } catch (error) {
        console.error('Error fetching discount prices:', error)
        toast.error('Errore nel caricamento dei prezzi scontati')
      }
    }

    fetchDiscountPrices()
  }, [selectedDiscountPriceList])

  // Funzione per calcolare la disponibilità totale per un prodotto dai magazzini selezionati
  const getSelectedWarehousesAvailability = (productId: number): number => {
    if (selectedWarehouses.length === 0) {
      const product = products.find(p => p.id === productId)
      return product?.total_availability || 0
    }
    
    return selectedWarehouses.reduce((total, warehouseId) => {
      return total + (warehousesAvailability[warehouseId]?.[productId] || 0)
    }, 0)
  }

  const filteredProducts = products
    .filter(product => {
      if (showOnlyAvailable) {
        const availability = selectedWarehouses.length > 0
          ? getSelectedWarehousesAvailability(product.id)
          : (product.total_availability || 0)

        if (availability <= 0) {
          return false
        }
      }
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const brandName = product.brand_id ? brands[product.brand_id]?.name?.toLowerCase() || '' : ''
        return (
          product.article_code.toLowerCase().includes(searchLower) ||
          product.variant_code.toLowerCase().includes(searchLower) ||
          brandName.includes(searchLower)
        )
      }
      
      return true
    })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleCheckboxChange = (productId: number, checked: boolean) => {
    setSelectedProducts(prev => 
      checked 
        ? [...prev, productId]
        : prev.filter(id => id !== productId)
    )
  }

  const handleGenerateLabels = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Seleziona almeno un prodotto')
      return
    }

    try {
      const labelData = {
        products: selectedProducts,
        layout: selectedLayout,
        quantityType,
        fixedQuantity: quantityType === 'fixed' ? parseInt(fixedQuantity) : null,
        warehouses: quantityType === 'store' ? selectedWarehouses : null,
        basePriceList: selectedBasePriceList,
        discountPriceList: selectedDiscountPriceList === 'none' ? null : selectedDiscountPriceList,
        labelFormat: selectedLabelFormat
      }

      const response = await fetch(`${process.env.API_URL}/api/generate-labels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(labelData),
      })

      if (!response.ok) throw new Error('Failed to generate labels')

      // Ottieni il blob del PDF
      const blob = await response.blob()
      
      // Crea un URL per il blob
      const url = window.URL.createObjectURL(blob)
      
      // Crea un elemento <a> temporaneo
      const a = document.createElement('a')
      a.href = url
      a.download = 'etichette.pdf' // Nome del file da scaricare
      
      // Aggiungi l'elemento al DOM e simula il click
      document.body.appendChild(a)
      a.click()
      
      // Rimuovi l'elemento e revoca l'URL
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('Etichette generate con successo')
    } catch (error) {
      console.error('Error generating labels:', error)
      toast.error('Errore nella generazione delle etichette')
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Stampa Etichette
        </h2>
      </div>

      <div className="flex gap-6">
        {/* Sezione Opzioni - Fissa */}
        <div className="w-80 sticky top-4 self-start">
          <Card>
            <CardHeader>
              <CardTitle>Opzioni di Stampa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Layout</Label>
                <Select value={selectedLayout} onValueChange={(value: LayoutType) => setSelectedLayout(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona layout" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LAYOUTS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo Quantità</Label>
                <Select value={quantityType} onValueChange={(value) => {
                  setQuantityType(value)
                  if (value === 'fixed') {
                    setSelectedWarehouses([])
                    setWarehousesAvailability({})
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo quantità" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Quantità Fissa</SelectItem>
                    <SelectItem value="store">Come Disponibilità Magazzino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {quantityType === 'fixed' && (
                <div className="space-y-2">
                  <Label>Quantità Fissa</Label>
                  <Input
                    type="number"
                    value={fixedQuantity}
                    onChange={(e) => setFixedQuantity(e.target.value)}
                    min="1"
                  />
                </div>
              )}

              {quantityType === 'store' && (
                <div className="space-y-2">
                  <Label>Seleziona Magazzini</Label>
                  <div className="space-y-2">
                    {warehouses.map((warehouse) => (
                      <div key={warehouse.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedWarehouses.includes(warehouse.id.toString())}
                          onCheckedChange={(checked) => {
                            setSelectedWarehouses(prev => 
                              checked
                                ? [...prev, warehouse.id.toString()]
                                : prev.filter(id => id !== warehouse.id.toString())
                            )
                          }}
                        />
                        <Label>
                          {warehouse.name} ({warehouse.code})
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Listino Base</Label>
                <Select value={selectedBasePriceList} onValueChange={setSelectedBasePriceList}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona listino base" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceLists.map((list) => (
                      <SelectItem key={list.id} value={list.id.toString()}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Listino Scontato (opzionale)</Label>
                <Select value={selectedDiscountPriceList} onValueChange={setSelectedDiscountPriceList}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona listino scontato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuno</SelectItem>
                    {discountLists.map((list) => (
                      <SelectItem key={list.id} value={list.id.toString()}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Formato Etichetta</Label>
                <Select value={selectedLabelFormat} onValueChange={setSelectedLabelFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50x34">Etichetta separata 50x34</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full mt-6"
                onClick={handleGenerateLabels}
                disabled={
                  !selectedLayout ||
                  !selectedBasePriceList ||
                  !selectedLabelFormat ||
                  selectedProducts.length === 0 ||
                  (quantityType === 'fixed' && !fixedQuantity) ||
                  (quantityType === 'store' && selectedWarehouses.length === 0)
                }
              >
                Genera Etichette ({selectedProducts.length})
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tabella Prodotti - Scrollabile */}
        <div className="flex-1 overflow-hidden">
          <Card className="h-[calc(100vh-12rem)]">
            <CardHeader className="sticky top-0 bg-white z-10">
              <CardTitle>Catalogo Prodotti</CardTitle>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={showOnlyAvailable}
                      onCheckedChange={setShowOnlyAvailable}
                      id="available-switch"
                    />
                    <Label htmlFor="available-switch">
                      {showOnlyAvailable ? "Solo disponibili" : "Tutti i prodotti"}
                    </Label>
                  </div>
                </div>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Cerca per codice articolo o variante..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-auto h-[calc(100%-8rem)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-16">Foto</TableHead>
                    <TableHead className="w-32">Codice Art.</TableHead>
                    <TableHead className="w-32">Codice Var.</TableHead>
                    <TableHead className="w-32">Brand</TableHead>
                    <TableHead className="w-24">Taglia</TableHead>
                    <TableHead className="w-24 text-center">Disp.</TableHead>
                    <TableHead className="w-28 text-right">Prezzo Base</TableHead>
                    {selectedDiscountPriceList && selectedDiscountPriceList !== 'none' && (
                      <TableHead className="w-28 text-right">Prezzo Scontato</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => 
                            handleCheckboxChange(product.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="relative h-12 w-12 rounded-md overflow-hidden border border-gray-200">
                          {mainPhotos[`${product.article_code}-${product.variant_code}`] ? (
                            <Image
                              src={mainPhotos[`${product.article_code}-${product.variant_code}`] || '/placeholder.png'}
                              alt={product.article_code}
                              className="object-cover"
                              fill
                              sizes="(max-width: 48px) 100vw"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <Shirt className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{product.article_code}</TableCell>
                      <TableCell>{product.variant_code}</TableCell>
                      <TableCell>{product.brand_id ? brands[product.brand_id]?.name || '-' : '-'}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-gray-100 rounded-md text-sm">
                          {product.size_id ? sizes[product.size_id]?.name || '-' : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-md text-sm ${
                          (selectedWarehouses.length > 0
                            ? getSelectedWarehousesAvailability(product.id)
                            : (product.total_availability || 0)) === 0 
                              ? 'bg-red-100 text-red-700' 
                              : (selectedWarehouses.length > 0
                                  ? getSelectedWarehousesAvailability(product.id)
                                  : (product.total_availability || 0)) < 3
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                        }`}>
                          {selectedWarehouses.length > 0
                            ? getSelectedWarehousesAvailability(product.id)
                            : (product.total_availability || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(
                          selectedBasePriceList 
                            ? listPrices[product.id] || product.retail_price
                            : product.retail_price
                        )}
                      </TableCell>
                      {selectedDiscountPriceList && selectedDiscountPriceList !== 'none' && (
                        <TableCell className="text-right font-medium text-red-600">
                          {formatPrice(discountPrices[product.id])}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 