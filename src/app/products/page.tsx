'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, MoreHorizontal, Pencil, Trash, Plus, Copy, Barcode, Edit, FileEdit, X, Camera } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import ProductDialog from '@/app/components/product-dialog'
import ProductEditDialog from '@/app/components/product-edit-dialog'
import AddBarcodePopup from '@/components/AddBarcodePopup'
import { useToast } from "@/hooks/use-toast"
import { GroupEditDialog } from '../components/group-edit-dialog'
import GroupBarcodesDialog from '@/components/GroupBarcodesDialog'
import NestedFilterMenu from '../components/nested-filter-menu'
import { useRouter, useSearchParams } from 'next/navigation'
import PhotoManagementDialog from '../components/PhotoManagementDialog'
import Image from 'next/image'

interface Brand {
  id: number;
  name: string;
}

interface Size {
  id: number;
  name: string;
}

interface SizeGroup {
  id: number;
  name: string;
}

interface Status {
  id: number;
  name: string;
}

interface ProductAvailability {
  product_id: number;
  quantity: number;
}

interface Barcode {
  id: number;
  code: string;
  img_link: string;
}

interface Product {
  id: number;
  article_code: string;
  variant_code: string;
  size_id: number;
  size_name: string;
  wholesale_price: string;
  retail_price: string;
  brand_name?: string;
  brand_id?: number;
  size_group_id?: number;
  size_group_name?: string;
  status_id: number;
  status_name?: string;
  total_availability?: number;
  created_at?: string;
  updated_at?: string;
  attributes?: Array<{
    parameter_id: number;
    attribute_id: number;
    parameter_name: string;
    attribute_name: string;
    attribute_value?: string;
  }>;
  main_photo?: {
    id: number;
    url: string;
    main: boolean;
  };
}

interface PriceRange {
  min: number;
  max: number;
}

interface PriceRanges {
  wholesale_price: PriceRange;
  retail_price: PriceRange;
}

interface AvailabilityFilter {
  type?: 'available' | 'not_available' | 'greater_than' | 'less_than'
  value?: number
}

interface Filters {
  [key: string]: number[]
}

interface ProductInGroup {
  id: number;
  size_id: number;
  size_name: string;
  total_availability: number;
  main_photo?: {
    id: number;
    url: string;
    main: boolean;
  };
}

interface ProductGroup {
  article_code: string;
  variant_code: string;
  status_id: number;
  status_name?: string;
  wholesale_price: string;
  retail_price: string;
  brand_id?: number;
  brand_name?: string;
  size_group_id?: number;
  size_group_name?: string;
  attributes?: Product['attributes'];
  products: ProductInGroup[];
  sizes: Array<{
    id: number;
    name: string;
  }>;
  total_availability: number;
  created_at: string;
  updated_at: string;
  main_photo?: {
    id: number;
    url: string;
    main: boolean;
  };
}

interface Parameter {
  id: number;
  name: string;
  attributes: Array<{
    id: number;
    name: string;
  }>;
}

const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

function compareSizes(a: string, b: string): number {
  const aUpper = a.toUpperCase();
  const bUpper = b.toUpperCase();
  
  const aIndex = sizeOrder.indexOf(aUpper);
  const bIndex = sizeOrder.indexOf(bUpper);
  
  if (aIndex !== -1 && bIndex !== -1) {
    return aIndex - bIndex;
  }
  
  const aNum = parseFloat(a);
  const bNum = parseFloat(b);
  
  if (!isNaN(aNum) && !isNaN(bNum)) {
    return aNum - bNum;
  }
  
  return a.localeCompare(b);
}

const highlightSearchTerm = (text: string, searchTerm: string) => {
  if (!searchTerm.trim()) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    regex.test(part) ? 
      <span key={i} className="bg-yellow-200">{part}</span> : 
      part
  );
};

const fetchMainPhoto = async (article_code: string, variant_code: string) => {
  try {
    // Normalizza i codici per la ricerca
    const normalizedArticleCode = article_code.replace(/\s+/g, '').toLowerCase();
    const normalizedVariantCode = variant_code.replace(/\s+/g, '').toLowerCase();
    
    const response = await fetch(`${server}/api/products/photos/${normalizedArticleCode}/${normalizedVariantCode}/main`);
    if (!response.ok) return null;
    const photo = await response.json();
    
    // Verifica che la foto corrisponda effettivamente al prodotto
    if (photo && 
        photo.article_code === normalizedArticleCode && 
        photo.variant_code === normalizedVariantCode) {
      return photo;
    }
    return null;
  } catch (error) {
    console.error('Error fetching main photo:', error);
    return null;
  }
};

const server = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

// Aggiungi queste configurazioni per Next.js Image in cima al file
const imageLoader = ({ src }: { src: string }) => {
  // Se l'URL è già completo, usalo direttamente
  if (src.startsWith('http')) {
    return src;
  }
  // Altrimenti, aggiungi il PUBLIC_URL
  const PUBLIC_URL = process.env.NEXT_PUBLIC_PUBLIC_URL || 'https://pub-f4e1b9395e524051a44e01925c9722f0.r2.dev';
  return `${PUBLIC_URL}/${src}`;
};

// Aggiungi questa funzione per generare i placeholder blurred
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f6f7f8" offset="0%" />
      <stop stop-color="#edeef1" offset="50%" />
      <stop stop-color="#f6f7f8" offset="100%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f6f7f8" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);

// Modifica il componente dell'immagine nella tabella
const ProductImage = ({ url, alt }: { url: string; alt: string }) => {
  return (
    <div className="relative w-12 h-12">
      <Image
        src={url}
        alt={alt}
        fill
        loader={imageLoader}
        className="object-cover rounded-md"
        sizes="48px"
        placeholder="blur"
        blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(48, 48))}`}
        priority={false}
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = '/images/placeholder-product.png';
        }}
      />
    </div>
  );
};

function TableContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [sizes, setSizes] = useState<Size[]>([])
  const [sizeGroups, setSizeGroups] = useState<SizeGroup[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [parameters, setParameters] = useState<Parameter[]>([])
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [filters, setFilters] = useState<Filters>(() => {
    try {
      const savedFilters = searchParams.get('filters')
      return savedFilters ? JSON.parse(savedFilters) : {}
    } catch {
      return {}
    }
  })
  const [isGroupedView, setIsGroupedView] = useState(true)

  const [priceRanges, setPriceRanges] = useState<PriceRanges>(() => {
    try {
      const savedPriceRanges = searchParams.get('priceRanges')
      return savedPriceRanges ? JSON.parse(savedPriceRanges) : {
        wholesale_price: {},
        retail_price: {}
      }
    } catch {
      return {
        wholesale_price: {},
        retail_price: {}
      }
    }
  })

  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>(() => {
    try {
      const savedAvailability = searchParams.get('availability')
      return savedAvailability ? JSON.parse(savedAvailability) : {}
    } catch {
      return {}
    }
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddBarcodePopupOpen, setIsAddBarcodePopupOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isGroupEditDialogOpen, setIsGroupEditDialogOpen] = useState(false)
  const [selectedGroupData, setSelectedGroupData] = useState<any>(null)
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])
  const [isGroupBarcodesDialogOpen, setIsGroupBarcodesDialogOpen] = useState(false)
  const [selectedGroupForBarcodes, setSelectedGroupForBarcodes] = useState<Product[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { toast } = useToast()
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhotoProduct, setSelectedPhotoProduct] = useState<{ article_code: string; variant_code: string } | null>(null);

  // Funzione per aggiornare l'URL con i filtri correnti
  const updateUrlParams = (newSearchTerm?: string, newFilters?: Filters, newAvailability?: AvailabilityFilter, newPriceRanges?: PriceRanges) => {
    const params = new URLSearchParams()
    
    if (newSearchTerm) params.set('search', newSearchTerm)
    if (newFilters && Object.keys(newFilters).length > 0) params.set('filters', JSON.stringify(newFilters))
    if (newAvailability && Object.keys(newAvailability).length > 0) params.set('availability', JSON.stringify(newAvailability))
    if (newPriceRanges && (Object.keys(newPriceRanges.wholesale_price).length > 0 || Object.keys(newPriceRanges.retail_price).length > 0)) {
      params.set('priceRanges', JSON.stringify(newPriceRanges))
    }
    
    router.push(`?${params.toString()}`, { scroll: false })
  }

  // Aggiorna i filtri e l'URL quando cambiano i valori
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    updateUrlParams(value, filters, availabilityFilter, priceRanges)
  }

  const handleFiltersChange = (newFilters: Record<string, number[]>) => {
    setFilters(newFilters)
    updateUrlParams(searchTerm, newFilters, availabilityFilter, priceRanges)
  }

  const handleAvailabilityFilterChange = (newAvailability: AvailabilityFilter) => {
    setAvailabilityFilter(newAvailability)
    updateUrlParams(searchTerm, filters, newAvailability, priceRanges)
  }

  const handlePriceRangesChange = (newPriceRanges: PriceRanges) => {
    setPriceRanges(newPriceRanges)
    updateUrlParams(searchTerm, filters, availabilityFilter, newPriceRanges)
  }

  useEffect(() => {
    // Recupera i valori salvati da localStorage solo lato client
    if (typeof window !== 'undefined') {
      const savedSearchTerm = localStorage.getItem('productSearchTerm')
      const savedFilters = localStorage.getItem('productFilters')
      const savedView = localStorage.getItem('productViewGrouped')
      
      setSearchTerm(savedSearchTerm || '')
      setFilters(savedFilters ? JSON.parse(savedFilters) : {})
      setIsGroupedView(savedView !== null ? JSON.parse(savedView) : true)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('productSearchTerm', searchTerm)
  }, [searchTerm])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [productResponse, brandData, sizeData, sizeGroupData, statusData, availabilityData] = await Promise.all([
        fetch(`${server}/api/products?${new URLSearchParams({
          search: searchTerm,
          filters: JSON.stringify({
            ...filters,
            availability: availabilityFilter.type ? availabilityFilter : undefined,
            wholesale_price: priceRanges.wholesale_price.min !== undefined || priceRanges.wholesale_price.max !== undefined ? priceRanges.wholesale_price : undefined,
            retail_price: priceRanges.retail_price.min !== undefined || priceRanges.retail_price.max !== undefined ? priceRanges.retail_price : undefined
          })
        }).toString()}`, { mode: 'cors', credentials: 'include' }).then(res => res.json()),
        fetch(`${server}/api/brands`, { mode: 'cors', credentials: 'include' }).then(res => res.json()),
        fetch(`${server}/api/sizes`, { mode: 'cors', credentials: 'include' }).then(res => res.json()),
        fetch(`${server}/api/size-groups`, { mode: 'cors', credentials: 'include' }).then(res => res.json()),
        fetch(`${server}/api/statuses/field/Products`, { mode: 'cors', credentials: 'include' }).then(res => res.json()),
        fetch(`${server}/api/product-availability`, { mode: 'cors', credentials: 'include' }).then(res => res.json())
      ]);

      console.log('Products Response:', productResponse);
      
      const productData = Array.isArray(productResponse.products) ? productResponse.products : [];

      // Fetch main photos for all products
      const productsWithPhotos = await Promise.all(productData.map(async (product: Product) => {
        const mainPhoto = await fetchMainPhoto(product.article_code, product.variant_code);
        return {
          ...product,
          main_photo: mainPhoto
        };
      }));

      const availabilityMap = availabilityData.reduce((acc: {[key: number]: number}, item: ProductAvailability) => {
        acc[item.product_id] = (acc[item.product_id] || 0) + item.quantity;
        return acc;
      }, {});

      const productsWithAvailability = productsWithPhotos.map((product: Product) => ({
        ...product,
        total_availability: availabilityMap[product.id] || 0
      }));

      setProducts(productsWithAvailability);
      setBrands(brandData)
      setSizes(sizeData)
      setSizeGroups(sizeGroupData)
      setStatuses(statusData)

      // Combina i parametri dall'API con quelli aggiuntivi (Brand, Taglie, Stato)
      const allParameters = [
        ...(productResponse.parameters || []),
        {
          id: -1,
          name: "Brand",
          attributes: brandData.map((brand: Brand) => ({
            id: brand.id,
            name: brand.name
          }))
        },
        {
          id: -2,
          name: "Taglie",
          attributes: sizeData.map((size: Size) => ({
            id: size.id,
            name: size.name
          }))
        },
        {
          id: -3,
          name: "Stato",
          attributes: statusData.map((status: Status) => ({
            id: status.id,
            name: status.name
          }))
        }
      ];
      
      setParameters(allParameters);
    } catch (e) {
      setError('Failed to fetch data. Please try again.')
      console.error('Fetch error:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    localStorage.setItem('productFilters', JSON.stringify(filters))
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [searchTerm, filters, availabilityFilter, priceRanges])

  const handleViewChange = (newValue: boolean) => {
    setIsGroupedView(newValue)
    localStorage.setItem('productViewGrouped', JSON.stringify(newValue))
  }

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return

    try {
      const response = await fetch(`${server}/api/products/${selectedProduct.id}`, {
        method: 'DELETE',
        mode: 'cors',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete product')
      }

      await fetchData()
      setIsDeleteDialogOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete product. Please try again.')
      console.error('Delete error:', e)
    }
  }

  const fetchProductBarcodes = async (productId: number): Promise<Barcode[]> => {
    try {
      console.log(`Fetching barcodes for product ID: ${productId}`);
      const response = await fetch(`${server}/api/barcode/product/${productId}/barcodes`, {
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch product barcodes');
      }

      const barcodes: Barcode[] = await response.json();
      console.log('Fetched barcodes:', barcodes);
      return barcodes;
    } catch (error) {
      console.error('Error fetching product barcodes:', error);
      throw error;
    }
  };

  const handleAddBarcode = async (productId: number, barcodeCode: string) => {
    try {
      console.log(`Adding barcode ${barcodeCode} to product ID: ${productId}`);
      const response = await fetch(`${server}/api/barcode/product-barcodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: barcodeCode, product_id: productId }),
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add barcode');
      }

      const newBarcode = await response.json();
      console.log('Successfully added barcode:', newBarcode);
      return newBarcode;
    } catch (error) {
      console.error('Add barcode error:', error);
      throw error;
    }
  };

  const handleDeleteBarcode = async (productId: number, barcodeId: number) => {
    try {
      console.log(`Deleting barcode ${barcodeId} for product ${productId}`);
      const response = await fetch(`${server}/api/barcode/product/${productId}/barcode/${barcodeId}`, {
        method: 'DELETE',
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete barcode');
      }

      console.log('Successfully deleted barcode');
      // Optionally, you can refresh the product data or update the UI here
    } catch (error) {
      console.error('Delete barcode error:', error);
      setError('Failed to delete barcode. Please try again.');
    }
  };

  const handleEdit = async (product: any) => {
    try {
      console.log('handleEdit called with product:', product);
      
      // Carica i dati completi del prodotto
      const response = await fetch(`${server}/api/products/${product.id}`, {
        mode: 'cors',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch product details');
      }
      
      const productDetails = await response.json();
      console.log('Product details fetched:', productDetails);
      
      setSelectedProduct(productDetails);
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dettagli del prodotto",
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = (product: any) => {
    setSelectedProduct(product)
    setIsDuplicating(true)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setSelectedProduct(null)
    setIsDuplicating(false)
    setIsDialogOpen(true)
  }

  const handleCreate = async (productData: Record<string, any>): Promise<void> => {
    try {
      const response = await fetch(`${server}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to create product')
      }

      const result = await response.json()
      
      // Aggiorna la lista dei prodotti
      fetchData()
      
      // Chiudi il dialog
      setIsDialogOpen(false)
      
      // Mostra un toast con il risultato
      toast({
        title: 'Prodotti Creati',
        description: result.message || `Creati ${result.created.length} prodotti${result.skipped?.length ? `, saltati ${result.skipped.length} prodotti esistenti` : ''}`,
        variant: 'default',
      })
    } catch (error) {
      console.error('Error creating product:', error)
      toast({
        title: 'Errore',
        description: 'Errore durante la creazione del prodotto',
        variant: 'destructive',
      })
    }
  }

  // Funzione per contare i prodotti nel gruppo
  const countProductsInGroup = (group: any) => {
    return products.filter(
      p => p.article_code === group.article_code && 
          p.variant_code === group.variant_code &&
          p.status_id === group.status_id &&
          p.wholesale_price === group.wholesale_price &&
          p.retail_price === group.retail_price
    ).length;
  };

  // Funzione per trovare il prodotto singolo
  const findSingleProduct = (group: any) => {
    return products.find(
      p => p.article_code === group.article_code && 
          p.variant_code === group.variant_code &&
          p.status_id === group.status_id &&
          p.wholesale_price === group.wholesale_price &&
          p.retail_price === group.retail_price
    );
  };

  const handleDelete = async (item: Product | ProductGroup) => {
    setSelectedProduct('id' in item ? item : null)
    setIsDeleteDialogOpen(true)
  }

  const groupProducts = (products: Product[]): ProductGroup[] => {
    const groups = products.reduce((acc: Record<string, ProductGroup>, product: Product) => {
      const attributesKey = product.attributes ? 
        product.attributes
          .sort((a, b) => a.attribute_name.localeCompare(b.attribute_name))
          .map(attr => `${attr.attribute_name}:${attr.attribute_value}`)
          .join('|') 
        : '';

      const key = `${product.article_code}-${product.variant_code}-${product.status_id}-${product.wholesale_price}-${product.retail_price}-${product.brand_id}-${product.size_group_id}-${attributesKey}`;

      if (!acc[key]) {
        acc[key] = {
          article_code: product.article_code,
          variant_code: product.variant_code,
          status_id: product.status_id,
          status_name: product.status_name,
          wholesale_price: product.wholesale_price,
          retail_price: product.retail_price,
          brand_id: product.brand_id,
          brand_name: product.brand_name,
          size_group_id: product.size_group_id,
          size_group_name: product.size_group_name,
          attributes: product.attributes,
          products: [{
            id: product.id,
            size_id: product.size_id,
            size_name: product.size_name || '',
            total_availability: product.total_availability || 0,
            main_photo: product.main_photo
          }],
          sizes: [{
            id: product.size_id,
            name: product.size_name || ''
          }],
          total_availability: product.total_availability || 0,
          created_at: product.created_at || new Date().toISOString(),
          updated_at: product.updated_at || product.created_at || new Date().toISOString(),
          main_photo: product.main_photo
        };
      } else {
        acc[key].products.push({
          id: product.id,
          size_id: product.size_id,
          size_name: product.size_name || '',
          total_availability: product.total_availability || 0,
          main_photo: product.main_photo
        });
        acc[key].sizes.push({
          id: product.size_id,
          name: product.size_name || ''
        });
        acc[key].total_availability += (product.total_availability || 0);

        if (product.main_photo && !acc[key].main_photo) {
          acc[key].main_photo = product.main_photo;
        }

        const currentUpdated = new Date(product.updated_at || product.created_at || new Date());
        const groupUpdated = new Date(acc[key].updated_at);
        if (currentUpdated > groupUpdated) {
          acc[key].updated_at = product.updated_at || product.created_at || new Date().toISOString();
        }
      }
      return acc;
    }, {});

    return Object.values(groups).map((group: ProductGroup) => ({
      ...group,
      products: group.products.sort((a, b) => compareSizes(a.size_name, b.size_name)),
      sizes: group.sizes.sort((a, b) => compareSizes(a.name, b.name))
    }));
  };

  const handleGroupEdit = (group: any) => {
    setSelectedGroupData({
      article_code: group.article_code,
      variant_code: group.variant_code,
      wholesale_price: parseFloat(group.wholesale_price),
      retail_price: parseFloat(group.retail_price),
      status_id: group.status_id,
      attributes: group.attributes
    });
    // Passa gli ID dei prodotti dal gruppo
    const productIds = group.products.map((p: any) => p.id);
    setSelectedProductIds(productIds);
    setIsGroupEditDialogOpen(true);
  };

  const handleAvailabilityChange = (filter: AvailabilityFilter) => {
    setAvailabilityFilter(filter);
    if (filter.type) {
      setFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters.availability;
        return newFilters;
      });
    }
  };

  const formatPrice = (price: string | number | undefined): number => {
    if (typeof price === 'string') {
      return parseFloat(price) || 0;
    }
    return price || 0;
  };

  const compareProducts = (p: Product, group: ProductGroup): boolean => {
    return p.article_code === group.article_code &&
           p.variant_code === group.variant_code &&
           p.status_id === group.status_id &&
           formatPrice(p.wholesale_price) === formatPrice(group.wholesale_price) &&
           formatPrice(p.retail_price) === formatPrice(group.retail_price);
  };

  const handlePhotoManagement = (group: any) => {
    setSelectedPhotoProduct({
      article_code: group.article_code,
      variant_code: group.variant_code
    });
    setPhotoDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Product List</h1>
          <div className="flex items-center gap-4">
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" /> Aggiungi Prodotto
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Vista Raggruppata</span>
              <Switch
                checked={isGroupedView}
                onCheckedChange={handleViewChange}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Input
            type="search"
            placeholder="Cerca prodotti..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full max-w-sm"
          />
          <NestedFilterMenu
            parameters={parameters}
            selectedFilters={filters}
            onFilterChange={handleFiltersChange}
            priceRanges={priceRanges}
            onPriceRangeChange={handlePriceRangesChange}
            availabilityFilter={availabilityFilter}
            onAvailabilityChange={handleAvailabilityFilterChange}
          />
        </div>

        {/* Badge dei filtri attivi */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([parameterId, values]) => {
            const parameter = parameters.find(p => p.id.toString() === parameterId);
            if (!parameter || values.length === 0) return null;

            const selectedAttributes = parameter.attributes
              .filter(attr => values.includes(attr.id))
              .map(attr => attr.name);

            const displayCount = 2;
            const remainingCount = selectedAttributes.length - displayCount;
            const displayedValues = selectedAttributes.slice(0, displayCount);

            return (
              <Badge
                key={parameterId}
                variant="secondary"
                className="relative group flex items-center gap-2"
              >
                <span>
                  {parameter.name}: {displayedValues.join(", ")}
                  {remainingCount > 0 && ` +${remainingCount}`}
                </span>
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    [parameterId]: []
                  }))}
                />
                {remainingCount > 0 && (
                  <span className="absolute z-50 top-full left-0 mt-1 hidden group-hover:block bg-muted text-muted-foreground p-1.5 rounded-md shadow-md max-w-[200px] text-xs">
                    {selectedAttributes.join(", ")}
                  </span>
                )}
              </Badge>
            );
          })}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foto</TableHead>
                <TableHead>Codice Articolo</TableHead>
                <TableHead>Variante</TableHead>
                <TableHead>Brand</TableHead>
                {!isGroupedView && <TableHead>Taglia</TableHead>}
                {isGroupedView && <TableHead>Taglie</TableHead>}
                <TableHead>Attributi</TableHead>
                <TableHead>Prezzo Ingrosso</TableHead>
                <TableHead>Prezzo Vendita</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Disponibilità</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isGroupedView ? (
                groupProducts(products)
                .sort((a, b) => {
                  // Prima ordina per data più recente
                  const updatedAtA = new Date(a.updated_at || a.created_at || '').getTime();
                  const updatedAtB = new Date(b.updated_at || b.created_at || '').getTime();
                  if (updatedAtA !== updatedAtB) {
                    return updatedAtB - updatedAtA;
                  }

                  // Se le date sono uguali, ordina per codice articolo
                  const articleComparison = a.article_code.localeCompare(b.article_code);
                  if (articleComparison !== 0) return articleComparison;

                  // Se anche il codice articolo è uguale, ordina per variante
                  return a.variant_code.localeCompare(b.variant_code);
                })
                .map((group, index, sortedGroups) => {
                  // Determina il numero del gruppo basato sul codice articolo
                  let groupNumber = 0;
                  let currentArticleCode = '';
                  for (let i = 0; i <= index; i++) {
                    const currentGroup = sortedGroups[i];
                    if (i === 0 || currentGroup.article_code !== currentArticleCode) {
                      if (i > 0) groupNumber++;
                      currentArticleCode = currentGroup.article_code;
                    }
                  }
                  
                  // Applica la classe di sfondo appropriata
                  const bgClass = groupNumber % 2 === 0 ? 'bg-gray-100 hover:bg-gray-200' : 'bg-white hover:bg-gray-200';
                  
                  return (
                    <TableRow key={index} className={bgClass}>
                      <TableCell>
                        {group.main_photo?.url && (
                          <ProductImage 
                            url={group.main_photo.url} 
                            alt={`${group.article_code} ${group.variant_code}`} 
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {highlightSearchTerm(group.article_code?.toUpperCase() || '', searchTerm)}
                      </TableCell>
                      <TableCell>
                        {highlightSearchTerm(group.variant_code?.toUpperCase() || '', searchTerm)}
                      </TableCell>
                      <TableCell>
                        {highlightSearchTerm(group.brand_name || '', searchTerm)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-0.5">
                          {group.sizes
                            .sort((a, b) => compareSizes(a.name, b.name))
                            .map((size, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-[10px] px-1 py-0 h-4"
                              >
                                {size.name}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-0.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 h-4"
                          >
                            {group.size_group_name}
                          </Badge>
                          {group.attributes?.map((attr, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-[10px] px-1 py-0 h-4"
                            >
                              {attr.attribute_name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('it-IT', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(formatPrice(group.wholesale_price))}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('it-IT', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(formatPrice(group.retail_price))}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          group.status_name?.toLowerCase() === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {group.status_name || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>{group.total_availability}</TableCell>
                      <TableCell>
                        {isGroupedView && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  const count = countProductsInGroup(group);
                                  if (count >= 2) {
                                    handleGroupEdit(group);
                                  } else {
                                    const singleProduct = findSingleProduct(group);
                                    if (singleProduct) {
                                      setSelectedProduct(singleProduct);
                                      setIsEditDialogOpen(true);
                                    }
                                  }
                                }}
                              >
                                <FileEdit className="mr-2 h-4 w-4" />
                                Modifica
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(group)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplica
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(group)}>
                                <Trash className="mr-2 h-4 w-4" />
                                Elimina
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePhotoManagement(group)}>
                                <Camera className="mr-2 h-4 w-4" />
                                Gestisci foto
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                // Prendiamo i prodotti del gruppo
                                const groupProducts = products.filter(p => 
                                  p.article_code === group.article_code &&
                                  p.variant_code === group.variant_code &&
                                  p.status_id === group.status_id &&
                                  p.wholesale_price === group.wholesale_price &&
                                  p.retail_price === group.retail_price
                                );
                                
                                console.log('Prodotti filtrati:', groupProducts);
                                setSelectedGroupForBarcodes(groupProducts);
                                setIsGroupBarcodesDialogOpen(true);
                              }}>
                                <Barcode className="mr-2 h-4 w-4" />
                                Manage Barcodes
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                products
                .sort((a, b) => {
                  // Crea una mappa delle date più recenti per ogni combinazione articolo-variante
                  const getLatestDate = (product: Product) => {
                    const sameGroupProducts = products.filter(p => 
                      p.article_code === product.article_code && 
                      p.variant_code === product.variant_code
                    );
                    return Math.max(...sameGroupProducts.map(p => 
                      new Date(p.updated_at || p.created_at || '').getTime()
                    ));
                  };

                  // Ottieni le date più recenti per entrambi i prodotti
                  const aLatestDate = getLatestDate(a);
                  const bLatestDate = getLatestDate(b);

                  // Prima ordina per data più recente
                  if (aLatestDate !== bLatestDate) {
                    return bLatestDate - aLatestDate;
                  }

                  // Se le date sono uguali, ordina per codice articolo
                  const articleComparison = a.article_code.localeCompare(b.article_code);
                  if (articleComparison !== 0) return articleComparison;
                  
                  // Se il codice articolo è uguale, ordina per variante
                  const variantComparison = a.variant_code.localeCompare(b.variant_code);
                  if (variantComparison !== 0) return variantComparison;
                  
                  // Se anche la variante è uguale, ordina per taglia usando la funzione compareSizes
                  const aSize = sizes.find(s => s.id === a.size_id)?.name || '';
                  const bSize = sizes.find(s => s.id === b.size_id)?.name || '';
                  return compareSizes(aSize, bSize);
                })
                .map((product, index, sortedProducts) => {
                  // Determina se questo prodotto è parte di un gruppo diverso dal precedente
                  const isNewGroup = index === 0 || (
                    product.article_code !== sortedProducts[index - 1].article_code ||
                    product.variant_code !== sortedProducts[index - 1].variant_code
                  );
                  
                  // Determina il numero del gruppo per alternare gli sfondi
                  let groupNumber = 0;
                  let currentGroup = '';
                  for (let i = 0; i <= index; i++) {
                    const currentProduct = sortedProducts[i];
                    const groupKey = `${currentProduct.article_code}-${currentProduct.variant_code}`;
                    
                    if (i === 0 || groupKey !== currentGroup) {
                      if (i > 0) groupNumber++;
                      currentGroup = groupKey;
                    }
                  }
                  
                  // Applica la classe di sfondo appropriata
                  const bgClass = groupNumber % 2 === 0 ? 'bg-gray-100 hover:bg-gray-200' : 'bg-white hover:bg-gray-200';
                  
                  return (
                    <TableRow 
                      key={product.id}
                      className={bgClass}
                    >
                      <TableCell>
                        {product.main_photo?.url && (
                          <ProductImage 
                            url={product.main_photo.url} 
                            alt={`${product.article_code} ${product.variant_code}`} 
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {highlightSearchTerm(product.article_code?.toUpperCase() || '', searchTerm)}
                      </TableCell>
                      <TableCell>
                        {highlightSearchTerm(product.variant_code?.toUpperCase() || '', searchTerm)}
                      </TableCell>
                      <TableCell>
                        {highlightSearchTerm(product.brand_name || '', searchTerm)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {sizes.find(s => s.id === product.size_id)?.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="grid grid-rows-2 gap-0.5">
                          <div className="flex flex-wrap gap-0.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 h-4"
                            >
                              {sizeGroups.find(sg => sg.id === product.size_group_id)?.name}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-0.5">
                            {product.attributes?.map((attr, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-[10px] px-1 py-0 h-4"
                              >
                                {attr.attribute_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('it-IT', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(formatPrice(product.wholesale_price))}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('it-IT', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(formatPrice(product.retail_price))}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          product.status_name?.toLowerCase() === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.status_name || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>{product.total_availability || 0}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProduct(product)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <FileEdit className="mr-2 h-4 w-4" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(product)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplica
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(product)}>
                              <Trash className="mr-2 h-4 w-4" />
                              Elimina
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedProduct(product);
                              setIsAddBarcodePopupOpen(true);
                            }}>
                              <Barcode className="mr-2 h-4 w-4" />
                              Aggiungi Barcode
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedPhotoProduct({
                                article_code: product.article_code,
                                variant_code: product.variant_code
                              });
                              setPhotoDialogOpen(true);
                            }}>
                              <Camera className="mr-2 h-4 w-4" />
                              Gestisci foto
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
      {/* Dialog per la creazione/duplicazione */}
      <ProductDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedProduct(null);
          setIsDuplicating(false);
        }}
        product={isDuplicating ? selectedProduct : null}
        onSave={fetchData}
        refreshData={fetchData}
      />

      {/* Dialog per la modifica */}
      <ProductEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setSelectedProduct(null)
        }}
        product={selectedProduct}
        onProductUpdate={fetchData}
      />
      <AddBarcodePopup
        isOpen={isAddBarcodePopupOpen}
        onClose={() => setIsAddBarcodePopupOpen(false)}
        productId={selectedProduct?.id || 0}
        onAddBarcode={handleAddBarcode}
        onDeleteBarcode={handleDeleteBarcode}
        fetchProductBarcodes={fetchProductBarcodes}
      />
      <GroupEditDialog
        isOpen={isGroupEditDialogOpen}
        onClose={() => {
          setIsGroupEditDialogOpen(false)
          setSelectedGroupData(null)
          setSelectedProductIds([])
          fetchData()
        }}
        groupData={selectedGroupData}
        productIds={selectedProductIds}
      />
      <GroupBarcodesDialog
        isOpen={isGroupBarcodesDialogOpen}
        onClose={() => {
          setIsGroupBarcodesDialogOpen(false);
          setSelectedGroupForBarcodes([]);
        }}
        products={selectedGroupForBarcodes}
        onAddBarcode={handleAddBarcode}
        onDeleteBarcode={handleDeleteBarcode}
      />
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {selectedPhotoProduct && (
        <PhotoManagementDialog
          open={photoDialogOpen}
          onOpenChange={setPhotoDialogOpen}
          articleCode={selectedPhotoProduct.article_code}
          variantCode={selectedPhotoProduct.variant_code}
        />
      )}
    </div>
  )
}

export default function TablePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TableContent />
    </Suspense>
  )
}