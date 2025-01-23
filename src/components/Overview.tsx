'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface OverviewProps {
  data: Array<{
    date: string
    total: number
  }>
}

export function Overview({ data = [] }: OverviewProps) {
  console.log('Overview data:', data, 'type:', typeof data)
  
  if (!Array.isArray(data)) {
    console.error('Data is not an array:', data)
    return null
  }

  const chartData = {
    labels: data.map(item => new Date(item.date).toLocaleDateString('it-IT', { 
      day: '2-digit',
      month: 'short'
    })),
    datasets: [
      {
        label: 'Vendite',
        data: data.map(item => item.total),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.4,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '€' + value
          }
        }
      }
    }
  }

  return (
    <div className="h-[350px]">
      <Line options={options} data={chartData} />
    </div>
  )
} 