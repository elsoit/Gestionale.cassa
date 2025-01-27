'use client'

import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

ChartJS.register(ArcElement, Tooltip, Legend)

interface TopProductsProps {
  data: Array<{
    name: string
    quantity: number
    revenue: number
  }>
}

export function TopProducts({ data = [] }: TopProductsProps) {
  if (!Array.isArray(data)) {
    console.error('TopProducts: data is not an array:', data)
    return null
  }

  const chartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        data: data.map(item => item.revenue || 0),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prodotti Più Venduti</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-[200px] mx-auto">
          <Pie data={chartData} options={options} />
        </div>
        <ScrollArea className="h-[200px] mt-4">
          <div className="space-y-4">
            {data.map((product, index) => (
              <div key={index} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" 
                     style={{ backgroundColor: chartData.datasets[0].backgroundColor[index] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {product.quantity} venduti
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">€{(product.revenue || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    {(((product.revenue || 0) / data.reduce((sum, p) => sum + (p.revenue || 0), 0)) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
} 