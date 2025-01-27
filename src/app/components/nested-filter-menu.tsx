import { Filter, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { useState, useEffect } from "react"

interface Parameter {
  id: number
  name: string
  attributes: Array<{
    id: number
    name: string
  }>
}

interface PriceRange {
  min: number | undefined
  max: number | undefined
}

interface NestedFilterMenuProps {
  parameters: Parameter[]
  selectedFilters: Record<string, number[]>
  onFilterChange: (newFilters: Record<string, number[]>) => void
  priceRanges: {
    wholesale_price: PriceRange
    retail_price: PriceRange
  }
  onPriceRangeChange: (newPriceRanges: any) => void
  availabilityFilter: {
    type?: 'available' | 'not_available' | 'greater_than' | 'less_than'
    value?: number
  }
  onAvailabilityChange: (filter: { type?: 'available' | 'not_available' | 'greater_than' | 'less_than'; value?: number }) => void
}

const NestedFilterMenu = ({ 
  parameters, 
  selectedFilters, 
  onFilterChange,
  priceRanges,
  onPriceRangeChange,
  availabilityFilter,
  onAvailabilityChange
}: NestedFilterMenuProps) => {
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({})
  const [maxPrices, setMaxPrices] = useState({
    wholesale_price: 1000,
    retail_price: 1000
  })
  const [customQuantity, setCustomQuantity] = useState<string>("")

  // Calcola il numero totale di filtri attivi
  const countActiveFilters = () => {
    let count = 0;
    
    // Conta i parametri che hanno almeno un filtro attivo
    if (selectedFilters && typeof selectedFilters === 'object') {
      Object.values(selectedFilters).forEach((values) => {
        if (Array.isArray(values) && values.length > 0) {
          count += 1; // Conta 1 per ogni parametro con filtri attivi
        }
      });
    }
    
    // Conta il filtro di disponibilità se attivo
    if (availabilityFilter?.type) {
      count += 1;
    }
    
    // Conta il filtro prezzo ingrosso se attivo
    if (priceRanges.wholesale_price?.min !== undefined || priceRanges.wholesale_price?.max !== undefined) {
      count += 1;
    }
    
    // Conta il filtro prezzo vendita se attivo
    if (priceRanges.retail_price?.min !== undefined || priceRanges.retail_price?.max !== undefined) {
      count += 1;
    }
    
    return count;
  };

  // Formatta il prezzo per la visualizzazione
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtri
          {countActiveFilters() > 0 && (
            <span className="flex items-center justify-center rounded-full bg-primary w-5 h-5 text-xs text-primary-foreground">
              {countActiveFilters()}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        {parameters?.map((parameter) => {
          const paramId = parameter.id.toString();
          const activeCount = Array.isArray(selectedFilters[paramId]) ? selectedFilters[paramId].length : 0;
          
          return (
            <DropdownMenuSub key={paramId}>
              <DropdownMenuSubTrigger className="w-full [&>svg]:hidden">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-2">
                    {parameter.name}
                    {activeCount > 0 && (
                      <span className="flex items-center justify-center rounded-full bg-primary w-5 h-5 text-xs text-primary-foreground">
                        {activeCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {activeCount > 0 && (
                      <X 
                        className="h-4 w-4 cursor-pointer hover:text-destructive" 
                        onClick={(e) => {
                          e.stopPropagation();
                          const newFilters = { ...selectedFilters };
                          delete newFilters[paramId];
                          onFilterChange(newFilters);
                        }}
                      />
                    )}
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-[240px]">
                <div className="p-2">
                  <Input
                    type="text"
                    placeholder="Cerca..."
                    value={searchTerms[paramId] || ""}
                    onChange={(e) => 
                      setSearchTerms(prev => ({
                        ...prev,
                        [paramId]: e.target.value
                      }))
                    }
                    className="h-8"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto py-1">
                  {parameter.attributes && parameter.attributes.length > 0 && (
                    <DropdownMenuCheckboxItem
                      checked={selectedFilters[paramId]?.length === parameter.attributes.length}
                      onCheckedChange={(checked) => {
                        const newFilters = { ...selectedFilters };
                        newFilters[paramId] = checked
                          ? parameter.attributes.map(attr => attr.id)
                          : [];
                        onFilterChange(newFilters);
                      }}
                    >
                      Seleziona tutti
                    </DropdownMenuCheckboxItem>
                  )}
                  {parameter.attributes
                    ?.filter(attr => 
                      attr?.name?.toLowerCase().includes((searchTerms[paramId] || "").toLowerCase())
                    )
                    .map((attr) => (
                      <DropdownMenuCheckboxItem
                        key={attr.id}
                        checked={selectedFilters[paramId]?.includes(attr.id)}
                        onCheckedChange={(checked) => {
                          const currentValues = selectedFilters[paramId] || [];
                          const newFilters = { ...selectedFilters };
                          newFilters[paramId] = checked
                            ? [...currentValues, attr.id]
                            : currentValues.filter((v: number) => v !== attr.id);
                          onFilterChange(newFilters);
                        }}
                      >
                        {attr.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}

        <DropdownMenuSeparator />

        {/* Filtro Disponibilità */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="w-full [&>svg]:hidden">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                Disponibilità
                {availabilityFilter.type && (
                  <span className="flex items-center justify-center rounded-full bg-primary w-5 h-5 text-xs text-primary-foreground">
                    1
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {availabilityFilter.type && (
                  <X 
                    className="h-4 w-4 cursor-pointer hover:text-destructive" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onAvailabilityChange({});
                    }}
                  />
                )}
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-[240px]">
            <DropdownMenuRadioGroup 
              value={availabilityFilter.type || ''} 
              onValueChange={(value) => {
                if (value === 'available' || value === 'not_available' || value === 'greater_than' || value === 'less_than') {
                  if (value === 'greater_than' || value === 'less_than') {
                    onAvailabilityChange({ 
                      type: value, 
                      value: parseInt(customQuantity) || 0 
                    });
                  } else {
                    onAvailabilityChange({ type: value });
                  }
                }
              }}
            >
              <DropdownMenuRadioItem value="available">
                Disponibile (&gt;0)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="not_available">
                Non disponibile (=0)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="greater_than">
                Maggiore di...
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="less_than">
                Minore di...
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            {(availabilityFilter.type === 'greater_than' || availabilityFilter.type === 'less_than') && (
              <div className="p-2">
                <Input
                  type="number"
                  placeholder="Quantità..."
                  value={customQuantity}
                  onChange={(e) => {
                    setCustomQuantity(e.target.value);
                    if (e.target.value) {
                      onAvailabilityChange({
                        type: availabilityFilter.type,
                        value: parseInt(e.target.value)
                      });
                    }
                  }}
                  className="h-8"
                />
              </div>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Filtro Prezzo Ingrosso */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="w-full [&>svg]:hidden">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                Prezzo Ingrosso
                {priceRanges?.wholesale_price && (priceRanges.wholesale_price?.min !== undefined || priceRanges.wholesale_price?.max !== undefined) && (
                  <span className="flex items-center justify-center rounded-full bg-primary w-5 h-5 text-xs text-primary-foreground">
                    1
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {priceRanges?.wholesale_price && (priceRanges.wholesale_price?.min !== undefined || priceRanges.wholesale_price?.max !== undefined) && (
                  <X 
                    className="h-4 w-4 cursor-pointer hover:text-destructive" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onPriceRangeChange({
                        ...priceRanges,
                        wholesale_price: { min: undefined, max: undefined }
                      });
                    }}
                  />
                )}
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-[240px] p-4">
            <DropdownMenuLabel className="flex justify-between mb-2">
              <span>{formatPrice(priceRanges?.wholesale_price?.min || 0)}</span>
              <span>{formatPrice(priceRanges?.wholesale_price?.max || maxPrices.wholesale_price)}</span>
            </DropdownMenuLabel>
            <Slider
              min={0}
              max={maxPrices.wholesale_price}
              step={1}
              value={[
                priceRanges?.wholesale_price?.min || 0,
                priceRanges?.wholesale_price?.max || maxPrices.wholesale_price
              ]}
              onValueChange={(values) => {
                onPriceRangeChange({
                  ...priceRanges,
                  wholesale_price: { min: values[0], max: values[1] }
                });
              }}
              className="my-4"
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Filtro Prezzo Vendita */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="w-full [&>svg]:hidden">
            <div className="flex items-center justify-between w-full pr-2">
              <div className="flex items-center gap-2">
                Prezzo Vendita
                {priceRanges?.retail_price && (priceRanges.retail_price?.min !== undefined || priceRanges.retail_price?.max !== undefined) && (
                  <span className="flex items-center justify-center rounded-full bg-primary w-5 h-5 text-xs text-primary-foreground">
                    1
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {priceRanges?.retail_price && (priceRanges.retail_price?.min !== undefined || priceRanges.retail_price?.max !== undefined) && (
                  <X 
                    className="h-4 w-4 cursor-pointer hover:text-destructive" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onPriceRangeChange({
                        ...priceRanges,
                        retail_price: { min: undefined, max: undefined }
                      });
                    }}
                  />
                )}
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-[240px] p-4">
            <DropdownMenuLabel className="flex justify-between mb-2">
              <span>{formatPrice(priceRanges?.retail_price?.min || 0)}</span>
              <span>{formatPrice(priceRanges?.retail_price?.max || maxPrices.retail_price)}</span>
            </DropdownMenuLabel>
            <Slider
              min={0}
              max={maxPrices.retail_price}
              step={1}
              value={[
                priceRanges?.retail_price?.min || 0,
                priceRanges?.retail_price?.max || maxPrices.retail_price
              ]}
              onValueChange={(values) => {
                onPriceRangeChange({
                  ...priceRanges,
                  retail_price: { min: values[0], max: values[1] }
                });
              }}
              className="my-4"
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NestedFilterMenu
