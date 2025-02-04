'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { SelectWithNullOption } from '@/components/SelectWithNullOption'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Plus, ScanBarcode, Trash2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LoadProductsTable } from '@/components/LoadProductsTable'
import { AddProductsModal } from "@/components/AddProductsModal"

interface Load {
  id: number
  code: string
  supply_id: number | null
  status_id: number
  warehouse_id: number
}

interface Supply {
  id: number
  name: string
}

interface Status {
  id: number
  name: string
}

interface Warehouse {
  id: number
  name: string
}

interface BaseProduct {
  id: number
  article_code: string
  variant_code: string
  wholesale_price: number
  retail_price: number
  availability?: {
    product_id: number
    warehouse_id: number
    quantity: number
  }[]
}

type ModalProductAttributes = {
  parameter_id: number
  parameter_name: string
  attribute_id: number
  attribute_name: string
}

type ProductAttributes = ModalProductAttributes & {
  parameter_description: string
  parameter_is_required: boolean
  parameter_is_expandable: boolean
}

interface ModalProduct extends Omit<BaseProduct, 'availability' | 'attributes'> {
  size_id: number
  size_name: string
  brand_id: number
  brand_name: string
  size_group_id: number
  size_group_name: string
  status_id: number
  status_name: string
  created_at: string
  updated_at: string
  mainPhotoUrl?: string
  availability?: {
    warehouse_id: number
    quantity: number
  }[]
  attributes: ModalProductAttributes[]
}

interface Product extends Omit<BaseProduct, 'attributes'> {
  size_id: number
  size_name: string
  brand_id: number
  brand_name: string
  size_group_id: number
  size_group_name: string
  status_id: number
  status_name: string
  created_at: string
  updated_at: string
  mainPhotoUrl?: string
  attributes: ProductAttributes[]
}

interface LoadProduct extends Omit<BaseProduct, 'attributes'> {
  quantity: number
  cost: number
  size?: { name: string }
  size_name: string
  load_product_id?: number
  status_id: number
  size_id: number
  size_group_id: number
  brand_id: number
  brand_name: string
  size_group_name: string
  status_name: string
  created_at: string
  updated_at: string
  attributes: ProductAttributes[]
}

interface LoadProductData {
  id: number;
  product_id: number;
}

interface GroupedProduct {
  article_code: string
  variant_code: string
  mainPhotoUrl?: string
  sizes: Product[]
  isExpanded?: boolean
}

interface Parameter {
  id: number
  name: string
  attributes: Array<{
    id: number
    name: string
  }>
}

interface PriceRange {
  min: number
  max: number
}

interface PriceRanges {
  wholesale_price: PriceRange
  retail_price: PriceRange
}

interface AvailabilityItem {
  warehouse_id: number;
  quantity: number;
  product_id: number;
}

// Aggiungi la funzione per recuperare le foto
const fetchMainPhoto = async (article_code: string, variant_code: string) => {
  try {
    const response = await fetch(`${process.env.API_URL}/api/products/photos/${article_code}/${variant_code}/main`);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.url || null;
  } catch (error) {
    console.error('Error fetching main photo:', error);
    return null;
  }
};

export default function LoadDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const id = params.id as string

  // Costanti per le chiavi del localStorage
  const LOAD_CACHE_KEY = `load-cache-${id}`;
  const ORIGINAL_DATA_KEY = `load-original-${id}`;

  // Funzione per salvare lo stato nel localStorage
  const saveToCache = (products: LoadProduct[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOAD_CACHE_KEY, JSON.stringify(products));
    }
  };

  // Funzione per salvare i dati originali nel localStorage
  const saveOriginalData = (products: LoadProduct[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ORIGINAL_DATA_KEY, JSON.stringify(products));
    }
  };

  // Funzione per caricare lo stato dal localStorage
  const loadFromCache = (): LoadProduct[] | null => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(LOAD_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  };

  // Funzione per caricare i dati originali dal localStorage
  const loadOriginalData = (): LoadProduct[] | null => {
    if (typeof window !== 'undefined') {
      const original = localStorage.getItem(ORIGINAL_DATA_KEY);
      return original ? JSON.parse(original) : null;
    }
    return null;
  };

  // Funzione per cancellare la cache
  const clearCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOAD_CACHE_KEY);
    }
  };

  const [load, setLoad] = useState<Load | null>(null)
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loadProducts, setLoadProducts] = useState<LoadProduct[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isChanged, setIsChanged] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalSearchTerm, setModalSearchTerm] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [removedProductIds, setRemovedProductIds] = useState<number[]>([])
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedAction, setSelectedAction] = useState<'confirm' | 'revoke' | 'delete' | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const tableRef = useRef<HTMLTableSectionElement>(null)
  const [flashingRows, setFlashingRows] = useState<Set<number>>(new Set())
  const [flashingQuantities, setFlashingQuantities] = useState<Set<number>>(new Set())

  const [photoLoadingStates, setPhotoLoadingStates] = useState<Record<string, boolean>>({});

  const [costInputs, setCostInputs] = useState<Record<string, string>>({});

  const getCostInputId = (product: LoadProduct) => `${product.id}-${product.size_name}`;

  // Aggiungo uno state per tenere traccia dei dati originali dal DB
  const [originalProducts, setOriginalProducts] = useState<LoadProduct[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Stato per i filtri e i prodotti della modale
  const [modalState, setModalState] = useState({
    products: [] as Product[],
    filteredProducts: [] as Product[],
    selectedFilters: {} as Record<string, number[]>,
    brands: [] as Array<{ id: number; name: string }>,
    sizes: [] as Array<{ id: number; name: string }>,
    parameters: [] as Parameter[],
    isLoading: false,
    priceRanges: {
      wholesale_price: { min: 0, max: 1000 },
      retail_price: { min: 0, max: 1000 }
    } as PriceRanges,
    availabilityFilter: {} as { type?: 'available' | 'not_available' | 'greater_than' | 'less_than', value?: number }
  })

  // Aggiungi un nuovo stato per tracciare l'azione in caricamento
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Aggiungi questi stati per gestire il dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLoadDetails()
      fetchSupplies()
      fetchStatuses()
      fetchWarehouses()
      fetchLoadProducts()
      fetchAllProducts()
    }
  }, [])

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [loadProducts])

  const fetchLoadDetails = async () => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/loads/${id}`)
      if (!response.ok) throw new Error('Failed to fetch load details')
      const data = await response.json()
      setLoad(data)
    } catch (error) {
      console.error('Error fetching load details:', error)
      toast({
        title: "Error",
        description: "Failed to fetch load details. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchSupplies = async () => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/supplies/`)
      if (!response.ok) throw new Error('Failed to fetch supplies')
      const data = await response.json()
      setSupplies(data)
    } catch (error) {
      console.error('Error fetching supplies:', error)
      toast({
        title: "Error",
        description: "Failed to fetch supplies. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchStatuses = async () => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/statuses/`)
      if (!response.ok) throw new Error('Failed to fetch statuses')
      const data = await response.json()
      setStatuses(data)
    } catch (error) {
      console.error('Error fetching statuses:', error)
      toast({
        title: "Error",
        description: "Failed to fetch statuses. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/warehouses/`)
      if (!response.ok) throw new Error('Failed to fetch warehouses')
      const data = await response.json()
      setWarehouses(data)
    } catch (error) {
      console.error('Error fetching warehouses:', error)
      toast({
        title: "Error",
        description: "Failed to fetch warehouses. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchLoadProducts = async () => {
    try {
      // Controlla se ci sono dati originali salvati
      const originalData = loadOriginalData();
      
      // Controlla se ci sono modifiche in cache
      const cached = loadFromCache();

      if (originalData && cached) {
        // Se abbiamo sia i dati originali che le modifiche, usa le modifiche
        setLoadProducts(cached);
        setOriginalProducts(originalData);
        setIsChanged(true);
        return;
      }

      // Se non ci sono dati salvati, carica dal server
      const response = await fetch(`${process.env.API_URL}/api/load-products/load/${id}`)
      if (!response.ok) throw new Error('Failed to fetch load products')
      const data = await response.json()
      
      const productsWithDetails = await Promise.all(data.map(async (loadProduct: LoadProductData) => {
        const productResponse = await fetch(`${process.env.API_URL}/api/products/${loadProduct.product_id}`)
        if (!productResponse.ok) throw new Error(`Failed to fetch product details for product ${loadProduct.product_id}`)
        const productData = await productResponse.json()
        
        const sizeResponse = await fetch(`${process.env.API_URL}/api/sizes/${productData.size_id}`)
        if (!sizeResponse.ok) throw new Error(`Failed to fetch size name for size ${productData.size_id}`)
        const sizeData = await sizeResponse.json()
        
        return {
          ...loadProduct,
          ...productData,
          load_product_id: loadProduct.id,
          size: sizeData.size_name
        }
      }))
      
      setLoadProducts(productsWithDetails)
      setOriginalProducts(productsWithDetails)
      
      // Salva i dati originali nel localStorage
      saveOriginalData(productsWithDetails);
      
      setIsChanged(false)
    } catch (error) {
      console.error('Error fetching load products:', error)
      toast({
        title: "Error",
        description: "Failed to fetch load products. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchAllProducts = async () => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/products/`)
      if (!response.ok) throw new Error('Failed to fetch products')
      const data = await response.json()
      
      const productsWithDetails = data.products.map((product: Product) => ({
        ...product,
        size: product.size_name || 'N/A'
      }))

      setAllProducts(productsWithDetails)
    } catch (error) {
      console.error('Error fetching products:', error)
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il caricamento dei prodotti",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchAllProducts()
  }, [])

  const handleLoadChange = (field: keyof Load, value: string | number | null) => {
    if (load) {
      setLoad({ ...load, [field]: value })
      setIsChanged(true)
    }
  }

  const findParentProduct = (product: LoadProduct) => {
    return loadProducts.find(p => 
      p.article_code === product.article_code && 
      p.variant_code === product.variant_code && 
      p.id !== product.id
    );
  };

  const scrollToRow = (rowId: string) => {
    setTimeout(() => {
      const row = document.querySelector(`[data-row-id="${rowId}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Modifica handleProductChange per salvare in cache
  const handleProductChange = (product: LoadProduct, field: keyof LoadProduct, value: string | number) => {
    const index = loadProducts.findIndex(p => p.id === product.id);
    if (index === -1) return;
    
    const newProducts = [...loadProducts];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setLoadProducts(newProducts);
    setIsChanged(true);
    saveToCache(newProducts);
  };

  // Funzione per rimuovere un prodotto e tutte le sue varianti
  const removeProductAndVariants = (product: LoadProduct) => {
    // Trova tutte le varianti dello stesso articolo
    const productsToRemove = loadProducts.filter(
      p => p.article_code === product.article_code && p.variant_code === product.variant_code
    );

    // Aggiungi gli ID alla lista dei prodotti da eliminare dal database
    productsToRemove.forEach(p => {
      if (p.load_product_id) {
        setRemovedProductIds(prev => [...prev, p.load_product_id!]);
      }
    });

    // Rimuovi i prodotti dall'array loadProducts mantenendo l'ordine
    const updatedProducts = loadProducts.filter(p => 
      !productsToRemove.some(rp => rp.id === p.id)
    );

    return { updatedProducts, productsToRemove };
  };

  // Funzione per rimuovere una singola variante
  const removeSingleVariant = (product: LoadProduct) => {
    const productsToRemove = loadProducts.filter(p => p.id === product.id)
    
    // Controlla se questa è l'ultima variante
    const remainingVariants = loadProducts.filter(
      p => p.article_code === product.article_code && 
          p.variant_code === product.variant_code && 
          p.id !== product.id
    );

    // Se è l'ultima variante, rimuovi anche il prodotto principale
    if (remainingVariants.length === 0) {
      const mainProduct = loadProducts.find(
        p => p.article_code === product.article_code && 
            p.variant_code === product.variant_code &&
            p.id !== product.id
      );
      if (mainProduct) {
        productsToRemove.push(mainProduct);
      }
    }

    // Aggiungi gli ID alla lista dei prodotti da eliminare dal database
    productsToRemove.forEach(p => {
      if (p.load_product_id) {
        setRemovedProductIds(prev => [...prev, p.load_product_id!]);
      }
    });

    // Rimuovi i prodotti dall'array loadProducts mantenendo l'ordine
    const updatedProducts = loadProducts.filter(p => 
      !productsToRemove.some(rp => rp.id === p.id)
    );

    return { updatedProducts, productsToRemove };
  };

  // Funzione principale per gestire la rimozione dei prodotti
  const handleRemoveProduct = (product: LoadProduct, isMainRow: boolean = false) => {
    if (isLoadDisabled) {
      toast({
        title: "Operazione non permessa",
        description: "Non puoi modificare un carico confermato o cancellato",
        variant: "destructive",
      });
      return;
    }

    const { updatedProducts, productsToRemove } = isMainRow 
      ? removeProductAndVariants(product)
      : removeSingleVariant(product);

    setLoadProducts(updatedProducts);
    saveToCache(updatedProducts);

    const updatedOriginals = originalProducts.filter(p => 
      !productsToRemove.some(rp => rp.id === p.id)
    );
    setOriginalProducts(updatedOriginals);
    saveOriginalData(updatedOriginals);

    setIsChanged(true);
  };

  // Gestione della quantità che arriva a 0
  const handleQuantityChange = (index: number, delta: number) => {
    if (isLoadDisabled) return;
    
    const newProducts = [...loadProducts];
    const product = newProducts[index];
    const newQuantity = Math.max(0, (product.quantity || 0) + delta);
    
    // Se la quantità arriva a 0, rimuovi solo questa variante
    if (newQuantity === 0) {
      // Rimuovi solo questa variante
      handleRemoveProduct(product, false);
      return;
    }

    // Altrimenti aggiorna la quantità
    newProducts[index] = { ...product, quantity: newQuantity };
    setLoadProducts(newProducts);
    setIsChanged(true);
    saveToCache(newProducts);
  };

  // Modifica handleAddProduct per gestire diversamente l'aggiunta di una singola taglia
  const handleAddProduct = (products: Product[]) => {
    if (isLoadDisabled) {
      toast({
        title: "Operazione non permessa",
        description: "Non puoi modificare un carico confermato o cancellato",
        variant: "destructive",
      });
      return;
    }
    
    setIsProductDialogOpen(false);
    
    // Se è una singola taglia, la gestiamo diversamente
    if (products.length === 1) {
      const product = products[0];
      const existingProduct = loadProducts.find(
        p => p.id === product.id && p.size_name === product.size_name
      );

      if (existingProduct) {
        // Se il prodotto esiste già, fallo lampeggiare
        handleFlashRow(existingProduct.id);
        scrollToRow(`variant-${existingProduct.id}`);
        return;
      }

      // Aggiungi la singola taglia come prodotto indipendente
      const newLoadProduct = convertToLoadProduct(product);
      setLoadProducts(prevProducts => {
        const newState = [newLoadProduct, ...prevProducts];
        handleFlashRow(newLoadProduct.id);
        scrollToRow(`variant-${newLoadProduct.id}`);
        saveToCache(newState);
        return newState;
      });
      setIsChanged(true);
      return;
    }

    // Gestione per selezione multipla di taglie
    const existingProducts = loadProducts.filter(
      p => p.article_code === products[0].article_code && p.variant_code === products[0].variant_code
    );

    if (existingProducts.length === products.length && 
        products.every(p => existingProducts.some(ep => ep.size_name === p.size_name))) {
      existingProducts.forEach(product => {
        handleFlashRow(product.id);
        scrollToRow(`variant-${product.id}`);
        const parentProduct = findParentProduct(product);
        if (parentProduct) {
          scrollToRow(`main-${parentProduct.id}`);
        }
      });
      return;
    }

    const newProducts = products.filter(p => 
      !existingProducts.some(ep => ep.size_name === p.size_name)
    );

    if (newProducts.length > 0) {
      const productsToAdd = newProducts.map(convertToLoadProduct);
      setLoadProducts(prevProducts => {
        const newState = [...productsToAdd, ...prevProducts];
        productsToAdd.forEach(p => {
          handleFlashRow(p.id);
          scrollToRow(`variant-${p.id}`);
        });
        if (productsToAdd.length > 0) {
          scrollToRow(`main-${productsToAdd[0].id}`);
        }
        saveToCache(newState);
        return newState;
      });
      setIsChanged(true);
    }
  };

  // Funzione per far lampeggiare una riga
  const handleFlashRow = (productId: number) => {
    setFlashingRows(prev => {
      const newSet = new Set<number>();
      prev.forEach(id => newSet.add(id));
      newSet.add(productId);
      return newSet;
    });
    setTimeout(() => {
      setFlashingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }, 2000);
  };

  // Modifica handleSave per gestire correttamente l'eliminazione
  const handleSave = async () => {
    try {
      if (!load) throw new Error('No load data to save')

      // Prima salviamo i prodotti rimossi
      for (const removedId of removedProductIds) {
        const deleteResponse = await fetch(`${process.env.API_URL}/api/load-products/${removedId}`, {
          method: 'DELETE'
        })
        if (!deleteResponse.ok) {
          throw new Error(`Failed to delete product with ID ${removedId}`)
        }
      }

      // Aggiorniamo/creiamo i prodotti rimanenti
      for (const product of loadProducts) {
        const productData = {
          load_id: parseInt(id),
          product_id: product.id,
          cost: parseFloat(product.cost.toString()),
          quantity: product.quantity
        }

        let response;
        if (product.load_product_id) {
          response = await fetch(`${process.env.API_URL}/api/load-products/${product.load_product_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
          })
        } else {
          response = await fetch(`${process.env.API_URL}/api/load-products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
          })

          if (response.ok) {
            const newProduct = await response.json();
            product.load_product_id = newProduct.id;
          }
        }

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || `Failed to update/create product ${product.id}`)
        }
      }

      // Aggiorniamo lo stato locale
      setIsChanged(false)
      setRemovedProductIds([])
      
      // Rimuoviamo la cache
      clearCache()
      localStorage.removeItem(ORIGINAL_DATA_KEY)

      // Usiamo i prodotti attuali come nuovi dati originali
      setOriginalProducts([...loadProducts])

      toast({
        title: "Successo",
        description: "Modifiche salvate con successo",
      })

      // Aggiorniamo i dettagli del carico
      await fetchLoadDetails()
    } catch (error) {
      console.error('Error saving changes:', error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante il salvataggio delle modifiche",
        variant: "destructive",
      })
    }
  }

  const handleConfirmLoad = async () => {
    if (!load || isConfirming) return

    try {
      // Prima salviamo le modifiche
      await handleSave()

      setIsConfirming(true)
      const response = await fetch(`${process.env.API_URL}/api/loads/${id}/confirm`, {
        method: 'PUT',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to confirm load')
      }

      toast({
        title: "Successo",
        description: "Carico confermato con successo",
      })

      // Aggiorniamo i dettagli del carico per ottenere il nuovo stato
      await fetchLoadDetails()
      
      // Rimuoviamo la cache e i dati originali
      clearCache()
      localStorage.removeItem(ORIGINAL_DATA_KEY)
    } catch (error) {
      console.error(error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante la conferma del carico",
        variant: "destructive",
      })
    } finally {
      setIsConfirming(false)
    }
  }

  const toggleExpansion = (groupKey: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey)
      } else {
        newSet.add(groupKey)
      }
      return newSet
    })
  }

  const groupProducts = (products: Product[]): GroupedProduct[] => {
    console.log('Grouping products:', products.length);
    
    const groupedMap = new Map<string, GroupedProduct>();
    
    products.forEach(product => {
      const key = `${product.article_code}-${product.variant_code}`;
      console.log('Processing product:', {
        key,
        article: product.article_code,
        variant: product.variant_code,
        size: product.size_name
      });
      
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          article_code: product.article_code,
          variant_code: product.variant_code,
          mainPhotoUrl: product.mainPhotoUrl,
          sizes: []
        });
      }
      
      const group = groupedMap.get(key);
      if (group) {
        group.sizes.push(product);
      }
    });
    
    const result = Array.from(groupedMap.values());
    console.log('Grouped results:', result.length);
    return result;
  };

  const handleSearch = async (term: string) => {
    console.log('🔍 Ricerca barcode iniziata:', term);
    setSearchTerm(term);
    if (term.trim() === '') return;

    try {
      console.log('📡 Chiamata API:', `${process.env.API_URL}/api/barcode/barcodes/${term}/product`);
      const response = await fetch(`${process.env.API_URL}/api/barcode/barcodes/${term}/product`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('✨ Status risposta:', response.status);

      if (response.ok) {
        const product = await response.json();
        console.log('✅ Prodotto trovato:', {
          id: product.id,
          article_code: product.article_code,
          variant_code: product.variant_code,
          size: product.size_name,
          barcode: term
        });

        const existingProductIndex = loadProducts.findIndex(
          p => p.id === product.id && p.size_name === product.size_name
        );

        let updatedProducts = [...loadProducts];

        if (existingProductIndex !== -1) {
          updatedProducts[existingProductIndex].quantity += 1;
          setLoadProducts(updatedProducts);
          handleFlashRow(product.id);
          scrollToRow(`variant-${product.id}`);
          const parentProduct = findParentProduct(updatedProducts[existingProductIndex]);
          if (parentProduct) {
            scrollToRow(`main-${parentProduct.id}`);
          }
        } else {
          const newLoadProduct: LoadProduct = {
            ...product,
            cost: product.wholesale_price || 0,
            quantity: 1,
            size_name: product.size_name
          };

          const lastVariantIndex = loadProducts.findLastIndex(
            p => p.article_code === product.article_code && p.variant_code === product.variant_code
          );

          if (lastVariantIndex !== -1) {
            updatedProducts.splice(lastVariantIndex + 1, 0, newLoadProduct);
            setLoadProducts(updatedProducts);
            handleFlashRow(newLoadProduct.id);
            scrollToRow(`variant-${newLoadProduct.id}`);
            const existingProduct = updatedProducts[lastVariantIndex];
            scrollToRow(`main-${existingProduct.id}`);
          } else {
            updatedProducts = [newLoadProduct, ...loadProducts];
            setLoadProducts(updatedProducts);
            handleFlashRow(newLoadProduct.id);
            scrollToRow(`variant-${newLoadProduct.id}`);
            scrollToRow(`main-${newLoadProduct.id}`);
          }
        }

        // Salva nel localStorage
        saveToCache(updatedProducts);
        setIsChanged(true);
        
        setSearchTerm('');
      } else if (response.status === 404) {
        console.log('❌ Prodotto non trovato per il barcode:', term);
        toast({
          title: "Prodotto non trovato",
          description: "Nessun prodotto trovato per questo codice a barre.",
          variant: "destructive",
        });
      } else {
        console.log('⚠️ Errore risposta API:', response.status);
        throw new Error('Failed to fetch product');
      }
    } catch (error) {
      console.error('🚨 Errore durante la ricerca:', error);
      toast({
        title: "Errore",
        description: "Errore durante la ricerca del prodotto. Riprova.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedAction || isActionLoading) return;

    try {
      setIsActionLoading(true);

      switch (selectedAction) {
        case 'confirm':
          await handleConfirmLoad();
          break;
        case 'revoke':
          await handleRevokeLoad();
          break;
        case 'delete':
          await handleDeleteLoad();
          break;
      }
    } finally {
      setIsActionLoading(false);
      setSelectedAction(null);
      setIsDialogOpen(false);
    }
  };

  const handleRevokeLoad = async () => {
    if (!load || isRevoking) return

    try {
      setIsRevoking(true)
      const response = await fetch(`${process.env.API_URL}/api/loads/${id}/revoke`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to revoke load')
      }

      toast({
        title: "Successo",
        description: "Carico revocato con successo",
      })

      // Refresh load details to get updated status
      await fetchLoadDetails()
    } catch (error) {
      console.error(error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante la revoca del carico",
        variant: "destructive",
      })
    } finally {
      setIsRevoking(false)
      setIsDialogOpen(false)
      setSelectedAction(null)
    }
  }

  const handleDeleteLoad = async () => {
    if (!load || isDeleting) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`${process.env.API_URL}/api/loads/${id}/delete`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete load');
      }

      // Pulizia del localStorage e dello stato
      clearCache();
      localStorage.removeItem(ORIGINAL_DATA_KEY);
      setLoadProducts([]);
      setOriginalProducts([]);
      setIsChanged(false);
      setRemovedProductIds([]);

      toast({
        title: "Successo",
        description: "Carico cancellato con successo",
      });

      // Aggiorniamo i dettagli del carico
      await fetchLoadDetails();
    } catch (error) {
      console.error(error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante la cancellazione del carico",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const getStatusBadgeStyle = (statusId: number) => {
    switch (statusId) {
      case 9: // bozza
        return "bg-gray-100 text-gray-800 border-gray-200"
      case 10: // caricato
        return "bg-green-100 text-green-800 border-green-200"
      case 11: // revocato
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case 12: // cancellato
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const summary = useMemo(() => {
    const totalCost = loadProducts.reduce((sum, product) => sum + product.cost * product.quantity, 0)
    const totalItems = loadProducts.reduce((sum, product) => sum + product.quantity, 0)
    const uniqueModels = new Set(loadProducts.map(product => product.article_code)).size
    const uniqueCombinations = new Set(loadProducts.map(product => `${product.article_code}-${product.variant_code}`)).size
    return { totalCost, totalItems, uniqueModels, uniqueCombinations }
  }, [loadProducts])

  // Controlla se il carico è confermato o cancellato
  const isLoadConfirmed = load?.status_id === 10;
  const isLoadCancelled = load?.status_id === 12;
  const isLoadRevoked = load?.status_id === 11;
  const isLoadDisabled = isLoadConfirmed || isLoadCancelled;

  // Funzione per caricare i dati della modale
  const loadModalData = useCallback(async () => {
    setModalState(prev => ({ ...prev, isLoading: true }))
    try {
      if (!load) return;

      const [
        productsResponse,
        brandsData,
        sizesData,
        availabilityData
      ] = await Promise.all([
        fetch(`${process.env.API_URL}/api/products?${new URLSearchParams({
          search: modalSearchTerm,
          filters: JSON.stringify(modalState.selectedFilters)
        }).toString()}`).then(res => res.json()),
        fetch(`${process.env.API_URL}/api/brands`).then(res => res.json()),
        fetch(`${process.env.API_URL}/api/sizes`).then(res => res.json()),
        fetch(`${process.env.API_URL}/api/product-availability/warehouse/${load.warehouse_id}`).then(res => res.json())
      ]);

      // Mappa delle disponibilità per prodotto
      const availabilityMap = (availabilityData as AvailabilityItem[]).reduce((acc: {[key: number]: number}, item: AvailabilityItem) => {
        acc[item.product_id] = (acc[item.product_id] || 0) + item.quantity;
        return acc;
      }, {});

      // Assicurati che i prodotti abbiano tutti i campi necessari
      const productData = Array.isArray(productsResponse.products) ? productsResponse.products : [];
      const productsWithDetails = await Promise.all(productData.map(async (product: Product) => {
        const mainPhoto = await fetchMainPhoto(product.article_code, product.variant_code);
        return {
          ...product,
          availability: availabilityData.filter((a: AvailabilityItem) => a.product_id === product.id),
          main_photo: mainPhoto
        };
      }));

      // Converti i parametri nel formato corretto
      const validParameters: Parameter[] = [
        {
          id: -1,
          name: "Brand",
          attributes: brandsData.map((brand: any) => ({
            id: brand.id,
            name: brand.name
          }))
        },
        {
          id: -2,
          name: "Taglie",
          attributes: sizesData.map((size: any) => ({
            id: size.id,
            name: size.name
          }))
        },
        ...(productsResponse.parameters || []).map((param: any) => ({
          id: param.id,
          name: param.name,
          attributes: (param.attributes || []).map((attr: any) => ({
            id: attr.id,
            name: attr.name
          }))
        }))
      ];

      setModalState(prev => ({
        ...prev,
        brands: brandsData,
        sizes: sizesData,
        parameters: validParameters,
        products: productsWithDetails,
        filteredProducts: productsWithDetails,
        isLoading: false
      }));

    } catch (error) {
      console.error('Error loading modal data:', error)
      toast({
        title: "Errore",
        description: "Errore durante il caricamento dei dati",
        variant: "destructive",
      })
      setModalState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  // Carica i dati quando si apre la modale
  useEffect(() => {
    if (isProductDialogOpen) {
      loadModalData()
    }
  }, [isProductDialogOpen, loadModalData])

  // Funzione per applicare i filtri
  const applyFilters = useCallback((
    filters: Record<string, number[]>,
    searchValue: string = ''
  ) => {
    if (!modalState.products) return;

    console.log('Applying filters:', { filters, searchValue });

    const filtered = modalState.products.filter(product => {
      // Filtro disponibilità
      if (filters.availability?.length > 0) {
        const totalAvailability = (product.availability || []).reduce((sum, a) => sum + (a.quantity || 0), 0);
        if (totalAvailability <= 0) return false;
      }

      // Filtro brand (-1)
      if (filters['-1']?.length > 0) {
        if (!filters['-1'].includes(product.brand_id)) return false;
      }

      // Filtro taglia (-2)
      if (filters['-2']?.length > 0) {
        if (!filters['-2'].includes(product.size_id)) return false;
      }

      // Filtri parametri dinamici
      for (const [paramId, selectedAttrs] of Object.entries(filters)) {
        if (['-1', '-2', 'availability'].includes(paramId)) continue;
        if (selectedAttrs.length === 0) continue;

        const hasMatchingAttribute = product.attributes?.some(attr => 
          attr.parameter_id === parseInt(paramId) && 
          selectedAttrs.includes(attr.attribute_id)
        );

        if (!hasMatchingAttribute) return false;
      }

      // Filtro ricerca
      if (searchValue) {
        const searchLower = searchValue.toLowerCase();
        const matches = 
          product.article_code?.toLowerCase().includes(searchLower) ||
          product.variant_code?.toLowerCase().includes(searchLower) ||
          product.brand_name?.toLowerCase().includes(searchLower);
        
        if (!matches) return false;
      }

      return true;
    });

    setModalState(prev => ({
      ...prev,
      filteredProducts: filtered,
      selectedFilters: filters
    }));
  }, [modalState.products]);

  // Handler per il cambio dei filtri
  const handleFilterChange = useCallback((newFilters: Record<string, number[]>) => {
    console.log('Filter change:', newFilters);
    // Manteniamo il filtro di disponibilità quando cambiamo altri filtri
    const updatedFilters = {
      ...newFilters,
      availability: modalState.selectedFilters.availability || []
    };
    applyFilters(updatedFilters, searchTerm);
  }, [applyFilters, searchTerm, modalState.selectedFilters.availability]);

  // Handler per il cambio del filtro disponibilità
  const handleAvailabilityChange = useCallback((checked: boolean) => {
    const newFilters = {
      ...modalState.selectedFilters,
      availability: checked ? [1] : []
    };
    applyFilters(newFilters, searchTerm);
  }, [applyFilters, searchTerm, modalState.selectedFilters]);

  // Handler per il cambio della ricerca nella modale
  const handleModalSearch = useCallback((value: string) => {
    setModalSearchTerm(value);
    applyFilters(modalState.selectedFilters, value);
  }, [applyFilters, modalState.selectedFilters]);

  const handlePhotoLoad = (productKey: string) => {
    setPhotoLoadingStates(prev => ({
      ...prev,
      [productKey]: false
    }));
  };

  const handlePhotoError = (productKey: string) => {
    setPhotoLoadingStates(prev => ({
      ...prev,
      [productKey]: false
    }));
  };

  const handleCostChange = (product: LoadProduct, value: string) => {
    // Permette solo numeri, virgola e backspace
    if (!/^[\d,]*$/.test(value)) return;
    
    setCostInputs(prev => ({
      ...prev,
      [getCostInputId(product)]: value
    }));
  };

  const formatCost = (cost: number | string) => {
    const numericCost = typeof cost === 'string' ? parseFloat(cost) : cost;
    return isNaN(numericCost) ? '0,00' : numericCost.toFixed(2).replace('.', ',');
  };

  const handleCostBlur = (index: number, product: LoadProduct, value: string) => {
    // Converte la virgola in punto e valida il numero
    const numericValue = parseFloat(value.replace(',', '.'));
    
    // Se non è un numero valido, ripristina il valore precedente
    if (isNaN(numericValue)) {
      setCostInputs(prev => ({
        ...prev,
        [getCostInputId(product)]: formatCost(product.cost)
      }));
      return;
    }

    // Aggiorna il prodotto con il nuovo costo
    handleProductChange(product, 'cost', numericValue);
    
    // Aggiorna l'input con il valore formattato a 2 decimali
    setCostInputs(prev => ({
      ...prev,
      [getCostInputId(product)]: formatCost(numericValue)
    }));
  };

  const sortSizes = (sizes: string[]) => {
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'];
    const numericSizes = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48'];
    
    return sizes.sort((a, b) => {
      const aUpper = a.toUpperCase();
      const bUpper = b.toUpperCase();
      
      // Se entrambe sono taglie numeriche
      if (!isNaN(Number(a)) && !isNaN(Number(b))) {
        return Number(a) - Number(b);
      }
      
      // Se entrambe sono taglie standard
      const aIndex = sizeOrder.indexOf(aUpper);
      const bIndex = sizeOrder.indexOf(bUpper);
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // Se una è numerica e l'altra no
      if (!isNaN(Number(a))) return -1;
      if (!isNaN(Number(b))) return 1;
      
      // Ordine alfabetico per default
      return aUpper.localeCompare(bUpper);
    });
  };

  const toggleAllRows = () => {
    if (expandedRows.size > 0) {
      setExpandedRows(new Set());
    } else {
      const allKeys = loadProducts
        .filter(p => loadProducts.filter(lp => 
          lp.article_code === p.article_code && 
          lp.variant_code === p.variant_code
        ).length > 1)
        .map(p => `${p.article_code}-${p.variant_code}`);
      setExpandedRows(new Set(allKeys));
    }
  };

  const handleCancel = () => {
    const cached = loadFromCache();
    if (cached) {
      setIsDialogOpen(true);
    }
  };

  const handleConfirmCancel = () => {
    clearCache();
    fetchLoadProducts();
    setIsChanged(false);
    setIsDialogOpen(false);
  };

  // Carica i dati dalla cache all'avvio
  useEffect(() => {
    const cached = loadFromCache();
    if (cached) {
      setLoadProducts(cached);
      setIsChanged(true);
    }
  }, [])

  // Funzioni di utilità per la gestione delle quantità
  const getQuantityStyle = (product: LoadProduct, variants?: LoadProduct[]): string => {
    // Se abbiamo variants, è una riga madre
    if (variants) {
      const totalQuantity = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
      const originalVariants = variants.map(v => originalProducts.find(op => op.id === v.id));
      const originalTotalQuantity = originalVariants.reduce((sum, v) => sum + (v?.quantity || 0), 0);

      if (totalQuantity > originalTotalQuantity) {
        return "font-bold text-green-600"; // Quantità totale aumentata
      } else if (totalQuantity < originalTotalQuantity) {
        return "font-bold text-yellow-600"; // Quantità totale diminuita
      }
      return ""; // Nessuna modifica
    }

    // Logica per le righe normali
    const originalProduct = originalProducts.find(p => p.id === product.id);
    if (!originalProduct) return "font-bold text-green-600"; // Nuovo prodotto
    
    if (product.quantity > originalProduct.quantity) {
      return "font-bold text-green-600"; // Quantità aumentata (verde)
    } else if (product.quantity < originalProduct.quantity) {
      return "font-bold text-yellow-600"; // Quantità diminuita (giallo)
    }
    return ""; // Nessuna modifica
  };

  const isQuantityModified = (product: LoadProduct): boolean => {
    const originalProduct = originalProducts.find(p => p.id === product.id);
    return originalProduct ? originalProduct.quantity !== product.quantity : true;
  };

  const isNewProduct = (product: LoadProduct): boolean => {
    return !originalProducts.some(p => p.id === product.id);
  };

  // Funzione di utilità per convertire da Product a LoadProduct
  const convertToLoadProduct = (product: Product): LoadProduct => ({
    ...product,
    cost: product.wholesale_price,
    quantity: 1,
    size_name: product.size_name,
    attributes: product.attributes.map(attr => ({
      ...attr,
      parameter_description: '',
      parameter_is_required: false,
      parameter_is_expandable: false
    }))
  });

  // Aggiungi questa funzione per gestire l'annullamento
  const handleCancelChanges = () => {
    setShowConfirmDialog(true);
  };

  // Funzione per confermare l'annullamento
  const handleConfirmCancelChanges = () => {
    // Ripristina i prodotti originali dal database
    setLoadProducts(originalProducts);
    
    // Pulisci la cache locale
    localStorage.removeItem(`load-${id}-products`);
    
    // Resetta lo stato di modifica
    setIsChanged(false);
    
    // Chiudi il dialog
    setShowConfirmDialog(false);
    
    // Mostra un toast di conferma
    toast({
      title: "Modifiche annullate",
      description: "Tutte le modifiche sono state annullate con successo",
    });
  };

  if (!load) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-4">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codice</label>
            <Input
              value={load.code}
              disabled={true}
              onChange={(e) => handleLoadChange('code', e.target.value)}
                className="bg-white h-8"
            />
          </div>
            <div>
          <SelectWithNullOption
            options={supplies.map(supply => ({ value: supply.id.toString(), label: supply.name }))}
            value={load.supply_id?.toString() ?? null}
            onValueChange={(value: string | number | null) => handleLoadChange('supply_id', value ? (typeof value === 'string' ? parseInt(value) : value) : null)}
            placeholder="Seleziona fornitura"
            label="Fornitura"
            nullOptionLabel="Nessuna fornitura"
          />
            </div>
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
              <div className="h-8 flex items-center">
                <span className={cn(
                  "inline-flex items-center rounded-md border px-2 py-1 text-sm font-medium",
                  getStatusBadgeStyle(load?.status_id || 0)
                )}>
                {statuses.find(s => s.id === load?.status_id)?.name || ''}
              </span>
            </div>
          </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Magazzino</label>
              <Input
                value={warehouses.find(w => w.id === load.warehouse_id)?.name || ''}
                disabled={true}
                className="bg-white h-8"
              />
            </div>
        </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mt-4">
       
            <Card className="bg-white border">
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-500">Numero Modelli</h3>
                  <p className="text-lg font-bold text-gray-900">{summary.uniqueModels}</p>
                </div>
            </CardContent>
          </Card>
              <Card className="bg-white border">
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-500">Totale Varianti</h3>
                  <p className="text-lg font-bold text-gray-900">{summary.uniqueCombinations}</p>
                </div>
            </CardContent>
          </Card>
              <Card className="bg-white border">
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-500">Articoli Caricati</h3>
                  <p className="text-lg font-bold text-gray-900">{summary.totalItems}</p>
                </div>
            </CardContent>
          </Card>
                 <Card className="bg-white border">
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-500">Totale Carico</h3>
                  <p className="text-lg font-bold text-gray-900">€{summary.totalCost.toFixed(2)}</p>
        </div>
              </CardContent>
            </Card>


        </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Search and Actions Bar */}
          <div className="sticky top-0 bg-white z-50 border-b border-gray-200">
            <div className="p-4 flex justify-between items-center">
              <div className="relative flex items-center w-1/2">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
                  placeholder="Scansiona codice a barre..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleSearch(e.target.value);
              }}
              onBlur={() => setSearchTerm('')}
              ref={searchInputRef}
                  className="pl-10 bg-white"
              disabled={isLoadDisabled}
            />
           </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleSave}
                  disabled={!isChanged || isLoadDisabled}
                  variant="outline"
                  className="font-medium"
                >
                  {isConfirming ? (
                    <>
                      <span className="animate-spin mr-2">⌛</span>
                      Salvando...
                    </>
                  ) : (
                    'Salva'
                  )}
                </Button>
                {isChanged && (
                  <Button
                    onClick={handleCancelChanges}
                    variant="ghost"
                    className="font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Annulla Modifiche
                  </Button>
                )}
            <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
              <DialogTrigger asChild>
                    <Button disabled={isLoadDisabled} className="font-medium">
                  <Plus className="mr-2 h-4 w-4" /> Aggiungi Prodotti
                </Button>
              </DialogTrigger>
                  <AddProductsModal 
                    isOpen={isProductDialogOpen}
                    onOpenChange={setIsProductDialogOpen}
                    onAddProduct={(products) => {
                      const convertedProducts = products.map(p => ({
                        ...p,
                        attributes: (p.attributes || []).map(attr => ({
                          ...attr,
                          parameter_description: '',
                          parameter_is_required: false,
                          parameter_is_expandable: false
                        }))
                      })) as unknown as Product[];
                      handleAddProduct(convertedProducts);
                    }}
                    warehouseId={load.warehouse_id}
                    loadProducts={loadProducts.map(p => ({
                      ...p,
                      attributes: (p.attributes || []).map(attr => ({
                        parameter_id: attr.parameter_id,
                        parameter_name: attr.parameter_name,
                        attribute_id: attr.attribute_id,
                        attribute_name: attr.attribute_name
                      }))
                    })) as unknown as ModalProduct[]}
                  />
            </Dialog>
              {load.status_id === 9 && (
                <>
                  <Button
                    onClick={() => {
                      setSelectedAction('confirm');
                      setIsDialogOpen(true);
                    }}
                    disabled={isConfirming || loadProducts.length === 0}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700 font-medium"
                  >
                    {isConfirming ? "Confermando..." : "Conferma Carico"}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedAction('delete');
                      setIsDialogOpen(true);
                    }}
                    disabled={isDeleting}
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </>
              )}
                {load.status_id === 10 && (
                  <Button
                    onClick={() => {
                      setSelectedAction('revoke');
                      setIsDialogOpen(true);
                    }}
                    disabled={isRevoking}
                    variant="destructive"
                  >
                    {isRevoking ? "Revocando..." : "Revoca Carico"}
                  </Button>
              )}
              {load.status_id === 11 && (
                <>
                  <Button
                    onClick={() => {
                      setSelectedAction('confirm');
                      setIsDialogOpen(true);
                    }}
                    disabled={isConfirming || loadProducts.length === 0}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700 font-medium"
                  >
                    {isConfirming ? "Confermando..." : "Riconferma Carico"}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedAction('delete');
                      setIsDialogOpen(true);
                    }}
                    disabled={isDeleting}
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
          </div>

          {/* Products Table */}
          <LoadProductsTable
            loadProducts={loadProducts}
            allProducts={allProducts}
            isLoadDisabled={isLoadDisabled}
            expandedRows={expandedRows}
            handleProductChange={(product: LoadProduct, field: string | number | symbol, value: any) => {
              if (typeof field === 'string') {
                handleProductChange(product, field as keyof LoadProduct, value);
              }
            }}
            handleRemoveProduct={handleRemoveProduct}
            handleQuantityChange={handleQuantityChange}
            isNewProduct={isNewProduct}
            getQuantityStyle={getQuantityStyle}
            flashingRows={flashingRows}
            flashingQuantities={flashingQuantities}
            toggleExpansion={toggleExpansion}
            handleAddProduct={handleAddProduct}
            sortSizes={sortSizes}
            toggleAllRows={toggleAllRows}
            isQuantityModified={isQuantityModified}
          />
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAction === 'confirm' && (load.status_id === 9 ? 'Conferma Carico' : 'Riconferma Carico')}
              {selectedAction === 'revoke' && 'Conferma Revoca'}
              {selectedAction === 'delete' && 'Conferma Cancellazione'}
            </DialogTitle>
            <DialogDescription>
              {selectedAction === 'confirm' && (
                <>
                  <p>{load.status_id === 9 ? 'Stai per confermare questo carico.' : 'Stai per riconfermare questo carico.'}</p>
                  <p>Questa operazione:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Aggiungerà la disponibilità dei prodotti al magazzino</li>
                    <li>Renderà il carico non più modificabile</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-4">
                    Sei sicuro di voler procedere?
                  </p>
                </>
              )}
              {selectedAction === 'revoke' && (
                <>
                  <p>Stai per revocare questo carico.</p>
                  <p>Questa operazione:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Rimuoverà la disponibilità dei prodotti dal magazzino</li>
                    <li>Riporterà il carico in stato di bozza</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-4">
                    Sei sicuro di voler procedere?
                  </p>
                </>
              )}
              {selectedAction === 'delete' && (
                <>
                  <p>Stai per cancellare questo carico.</p>
                  <p>Questa operazione:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Rimuoverà definitivamente il carico dal sistema</li>
                    <li>Tutte le modifiche non salvate andranno perse</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-4">
                    Questa operazione non può essere annullata. Sei sicuro di voler procedere?
                  </p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isActionLoading}>
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmAction}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <>
                  <span className="animate-spin mr-2">⌛</span>
                  {selectedAction === 'confirm' && (load?.status_id === 9 ? "Confermando..." : "Riconfermando...")}
                  {selectedAction === 'revoke' && "Revocando..."}
                  {selectedAction === 'delete' && "Cancellando..."}
                </>
              ) : (
                <>
                  {selectedAction === 'confirm' && (load?.status_id === 9 ? "Conferma" : "Riconferma")}
                  {selectedAction === 'revoke' && "Revoca"}
                  {selectedAction === 'delete' && "Cancella"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aggiungi il Dialog di conferma */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Conferma Annullamento</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler annullare tutte le modifiche? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancelChanges}
            >
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
