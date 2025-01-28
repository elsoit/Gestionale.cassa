'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Camera, Package, Upload, Wand2, Loader2, Star, Trash2, X, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

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
}

interface GroupedProduct {
  id: number;
  size_id: number;
  size_name: string;
  total_availability: number;
  status_id: number;
  status_name?: string;
  wholesale_price: string;
  retail_price: string;
}

interface ProductGroup {
  article_code: string;
  variant_code: string;
  status_id: number;
  status_name?: string;
  brand_id?: number;
  brand_name?: string;
  size_group_id?: number;
  size_group_name?: string;
  attributes?: Product['attributes'];
  products: GroupedProduct[];
  photos: {
    id: number;
    url: string;
    main: boolean;
  }[];
}

interface Variant {
  article_code: string;
  variant_code: string;
  brand_name?: string;
  main_photo?: {
    url: string;
  };
}

interface Warehouse {
  id: number;
  name: string;
  code: string;
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

// Aggiungo la funzione per calcolare lo stato complessivo
const calculateOverallStatus = (products: GroupedProduct[]) => {
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status_id === 1).length;
  const inactiveProducts = products.filter(p => p.status_id === 2).length;
  const deletedProducts = products.filter(p => p.status_id === 3).length;

  if (activeProducts === totalProducts) {
    return { id: 1, name: 'Attivo', class: 'bg-green-100 text-green-800 border-green-200' };
  } else if (deletedProducts === totalProducts) {
    return { id: 3, name: 'Cancellato', class: 'bg-red-100 text-red-800 border-red-200' };
  } else if (inactiveProducts === totalProducts) {
    return { id: 2, name: 'Inattivo', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  } else if (activeProducts > 0) {
    return { id: 4, name: 'Parzialmente Attivo', class: 'bg-blue-100 text-blue-800 border-blue-200' };
  } else if (inactiveProducts > 0) {
    return { id: 5, name: 'Parzialmente Inattivo', class: 'bg-orange-100 text-orange-800 border-orange-200' };
  }
  return { id: 0, name: 'Sconosciuto', class: 'bg-gray-100 text-gray-800 border-gray-200' };
};

export default function ProductPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  
  const [productGroup, setProductGroup] = useState<ProductGroup | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [suggestedPhotos, setSuggestedPhotos] = useState<Array<{ url: string; title: string }>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [shouldRefresh, setShouldRefresh] = useState(0)
  const [suggestedPhotosOpen, setSuggestedPhotosOpen] = useState(false)
  const [selectedSuggestedPhotos, setSelectedSuggestedPhotos] = useState<Set<string>>(new Set())
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all')
  const [availabilityData, setAvailabilityData] = useState<{[key: string]: number}>({})

  const fetchProductData = async () => {
    try {
      setIsLoading(true);
      const articleCode = typeof params.article_code === 'string' ? params.article_code : params.article_code[0];
      const variantCode = typeof params.variant_code === 'string' ? params.variant_code : params.variant_code[0];

      console.log('Fetching products for:', { articleCode, variantCode });

      const response = await fetch(
        `${process.env.API_URL}/api/products/group/${articleCode}/${variantCode}`,
        { mode: 'cors', credentials: 'include' }
      );
      
      if (!response.ok) {
        console.error('API response not ok:', response.status);
        throw new Error(`Failed to fetch products: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Products data:', data);
      
      if (!data || !data.products || data.products.length === 0) {
        console.error('No products found in response:', data);
        throw new Error('No products found');
      }

      // Fetch photos for this combination
      const photosResponse = await fetch(`${process.env.API_URL}/api/products/photos/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          products: [{
            article_code: data.article_code,
            variant_code: data.variant_code
          }]
        }),
        mode: 'cors',
        credentials: 'include'
      });

      if (!photosResponse.ok) {
        throw new Error('Failed to fetch photos');
      }

      const photosData = await photosResponse.json();
      const key = `${data.article_code.toLowerCase()}-${data.variant_code.toLowerCase()}`;
      const productPhotos = photosData[key] || [];

      // Create product group with photos
      const groupData: ProductGroup = {
        article_code: data.article_code,
        variant_code: data.variant_code,
        status_id: data.products[0]?.status_id,
        status_name: data.products[0]?.status_name,
        brand_id: data.brand_id,
        brand_name: data.brand_name,
        size_group_id: data.size_group_id,
        size_group_name: data.size_group_name,
        attributes: data.attributes,
        products: data.products.map((product: Product) => ({
          id: product.id,
          size_id: product.size_id,
          size_name: product.size_name,
          total_availability: product.total_availability || 0,
          status_id: product.status_id,
          status_name: product.status_name,
          wholesale_price: product.wholesale_price,
          retail_price: product.retail_price
        })).sort((a: GroupedProduct, b: GroupedProduct) => compareSizes(a.size_name, b.size_name)),
        photos: productPhotos
      };

      setProductGroup(groupData);

      // Fetch other variants with same article_code
      const variantsResponse = await fetch(
        `${process.env.API_URL}/api/products/variants/${articleCode}`,
        { mode: 'cors', credentials: 'include' }
      )
      
      if (!variantsResponse.ok) throw new Error('Failed to fetch variants')
      
      const variantsData = await variantsResponse.json()
      
      // Fetch photos for all variants
      const variantsPhotosResponse = await fetch(`${process.env.API_URL}/api/products/photos/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          products: variantsData.map((variant: Variant) => ({
            article_code: variant.article_code,
            variant_code: variant.variant_code
          }))
        }),
        mode: 'cors',
        credentials: 'include'
      });

      if (!variantsPhotosResponse.ok) {
        throw new Error('Failed to fetch variant photos');
      }

      const variantsPhotosData = await variantsPhotosResponse.json();
      
      // Combine variants with their photos
      const variantsWithPhotos = variantsData.map((variant: Variant) => {
        const variantKey = `${variant.article_code.toLowerCase()}-${variant.variant_code.toLowerCase()}`;
        const variantPhotos = variantsPhotosData[variantKey] || [];
        return {
          ...variant,
          main_photo: variantPhotos[0]
        };
      });

      setVariants(variantsWithPhotos);
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati del prodotto",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/warehouses`, {
        mode: 'cors',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch warehouses');
      const data = await response.json();
      setWarehouses(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i magazzini",
        variant: "destructive"
      });
    }
  };

  const fetchAvailability = async (productId: number, warehouseId: string) => {
    if (warehouseId === 'all') {
      setAvailabilityData({});
      return;
    }
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/product-availability/product/${productId}/warehouse/${warehouseId}`,
        { mode: 'cors', credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch availability');
      const data = await response.json();
      setAvailabilityData(prev => ({
        ...prev,
        [productId]: data?.quantity || 0
      }));
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare la disponibilità",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (params.article_code && params.variant_code) {
      fetchProductData();
      fetchWarehouses();
    }
  }, [params.article_code, params.variant_code, shouldRefresh]);

  useEffect(() => {
    if (productGroup && selectedWarehouse !== 'all') {
      setAvailabilityData({});
      Promise.all(
        productGroup.products.map(product => 
          fetchAvailability(product.id, selectedWarehouse)
        )
      );
    }
  }, [selectedWarehouse]);

  const handleUploadPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length || !productGroup) return;

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('photo', file);
    });

    try {
      const response = await fetch(
        `${process.env.API_URL}/api/products/photos/${productGroup.article_code}/${productGroup.variant_code}/upload`, 
        {
          method: 'POST',
          body: formData,
          mode: 'cors',
          credentials: 'include'
        }
      );

      if (!response.ok) throw new Error('Errore durante il caricamento delle foto');

      await response.json();
      setShouldRefresh(prev => prev + 1);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast({
        title: "Successo",
        description: "Foto caricate con successo"
      });
    } catch (error) {
      console.error('Errore:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare le foto"
      });
    }
  };

  const handleSuggestPhotos = async () => {
    if (!productGroup) return;
    setIsSuggesting(true);
    try {
      const response = await fetch(`${process.env.API_URL}/api/products/photos/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          searchQuery: `${productGroup.article_code} ${productGroup.variant_code}` 
        }),
      });

      if (!response.ok) throw new Error('Errore durante la ricerca delle foto');

      const data = await response.json();
      setSuggestedPhotos(data.photos);
      setSuggestedPhotosOpen(true);
    } catch (error) {
      console.error('Errore:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile cercare le foto suggerite"
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleDownloadSelectedPhotos = async () => {
    if (!productGroup || selectedSuggestedPhotos.size === 0) return;
    setIsDownloadingBatch(true);
    try {
      const photoUrls = Array.from(selectedSuggestedPhotos);
      for (const imageUrl of photoUrls) {
        const response = await fetch(`${process.env.API_URL}/api/products/photos/download-suggested`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl,
            articleCode: productGroup.article_code,
            variantCode: productGroup.variant_code
          }),
        });

        if (!response.ok) throw new Error('Errore durante il download della foto');
        await response.json();
      }

      setShouldRefresh(prev => prev + 1);
      setSuggestedPhotosOpen(false);
      setSelectedSuggestedPhotos(new Set());
      
      toast({
        title: "Successo",
        description: `${photoUrls.length} foto scaricate con successo`
      });

    } catch (error) {
      console.error('Errore:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile scaricare le foto"
      });
    } finally {
      setIsDownloadingBatch(false);
    }
  };

  const togglePhotoSelection = (url: string) => {
    setSelectedSuggestedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  };

  const handleSetMainPhoto = async (photoId: number) => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/products/photos/${photoId}/main`, {
        method: 'PUT',
      });

      if (!response.ok) throw new Error('Errore durante l\'impostazione della foto principale');

      await response.json();
      setShouldRefresh(prev => prev + 1);

      toast({
        title: "Successo",
        description: "Foto principale impostata con successo"
      });
    } catch (error) {
      console.error('Errore:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile impostare la foto principale"
      });
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/products/photos/${photoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Errore durante l\'eliminazione della foto');

      setShouldRefresh(prev => prev + 1);
      
      toast({
        title: "Successo",
        description: "Foto eliminata con successo"
      });
    } catch (error) {
      console.error('Errore:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile eliminare la foto"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (!productGroup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Prodotto non trovato</h1>
        <Button onClick={() => router.push('/products')}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Torna alla lista
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r bg-card">
        <ScrollArea className="h-screen">
          <div className="p-6 space-y-6">
            <div>
              <Button 
                variant="ghost" 
                onClick={() => router.push('/products')}
                className="flex items-center text-sm text-muted-foreground hover:text-foreground -ml-3"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Torna alla lista
              </Button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prezzo medio ingrosso</span>
                <span className="text-sm font-medium">
                  {(() => {
                    const prices = productGroup.products.map(p => parseFloat(p.wholesale_price));
                    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
                    return new Intl.NumberFormat('it-IT', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(avg);
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prezzo medio vendita</span>
                <span className="text-sm font-medium">
                  {(() => {
                    const prices = productGroup.products.map(p => parseFloat(p.retail_price));
                    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
                    return new Intl.NumberFormat('it-IT', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(avg);
                  })()}
                </span>
              </div>
            </div>

            <Separator />

            {/* Info Rapide */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Info Prodotto</h3>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Brand</span>
                  <Badge variant="outline">{productGroup.brand_name}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Stato</span>
                  <Badge 
                    variant="outline" 
                    className={calculateOverallStatus(productGroup.products).class}
                  >
                    {calculateOverallStatus(productGroup.products).name}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Gruppo Taglie</span>
                  <Badge variant="outline">{productGroup.size_group_name}</Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Attributi */}
            <div className="space-y-4">
              <h3 className="font-medium">Attributi</h3>
              <div className="flex flex-wrap gap-2">
                {productGroup.attributes?.map((attr, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {attr.parameter_name}: {attr.attribute_name}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Varianti */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Varianti</h3>
                <Badge variant="secondary" className="text-xs">
                  {variants.length} varianti
                </Badge>
              </div>
              <div className="space-y-2">
                {variants.map((variant) => (
                  <button
                    key={variant.variant_code}
                    onClick={() => router.push(`/products/${variant.article_code}/${variant.variant_code}`)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                      variant.variant_code === productGroup.variant_code
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {variant.main_photo ? (
                      <div className="relative w-12 h-12 rounded-md overflow-hidden">
                        <Image
                          src={variant.main_photo.url}
                          alt={variant.variant_code}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="text-left">
                      <div className="font-medium">{variant.variant_code}</div>
                      <div className="text-xs text-muted-foreground">
                        {variant.brand_name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="h-full flex flex-col">
          {/* Header */}
          <header className="border-b bg-card">
            <div className="container py-4 px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {productGroup.article_code}
                    <span className="text-muted-foreground mx-2">-</span>
                    <span className="text-muted-foreground">{productGroup.variant_code}</span>
                  </h2>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 p-6 space-y-6">
            {/* Galleria Foto */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Galleria Foto</h3>
                  <Badge variant="secondary" className="text-xs">
                    {productGroup.photos.length} foto
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleUploadPhotos}
                        onClick={(e) => {
                          // Reset value before each selection to ensure onChange fires even with same file
                          (e.target as HTMLInputElement).value = '';
                        }}
                      />
                      <Upload className="w-4 h-4" />
                      Carica Foto
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSuggestPhotos}
                    disabled={isSuggesting}
                  >
                    {isSuggesting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Ricerca...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Suggerisci Foto
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="w-full overflow-x-auto touch-pan-x snap-x snap-mandatory">
                  <div className="flex gap-4 pb-4">
                    {productGroup.photos.length === 0 ? (
                      <div className="flex-none w-[140px] aspect-[3/4] rounded-lg bg-muted flex flex-col items-center justify-center text-muted-foreground snap-start">
                        <Camera className="w-8 h-8 mb-2" />
                        <p className="text-sm">Nessuna foto</p>
                      </div>
                    ) : (
                      productGroup.photos.map((photo) => (
                        <div 
                          key={photo.id}
                          className="flex-none w-[140px] aspect-[3/4] relative rounded-lg overflow-hidden bg-muted hover:shadow-lg transition-all duration-300 group snap-start"
                        >
                          <Image
                            src={photo.url}
                            alt={`${productGroup.article_code} ${productGroup.variant_code}`}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                          {photo.main && (
                            <div className="absolute top-2 right-2 text-yellow-500 bg-white rounded-full p-1.5 shadow-lg">
                              <Star className="w-4 h-4 fill-current" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all">
                            <div className="absolute bottom-2 right-2 flex gap-2">
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => handleSetMainPhoto(photo.id)}
                                className={photo.main ? 'text-yellow-500' : ''}
                              >
                                <Star className={`w-4 h-4 ${photo.main ? 'fill-current' : ''}`} />
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabella Taglie */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Taglie e Prezzi</h3>
                <select 
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                >
                  <option value="all">Tutti i magazzini</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[100px]">Taglia</TableHead>
                      <TableHead>
                        Disponibilità
                        {selectedWarehouse !== 'all' && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({warehouses.find(w => w.id.toString() === selectedWarehouse)?.name})
                          </span>
                        )}
                      </TableHead>
                      <TableHead>Prezzo Ingrosso</TableHead>
                      <TableHead>Prezzo Dettaglio</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productGroup.products.map((product) => (
                      <TableRow 
                        key={product.id} 
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium">{product.size_name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`font-mono ${
                              selectedWarehouse !== 'all' && availabilityData[product.id] === 0 
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : ''
                            }`}
                          >
                            {selectedWarehouse === 'all' 
                              ? product.total_availability 
                              : availabilityData[product.id] || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {new Intl.NumberFormat('it-IT', {
                            style: 'currency',
                            currency: 'EUR'
                          }).format(parseFloat(product.wholesale_price))}
                        </TableCell>
                        <TableCell className="font-mono">
                          {new Intl.NumberFormat('it-IT', {
                            style: 'currency',
                            currency: 'EUR'
                          }).format(parseFloat(product.retail_price))}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={product.status_id === 1 ? "default" : "secondary"}
                            className={
                              product.status_id === 1 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            }
                          >
                            {product.status_name}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Dialog Foto Suggerite */}
      <Dialog open={suggestedPhotosOpen} onOpenChange={setSuggestedPhotosOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-xl">Foto Suggerite</span>
                {selectedSuggestedPhotos.size > 0 && (
                  <Badge variant="secondary" className="text-base">
                    {selectedSuggestedPhotos.size} selezionate
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedSuggestedPhotos.size > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleDownloadSelectedPhotos}
                    disabled={isDownloadingBatch}
                    className="h-9"
                  >
                    {isDownloadingBatch ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Caricamento...
                      </>
                    ) : (
                      'Carica Selezionate'
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSuggestedPhotosOpen(false)}
                  className="h-9 w-9"
                >
                  <X className="h-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
            {suggestedPhotos.map((photo, index) => (
              <div 
                key={index} 
                className={`relative group cursor-pointer rounded-lg overflow-hidden ${
                  selectedSuggestedPhotos.has(photo.url) 
                    ? 'ring-2 ring-primary ring-offset-2' 
                    : 'hover:ring-2 hover:ring-primary/50 hover:ring-offset-2'
                }`}
                onClick={() => togglePhotoSelection(photo.url)}
              >
                <div className="relative aspect-square">
                  <Image
                    src={photo.url}
                    alt={photo.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity ${
                  selectedSuggestedPhotos.has(photo.url) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                } flex items-center justify-center`}>
                  {selectedSuggestedPhotos.has(photo.url) ? (
                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="text-white text-sm font-medium">
                      Clicca per selezionare
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 