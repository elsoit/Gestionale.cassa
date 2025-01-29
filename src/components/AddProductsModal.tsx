import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Filter, Search, X } from 'lucide-react'
import { cn } from "@/lib/utils"

interface Product {
  id: number
  article_code: string
  variant_code: string
  size_name: string
  brand_name: string
  wholesale_price: number
  size_id: number
  size_group_id: number
  brand_id: number
  retail_price: number
  status_id: number
  created_at: string
  updated_at: string
  size_group_name: string
  status_name: string
  availability?: {
    warehouse_id: number
    quantity: number
  }[]
  attributes: Array<{
    parameter_id: number
    parameter_name: string
    attribute_id: number
    attribute_name: string
  }>
  mainPhotoUrl?: string
  barcode?: string
  quantity?: number
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

interface AddProductsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAddProduct: (products: Product[]) => void
  warehouseId: number
  loadProducts: Product[]
}

export function AddProductsModal({ isOpen, onOpenChange, onAddProduct, warehouseId, loadProducts }: AddProductsModalProps) {
  const [modalState, setModalState] = useState({
    products: [] as Product[],
    filteredProducts: [] as Product[],
    selectedFilters: {} as Record<string, number[]>,
    brands: [] as Array<{ id: number; name: string }>,
    sizes: [] as Array<{ id: number; name: string }>,
    parameters: [] as Parameter[],
    isLoading: false,
    priceRanges: {
      wholesale_price: { min: 0, max: 1000 },
      retail_price: { min: 0, max: 1000 }
    } as PriceRanges,
    availabilityFilter: {} as { type?: 'available' | 'not_available' | 'greater_than' | 'less_than', value?: number }
  })

  const [modalSearchTerm, setModalSearchTerm] = useState('')

  // Funzione per caricare i dati della modale
  const loadModalData = useCallback(async () => {
    setModalState(prev => ({ ...prev, isLoading: true }))
    try {
      const [
        productsResponse,
        brandsData,
        sizesData,
        availabilityData
      ] = await Promise.all([
        fetch(`${process.env.API_URL}/api/products?${new URLSearchParams({
          search: modalSearchTerm,
          filters: JSON.stringify(modalState.selectedFilters)
        }).toString()}`).then(res => res.json()),
        fetch(`${process.env.API_URL}/api/brands`).then(res => res.json()),
        fetch(`${process.env.API_URL}/api/sizes`).then(res => res.json()),
        fetch(`${process.env.API_URL}/api/product-availability/warehouse/${warehouseId}`).then(res => res.json())
      ]);

      // Mappa delle disponibilità per prodotto
      const availabilityMap = availabilityData.reduce((acc: Record<number, number>, item: any) => {
        acc[item.product_id] = item.quantity;
        return acc;
      }, {});

      // Aggiungi la disponibilità ai prodotti
      const productsWithAvailability = productsResponse.products.map((product: Product) => ({
        ...product,
        availability: [{
          warehouse_id: warehouseId,
          quantity: availabilityMap[product.id] || 0
        }]
      }));

      // Converti i parametri nel formato corretto
      const validParameters: Parameter[] = [
        {
          id: -1,
          name: "Brand",
          attributes: brandsData.map((brand: any) => ({
            id: brand.id,
            name: brand.name,
          })),
        },
        {
          id: -2,
          name: "Taglie",
          attributes: sizesData.map((size: any) => ({
            id: size.id,
            name: size.name,
          })),
        },
        ...(productsResponse.parameters || []).map((param: any) => ({
          id: param.id,
          name: param.name,
          attributes: (param.attributes || []).map((attr: any) => ({
            id: attr.id,
            name: attr.name,
          })),
        }))
      ];

      setModalState(prev => ({
        ...prev,
        brands: brandsData,
        sizes: sizesData,
        parameters: validParameters,
        products: productsWithAvailability,
        filteredProducts: productsWithAvailability,
        isLoading: false
      }));

    } catch (error) {
      console.error('Error loading modal data:', error)
      setModalState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  // Carica i dati quando si apre la modale
  React.useEffect(() => {
    if (isOpen) {
      loadModalData()
    }
  }, [isOpen])

  // Funzione per applicare i filtri
  const applyFilters = useCallback((
    filters: Record<string, number[]>,
    searchValue: string = ''
  ) => {
    if (!modalState.products) return;

    const filtered = modalState.products.filter(product => {
      // Filtro disponibilità
      if (filters.availability?.length > 0) {
        const totalAvailability = (product.availability || []).reduce((sum, a) => sum + (a.quantity || 0), 0);
        if (totalAvailability <= 0) return false;
      }

      // Filtro brand (-1)
      if (filters['-1']?.length > 0) {
        if (!filters['-1'].includes(product.brand_id)) return false;
      }

      // Filtro taglia (-2)
      if (filters['-2']?.length > 0) {
        if (!filters['-2'].includes(product.size_id)) return false;
      }

      // Filtri parametri dinamici
      for (const [paramId, selectedAttrs] of Object.entries(filters)) {
        if (['-1', '-2', 'availability'].includes(paramId)) continue;
        if (selectedAttrs.length === 0) continue;

        const hasMatchingAttribute = product.attributes?.some(attr => 
          attr.parameter_id === parseInt(paramId) && 
          selectedAttrs.includes(attr.attribute_id)
        );

        if (!hasMatchingAttribute) return false;
      }

      // Filtro ricerca
      if (searchValue) {
        const searchLower = searchValue.toLowerCase();
        const matches = 
          product.article_code?.toLowerCase().includes(searchLower) ||
          product.variant_code?.toLowerCase().includes(searchLower) ||
          product.brand_name?.toLowerCase().includes(searchLower);
        
        if (!matches) return false;
      }

      return true;
    });

    setModalState(prev => ({
      ...prev,
      filteredProducts: filtered,
      selectedFilters: filters
    }));
  }, [modalState.products]);

  // Handler per il cambio dei filtri
  const handleFilterChange = useCallback((newFilters: Record<string, number[]>) => {
    const updatedFilters = {
      ...newFilters,
      availability: modalState.selectedFilters.availability || []
    };
    applyFilters(updatedFilters, modalSearchTerm);
  }, [applyFilters, modalSearchTerm, modalState.selectedFilters.availability]);

  // Handler per il cambio del filtro disponibilità
  const handleAvailabilityChange = useCallback((checked: boolean) => {
    const newFilters = {
      ...modalState.selectedFilters,
      availability: checked ? [1] : []
    };
    applyFilters(newFilters, modalSearchTerm);
  }, [applyFilters, modalSearchTerm, modalState.selectedFilters]);

  // Handler per il cambio della ricerca nella modale

  const handleModalSearch = useCallback((value: string) => {
   setModalSearchTerm(value);
     applyFilters(modalState.selectedFilters, value);
      }, [applyFilters, modalState.selectedFilters]);

  const groupProducts = (products: Product[]) => {
    const groupedMap = new Map<string, { article_code: string; variant_code: string; sizes: Product[] }>();
    
    products.forEach(product => {
      const key = `${product.article_code}-${product.variant_code}`;
      
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          article_code: product.article_code,
          variant_code: product.variant_code,
          sizes: []
        });
      }
      
      const group = groupedMap.get(key);
      if (group) {
        group.sizes.push(product);
      }
    });
    
    return Array.from(groupedMap.values());
  };

  const sortSizes = (sizes: string[]) => {
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'];
    const numericSizes = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48'];
    
    return sizes.sort((a, b) => {
      const aUpper = a.toUpperCase();
      const bUpper = b.toUpperCase();
      
      // Se entrambe sono taglie numeriche
      if (!isNaN(Number(a)) && !isNaN(Number(b))) {
        return Number(a) - Number(b);
      }
      
      // Se entrambe sono taglie standard
      const aIndex = sizeOrder.indexOf(aUpper);
      const bIndex = sizeOrder.indexOf(bUpper);
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // Se una è numerica e l'altra no
      if (!isNaN(Number(a))) return -1;
      if (!isNaN(Number(b))) return 1;
      
      // Ordine alfabetico per default
      return aUpper.localeCompare(bUpper);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-5 border-b">
          <DialogTitle>Aggiungi Prodotto</DialogTitle>
          <DialogDescription className="text-sm">
            Cerca e seleziona i prodotti da aggiungere al carico
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex min-h-0">
          {/* Sidebar with filters */}
          <div className="w-[280px] border-r border-gray-200 p-4 overflow-y-auto">
            {/* Campo di ricerca */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca prodotti..."
                  value={modalSearchTerm}
                  onChange={(e) => handleModalSearch(e.target.value)}
                  className="pl-10 bg-white"
                  autoFocus
                />
              </div>
            </div>

            {/* Header dei filtri */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <h2 className="text-base font-semibold">Filtri</h2>
              </div>
              {Object.values(modalState.selectedFilters).some(values => values.length > 0) && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const emptyFilters = {};
                    setModalState(prev => ({
                      ...prev,
                      selectedFilters: emptyFilters,
                      filteredProducts: prev.products
                    }));
                    setModalSearchTerm('');
                    applyFilters(emptyFilters, '');
                  }}
                  className="h-8 px-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="h-4 w-4 mr-1" />
                  Rimuovi tutti
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {/* Disponibilità */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Disponibilità</h3>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  <label className="flex items-center space-x-2">
                    <Checkbox 
                      checked={!!modalState.selectedFilters.availability?.length}
                      onCheckedChange={(checked) => handleAvailabilityChange(!!checked)}
                    />
                    <span className="text-sm">Solo Disponibili</span>
                  </label>
                </div>
              </div>

              {/* Brand */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Brand</h3>
                  {modalState.selectedFilters['-1']?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                        {modalState.selectedFilters['-1'].length}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newFilters = { ...modalState.selectedFilters };
                          delete newFilters['-1'];
                          setModalState(prev => ({
                            ...prev,
                            selectedFilters: newFilters,
                            filteredProducts: prev.products
                          }));
                          applyFilters(newFilters, modalSearchTerm);
                        }}
                        className="h-6 w-6 p-0 hover:bg-gray-100"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {modalState.brands.map((brand) => (
                    <label key={brand.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={modalState.selectedFilters['-1']?.includes(brand.id) || false}
                        onCheckedChange={(checked) => {
                          const newFilters = { ...modalState.selectedFilters };
                          if (checked) {
                            newFilters['-1'] = [...(newFilters['-1'] || []), brand.id];
                          } else {
                            newFilters['-1'] = (newFilters['-1'] || []).filter(id => id !== brand.id);
                            if (newFilters['-1'].length === 0) {
                              delete newFilters['-1'];
                            }
                          }
                          setModalState(prev => ({
                            ...prev,
                            selectedFilters: newFilters
                          }));
                          applyFilters(newFilters, modalSearchTerm);
                        }}
                      />
                      <span className="text-sm">{brand.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Taglie */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Taglie</h3>
                  {modalState.selectedFilters['-2']?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                        {modalState.selectedFilters['-2'].length}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newFilters = { ...modalState.selectedFilters };
                          delete newFilters['-2'];
                          setModalState(prev => ({
                            ...prev,
                            selectedFilters: newFilters,
                            filteredProducts: prev.products
                          }));
                          applyFilters(newFilters, modalSearchTerm);
                        }}
                        className="h-6 w-6 p-0 hover:bg-gray-100"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {modalState.sizes.map((size) => (
                    <label key={size.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={modalState.selectedFilters['-2']?.includes(size.id) || false}
                        onCheckedChange={(checked) => {
                          const newFilters = { ...modalState.selectedFilters };
                          if (checked) {
                            newFilters['-2'] = [...(newFilters['-2'] || []), size.id];
                          } else {
                            newFilters['-2'] = (newFilters['-2'] || []).filter(id => id !== size.id);
                            if (newFilters['-2'].length === 0) {
                              delete newFilters['-2'];
                            }
                          }
                          setModalState(prev => ({
                            ...prev,
                            selectedFilters: newFilters
                          }));
                          applyFilters(newFilters, modalSearchTerm);
                        }}
                      />
                      <span className="text-sm">{size.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Altri Parametri */}
              {modalState.parameters.filter(param => param.id > 0).map((param) => (
                <div key={param.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">{param.name}</h3>
                    {modalState.selectedFilters[param.id]?.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                          {modalState.selectedFilters[param.id].length}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newFilters = { ...modalState.selectedFilters };
                            delete newFilters[param.id];
                            setModalState(prev => ({
                              ...prev,
                              selectedFilters: newFilters,
                              filteredProducts: prev.products
                            }));
                            applyFilters(newFilters, modalSearchTerm);
                          }}
                          className="h-6 w-6 p-0 hover:bg-gray-100"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {param.attributes?.map((attr) => (
                      <label key={attr.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={modalState.selectedFilters[param.id]?.includes(attr.id) || false}
                          onCheckedChange={(checked) => {
                            const newFilters = { ...modalState.selectedFilters };
                            if (checked) {
                              newFilters[param.id] = [...(newFilters[param.id] || []), attr.id];
                            } else {
                              newFilters[param.id] = (newFilters[param.id] || []).filter(id => id !== attr.id);
                              if (newFilters[param.id].length === 0) {
                                delete newFilters[param.id];
                              }
                            }
                            setModalState(prev => ({
                              ...prev,
                              selectedFilters: newFilters
                            }));
                            applyFilters(newFilters, modalSearchTerm);
                          }}
                        />
                        <span className="text-sm">{attr.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            {/* Table Container */}
            <div className="flex-1 overflow-auto px-6 py-4">
              {modalState.isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Caricamento...</div>
                </div>
              ) : modalState.filteredProducts.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Nessun prodotto trovato</div>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow className="border-b">
                      <TableHead className="w-[200px] bg-white font-semibold">Brand</TableHead>
                      <TableHead className="w-[200px] bg-white font-semibold">Codice Articolo</TableHead>
                      <TableHead className="w-[100px] bg-white font-semibold">Codice Variante</TableHead>
                      <TableHead className="w-[200px] bg-white font-semibold">Taglie</TableHead>
                      <TableHead className="w-[120px] bg-white font-semibold">Disponibilità</TableHead>
                      <TableHead className="w-[120px] text-right bg-white font-semibold">P.ingrosso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupProducts(modalState.filteredProducts).map((group) => {
                      const totalAvailability = group.sizes.reduce((sum, size) => {
                        const warehouseAvailability = size.availability?.find(a => a.warehouse_id === warehouseId)?.quantity || 0;
                        return sum + warehouseAvailability;
                      }, 0);

                      return (
                        <TableRow
                          key={`${group.article_code}-${group.variant_code}`}
                          className="hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            onAddProduct(group.sizes);
                            onOpenChange(false);
                          }}
                        >
                          <TableCell>{group.sizes[0].brand_name}</TableCell>
                          <TableCell>{group.article_code}</TableCell>
                          <TableCell>{group.variant_code}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap gap-1">
                              {sortSizes(group.sizes.map(p => p.size_name))
                                .map((sizeName) => {
                                  const p = group.sizes.find(p => p.size_name === sizeName);
                                  if (!p) return null;
                                  const isInLoad = loadProducts.some(lp => 
                                    lp.article_code === p.article_code && 
                                    lp.variant_code === p.variant_code && 
                                    lp.size_name === p.size_name
                                  );
                                  const sizeAvailability = p.availability?.find(a => a.warehouse_id === warehouseId)?.quantity || 0;
                                  return (
                                    <div key={p.id} className="flex flex-col items-center gap-0.5">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={isInLoad}
                                        className={cn(
                                          "px-2 py-0.5 h-6 text-xs rounded-full",
                                          isInLoad 
                                            ? "bg-gray-900 text-white hover:bg-gray-900 hover:text-white" 
                                            : sizeAvailability > 0
                                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                              : "bg-red-50 text-red-700 hover:bg-red-100"
                                        )}
                                        onClick={() => {
                                          if (!isInLoad) {
                                            onAddProduct([p]);
                                            onOpenChange(false);
                                          }
                                        }}
                                      >
                                        {sizeName}
                                        <span className="ml-1 text-xs">
                                          ({sizeAvailability})
                                        </span>
                                      </Button>
                                    </div>
                                  );
                                })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{totalAvailability}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">€{(Number(group.sizes[0].wholesale_price) || 0).toFixed(2)}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 

