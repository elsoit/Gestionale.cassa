import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useCallback, memo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"

interface FilterItem {
  id: number
  name: string
}

interface Parameter {
  id: number
  name: string
  attributes: Array<{
    parameter_id: number
    parameter_name: string
    parameter_description: string
    parameter_is_required: boolean
    parameter_is_expandable: boolean
    attribute_id: number
    attribute_name: string
  }>
}

interface LoadProductsFilterProps {
  brands: FilterItem[]
  sizes: FilterItem[]
  parameters: Parameter[]
  selectedFilters: Record<string, number[]>
  onFilterChange: (filters: Record<string, number[]>) => void
}

function FilterSection({ 
  title,
  items = [],
  selectedIds = [],
  onSelect
}: { 
  title: string
  items: Array<{ id: number; name: string }>
  selectedIds: number[]
  onSelect: (ids: number[]) => void
}) {
  const [searchTerm, setSearchTerm] = useState("")

  // Filtra gli elementi in base al termine di ricerca
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Gestisce la selezione/deselezione di tutti gli elementi
  const handleSelectAll = (checked: boolean) => {
    onSelect(checked ? items.map(item => item.id) : [])
  }

  // Gestisce la selezione/deselezione di un singolo elemento
  const handleToggleItem = (itemId: number, checked: boolean) => {
    if (checked) {
      onSelect([...selectedIds, itemId])
    } else {
      onSelect(selectedIds.filter(id => id !== itemId))
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{title}</Label>
        {selectedIds.length > 0 && (
          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
            {selectedIds.length}
          </span>
        )}
      </div>

      <Input
        type="text"
        placeholder={`Cerca ${title.toLowerCase()}...`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-8"
      />

      <ScrollArea className="h-[120px]">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectedIds.length === items.length && items.length > 0}
              onCheckedChange={(checked) => handleSelectAll(!!checked)}
            />
            <Label className="text-sm">Seleziona tutti</Label>
          </div>

          {filteredItems.map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <Checkbox
                checked={selectedIds.includes(item.id)}
                onCheckedChange={(checked) => handleToggleItem(item.id, !!checked)}
              />
              <Label className="text-sm">{item.name}</Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

const LoadProductsFilter = ({ 
  brands,
  sizes,
  parameters,
  selectedFilters,
  onFilterChange
}: LoadProductsFilterProps) => {
  // Gestisce il filtro di disponibilità
  const handleAvailableChange = useCallback((checked: boolean) => {
    const newFilters = { ...selectedFilters }
    if (checked) {
      newFilters['available'] = [1]
    } else {
      delete newFilters['available']
    }
    onFilterChange(newFilters)
  }, [selectedFilters, onFilterChange])

  // Gestisce i cambiamenti nei filtri
  const handleFilterChange = useCallback((filterId: string, selectedIds: number[]) => {
    const newFilters = { ...selectedFilters }
    if (selectedIds.length > 0) {
      newFilters[filterId] = selectedIds
    } else {
      delete newFilters[filterId]
    }
    // Se non ci sono più filtri attivi, passa un oggetto vuoto
    const hasActiveFilters = Object.values(newFilters).some(values => values.length > 0)
    onFilterChange(hasActiveFilters ? newFilters : {})
  }, [selectedFilters, onFilterChange])

  // Funzione per resettare tutti i filtri
  const handleResetFilters = useCallback(() => {
    onFilterChange({})
  }, [onFilterChange])

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Header con reset */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={!!selectedFilters['available']}
            onCheckedChange={(checked) => handleAvailableChange(!!checked)}
          />
          <Label className="text-sm font-medium">Solo Disponibili</Label>
        </div>
        {Object.keys(selectedFilters).length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-8 px-2 text-sm text-gray-500 hover:text-gray-900"
          >
            Reset filtri
          </Button>
        )}
      </div>

      {/* Filtro Brand */}
      <FilterSection
        title="Brand"
        items={brands}
        selectedIds={selectedFilters['brand'] || []}
        onSelect={(ids) => handleFilterChange('brand', ids)}
      />

      {/* Filtro Taglie */}
      <FilterSection
        title="Taglie"
        items={sizes}
        selectedIds={selectedFilters['size'] || []}
        onSelect={(ids) => handleFilterChange('size', ids)}
      />

      {/* Filtri Parametri */}
      {parameters?.map((param) => {
        if (!param?.attributes) return null;
        
        // Estrai gli attributi unici dal parametro e convertili nel formato corretto
        const uniqueAttributes = param.attributes
          .filter(attr => attr && attr.attribute_id && attr.attribute_name)
          .map(attr => ({
            id: attr.attribute_id,
            name: attr.attribute_name
          }));

        if (uniqueAttributes.length === 0) return null;

        return (
          <FilterSection
            key={param.id}
            title={param.name}
            items={uniqueAttributes}
            selectedIds={selectedFilters[param.id.toString()] || []}
            onSelect={(ids) => handleFilterChange(param.id.toString(), ids)}
          />
        );
      })}
    </div>
  )
}

export default memo(LoadProductsFilter) 