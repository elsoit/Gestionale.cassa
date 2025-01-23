export interface Attribute {
  parameter_id: number
  parameter_name: string
  parameter_description: string
  parameter_is_required: boolean
  parameter_is_expandable: boolean
  attribute_id: number
  attribute_name: string
}

export interface Product {
  id: number
  article_code: string
  variant_code: string
  size_id: number
  size_group_id: number
  brand_id: number
  wholesale_price: number
  retail_price: number
  status_id: number
  created_at: string
  updated_at: string
  brand_name: string
  size_name: string
  size_group_name: string
  status_name: string
  attributes: Attribute[]
  mainPhotoUrl?: string
  barcode?: string
  quantity?: number
  availability?: {
    product_id: number
    warehouse_id: number
    quantity: number
  }[]
}

export interface LoadProduct extends Omit<Product, 'size_name'> {
  quantity: number
  cost: number
  mainPhotoUrl?: string
  size?: { name: string }
  size_name: string
} 