'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import Image from "next/image"
import NestedFilterMenu from '@/app/components/nested-filter-menu'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { StaticImport } from 'next/dist/shared/lib/get-img-props'

interface Brand {
  id: number
  name: string
  description: string | null
}

interface Size {
  id: number
  name: string
}

interface Product {
  id: number
  article_code: string
  variant_code: string
  retail_price: number
  wholesale_price: number
  brand_id: number | null
  size_id: number | null
  total_availability?: number
}

interface Parameter {
  id: number
  name: string
  attributes: Array<{
    id: number
    name: string
  }>
}

interface PriceRange {
  min: number
  max: number
}

interface PriceRanges {
  wholesale_price: PriceRange
  retail_price: PriceRange
}

interface AvailabilityFilter {
  type?: 'available' | 'not_available' | 'greater_than' | 'less_than'
  value?: number
}

interface Filters {
  [key: string]: number[]
}

interface PriceList {
  id: number
  name: string
}

export default function AddProductsToDiscountList() {
  const params = useParams()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Record<number, Brand>>({})
  const [sizes, setSizes] = useState<Record<number, Size>>({})
  const [selectedProducts, setSelectedProducts] = useState<Record<number, number>>({}) // Stores discount percentages
  const [isLoading, setIsLoading] = useState(true)
  const [listName, setListName] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [mainPhotos, setMainPhotos] = useState<Record<string, string>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [priceRanges, setPriceRanges] = useState<PriceRanges>({
    wholesale_price: { min: 0, max: 1000 },
    retail_price: { min: 0, max: 1000 }
  })
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>({})
  const [parameters, setParameters] = useState<Parameter[]>([])
  const [baseCalc, setBaseCalc] = useState<string>('')
  const [calcRule, setCalcRule] = useState<string>('')
  const [calcValue, setCalcValue] = useState<string>('')
  const [rounding, setRounding] = useState<string>('')
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false)
  const [basePrices, setBasePrices] = useState<Record<number, number>>({})
  const [selectedPriceList, setSelectedPriceList] = useState<string>('')
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [otherListPrices, setOtherListPrices] = useState<Record<number, number>>({})

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

        // Fetch products with filters
        const searchParams = new URLSearchParams()
        if (searchTerm) searchParams.set('search', searchTerm)
        if (Object.keys(filters).length > 0) searchParams.set('filters', JSON.stringify(filters))
        if (Object.keys(availabilityFilter).length > 0) searchParams.set('availability', JSON.stringify(availabilityFilter))
        if (Object.keys(priceRanges.wholesale_price).length > 0 || Object.keys(priceRanges.retail_price).length > 0) {
          searchParams.set('priceRanges', JSON.stringify(priceRanges))
        }

        const productsResponse = await fetch(`${process.env.API_URL}/api/products?${searchParams.toString()}`)
        if (!productsResponse.ok) throw new Error('Failed to fetch products')
        const productsData = await productsResponse.json()
        
        if (productsData && Array.isArray(productsData.products)) {
          setProducts(productsData.products)
          
          // Initialize base prices with retail prices
          const initialBasePrices: Record<number, number> = {}
          productsData.products.forEach((product: Product) => {
            initialBasePrices[product.id] = product.retail_price
          })
          setBasePrices(initialBasePrices)
          
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

          // Set parameters for filters
          const allParameters = [
            {
              id: -1,
              name: "Brand",
              attributes: Object.values(brandsMap).map(brand => ({
                id: brand.id,
                name: brand.name
              }))
            },
            {
              id: -2,
              name: "Taglie",
              attributes: Object.values(sizesMap).map(size => ({
                id: size.id,
                name: size.name
              }))
            },
            ...(productsData.parameters || [])
          ]
          setParameters(allParameters)

          // Fetch availabilities
          const availabilityResponse = await fetch(`${process.env.API_URL}/api/product-availability`)
          if (!availabilityResponse.ok) throw new Error('Failed to fetch availability')
          const availabilityData = await availabilityResponse.json()
          
          const availabilityMap = availabilityData.reduce((acc: {[key: number]: number}, item: { product_id: number, quantity: number }) => {
            acc[item.product_id] = (acc[item.product_id] || 0) + item.quantity
            return acc
          }, {})

          if (productsData && Array.isArray(productsData.products)) {
            let productsWithAvailability = productsData.products.map((product: Product) => ({
              ...product,
              total_availability: availabilityMap[product.id] || 0
            }))

            if (showOnlyAvailable) {
              productsWithAvailability = productsWithAvailability.filter((product: Product) => 
                (product.total_availability || 0) > 0
              )
            }

            setProducts(productsWithAvailability)
          }
        }

        // Fetch discount list details and discounts
        const listResponse = await fetch(`${process.env.API_URL}/api/discount-lists/${params.id}`)
        if (!listResponse.ok) throw new Error('Failed to fetch discount list')
        const listData = await listResponse.json()
        setListName(listData.name || 'Listino Sconti')

        if (Array.isArray(listData.products)) {
          const discountsMap: Record<number, number> = {}
          listData.products.forEach((p: any) => {
            const basePrice = p.default_price || p.retail_price
            const discountedPrice = p.discounted_price
            if (basePrice && discountedPrice) {
              const discountPercentage = ((basePrice - discountedPrice) / basePrice) * 100
              discountsMap[p.product_id] = discountPercentage
            }
          })
          setSelectedProducts(discountsMap)
        }

        // Fetch price lists
        const priceListsResponse = await fetch(`${process.env.API_URL}/api/price-lists`)
        if (!priceListsResponse.ok) throw new Error('Failed to fetch price lists')
        const priceListsData = await priceListsResponse.json()
        setPriceLists(priceListsData)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Errore nel caricamento dei dati')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id, searchTerm, filters, availabilityFilter, priceRanges, showOnlyAvailable])

  useEffect(() => {
    const fetchOtherListPrices = async () => {
      if (selectedPriceList) {
        try {
          const response = await fetch(`${process.env.API_URL}/api/price-lists/${selectedPriceList}/products`)
          if (!response.ok) throw new Error('Failed to fetch other list prices')
          const data = await response.json()
          const pricesMap: Record<number, number> = {}
          data.forEach((item: { product_id: number; price: number }) => {
            pricesMap[item.product_id] = item.price
          })
          setOtherListPrices(pricesMap)
        } catch (error) {
          console.error('Error fetching other list prices:', error)
          toast.error('Errore nel caricamento dei prezzi del listino selezionato')
        }
      }
    }

    fetchOtherListPrices()
  }, [selectedPriceList])

  const handleDiscountChange = (productId: number, discount: string) => {
    const discountValue = parseFloat(discount)
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) return

    setSelectedProducts(prev => ({
      ...prev,
      [productId]: discountValue
    }))
  }

  const handleSave = async (productId: number) => {
    try {
      const basePrice = basePrices[productId] || products.find(p => p.id === productId)?.retail_price || 0
      const discount = selectedProducts[productId] || 0
      const discountedPrice = basePrice * (1 - discount / 100)

      const response = await fetch(`${process.env.API_URL}/api/discount-lists/discounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          discount_list_id: parseInt(params.id as string),
          product_id: productId,
          discounted_price: discountedPrice
        }]),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add product')
      }

      toast.success('Prodotto aggiunto al listino')
    } catch (error) {
      console.error('Error adding product:', error)
      toast.error(error instanceof Error ? error.message : 'Errore nell\'aggiunta del prodotto')
    }
  }

  const handleCheckboxChange = (productId: number, checked: boolean) => {
    setSelectedIds(prev => 
      checked 
        ? [...prev, productId]
        : prev.filter(id => id !== productId)
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const getPhotoUrl = (product: Product): string | StaticImport => {
    try {
      const key = `${product.article_code}-${product.variant_code}`
      return mainPhotos[key] || ''
    } catch (error) {
      console.error('Error getting photo URL:', error)
      return ''
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(products.map(p => p.id))
    } else {
      setSelectedIds([])
    }
  }

  const calculateDiscountedPrice = (basePrice: number, discount: number) => {
    return basePrice * (1 - discount / 100)
  }

  const handleMassUpdate = () => {
    const selectedProds = products.filter(p => selectedIds.includes(p.id))
    
    selectedProds.forEach(product => {
      let basePrice = 0
      
      // Determina il prezzo base
      switch (baseCalc) {
        case 'wholesale':
          basePrice = product.wholesale_price
          break
        case 'retail':
          basePrice = product.retail_price
          break
        case 'current_list':
          basePrice = basePrices[product.id] || product.retail_price
          break
        case 'other_list':
          basePrice = otherListPrices[Number(selectedPriceList)] || product.retail_price
          break
        case 'absolute':
          basePrice = parseFloat(calcValue)
          break
        default:
          basePrice = product.retail_price
      }

      // Aggiorna il prezzo base per questo prodotto
      setBasePrices(prev => ({
        ...prev,
        [product.id]: basePrice
      }))

      // Applica la regola di calcolo per lo sconto
      const discountValue = parseFloat(calcValue) || 0
      let finalPrice = basePrice
      
      switch (calcRule) {
        case 'discount_percent':
          finalPrice = basePrice * (1 - discountValue / 100)
          break
        case 'discount_absolute':
          finalPrice = basePrice - discountValue
          break
        case 'divide_factor':
          finalPrice = basePrice / discountValue
          break
        case 'markup_percent':
          finalPrice = basePrice * (1 + discountValue / 100)
          break
        case 'markup_absolute':
          finalPrice = basePrice + discountValue
          break
        case 'multiply_factor':
          finalPrice = basePrice * discountValue
          break
      }

      // Applica l'arrotondamento al prezzo finale
      switch (rounding) {
        case '99_up':
          if (Math.floor(finalPrice) === finalPrice) {
            finalPrice = finalPrice + 0.99
          } else {
            finalPrice = Math.ceil(finalPrice) - 0.01
          }
          break
        case '99_down':
          finalPrice = Math.floor(finalPrice) - 0.01
          break
        case '00_up':
          finalPrice = Math.ceil(finalPrice)
          break
        case '00_down':
          finalPrice = Math.floor(finalPrice)
          break
      }

      // Calcola lo sconto percentuale basato sul prezzo finale arrotondato
      const discountPercentage = ((basePrice - finalPrice) / basePrice) * 100
      handleDiscountChange(product.id, discountPercentage.toString())
    })
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Aggiungi Prodotti a {listName}
        </h2>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
          >
            Torna al Listino
          </Button>
          <Button
            disabled={selectedIds.length === 0}
            onClick={async () => {
              try {
                const productsToSave = selectedIds.map(id => {
                  const basePrice = basePrices[id] || products.find(p => p.id === id)?.retail_price || 0
                  const discount = selectedProducts[id] || 0
                  const discountedPrice = parseFloat((basePrice * (1 - discount / 100)).toFixed(2))
                  
                  return {
                    discount_list_id: parseInt(params.id as string),
                    product_id: id,
                    discounted_price: discountedPrice
                  }
                }).filter(p => p.discounted_price >= 0)
                
                const response = await fetch(`${process.env.API_URL}/api/discount-lists/discounts`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(productsToSave),
                })

                const responseData = await response.json().catch(() => null)

                if (!response.ok) {
                  throw new Error(responseData?.error || 'Errore nel salvataggio sconti')
                }

                toast.success('Sconti salvati con successo')
                router.back()
              } catch (error) {
                console.error('Error saving discounts:', error)
                toast.error(error instanceof Error ? error.message : 'Errore nel salvataggio degli sconti')
              }
            }}
          >
            Salva Sconti ({selectedIds.length})
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Input
          type="search"
          placeholder="Cerca prodotti..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-sm"
        />
        <div className="flex items-center space-x-2">
          <Switch
            checked={showOnlyAvailable}
            onCheckedChange={setShowOnlyAvailable}
            id="available-switch"
          />
          <Label htmlFor="available-switch">Solo prodotti disponibili</Label>
        </div>
        <NestedFilterMenu
          parameters={parameters}
          selectedFilters={filters}
          onFilterChange={setFilters}
          priceRanges={priceRanges}
          onPriceRangeChange={setPriceRanges}
          availabilityFilter={availabilityFilter}
          onAvailabilityChange={setAvailabilityFilter}
        />
      </div>

      <div className="flex gap-6">
        {/* Sezione Modifica Massiva */}
        <Card className="w-80">
          <CardHeader>
            <CardTitle>Modifica Massiva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Base Calcolo</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={baseCalc}
                onChange={(e) => setBaseCalc(e.target.value)}
              >
                <option value="">Seleziona base calcolo</option>
                <option value="wholesale">Prezzo Ingrosso</option>
                <option value="retail">Prezzo Dettaglio</option>
                <option value="current_list">Prezzo Listino Attuale</option>
                <option value="other_list">Prezzo Altro Listino</option>
                <option value="absolute">Valore Assoluto</option>
              </select>
            </div>

            {baseCalc === 'other_list' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Seleziona Listino</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={selectedPriceList}
                  onChange={(e) => setSelectedPriceList(e.target.value)}
                >
                  <option value="">Seleziona listino</option>
                  {priceLists.map(list => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </select>
              </div>
            )}

            {baseCalc !== 'absolute' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Regola Calcolo</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={calcRule}
                  onChange={(e) => setCalcRule(e.target.value)}
                >
                  <option value="">Seleziona regola calcolo</option>
                  <option value="discount_percent">Sconto Percentuale</option>
                  <option value="discount_absolute">Sconto Assoluto</option>
                  <option value="divide_factor">Divisione Fattore</option>
                  <option value="markup_percent">Ricarico Percentuale</option>
                  <option value="markup_absolute">Ricarico Assoluto</option>
                  <option value="multiply_factor">Moltiplicazione Fattore</option>
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Valore Calcolo</label>
              <div className="relative">
                <Input
                  type="number"
                  value={calcValue}
                  onChange={(e) => setCalcValue(e.target.value)}
                  className="w-full pr-8"
                  placeholder="Inserisci valore"
                />
                <span className="absolute right-3 top-2 text-sm text-muted-foreground">
                  {baseCalc === 'absolute' || calcRule === 'discount_absolute' || calcRule === 'markup_absolute' 
                    ? '€' 
                    : calcRule?.includes('percent') 
                      ? '%' 
                      : ''}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Arrotondamento</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={rounding}
                onChange={(e) => setRounding(e.target.value)}
              >
                <option value="">Nessuno</option>
                <option value="99_up">Al ,99 per eccesso</option>
                <option value="99_down">Al ,99 per difetto</option>
                <option value="00_up">Al ,00 per eccesso</option>
                <option value="00_down">Al ,00 per difetto</option>
              </select>
            </div>

            <Button 
              className="w-full"
              disabled={selectedIds.length === 0 || !baseCalc || (!calcRule && baseCalc !== 'absolute') || !calcValue}
              onClick={handleMassUpdate}
            >
              Applica a Selezionati ({selectedIds.length})
            </Button>
          </CardContent>
        </Card>

        {/* Tabella Prodotti */}
        <div className="flex-1">
          <Card>
            <CardHeader>
              <CardTitle>Tutti i Prodotti</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === products.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds(products.map(p => p.id))
                          } else {
                            setSelectedIds([])
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="w-12">Foto</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Articolo</TableHead>
                    <TableHead>Taglia</TableHead>
                    <TableHead className="text-right">Disp.</TableHead>
                    <TableHead className="text-right">Prezzo Ingrosso</TableHead>
                    <TableHead className="text-right">Prezzo Dettaglio</TableHead>
                    <TableHead className="text-right">Prezzo Base</TableHead>
                    <TableHead className="text-right">Sconto %</TableHead>
                    <TableHead className="text-right">Prezzo Scontato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10}>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="py-1">
                          <Checkbox
                            checked={selectedIds.includes(product.id)}
                            onCheckedChange={(checked) => handleCheckboxChange(product.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="py-1">
                          {getPhotoUrl(product) ? (
                            <div className="relative w-10 h-10">
                              <Image
                                src={getPhotoUrl(product)}
                                alt={product.article_code}
                                fill
                                className="object-cover rounded-md"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs">
                              No foto
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-1">{product.brand_id ? brands[product.brand_id]?.name || '-' : '-'}</TableCell>
                        <TableCell className="py-1 font-medium">
                          {product.article_code}
                          {product.variant_code && (
                            <span className="text-muted-foreground ml-1">
                              ({product.variant_code})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-1">{product.size_id ? sizes[product.size_id]?.name || '-' : '-'}</TableCell>
                        <TableCell className="py-1 text-right font-medium">
                          <span className={`${(product.total_availability || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {product.total_availability || 0}
                          </span>
                        </TableCell>
                        <TableCell className="py-1 text-right">
                          {formatCurrency(product.wholesale_price)}
                        </TableCell>
                        <TableCell className="py-1 text-right">
                          {formatCurrency(product.retail_price)}
                        </TableCell>
                        <TableCell className="py-1 text-right">
                          {formatCurrency(basePrices[product.id] || product.retail_price)}
                        </TableCell>
                        <TableCell className="py-1 text-right">
                          <Input
                            type="number"
                            value={Number(selectedProducts[product.id] || 0).toFixed(2) || ''}
                            onChange={(e) => handleDiscountChange(product.id, e.target.value)}
                            className="w-20 h-8 text-right"
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell className="py-1 text-right font-medium">
                          {formatCurrency(calculateDiscountedPrice(
                            basePrices[product.id] || product.retail_price,
                            selectedProducts[product.id] || 0
                          ))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 