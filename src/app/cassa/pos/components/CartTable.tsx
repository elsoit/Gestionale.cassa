'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Minus, Plus, Trash, ChevronDown, CirclePercent, Shirt } from 'lucide-react'
import ProductImage from './ProductImage'

interface CartItem {
  id: number;
  article_code: string;
  variant_code: string;
  size: string;
  quantity: number;
  retail_price: string;
  brand_id?: number;
  status_id?: number;
  isFromReservation?: boolean;
  mainPhotoUrl?: string;
  total_availability?: number;
  discount: number;
  total: number;
  unitDiscounts?: number[];
  isExpanded?: boolean;
  rowId: string;
  unitIds?: string[];
}

interface CartTableProps {
  cart: CartItem[]
  productsData: any[]
  updateQuantity: (productId: number, action: 'increase' | 'decrease') => void
  removeFromCart: (productId: number) => void
  updateDiscount: (productId: number, newDiscount: number) => void
  updateUnitDiscount: (productId: number, unitIndex: number, newDiscount: number) => void
  resetDiscounts: (productId: number) => void
  shakingRows: {[key: number]: boolean}
  generateUniqueId: () => string
}

export default function CartTable({
  cart,
  productsData,
  updateQuantity,
  removeFromCart,
  updateDiscount,
  updateUnitDiscount,
  resetDiscounts,
  shakingRows,
  generateUniqueId
}: CartTableProps) {
  const [expandedRows, setExpandedRows] = useState<{[key: number]: boolean}>({})

  const toggleRowExpansion = (productId: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }))
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-[#F9FAFB]">
          <TableHead className="w-1/3">Articolo</TableHead>
          <TableHead>P.listino</TableHead>
          <TableHead>sconto %</TableHead>
          <TableHead>P.scontato</TableHead>
          <TableHead>totale</TableHead>
          <TableHead>Quantità</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cart.map((item) => {
          const isOverQuantity = !item.isFromReservation && 
            item.quantity > (productsData.find(p => p.id === item.id)?.quantity || 0);
          
          return (
            <React.Fragment key={item.id}>
              <TableRow 
                id={`cart-row-${item.id}`}
                className={`${isOverQuantity || item.quantity === 0 ? 'bg-red-50' : ''} 
                  ${shakingRows[item.id] ? 'shake-slow' : ''}`}
              >
                <TableCell className="flex items-center gap-2">
                  <ProductImage
                    mainPhotoUrl={item.mainPhotoUrl}
                    article_code={item.article_code}
                    variant_code={item.variant_code}
                    size="sm"
                  />
                  {item.article_code} - {item.variant_code} {' '}- 
                  <span className="font-semibold bg-gray-100 px-1.5 py-0.5 rounded ml-1 text-xs">{item.size}</span>
                  {!item.isFromReservation && (productsData.find(p => p.id === item.id)?.quantity || 0) === 0 && (
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded font-medium ml-2">
                      ESAURITO
                    </span>
                  )}
                  {!item.isFromReservation && (productsData.find(p => p.id === item.id)?.quantity || 0) > 0 && 
                   (productsData.find(p => p.id === item.id)?.quantity || 0) < 4 && (
                    <span className="bg-yellow-100 text-yellow-600 text-[11px] px-1.5 py-0.5 rounded ml-2">
                      BASSA
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={item.discount > 0 ? 'text-red-500 line-through' : ''}>
                    {parseFloat(item.retail_price).toFixed(2)}€
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={item.discount}
                      onChange={(e) => updateDiscount(item.id, Number(e.target.value))}
                      className="w-16"
                      step="1"
                      min="0"
                      max="100"
                      disabled={item.isFromReservation}
                    />
                    {!item.isFromReservation && (item.discount > 0 || (item.unitDiscounts && item.unitDiscounts.some((d: number) => d > 0))) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => resetDiscounts(item.id)}
                        title="Azzera sconti"
                      >
                        <CirclePercent className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {(parseFloat(item.retail_price) * (1 - item.discount / 100)).toFixed(2)} €
                </TableCell>
                <TableCell>
                  {(parseFloat(item.retail_price) * item.quantity * (1 - item.discount / 100)).toFixed(2)} €
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 rounded-full" 
                        onClick={() => updateQuantity(item.id, 'decrease')}
                        disabled={item.isFromReservation || (productsData.find(p => p.id === item.id)?.quantity || 0) === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="mx-2 w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 rounded-full" 
                        onClick={() => updateQuantity(item.id, 'increase')}
                        disabled={
                          item.isFromReservation || 
                          (productsData.find(p => p.id === item.id)?.quantity || 0) === 0 ||
                          item.quantity >= (productsData.find(p => p.id === item.id)?.quantity || 0)
                        }
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {item.quantity > 1 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 px-2 flex items-center gap-1 bg-gray-100 hover:bg-gray-200"
                        onClick={() => toggleRowExpansion(item.id)}
                      >
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform ${
                            expandedRows[item.id] ? 'transform rotate-180' : ''
                          }`}
                        />
                      </Button>
                    )}

                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0" 
                      onClick={() => removeFromCart(item.id)}
                      disabled={item.isFromReservation}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>

              {expandedRows[item.id] && item.quantity > 1 && (
                Array.from({ length: item.quantity }).map((_, index) => {
                  const unitId = item.unitIds?.[index] || generateUniqueId();
                  const unitDiscount = item.unitDiscounts?.[index] || 0;
                  const basePrice = parseFloat(item.retail_price);
                  const discountedPrice = basePrice * (1 - unitDiscount / 100);

                  return (
                    <TableRow 
                      key={unitId}
                      id={`unit-row-${unitId}`}
                      className="bg-gray-50"
                    >
                      <TableCell className="pl-12">
                        Unità {index + 1}
                      </TableCell>
                      <TableCell>
                        <span className={unitDiscount > 0 ? 'text-red-500 line-through' : ''}>
                          {basePrice.toFixed(2)}€
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={unitDiscount}
                            onChange={(e) => updateUnitDiscount(item.id, index, Number(e.target.value))}
                            className="w-16"
                            step="1"
                            min="0"
                            max="100"
                            disabled={item.isFromReservation}
                          />
                          {!item.isFromReservation && unitDiscount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => updateUnitDiscount(item.id, index, 0)}
                              title="Azzera sconto"
                            >
                              <CirclePercent className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {discountedPrice.toFixed(2)}€
                      </TableCell>
                      <TableCell>
                        {discountedPrice.toFixed(2)}€
                      </TableCell>
                      <TableCell>1</TableCell>
                    </TableRow>
                  );
                })
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  )
} 