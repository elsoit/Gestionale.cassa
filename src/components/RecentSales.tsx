'use client'

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface RecentSale {
  id: number
  code: string
  total: number | string
  date: string
  client: {
    name: string
  }
}

interface RecentSalesProps {
  data: RecentSale[]
}

const formatCurrency = (value: number | string | undefined) => {
  if (value === undefined || value === null) return '0.00'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return '0.00'
  return numValue.toFixed(2)
}

export function RecentSales({ data = [] }: RecentSalesProps) {
  return (
    <div className="space-y-8">
      {data.map((sale) => (
        <div key={sale.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              {sale.client.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{sale.client.name}</p>
            <p className="text-sm text-muted-foreground">
              {sale.code}
            </p>
          </div>
          <div className="ml-auto font-medium">+€{formatCurrency(sale.total)}</div>
        </div>
      ))}
    </div>
  )
} 