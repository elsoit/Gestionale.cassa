import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EditProductPopupProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  brands: { id: number; name: string }[];
  sizes: { id: number; name: string }[];
  sizeGroups: { id: number; name: string }[];
  statuses: { id: number; name: string; field: string }[];
  onEditProduct: (product: any) => void;
}

export default function EditProductPopup({
  isOpen,
  onClose,
  product,
  brands,
  sizes,
  sizeGroups,
  statuses,
  onEditProduct
}: EditProductPopupProps) {
  const [editedProduct, setEditedProduct] = useState<any>(null)

  useEffect(() => {
    if (product) {
      setEditedProduct({ ...product })
    }
  }, [product])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditedProduct((prev: Record<string, any>) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string) => (value: string) => {
    setEditedProduct((prev: Record<string, any>) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editedProduct) {
      onEditProduct(editedProduct)
    }
  }

  if (!editedProduct) {
    return null
  }

  // Filter statuses to only include those with field "Product"
  const productStatuses = statuses.filter(status => status.field === "Product")

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="article_code" className="text-right">
              Article Code
            </Label>
            <Input
              id="article_code"
              name="article_code"
              value={editedProduct.article_code || ''}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="variant_code" className="text-right">
              Variant Code
            </Label>
            <Input
              id="variant_code"
              name="variant_code"
              value={editedProduct.variant_code || ''}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="size" className="text-right">
              Size
            </Label>
            <Select onValueChange={handleSelectChange('size_id')} value={editedProduct.size_id?.toString() || ''}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {sizes.map(size => (
                  <SelectItem key={size.id} value={size.id.toString()}>{size.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="size_group" className="text-right">
              Size Group
            </Label>
            <Select onValueChange={handleSelectChange('size_group_id')} value={editedProduct.size_group_id?.toString() || ''}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select size group" />
              </SelectTrigger>
              <SelectContent>
                {sizeGroups.map(group => (
                  <SelectItem key={group.id} value={group.id.toString()}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="brand" className="text-right">
              Brand
            </Label>
            <Select onValueChange={handleSelectChange('brand_id')} value={editedProduct.brand_id?.toString() || ''}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map(brand => (
                  <SelectItem key={brand.id} value={brand.id.toString()}>{brand.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="wholesale_price" className="text-right">
              Wholesale Price
            </Label>
            <Input
              id="wholesale_price"
              name="wholesale_price"
              type="number"
              value={editedProduct.wholesale_price || ''}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="retail_price" className="text-right">
              Retail Price
            </Label>
            <Input
              id="retail_price"
              name="retail_price"
              type="number"
              value={editedProduct.retail_price || ''}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select onValueChange={handleSelectChange('status_id')} value={editedProduct.status_id?.toString() || ''}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {productStatuses.map(status => (
                  <SelectItem key={status.id} value={status.id.toString()}>{status.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}