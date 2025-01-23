import Image from 'next/image'

interface StandardLabelProps {
  brand: string
  articleCode: string
  variant: string
  size: string
  color?: string
  basePrice: number
  discountedPrice?: number
  barcode: string
}

export const StandardLabel = ({
  brand,
  articleCode,
  variant,
  size,
  color,
  basePrice,
  discountedPrice,
  barcode
}: StandardLabelProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)
  }

  return (
    <div className="w-[400px] h-[300px] p-4 flex flex-col justify-between bg-white">
      {/* Brand */}
      <div className="text-xl font-bold border-b border-black pb-2">
        {brand}
      </div>

      {/* Codice Articolo */}
      <div className="text-4xl font-bold mt-2">
        {articleCode}
      </div>

      {/* Variante, Taglia e Colore */}
      <div className="flex gap-4 text-2xl mt-2">
        <div>
          VARIANTE {variant}
        </div>
        <div className="bg-black text-white px-4 py-1">
          TAGLIA {size}
        </div>
        {color && (
          <div>
            COLORE {color}
          </div>
        )}
      </div>

      {/* Prezzi */}
      <div className="flex justify-between items-center mt-4">
        <div>
          <div className="text-sm">Prezzo listino</div>
          <div className="text-2xl">{formatPrice(basePrice)}</div>
        </div>
        {discountedPrice && (
          <div>
            <div className="text-sm">Prezzo scontato</div>
            <div className="text-2xl bg-black text-white px-4 py-1">
              {formatPrice(discountedPrice)}
            </div>
          </div>
        )}
      </div>

      {/* Barcode */}
      <div className="mt-4">
        <Image 
          src={`data:image/png;base64,${barcode}`}
          alt="Barcode"
          width={100}
          height={50}
          className="w-full h-full object-contain"
        />
        <div className="text-center text-sm mt-1">
          No: {barcode}
        </div>
      </div>
    </div>
  )
} 