import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface PhotoManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleCode: string;
  variantCode: string;
}

interface Photo {
  id: number;
  url: string;
  main: boolean;
}

const server = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export default function PhotoManagementDialog({ 
  open, 
  onOpenChange,
  articleCode,
  variantCode 
}: PhotoManagementDialogProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
      const interval = setInterval(fetchPhotos, 45 * 60 * 1000);
      return () => clearInterval(interval);
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
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setIsUploading(false);
    }
  }, [articleCode, variantCode]);

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
    } catch (error) {
      console.error('Error deleting photo:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Gestione Foto - {articleCode} {variantCode}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-4 mt-4">
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

        <div
          {...getRootProps()}
          className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'}
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <p>Caricamento in corso...</p>
          ) : isDragActive ? (
            <p>Rilascia i file qui...</p>
          ) : (
            <p>Trascina le foto qui o clicca per selezionarle</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 