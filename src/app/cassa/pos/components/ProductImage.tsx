'use client'

import Image from 'next/image'
import { Shirt } from 'lucide-react'

interface ProductImageProps {
  mainPhotoUrl?: string
  article_code: string
  variant_code: string
  size?: 'sm' | 'md' | 'lg'
}

export default function ProductImage({ mainPhotoUrl, article_code, variant_code, size = 'sm' }: ProductImageProps) {
  const dimensions = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  }

  if (!mainPhotoUrl) {
    return (
      <div className={`${dimensions[size]} bg-gray-100 rounded border flex items-center justify-center`}>
        <Shirt className="w-5 h-5 text-gray-400" />
      </div>
    )
  }

  return (
    <div className={`relative ${dimensions[size]} bg-white rounded border`}>
      <div className="absolute inset-1">
        <Image
          src={mainPhotoUrl}
          alt={`${article_code} - ${variant_code}`}
          fill
          sizes={`(max-width: ${size === 'sm' ? '48' : size === 'md' ? '64' : '80'}px) 100vw`}
          className="rounded object-contain p-1"
          style={{ aspectRatio: "1/1" }}
        />
      </div>
    </div>
  )
} 