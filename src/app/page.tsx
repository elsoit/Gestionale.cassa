'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Overview } from "@/components/Overview"
import { RecentSales } from "@/components/RecentSales"
import { TopProducts } from "@/components/TopProducts"
import { Button } from "@/components/ui/button"
import { CalendarDateRangePicker } from "@/components/date-range-picker"
import { Calendar, DollarSign, Package, ShoppingCart, TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"

interface SalesData {
  totalSales: number
  totalRevenue: number
  averageOrderValue: number
  totalProducts: number
  topProducts: Array<{
    id: number
    name: string
    article_code: string
    variant_code: string
    quantity: number
    revenue: number
    orders_count: number
  }>
  recentSales: Array<{
    id: number
    code: string
    total: number
    date: string
    status_id: number
    status_name: string
    client_name: string
    punto_vendita_name: string
    operator_name: string
    operator_surname: string
    items: Array<{
      product_id: number
      name: string
      quantity: number
      total: number
    }>
  }>
  salesByDay: Array<{
    date: string
    orders_count: number
    total_revenue: number
    average_order_value: number
    unique_customers: number
  }>
}

const initialSalesData: SalesData = {
  totalSales: 0,
  totalRevenue: 0,
  averageOrderValue: 0,
  totalProducts: 0,
  topProducts: [],
  recentSales: [],
  salesByDay: []
}

export default function DashboardPage() {
  const [salesData, setSalesData] = useState<SalesData>(initialSalesData)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date()
  })

  const fetchData = async (from?: Date, to?: Date) => {
    try {
      setIsLoading(true)
      
      // Costruisci i parametri della query
      const params = new URLSearchParams()
      if (from) params.append('from', format(from, 'yyyy-MM-dd'))
      if (to) params.append('to', format(to, 'yyyy-MM-dd'))
      
      const queryString = params.toString()
      const baseUrl = `${process.env.API_URL}/api/orders/dashboard`
      
      // Fetch dashboard stats with date range
      const statsResponse = await fetch(`${baseUrl}/stats?${queryString}`)
      const statsData = await statsResponse.json()

      // Fetch top products with date range
      const topProductsResponse = await fetch(`${baseUrl}/top-products?${queryString}`)
      const topProductsData = await topProductsResponse.json()

      // Fetch recent sales with date range
      const recentSalesResponse = await fetch(`${baseUrl}/recent-sales?${queryString}`)
      const recentSalesData = await recentSalesResponse.json()

      // Fetch sales by day with date range
      const salesByDayResponse = await fetch(`${baseUrl}/sales-by-day?${queryString}`)
      const salesByDayData = await salesByDayResponse.json()

      setSalesData({
        totalSales: Number(statsData?.totalSales) || 0,
        totalRevenue: Number(statsData?.totalRevenue) || 0,
        averageOrderValue: Number(statsData?.averageOrderValue) || 0,
        totalProducts: Number(statsData?.totalProducts) || 0,
        topProducts: Array.isArray(topProductsData) ? topProductsData : [],
        recentSales: Array.isArray(recentSalesData) ? recentSalesData : [],
        salesByDay: Array.isArray(salesByDayData) ? salesByDayData : []
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Effetto per caricare i dati iniziali e quando cambia il range di date
  useEffect(() => {
    fetchData(dateRange.from, dateRange.to)
  }, [dateRange])

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from) {
      setDateRange({
        from: range.from,
        to: range.to || range.from
      })
    }
  }

  // Funzioni helper per la gestione sicura dei dati
  const getSafeArray = (data: any[] | null | undefined) => {
    return Array.isArray(data) ? data : []
  }

  const formatCurrency = (value: number | string | undefined) => {
    if (value === undefined || value === null) return '0.00'
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return '0.00'
    return numValue.toFixed(2)
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <CalendarDateRangePicker 
            date={dateRange}
            onDateChange={handleDateRangeChange}
          />
          <Button>Download</Button>
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Vendite Totali
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-[100px]" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{salesData?.totalSales || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Numero totale di ordini
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Incasso Totale
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-[100px]" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">€{formatCurrency(salesData?.totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">
                      Fatturato totale
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Valore Medio Ordine
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-[100px]" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">€{formatCurrency(salesData?.averageOrderValue)}</div>
                    <p className="text-xs text-muted-foreground">
                      Media per ordine
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prodotti Venduti</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-[100px]" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">{salesData?.totalProducts || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Totale prodotti venduti
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Andamento Vendite</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                {isLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : (
                  <Overview 
                    data={getSafeArray(salesData?.salesByDay).map(item => ({
                      date: item.date,
                      total: item.total_revenue || 0
                    }))} 
                  />
                )}
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Vendite Recenti</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-4 w-[150px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <RecentSales 
                    data={getSafeArray(salesData?.recentSales).map(sale => ({
                      id: sale.id,
                      code: sale.code,
                      total: Number(sale.total) || 0,
                      date: sale.date,
                      client: {
                        name: sale.client_name || 'Cliente Generico'
                      }
                    }))} 
                  />
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardContent className="pl-2">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-[200px] w-[200px] mx-auto rounded-full" />
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-4 w-full" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <TopProducts 
                    data={getSafeArray(salesData?.topProducts)} 
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
