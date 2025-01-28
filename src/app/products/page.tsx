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
import ProductPhotosManagementDialog from '../components/ProductPhotosManagementDialog'

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
  photos: {
    id: number;
    url: string;
    main: boolean;
  }[];
}

interface PriceRange {
  min: number | undefined;
  max: number | undefined;
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

interface DeleteResponse {
  details: {
    deletedCount: number;
    statusChangedCount: number;
    errorCount: number;
  };
  results: {
    deleted: Product[];
    statusChanged: Product[];
    errors: Array<{ id: number; error: string }>;
    usage: {
      [key: number]: {
        canDelete: boolean;
        hasLoadings: boolean;
        hasAvailability: boolean;
        hasOrders: boolean;
      }
    }
  };
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
    
    const response = await fetch(`${process.env.API_URL}/api/products/photos/${normalizedArticleCode}/${normalizedVariantCode}/main`);
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
const ProductImage = ({ 
  url, 
  alt, 
  article_code, 
  variant_code, 
  onImageClick 
}: { 
  url?: string; 
  alt: string; 
  article_code: string; 
  variant_code: string; 
  onImageClick: (article_code: string, variant_code: string) => void;
}) => {
  return (
    <div 
      className="relative w-12 h-12 cursor-pointer bg-gray-100 rounded-md flex items-center justify-center overflow-hidden" 
      onClick={() => onImageClick(article_code, variant_code)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onImageClick(article_code, variant_code);
        }
      }}
    >
      {url ? (
        <Image
          src={url}
          alt={alt}
          fill
          className="object-cover rounded-md"
          sizes="48px"
          priority={false}
          loading="lazy"
        />
      ) : (
        <Camera className="w-6 h-6 text-gray-400" />
      )}
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
  const [showDeleted, setShowDeleted] = useState(false)

  const [priceRanges, setPriceRanges] = useState<PriceRanges>(() => {
    try {
      const savedPriceRanges = searchParams.get('priceRanges')
      return savedPriceRanges ? JSON.parse(savedPriceRanges) : {
        wholesale_price: { min: undefined, max: undefined },
        retail_price: { min: undefined, max: undefined }
      }
    } catch {
      return {
        wholesale_price: { min: undefined, max: undefined },
        retail_price: { min: undefined, max: undefined }
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
  const [isPhotosManagementOpen, setIsPhotosManagementOpen] = useState(false);
  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState(false);
  const [selectedGalleryProduct, setSelectedGalleryProduct] = useState<{ article_code: string; variant_code: string } | null>(null);

  // Funzione per aggiornare l'URL con i filtri correnti
  const updateUrlParams = (newSearchTerm?: string, newFilters?: Filters, newAvailability?: AvailabilityFilter, newPriceRanges?: PriceRanges) => {
    const params = new URLSearchParams()
    
    // Aggiungi i parametri solo se hanno valori significativi
    if (newSearchTerm?.trim()) {
      params.set('search', newSearchTerm)
    }
    
    if (newFilters && Object.keys(newFilters).length > 0) {
      // Verifica se ci sono array di filtri non vuoti
      const hasNonEmptyFilters = Object.values(newFilters).some(arr => arr.length > 0);
      if (hasNonEmptyFilters) {
        params.set('filters', JSON.stringify(newFilters))
      }
    }
    
    if (newAvailability && Object.keys(newAvailability).length > 0 && newAvailability.type) {
      params.set('availability', JSON.stringify(newAvailability))
    }
    
    if (newPriceRanges) {
      const hasWholesalePrice = Object.keys(newPriceRanges.wholesale_price || {}).length > 0;
      const hasRetailPrice = Object.keys(newPriceRanges.retail_price || {}).length > 0;
      if (hasWholesalePrice || hasRetailPrice) {
        params.set('priceRanges', JSON.stringify(newPriceRanges))
      }
    }
    
    // Se non ci sono parametri, pulisci l'URL
    const newUrl = params.toString() ? `?${params.toString()}` : '/products';
    router.push(newUrl, { scroll: false })
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
    setIsLoading(true);
    setError(null);
    
    try {
      const [productResponse, brandData, sizeData, sizeGroupData, statusData, availabilityData] = await Promise.all([
        fetch(`${process.env.API_URL}/api/products?${new URLSearchParams({
          search: searchTerm,
          filters: JSON.stringify({
            ...filters,
            availability: availabilityFilter.type ? availabilityFilter : undefined,
            wholesale_price: priceRanges.wholesale_price.min !== undefined || priceRanges.wholesale_price.max !== undefined ? priceRanges.wholesale_price : undefined,
            retail_price: priceRanges.retail_price.min !== undefined || priceRanges.retail_price.max !== undefined ? priceRanges.retail_price : undefined
          })
        }).toString()}`, { mode: 'cors', credentials: 'include' }).then(res => res.json()),
        fetch(`${process.env.API_URL}/api/brands`, { mode: 'cors', credentials: 'include' }).then(res => res.json()),
        fetch(`${process.env.API_URL}/api/sizes`, { mode: 'cors', credentials: 'include' }).then(res => res.json()),
        fetch(`${process.env.API_URL}/api/size-groups`, { mode: 'cors', credentials: 'include' }).then(res => res.json()),
        fetch(`${process.env.API_URL}/api/statuses/field/Products`, { mode: 'cors', credentials: 'include' }).then(res => res.json()),
        fetch(`${process.env.API_URL}/api/product-availability`, { mode: 'cors', credentials: 'include' }).then(res => res.json())
      ]);

      const productData = Array.isArray(productResponse.products) ? productResponse.products : [];
      
      // Crea la mappa delle disponibilità prima di tutto
      const availabilityMap = availabilityData.reduce((acc: { [key: number]: number }, item: ProductAvailability) => {
        acc[item.product_id] = (acc[item.product_id] || 0) + item.quantity;
        return acc;
      }, {});

      let productsWithPhotos: Product[] = [];

      try {
        // Fetch photos for all products in one call
        const photosResponse = await fetch(`${process.env.API_URL}/api/products/photos/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            products: productData.map((product: Product) => ({
              article_code: product.article_code,
              variant_code: product.variant_code
            }))
          }),
          mode: 'cors',
          credentials: 'include'
        });

        if (!photosResponse.ok) {
          throw new Error(`Error fetching photos: ${photosResponse.statusText}`);
        }

        const photosData = await photosResponse.json();

        // Combine products with their photos
        productsWithPhotos = productData.map((product: Product) => {
          const key = `${product.article_code.toLowerCase()}-${product.variant_code.toLowerCase()}`;
          const productPhotos = photosData[key] || [];
          return {
            ...product,
            photos: productPhotos,
            main_photo: productPhotos[0], // La prima foto è quella principale grazie all'ORDER BY main DESC
            total_availability: availabilityMap[product.id] || 0
          };
        });
      } catch (photoError) {
        console.error('Error fetching or processing photos:', photoError);
        toast({
          title: "Errore",
          description: "Errore nel caricamento delle foto dei prodotti",
          variant: "destructive"
        });
        
        // Se c'è un errore con le foto, continua con i prodotti senza foto
        productsWithPhotos = productData.map((product: Product) => ({
          ...product,
          photos: [],
          main_photo: null,
          total_availability: availabilityMap[product.id] || 0
        }));
      }

      setProducts(productsWithPhotos);
      setBrands(brandData);
      setSizes(sizeData);
      setSizeGroups(sizeGroupData);
      setStatuses(statusData);

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
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Errore nel caricamento dei dati');
      toast({
        title: "Errore",
        description: "Errore nel caricamento dei dati",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    if (!selectedProduct) return;

    try {
      const isGroup = isGroupedView && selectedProduct.article_code;
      const response = await fetch(`${process.env.API_URL}/api/products/${selectedProduct.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isGroupDelete: isGroup,
          groupInfo: isGroup ? {
            article_code: selectedProduct.article_code,
            variant_code: selectedProduct.variant_code,
            status_id: selectedProduct.status_id
          } : null
        }),
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      const result = await response.json() as DeleteResponse;
      
      // Mostra il toast appropriato basato sul risultato
      if (result.details.deletedCount > 0 || result.details.statusChangedCount > 0) {
        let message = '';
        
        // Costruisci il messaggio dettagliato per i prodotti disattivati
        if (result.details.statusChangedCount > 0) {
          const reasons = [];
          const products = result.results.statusChanged;
          
          // Raggruppa i prodotti per motivo di disattivazione
          const productsWithLoadings = products.filter(p => result.results.usage[p.id]?.hasLoadings);
          const productsWithAvailability = products.filter(p => result.results.usage[p.id]?.hasAvailability);
          const productsWithOrders = products.filter(p => result.results.usage[p.id]?.hasOrders);
          
          if (productsWithLoadings.length > 0) {
            reasons.push(`${productsWithLoadings.length} presenti in carichi`);
          }
          if (productsWithAvailability.length > 0) {
            reasons.push(`${productsWithAvailability.length} con disponibilità`);
          }
          if (productsWithOrders.length > 0) {
            reasons.push(`${productsWithOrders.length} presenti in ordini`);
          }
          
          message = `${result.details.statusChangedCount} prodotti disattivati (${reasons.join(', ')})`;
        }
        
        // Aggiungi informazioni sui prodotti eliminati
        if (result.details.deletedCount > 0) {
          message = message ? 
            `${result.details.deletedCount} prodotti eliminati e ${message}` :
            `${result.details.deletedCount} prodotti eliminati con successo`;
        }
        
        toast({
          title: "Operazione completata",
          description: message,
          variant: "default"
        });
      }

      if (result.details.errorCount > 0) {
        toast({
          title: "Attenzione",
          description: `Si sono verificati ${result.details.errorCount} errori durante l'operazione`,
          variant: "destructive"
        });
      }

      await fetchData();
      setIsDeleteDialogOpen(false);
    } catch (e) {
      console.error('Delete error:', e);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione",
        variant: "destructive"
      });
    }
  };

  const fetchProductBarcodes = async (productId: number): Promise<Barcode[]> => {
    try {
      console.log(`Fetching barcodes for product ID: ${productId}`);
      const response = await fetch(`${process.env.API_URL}/api/barcode/product/${productId}/barcodes`, {
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
      const response = await fetch(`${process.env.API_URL}/api/barcode/product-barcodes`, {
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
      const response = await fetch(`${process.env.API_URL}/api/barcode/product/${productId}/barcode/${barcodeId}`, {
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

  const handleEdit = async (product: Product | ProductGroup) => {
    try {
      console.log('handleEdit called with:', product);
      
      // Se è un gruppo con un solo prodotto, ottieni l'ID del prodotto singolo
      const productId = 'products' in product ? product.products[0].id : product.id;
      
      // Carica i dati completi del prodotto
      const response = await fetch(`${process.env.API_URL}/api/products/${productId}`, {
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
      const response = await fetch(`${process.env.API_URL}/api/products`, {
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
    // Se è un gruppo, prendiamo il primo prodotto come riferimento
    if ('products' in item) {
      setSelectedProduct({
        id: item.products[0].id,
        article_code: item.article_code,
        variant_code: item.variant_code,
        status_id: item.status_id,
        // Aggiungiamo altri campi necessari
        size_id: item.products[0].size_id,
        size_name: item.products[0].size_name,
        wholesale_price: item.wholesale_price,
        retail_price: item.retail_price,
        brand_id: item.brand_id,
        brand_name: item.brand_name,
        size_group_id: item.size_group_id,
        size_group_name: item.size_group_name,
        attributes: item.attributes,
        total_availability: item.total_availability,
        photos: [],
        main_photo: item.main_photo
      });
    } else {
      setSelectedProduct(item);
    }
    setIsDeleteDialogOpen(true);
  };

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

  const handleImageClick = (article_code: string, variant_code: string) => {
    setSelectedGalleryProduct({ article_code, variant_code });
    setIsPhotoGalleryOpen(true);
  };

  // Funzione per filtrare i prodotti eliminati
  const filterProducts = (products: Product[]) => {
    if (showDeleted) return products;
    return products.filter(p => p.status_name?.toLowerCase() !== 'deleted');
  };

  return (
    <div className="container mx-auto py-10">
      {/* Header principale */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestione Prodotti</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="show-deleted" className="text-sm text-muted-foreground">Mostra Eliminati</Label>
            <Switch
              id="show-deleted"
              checked={showDeleted}
              onCheckedChange={setShowDeleted}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="view-mode" className="text-sm text-muted-foreground">Vista Raggruppata</Label>
            <Switch
              id="view-mode"
              checked={isGroupedView}
              onCheckedChange={handleViewChange}
            />
          </div>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" /> Nuovo Prodotto
          </Button>
        </div>
      </div>

      {/* Barra degli strumenti */}
      <div className="bg-muted/30 p-4 rounded-lg mb-6">
        <div className="flex flex-col gap-4">
          {/* Riga 1: Ricerca e Filtri */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                type="search"
                placeholder="Cerca per codice articolo, variante, brand..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full"
              />
            </div>
            <NestedFilterMenu
              parameters={parameters}
              selectedFilters={filters}
              onFilterChange={handleFiltersChange}
              priceRanges={priceRanges}
              onPriceRangeChange={handlePriceRangesChange}
              availabilityFilter={availabilityFilter}
              onAvailabilityChange={handleAvailabilityFilterChange}
            />
            <Button
              onClick={() => setIsPhotosManagementOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Camera className="w-4 h-4" />
              Gestione Foto
            </Button>
          </div>

          {/* Riga 2: Filtri attivi */}
          <div className="flex flex-wrap gap-2">
            {/* Tag per i filtri degli attributi */}
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
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newFilters = { ...filters };
                      delete newFilters[parameterId];
                      setFilters(newFilters);
                      updateUrlParams(searchTerm, newFilters, availabilityFilter, priceRanges);
                    }}
                  />
                  {remainingCount > 0 && (
                    <span className="absolute z-50 top-full left-0 mt-1 hidden group-hover:block bg-muted text-muted-foreground p-1.5 rounded-md shadow-md max-w-[200px] text-xs">
                      {selectedAttributes.join(", ")}
                    </span>
                  )}
                </Badge>
              );
            })}

            {/* Tag per il filtro disponibilità */}
            {availabilityFilter.type && (
              <Badge
                variant="secondary"
                className="flex items-center gap-2"
              >
                <span>
                  Disponibilità: {
                    availabilityFilter.type === 'available' ? 'Disponibile' :
                    availabilityFilter.type === 'not_available' ? 'Non disponibile' :
                    availabilityFilter.type === 'greater_than' ? `>${availabilityFilter.value}` :
                    availabilityFilter.type === 'less_than' ? `<${availabilityFilter.value}` : ''
                  }
                </span>
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => {
                    setAvailabilityFilter({});
                    updateUrlParams(searchTerm, filters, {}, priceRanges);
                  }}
                />
              </Badge>
            )}

            {/* Tag per i filtri dei prezzi */}
            {priceRanges.wholesale_price.min !== undefined && (
              <Badge
                variant="secondary"
                className="flex items-center gap-2"
              >
                <span>
                  Prezzo Ingrosso: {new Intl.NumberFormat('it-IT', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(priceRanges.wholesale_price.min)} - {new Intl.NumberFormat('it-IT', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(priceRanges.wholesale_price.max || 0)}
                </span>
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => {
                    const newPriceRanges = {
                      ...priceRanges,
                      wholesale_price: { min: undefined, max: undefined }
                    };
                    setPriceRanges(newPriceRanges);
                    updateUrlParams(searchTerm, filters, availabilityFilter, newPriceRanges);
                  }}
                />
              </Badge>
            )}

            {priceRanges.retail_price.min !== undefined && (
              <Badge
                variant="secondary"
                className="flex items-center gap-2"
              >
                <span>
                  Prezzo Vendita: {new Intl.NumberFormat('it-IT', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(priceRanges.retail_price.min)} - {new Intl.NumberFormat('it-IT', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(priceRanges.retail_price.max || 0)}
                </span>
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => {
                    const newPriceRanges = {
                      ...priceRanges,
                      retail_price: { min: undefined, max: undefined }
                    };
                    setPriceRanges(newPriceRanges);
                    updateUrlParams(searchTerm, filters, availabilityFilter, newPriceRanges);
                  }}
                />
              </Badge>
            )}

            {/* Tag per cancellare tutti i filtri */}
            {(() => {
              // Conta il numero totale di filtri attivi
              let activeFiltersCount = 0;
              
              // Conta i filtri degli attributi
              activeFiltersCount += Object.keys(filters).length;
              
              // Conta il filtro disponibilità
              if (availabilityFilter.type) activeFiltersCount++;
              
              // Conta i filtri dei prezzi
              if (priceRanges.wholesale_price.min !== undefined) activeFiltersCount++;
              if (priceRanges.retail_price.min !== undefined) activeFiltersCount++;
              
              return activeFiltersCount >= 2 ? (
                <Badge
                  variant="destructive"
                  className="cursor-pointer flex items-center gap-2"
                  onClick={() => {
                    setFilters({});
                    setAvailabilityFilter({});
                    setPriceRanges({
                      wholesale_price: { min: undefined, max: undefined },
                      retail_price: { min: undefined, max: undefined }
                    });
                    updateUrlParams(searchTerm, {}, {}, {
                      wholesale_price: { min: undefined, max: undefined },
                      retail_price: { min: undefined, max: undefined }
                    });
                  }}
                >
                  <span>Cancella tutti i filtri</span>
                  <X className="h-3 w-3" />
                </Badge>
              ) : null;
            })()}
          </div>
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
                groupProducts(filterProducts(products))
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
                        <ProductImage 
                          url={group.main_photo?.url}
                          alt={`Foto ${group.article_code}`}
                          article_code={group.article_code}
                          variant_code={group.variant_code}
                          onImageClick={handleImageClick}
                        />
                      </TableCell>
                      <TableCell className="font-medium cursor-pointer hover:text-primary transition-colors" 
                        onClick={() => router.push(`/products/${group.article_code}/${group.variant_code}`)}>
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
                            : group.status_name?.toLowerCase() === 'deleted'
                              ? 'bg-red-600 text-white'
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
                                  if ('products' in group) {
                                    if (group.products.length === 1) {
                                      handleEdit(group);
                                    } else {
                                      handleGroupEdit(group);
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
                filterProducts(products)
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
                        <ProductImage 
                          url={product.main_photo?.url}
                          alt={`Foto ${product.article_code}`}
                          article_code={product.article_code}
                          variant_code={product.variant_code}
                          onImageClick={handleImageClick}
                        />
                      </TableCell>
                      <TableCell className="font-medium cursor-pointer hover:text-primary transition-colors"
                        onClick={() => router.push(`/products/${product.article_code}/${product.variant_code}`)}>
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
                            : product.status_name?.toLowerCase() === 'deleted'
                              ? 'bg-red-600 text-white'
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
                              setSelectedGalleryProduct(product);
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
          setSelectedGalleryProduct(null);
          setIsDuplicating(false);
        }}
        product={isDuplicating ? selectedGalleryProduct : null}
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
            <DialogTitle>Conferma Eliminazione</DialogTitle>
            <DialogDescription className="space-y-2">
              {isGroupedView ? (
                <>
                  <p>Stai per eliminare tutti i prodotti di questo gruppo.</p>
                  <p>I prodotti verranno:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Eliminati completamente se non sono mai stati utilizzati</li>
                    <li>Disattivati se sono presenti in carichi</li>
                    <li>Disattivati se hanno disponibilità</li>
                    <li>Disattivati se sono presenti in ordini</li>
                  </ul>
                </>
              ) : (
                <>
                  <p>Stai per eliminare questo prodotto.</p>
                  <p>Il prodotto verrà:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Eliminato completamente se non è mai stato utilizzato</li>
                    <li>Disattivato se è presente in carichi</li>
                    <li>Disattivato se ha disponibilità</li>
                    <li>Disattivato se è presente in ordini</li>
                  </ul>
                </>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                Questa operazione non può essere annullata.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>Elimina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {selectedPhotoProduct && (
        <PhotoManagementDialog
          open={photoDialogOpen}
          onOpenChange={setPhotoDialogOpen}
          articleCode={selectedPhotoProduct.article_code}
          variantCode={selectedPhotoProduct.variant_code}
          onPhotoChange={fetchData}
        />
      )}
      <ProductPhotosManagementDialog
        open={isPhotosManagementOpen}
        onOpenChange={setIsPhotosManagementOpen}
        products={products}
        onPhotoChange={fetchData}
      />
      {selectedGalleryProduct && (
        <PhotoManagementDialog
          open={isPhotoGalleryOpen}
          onOpenChange={(open) => {
            setIsPhotoGalleryOpen(open);
            if (!open) setSelectedGalleryProduct(null);
          }}
          articleCode={selectedGalleryProduct.article_code}
          variantCode={selectedGalleryProduct.variant_code}
          onPhotoChange={fetchData}
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