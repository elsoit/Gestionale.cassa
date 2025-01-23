import React, { useState } from 'react'
import { TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus, Minus, Shirt, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { cn } from "@/lib/utils"
import { Product, LoadProduct } from '../types/products'

interface LoadProductTableRowProps {
  main: LoadProduct
  variants: LoadProduct[]
  groupIndex: number
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
  loadProducts: LoadProduct[]
  isQuantityModified: (product: LoadProduct) => boolean
  isNewProduct: (product: LoadProduct) => boolean
  getQuantityStyle: (product: LoadProduct, variants?: LoadProduct[]) => string
}

export function LoadProductTableRow({
  main,
  variants,
  groupIndex,
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
  loadProducts,
  isQuantityModified,
  isNewProduct,
  getQuantityStyle,
}: LoadProductTableRowProps) {
  const [photoLoadingStates, setPhotoLoadingStates] = useState<Record<string, boolean>>({});
  const [costInputs, setCostInputs] = useState<Record<string, string>>({});

  const handlePhotoLoad = (key: string) => {
    setPhotoLoadingStates(prev => ({ ...prev, [key]: false }));
  };

  const handlePhotoError = (key: string) => {
    setPhotoLoadingStates(prev => ({ ...prev, [key]: false }));
  };

  const getCostInputId = (product: LoadProduct) => 
    `${product.article_code}-${product.variant_code}-${product.size?.name || product.size_name}`;

  const handleCostChange = (product: LoadProduct, value: string) => {
    // Accettiamo solo numeri e virgola
    if (!/^[\d,]*$/.test(value)) return;
    setCostInputs(prev => ({ ...prev, [getCostInputId(product)]: value }));
  };

  const handleCostBlur = (product: LoadProduct, value: string) => {
    const numericValue = Number(value.replace(',', '.'))
    if (!isNaN(numericValue)) {
      const productIndex = loadProducts.findIndex(p => p.id === product.id)
      handleProductChange(product, 'cost', numericValue)
    }
  };

  const formatCost = (cost: number | null | undefined) => {
    if (cost === null || cost === undefined || isNaN(Number(cost))) {
      return "0,00";
    }
    return Number(cost).toFixed(2).replace('.', ',');
  };

  // Layout unico per tutti i prodotti
  const isExpanded = expandedRows.has(`p${groupIndex + 1}`);
  const hasOnlyOneVariant = variants.length === 1;
  const groupKey = `p${groupIndex + 1}`;
  
  const totalQuantity = variants.reduce((sum, variant) => sum + (variant.quantity || 0), 0)
  const totalCost = variants.reduce((sum, variant) => sum + ((variant.cost || 0) * (variant.quantity || 0)), 0)
  const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0

  return (
    <React.Fragment>
      {/* Riga principale */}
      <TableRow 
        className={cn(
          "bg-gray-50 font-medium h-14",
          !hasOnlyOneVariant && "cursor-pointer hover:bg-gray-100",
          isNewProduct(main) && "bg-green-50",
          flashingRows?.has(main.id) && "animate-flash-green"
        )}
        data-row-id={groupKey}
        onClick={(e) => !hasOnlyOneVariant && toggleExpansion(groupKey, e)}
      >
        <TableCell className="py-1">
          <div className="flex items-center gap-2">
            {main.mainPhotoUrl ? (
              <div className="relative w-12 h-12 bg-white rounded border">
                <div className={cn(
                  "absolute inset-1",
                  photoLoadingStates[`${main.article_code}-${main.variant_code}`] && "animate-pulse bg-gray-200"
                )}>
                  <Image
                    src={main.mainPhotoUrl}
                    alt={`${main.article_code} - ${main.variant_code}`}
                    fill
                    sizes="(max-width: 48px) 100vw"
                    className={cn(
                      "rounded object-contain p-1",
                      photoLoadingStates[`${main.article_code}-${main.variant_code}`] && "opacity-0"
                    )}
                    style={{ aspectRatio: "1/1" }}
                    onLoadingComplete={() => handlePhotoLoad(`${main.article_code}-${main.variant_code}`)}
                    onError={() => handlePhotoError(`${main.article_code}-${main.variant_code}`)}
                  />
                </div>
              </div>
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                <Shirt className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <span>{main.article_code} - {main.variant_code}</span>
            {!hasOnlyOneVariant && (
              <ChevronRight className={cn(
                "w-4 h-4 transition-transform ml-1",
                isExpanded && "transform rotate-90"
              )} />
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex gap-1 flex-wrap">
            {sortSizes(allProducts
              .filter(p => p.article_code === main.article_code && p.variant_code === main.variant_code)
              .map(p => p.size_name))
              .map((sizeName) => {
                const p = allProducts.find(p => 
                  p.article_code === main.article_code && 
                  p.variant_code === main.variant_code &&
                  p.size_name === sizeName
                );
                if (!p) return null;
                const loadVariant = variants.find(v => 
                  v.article_code === p.article_code && 
                  v.variant_code === p.variant_code && 
                  (v.size?.name || v.size_name) === p.size_name
                );
                const isInLoad = !!loadVariant;
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
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isInLoad) {
                          handleAddProduct([p]);
                        }
                      }}
                    >
                      {sizeName}
                    </Button>
                    {isInLoad && (
                      <span className="text-xs font-medium text-gray-500">
                        {loadVariant.quantity}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </TableCell>
        <TableCell className="py-1 text-right">{(Number(main.wholesale_price) || 0).toFixed(2)}</TableCell>
        <TableCell className="py-1">
          {hasOnlyOneVariant ? (
            <Input
              type="text"
              value={costInputs[getCostInputId(variants[0])] ?? formatCost(variants[0].cost)}
              disabled={isLoadDisabled}
              onChange={(e) => handleCostChange(variants[0], e.target.value)}
              onBlur={(e) => handleCostBlur(variants[0], e.target.value)}
              className="h-7 w-20 text-right"
            />
          ) : (
            <div className="text-right">
              €{formatCost(averageCost)}
            </div>
          )}
        </TableCell>
        <TableCell className="py-1 text-center">
          {hasOnlyOneVariant ? (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const productIndex = loadProducts.findIndex(p => p.id === variants[0].id);
                  handleQuantityChange(productIndex, -1);
                }}
                disabled={isLoadDisabled || variants[0].quantity === 0}
              >
                -
              </Button>
              <span className={getQuantityStyle(variants[0])}>
                {variants[0].quantity || 0}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const productIndex = loadProducts.findIndex(p => p.id === variants[0].id);
                  handleQuantityChange(productIndex, 1);
                }}
                disabled={isLoadDisabled}
              >
                +
              </Button>
            </div>
          ) : (
            <span className={getQuantityStyle(main, variants)}>
              {totalQuantity}
            </span>
          )}
        </TableCell>
        <TableCell className="py-1 text-right">€{formatCost(totalCost)}</TableCell>
        <TableCell className="py-1">
          <Button 
            variant="ghost" 
            size="sm"
            disabled={isLoadDisabled} 
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveProduct(main, true);
            }}
            className="bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 rounded-full h-8 w-8 p-0 transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>

      {/* Righe delle varianti espanse (solo se ci sono più varianti) */}
      {!hasOnlyOneVariant && isExpanded && variants.map((variant, index) => {
        const productIndex = loadProducts.findIndex(p => p.id === variant.id);
        return (
          <TableRow 
            key={variant.id}
            className={cn(
              "h-10 text-sm border-0",
              index % 2 === 0 ? "bg-gray-50/50" : "bg-white",
              isNewProduct(variant) && "bg-green-50",
              flashingRows?.has(variant.id) && "animate-flash-green"
            )}
            data-row-id={`${groupKey}e${index + 1}`}
          >
            <TableCell className="py-1">
              <div className="pl-12">{variant.article_code} - {variant.variant_code}</div>
            </TableCell>
            <TableCell className="py-1">{variant.size?.name || variant.size_name}</TableCell>
            <TableCell className="py-1 text-right">{(Number(variant.wholesale_price) || 0).toFixed(2)}</TableCell>
            <TableCell className="py-1">
              <Input
                type="text"
                value={costInputs[getCostInputId(variant)] ?? formatCost(variant.cost)}
                disabled={isLoadDisabled}
                onChange={(e) => handleCostChange(variant, e.target.value)}
                onBlur={(e) => handleCostBlur(variant, e.target.value)}
                className="h-7 w-20 text-right"
              />
            </TableCell>
            <TableCell className="py-1 text-center">
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(productIndex, -1);
                  }}
                  disabled={isLoadDisabled || variant.quantity === 0}
                >
                  -
                </Button>
                <span className={getQuantityStyle(variant)}>
                  {variant.quantity || 0}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuantityChange(productIndex, 1);
                  }}
                  disabled={isLoadDisabled}
                >
                  +
                </Button>
              </div>
            </TableCell>
            <TableCell className="py-1 text-right">€{formatCost((variant.cost || 0) * (variant.quantity || 0))}</TableCell>
            <TableCell className="py-1">
              <Button 
                variant="ghost" 
                size="icon"
                disabled={isLoadDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveProduct(variant, false);
                }}
                className="h-7 w-7"
              >
                <X className="h-3 w-3" />
              </Button>
            </TableCell>
          </TableRow>
        );
      })}
    </React.Fragment>
  );
} 