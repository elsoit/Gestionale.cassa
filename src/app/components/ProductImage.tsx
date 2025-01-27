import React from 'react';
import { ImageIcon } from 'lucide-react';

interface ProductImageProps {
  url?: string;
  article_code: string;
  variant_code: string;
  onImageClick?: (article_code: string, variant_code: string) => void;
}

export default function ProductImage({ url, article_code, variant_code, onImageClick }: ProductImageProps) {
  const handleClick = () => {
    onImageClick?.(article_code, variant_code);
  };

  return (
    <div 
      className="relative w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Immagine prodotto ${article_code} ${variant_code}`}
    >
      {url ? (
        <img 
          src={url} 
          alt={`Prodotto ${article_code} ${variant_code}`}
          className="w-full h-full object-cover rounded-md"
        />
      ) : (
        <ImageIcon className="w-6 h-6 text-gray-400" />
      )}
    </div>
  );
} 