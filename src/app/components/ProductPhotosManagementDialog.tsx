import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Wand2, Loader2, Search, X, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import PhotoManagementDialog from './PhotoManagementDialog';
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";


interface Product {
  id: number;
  article_code: string;
  variant_code: string;
  photos: {
    id: number;
    url: string;
    main: boolean;
  }[];
  brand_name?: string;
  brand_id?: number;
  status_id: number;
  status_name?: string;
  updated_at?: string;
}

interface SuggestedPhoto {
  url: string;
  title: string;
}

interface ProductPhotosManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onPhotoChange?: () => void;
}

export default function ProductPhotosManagementDialog({
  open,
  onOpenChange,
  products,
  onPhotoChange
}: ProductPhotosManagementDialogProps) {
  const [selectedProduct, setSelectedProduct] = useState<{articleCode: string, variantCode: string} | null>(null);
  const [photoManagementOpen, setPhotoManagementOpen] = useState(false);
  const [suggestedPhotos, setSuggestedPhotos] = useState<Record<string, SuggestedPhoto[]>>({});
  const [isSuggesting, setIsSuggesting] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [productPhotos, setProductPhotos] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Raggruppa i prodotti per codice articolo e variante
  const groupedProducts = products.reduce((acc, product) => {
    const key = `${product.article_code}-${product.variant_code}`;
    if (!acc[key]) {
      acc[key] = {
        article_code: product.article_code,
        variant_code: product.variant_code,
        brand_name: product.brand_name,
        brand_id: product.brand_id,
        status_id: product.status_id,
        status_name: product.status_name,
        photos: product.photos || [],
        updated_at: product.updated_at
      };
    }
    return acc;
  }, {} as Record<string, { 
    article_code: string; 
    variant_code: string; 
    brand_name?: string;
    brand_id?: number;
    status_id: number;
    status_name?: string;
    photos: any[];
    updated_at?: string;
  }>);

  // Ordina i prodotti come nella tabella principale
  const sortedProducts = Object.entries(groupedProducts).sort((a, b) => {
    const productA = a[1];
    const productB = b[1];

    // Prima ordina per data più recente
    const updatedAtA = new Date(productA.updated_at || '').getTime();
    const updatedAtB = new Date(productB.updated_at || '').getTime();
    if (updatedAtA !== updatedAtB) {
      return updatedAtB - updatedAtA;
    }

    // Se le date sono uguali, ordina per codice articolo
    const articleComparison = productA.article_code.localeCompare(productB.article_code);
    if (articleComparison !== 0) return articleComparison;

    // Se anche il codice articolo è uguale, ordina per variante
    return productA.variant_code.localeCompare(productB.variant_code);
  });

  // Filtra i prodotti in base al termine di ricerca
  const filteredProducts = sortedProducts.filter(([_, product]) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.article_code.toLowerCase().includes(searchLower) ||
      product.variant_code.toLowerCase().includes(searchLower) ||
      product.brand_name?.toLowerCase().includes(searchLower) ||
      product.status_name?.toLowerCase().includes(searchLower)
    );
  });

  const fetchProductPhotos = async (articleCode: string, variantCode: string) => {
    const key = `${articleCode}-${variantCode}`;
    setIsLoading(prev => ({ ...prev, [key]: true }));
    
    try {
      const normalizedArticleCode = articleCode.replace(/\s+/g, '').toLowerCase();
      const normalizedVariantCode = variantCode.replace(/\s+/g, '').toLowerCase();

      const response = await fetch(`${process.env.API_URL}/api/products/photos/${normalizedArticleCode}/${normalizedVariantCode}`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      const data = await response.json();
      
      setProductPhotos(prev => ({
        ...prev,
        [key]: data
      }));
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile recuperare le foto"
      });
    } finally {
      setIsLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    if (open) {
      // Recupera le foto per ogni prodotto quando la modale si apre
      Object.entries(groupedProducts).forEach(([_, product]) => {
        fetchProductPhotos(product.article_code, product.variant_code);
      });
    }
  }, [open]);

  const handleManagePhotos = (articleCode: string, variantCode: string) => {
    setSelectedProduct({ articleCode, variantCode });
    setPhotoManagementOpen(true);
  };

  const handleSuggestPhotos = async (articleCode: string, variantCode: string) => {
    const key = `${articleCode}-${variantCode}`;
    setIsSuggesting(key);
    try {
      const response = await fetch(`${process.env.API_URL}/api/products/photos/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          searchQuery: `${articleCode} ${variantCode}` 
        }),
      });

      if (!response.ok) {
        throw new Error('Errore durante la ricerca delle foto');
      }

      const data = await response.json();
      setSuggestedPhotos(prev => ({
        ...prev,
        [key]: data.photos
      }));
    } catch (error) {
      console.error('Errore:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile cercare le foto suggerite"
      });
    } finally {
      setIsSuggesting(null);
    }
  };

  const handleDownloadSuggested = async (imageUrl: string, articleCode: string, variantCode: string) => {
    setIsDownloading(imageUrl);
    try {
      const response = await fetch(`${process.env.API_URL}/api/products/photos/download-suggested`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          articleCode,
          variantCode
        }),
      });

      if (!response.ok) {
        throw new Error('Errore durante il download della foto');
      }

      await response.json();
      
      // Ricarica le foto del prodotto
      await fetchProductPhotos(articleCode, variantCode);
      
      toast({
        title: "Successo",
        description: "Foto scaricata e salvata con successo"
      });

      // Rimuovi la foto dalle suggerite
      const key = `${articleCode}-${variantCode}`;
      setSuggestedPhotos(prev => {
        const updated = { ...prev };
        updated[key] = updated[key].filter(photo => photo.url !== imageUrl);
        if (updated[key].length === 0) delete updated[key];
        return updated;
      });
    } catch (error) {
      console.error('Errore:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile scaricare la foto"
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleCloseSuggestedPhotos = (articleCode: string, variantCode: string) => {
    const key = `${articleCode}-${variantCode}`;
    setSuggestedPhotos(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleUploadPhotos = async (event: React.ChangeEvent<HTMLInputElement>, articleCode: string, variantCode: string) => {
    const files = event.target.files;
    if (!files?.length) return;

    const formData = new FormData();
    formData.append('articleCode', articleCode);
    formData.append('variantCode', variantCode);
    Array.from(files).forEach(file => {
      formData.append('photos', file);
    });

    try {
      const response = await fetch(`${process.env.API_URL}/api/products/photos/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Errore durante il caricamento delle foto');

      await response.json();
      await fetchProductPhotos(articleCode, variantCode);

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

  const handleSetMainPhoto = async (photoId: number, articleCode: string, variantCode: string) => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/products/photos/${photoId}/main`, {
        method: 'PUT',
      });

      if (!response.ok) throw new Error('Errore durante l\'impostazione della foto principale');

      await response.json();
      await fetchProductPhotos(articleCode, variantCode);

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

  const handleDeletePhoto = async (photoId: number, articleCode: string, variantCode: string) => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/products/photos/${photoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Errore durante l\'eliminazione della foto');

      await fetchProductPhotos(articleCode, variantCode);
      
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

  const handleUpload = async (articleCode: string, variantCode: string, file: File) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`${process.env.API_URL}/api/products/photos/${articleCode}/${variantCode}/upload`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento della foto');
      }

      onPhotoChange?.();
      toast({
        title: "Successo",
        description: "Foto caricata con successo",
      });
    } catch (error) {
      console.error('Errore nel caricamento:', error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento della foto",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (photoId: number) => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/products/photos/${photoId}`, {
        method: 'DELETE',
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Errore nella cancellazione della foto');
      }

      onPhotoChange?.();
      toast({
        title: "Successo",
        description: "Foto eliminata con successo",
      });
    } catch (error) {
      console.error('Errore nella cancellazione:', error);
      toast({
        title: "Errore",
        description: "Errore nella cancellazione della foto",
        variant: "destructive",
      });
    }
  };

  const handleSetMain = async (photoId: number) => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/products/photos/${photoId}/main`, {
        method: 'PUT',
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Errore nell\'impostazione della foto principale');
      }

      onPhotoChange?.();
      toast({
        title: "Successo",
        description: "Foto principale impostata con successo",
      });
    } catch (error) {
      console.error('Errore nell\'impostazione della foto principale:', error);
      toast({
        title: "Errore",
        description: "Errore nell'impostazione della foto principale",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0 gap-0">
          <div className="flex flex-col p-6 border-b">
            <DialogHeader>
              <DialogTitle>Gestione Foto Prodotti</DialogTitle>
            </DialogHeader>

            {/* Campo di ricerca */}
            <div className="flex items-center gap-2 border rounded-lg p-2 mt-4">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cerca per codice articolo, variante, brand o stato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-4">
              {filteredProducts.map(([key, product]) => {
                const hasSuggestedPhotos = suggestedPhotos[key]?.length > 0;
                const photos = productPhotos[key] || [];
                const isLoadingPhotos = isLoading[key];

                return (
                  <div key={key} className="space-y-4">
                    <div className={`flex items-center justify-between p-4 border rounded-lg ${
                      sortedProducts.find(([k, p]) => k !== key && p.article_code === product.article_code) 
                        ? 'border-l-4 border-l-blue-500' 
                        : ''
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {product.brand_name && (
                            <span className="text-sm text-gray-500">{product.brand_name}</span>
                          )}
                          <p className="font-semibold">
                            {product.article_code} - {product.variant_code}
                          </p>
                          {product.status_name && (
                            <Badge variant="outline">{product.status_name}</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-4 items-center">
                        <p className="text-sm font-medium text-gray-500">foto caricate</p>
                        <div className="flex gap-2">
                          {isLoadingPhotos ? (
                            <div className="w-16 h-16 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                          ) : photos.length > 0 ? (
                            [...photos]
                              .sort((a, b) => (b.main ? 1 : 0) - (a.main ? 1 : 0))
                              .map((photo) => (
                                <div key={photo.id} className="relative w-16 h-16 group">
                                  <Image
                                    src={photo.url}
                                    alt={`Photo ${photo.id}`}
                                    fill
                                    className="object-cover rounded-md"
                                  />
                                  {photo.main && (
                                    <div className="absolute top-1 right-1 text-yellow-500">
                                      <Star className="w-4 h-4 fill-current" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleSetMainPhoto(photo.id, product.article_code, product.variant_code)}
                                      className={`p-1 rounded-full ${
                                        photo.main ? 'text-yellow-500' : 'text-gray-400'
                                      } hover:text-yellow-500 transition-colors`}
                                    >
                                      <Star className={`w-4 h-4 ${photo.main ? 'fill-current' : ''}`} />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePhoto(photo.id, product.article_code, product.variant_code)}
                                      className="p-1 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))
                          ) : (
                            <p className="text-sm text-gray-400">Nessuna foto</p>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          asChild
                        >
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              multiple
                              accept="image/*"
                              onChange={(e) => handleUploadPhotos(e, product.article_code, product.variant_code)}
                            />
                            <Upload className="w-4 h-4" />
                            Carica Foto
                          </label>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestPhotos(product.article_code, product.variant_code)}
                          disabled={isSuggesting === key}
                        >
                          {isSuggesting === key ? (
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

                    {hasSuggestedPhotos && (
                      <div className="ml-8 p-4 border rounded-lg bg-gray-50 relative">
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleCloseSuggestedPhotos(product.article_code, product.variant_code)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm font-medium text-gray-500 mb-2">foto suggerite</p>
                        <div className="grid grid-cols-6 gap-2">
                          {suggestedPhotos[key].map((photo, index) => (
                            <div key={index} className="relative group">
                              <div className="relative aspect-square">
                                <Image
                                  src={photo.url}
                                  alt={photo.title}
                                  fill
                                  className="object-cover rounded-md"
                                />
                              </div>
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleDownloadSuggested(photo.url, product.article_code, product.variant_code)}
                                  disabled={isDownloading === photo.url}
                                >
                                  {isDownloading === photo.url ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    'Usa questa foto'
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedProduct && (
        <PhotoManagementDialog
          open={photoManagementOpen}
          onOpenChange={setPhotoManagementOpen}
          articleCode={selectedProduct.articleCode}
          variantCode={selectedProduct.variantCode}
        />
      )}
    </>
  );
} 