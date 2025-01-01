import React, { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Status {
  id: number;
  name: string;
  field: string;
}

interface Size {
  id: number;
  name: string;
}

interface AddProductPopupProps {
  isOpen: boolean;
  onClose: () => void;
  brands: { id: number; name: string }[];
  sizes: Size[];
  sizeGroups: { id: number; name: string }[];
  statuses: Status[];
  onAddProducts: (products: any[]) => void;
}

export default function AddProductPopup({
  isOpen,
  onClose,
  brands,
  sizes,
  sizeGroups,
  statuses,
  onAddProducts
}: AddProductPopupProps) {
  const [newProduct, setNewProduct] = useState({
    article_code: '',
    variant_code: '',
    size_ids: [] as number[],
    size_group_id: '',
    brand_id: '',
    wholesale_price: '',
    retail_price: '',
    status_id: ''
  })

  const filteredStatuses = useMemo(() => {
    return statuses.filter(status => status.field === 'Product')
  }, [statuses])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewProduct(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string) => (value: string) => {
    setNewProduct(prev => ({ ...prev, [name]: value }))
  }

  const handleSizeToggle = (sizeId: number) => {
    setNewProduct(prev => ({
      ...prev,
      size_ids: prev.size_ids.includes(sizeId)
        ? prev.size_ids.filter(id => id !== sizeId)
        : [...prev.size_ids, sizeId]
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const products = newProduct.size_ids.map(sizeId => ({
      ...newProduct,
      size_id: sizeId,
      size_ids: undefined // Remove the size_ids array from the final product object
    }))
    onAddProducts(products)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Products</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="article_code" className="text-right">
              Article Code
            </Label>
            <Input
              id="article_code"
              name="article_code"
              value={newProduct.article_code}
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
              value={newProduct.variant_code}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Sizes</Label>
            <ScrollArea className="h-[200px] col-span-3 border rounded-md p-2">
              {sizes.map(size => (
                <div key={size.id} className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id={`size-${size.id}`}
                    checked={newProduct.size_ids.includes(size.id)}
                    onCheckedChange={() => handleSizeToggle(size.id)}
                  />
                  <Label htmlFor={`size-${size.id}`}>{size.name}</Label>
                </div>
              ))}
            </ScrollArea>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="size_group" className="text-right">
              Size Group
            </Label>
            <Select onValueChange={handleSelectChange('size_group_id')} value={newProduct.size_group_id}>
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
            <Select onValueChange={handleSelectChange('brand_id')} value={newProduct.brand_id}>
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
              value={newProduct.wholesale_price}
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
              value={newProduct.retail_price}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select onValueChange={handleSelectChange('status_id')} value={newProduct.status_id}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {filteredStatuses.map(status => (
                  <SelectItem key={status.id} value={status.id.toString()}>{status.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>Add Products</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}