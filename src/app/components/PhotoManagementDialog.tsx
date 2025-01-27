import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { Loader2, Trash2, Upload, Wand2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PhotoManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleCode: string;
  variantCode: string;
  onPhotoChange?: () => void;
}

interface Photo {
  id: number;
  url: string;
  main: boolean;
}

interface SuggestedPhoto {
  url: string;
  title: string;
}

const server = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export default function PhotoManagementDialog({ 
  open, 
  onOpenChange,
  articleCode,
  variantCode,
  onPhotoChange
}: PhotoManagementDialogProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedPhotos, setSuggestedPhotos] = useState<SuggestedPhoto[]>([]);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPhotos = async () => {
    try {
      const normalizedArticleCode = articleCode.replace(/\s+/g, '').toLowerCase();
      const normalizedVariantCode = variantCode.replace(/\s+/g, '').toLowerCase();

      const response = await fetch(`${server}/api/products/photos/${normalizedArticleCode}/${normalizedVariantCode}`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      const data = await response.json();
      setPhotos(data);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  useEffect(() => {
    if (open && articleCode && variantCode) {
      fetchPhotos();
    }
  }, [open, articleCode, variantCode]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);
    try {
      const normalizedArticleCode = articleCode.replace(/\s+/g, '').toLowerCase();
      const normalizedVariantCode = variantCode.replace(/\s+/g, '').toLowerCase();

      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('article_code', normalizedArticleCode);
        formData.append('variant_code', normalizedVariantCode);

        const response = await fetch(`${server}/api/products/photos/${normalizedArticleCode}/${normalizedVariantCode}/upload`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Errore nel caricamento: ${response.status} - ${errorData}`);
        }
      }
      fetchPhotos();
      onPhotoChange?.();
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setIsUploading(false);
    }
  }, [articleCode, variantCode, onPhotoChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    }
  });

  const handleSetMainPhoto = async (photoId: number) => {
    try {
      const response = await fetch(`${server}/api/products/photos/${photoId}/main`, {
        method: 'PUT'
      });
      if (!response.ok) throw new Error('Failed to set main photo');
      fetchPhotos();
      onPhotoChange?.();
    } catch (error) {
      console.error('Error setting main photo:', error);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      const response = await fetch(`${server}/api/products/photos/${photoId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete photo');
      fetchPhotos();
      onPhotoChange?.();
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  const handleSuggestPhotos = async () => {
    setIsSuggesting(true)
    try {
      const response = await fetch(`${server}/api/products/photos/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          searchQuery: `${articleCode} ${variantCode}` 
        }),
      })

      if (!response.ok) {
        throw new Error('Errore durante la ricerca delle foto')
      }

      const data = await response.json()
      setSuggestedPhotos(data.photos)
    } catch (error) {
      console.error('Errore:', error)
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile cercare le foto suggerite"
      })
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleDownloadSuggested = async (imageUrl: string) => {
    setIsDownloading(imageUrl)
    try {
      const response = await fetch(`${server}/api/products/photos/download-suggested`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          articleCode,
          variantCode
        }),
      })

      if (!response.ok) {
        throw new Error('Errore durante il download della foto')
      }

      await response.json()
      
      // Aggiorna immediatamente la lista delle foto
      await fetchPhotos();
      
      toast({
        title: "Successo",
        description: "Foto scaricata e salvata con successo"
      })
    } catch (error) {
      console.error('Errore:', error)
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile scaricare la foto"
      })
    } finally {
      setIsDownloading(null)
    }
  }

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`${server}/api/products/photos/${articleCode}/${variantCode}/upload`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento della foto');
      }

      await fetchPhotos();
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
      const response = await fetch(`${server}/api/products/photos/${photoId}`, {
        method: 'DELETE',
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Errore nella cancellazione della foto');
      }

      await fetchPhotos();
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
      const response = await fetch(`${server}/api/products/photos/${photoId}/main`, {
        method: 'PUT',
        mode: 'cors',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Errore nell\'impostazione della foto principale');
      }

      await fetchPhotos();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestione Foto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sezione upload */}
          <div className="flex items-center gap-4">
            <Button onClick={() => document.getElementById('photo-upload')?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Carica Foto
            </Button>
            <Button onClick={handleSuggestPhotos} disabled={isSuggesting}>
              <Wand2 className="w-4 h-4 mr-2" />
              {isSuggesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ricerca in corso...
                </>
              ) : (
                'Suggerisci Foto'
              )}
            </Button>
            <input
              type="file"
              id="photo-upload"
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                onDrop(files);
              }}
            />
          </div>

          {/* Sezione foto suggerite */}
          {suggestedPhotos.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Foto Suggerite</h3>
              <div className="grid grid-cols-6 gap-2">
                {suggestedPhotos.map((photo, index) => (
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
                        onClick={() => handleDownloadSuggested(photo.url)}
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

          {/* Sezione foto esistenti */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Foto Caricate</h3>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : photos.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Nessuna foto caricata
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square relative overflow-hidden rounded-lg">
                      <Image
                        src={photo.url}
                        alt={`Photo ${photo.id}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <Button
                          variant={photo.main ? "default" : "secondary"}
                          size="sm"
                          onClick={() => handleSetMainPhoto(photo.id)}
                        >
                          {photo.main ? 'Principale' : 'Imposta come principale'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          Elimina
                        </Button>
                      </div>
                    </div>
                    {photo.main && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                        Principale
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 