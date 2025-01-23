import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadProductTableRow } from '@/components/LoadProductTableRow'
import { Product, LoadProduct } from '../types/products'
import { Button } from "@/components/ui/button"
import { ChevronRight } from 'lucide-react'
import { cn } from "@/lib/utils"

interface LoadProductsTableProps {
  loadProducts: LoadProduct[]
  allProducts: Product[]
  isLoadDisabled: boolean
  expandedRows: Set<string>
  flashingRows: Set<number>
  flashingQuantities: Set<number>
  handleProductChange: (product: LoadProduct, field: string | number | symbol, value: any) => void
  handleQuantityChange: (index: number, change: number) => void
  handleRemoveProduct: (product: LoadProduct, isMainRow: boolean) => void
  toggleExpansion: (groupKey: string, e?: React.MouseEvent) => void
  handleAddProduct: (products: Product[]) => void
  sortSizes: (sizes: string[]) => string[]
  toggleAllRows: () => void
  isQuantityModified: (product: LoadProduct) => boolean
  isNewProduct: (product: LoadProduct) => boolean
  getQuantityStyle: (product: LoadProduct, variants?: LoadProduct[]) => string
}

export function LoadProductsTable({
  loadProducts,
  allProducts,
  isLoadDisabled,
  expandedRows,
  flashingRows,
  flashingQuantities,
  handleProductChange,
  handleQuantityChange,
  handleRemoveProduct,
  toggleExpansion,
  handleAddProduct,
  sortSizes,
  toggleAllRows,
  isQuantityModified,
  isNewProduct,
  getQuantityStyle
}: LoadProductsTableProps) {
  // Raggruppa i prodotti per article_code e variant_code
  const groupedProducts = loadProducts.reduce((groups, product) => {
    const key = `${product.article_code}-${product.variant_code}`
    if (!groups[key]) {
      groups[key] = {
        main: product,
        variants: []
      }
    }
    groups[key].variants.push(product)

    // Se il prodotto è appena stato aggiunto (flashingRows), espandi la riga
    if (flashingRows.has(product.id) && groups[key].variants.length > 1) {
      const groupKey = `p${Object.keys(groups).length}`;
      expandedRows.add(groupKey);
    }

    return groups
  }, {} as Record<string, { main: LoadProduct; variants: LoadProduct[] }>)

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100 hover:bg-gray-100">
            <TableHead className="w-[350px]">
              Codice Prodotto
              <Button
                variant="ghost"
                size="sm"
                className="ml-1"
                onClick={toggleAllRows}
              >
                <ChevronRight className={`h-4 w-4 transition-transform ${expandedRows.size > 0 ? 'rotate-90' : ''}`} />
              </Button>
            </TableHead>
            <TableHead className="w-[400px]">Taglia</TableHead>
            <TableHead className="w-[120px] text-right">Prezzo Wholesale</TableHead>
            <TableHead className="w-[100px] text-right">Costo</TableHead>
            <TableHead className="w-[150px] text-center">Quantità</TableHead>
            <TableHead className="w-[120px] text-right">Totale Costo</TableHead>
            <TableHead className="w-[80px] text-center">Azione</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(groupedProducts).map(([key, { main, variants }], groupIndex) => (
            <LoadProductTableRow
              key={key}
              main={main}
              variants={variants}
              groupIndex={groupIndex}
              allProducts={allProducts}
              isLoadDisabled={isLoadDisabled}
              expandedRows={expandedRows}
              flashingRows={flashingRows}
              flashingQuantities={flashingQuantities}
              handleProductChange={handleProductChange}
              handleQuantityChange={handleQuantityChange}
              handleRemoveProduct={handleRemoveProduct}
              toggleExpansion={toggleExpansion}
              handleAddProduct={handleAddProduct}
              sortSizes={sortSizes}
              loadProducts={loadProducts}
              isQuantityModified={isQuantityModified}
              isNewProduct={isNewProduct}
              getQuantityStyle={getQuantityStyle}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 