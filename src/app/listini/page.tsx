'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useRouter } from 'next/navigation'

interface PriceList {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
  products_count: number
  average_price: number
}

interface DiscountList {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
  products_count: number
  average_discount: number
}

export default function ListsPage() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [discountLists, setDiscountLists] = useState<DiscountList[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [activeTab, setActiveTab] = useState('prices')
  const router = useRouter()

  const fetchPriceLists = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/price-lists')
      const data = await response.json()
      setPriceLists(data)
    } catch (error) {
      console.error('Error fetching price lists:', error)
      toast.error('Errore nel caricamento dei listini prezzi')
    }
  }

  const fetchDiscountLists = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/discount-lists')
      const data = await response.json()
      setDiscountLists(data)
    } catch (error) {
      console.error('Error fetching discount lists:', error)
      toast.error('Errore nel caricamento dei listini sconti')
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      await Promise.all([fetchPriceLists(), fetchDiscountLists()])
      setIsLoading(false)
    }
    fetchData()
  }, [])

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: it })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100)
  }

  const handleCreateList = async () => {
    try {
      const endpoint = activeTab === 'prices' ? 'price-lists' : 'discount-lists'
      const response = await fetch(`http://localhost:3003/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newListName,
          description: newListDescription,
        }),
      })

      if (!response.ok) throw new Error('Failed to create list')

      if (activeTab === 'prices') {
        await fetchPriceLists()
      } else {
        await fetchDiscountLists()
      }

      setIsDialogOpen(false)
      setNewListName('')
      setNewListDescription('')
      toast.success('Listino creato con successo')
    } catch (error) {
      console.error('Error creating list:', error)
      toast.error('Errore nella creazione del listino')
    }
  }

  const handleDeleteList = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo listino?')) return

    try {
      const endpoint = activeTab === 'prices' ? 'price-lists' : 'discount-lists'
      const response = await fetch(`http://localhost:3003/api/${endpoint}/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete list')

      if (activeTab === 'prices') {
        await fetchPriceLists()
      } else {
        await fetchDiscountLists()
      }

      toast.success('Listino eliminato con successo')
    } catch (error) {
      console.error('Error deleting list:', error)
      toast.error('Errore nell\'eliminazione del listino')
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Listini</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Nuovo Listino {activeTab === 'prices' ? 'Prezzi' : 'Sconti'}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea Nuovo Listino {activeTab === 'prices' ? 'Prezzi' : 'Sconti'}</DialogTitle>
                <DialogDescription>
                  Inserisci i dettagli per il nuovo listino.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Nome del listino"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrizione</Label>
                  <Textarea
                    id="description"
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    placeholder="Descrizione del listino"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleCreateList} disabled={!newListName.trim()}>
                  Crea Listino
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="prices" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="prices">Listini Prezzi</TabsTrigger>
          <TabsTrigger value="discounts">Listini Sconti</TabsTrigger>
        </TabsList>

        <TabsContent value="prices">
          <Card>
            <CardHeader>
              <CardTitle>Listini Prezzi</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrizione</TableHead>
                      <TableHead className="text-right">Prodotti</TableHead>
                      <TableHead className="text-right">Prezzo Medio</TableHead>
                      <TableHead>Creato il</TableHead>
                      <TableHead>Ultimo Aggiornamento</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceLists.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Nessun listino presente. Crea il tuo primo listino!
                        </TableCell>
                      </TableRow>
                    ) : (
                      priceLists.map((list) => (
                        <TableRow key={list.id}>
                          <TableCell className="font-medium">{list.name}</TableCell>
                          <TableCell>{list.description || '-'}</TableCell>
                          <TableCell className="text-right">{list.products_count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(list.average_price)}</TableCell>
                          <TableCell>{formatDate(list.created_at)}</TableCell>
                          <TableCell>{formatDate(list.updated_at)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button 
                              variant="outline" 
                              onClick={() => router.push(`/listini/${list.id}`)}
                            >
                              Prodotti
                            </Button>
                            <Button variant="outline">Modifica</Button>
                            <Button 
                              variant="destructive"
                              onClick={() => handleDeleteList(list.id)}
                            >
                              Elimina
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discounts">
          <Card>
            <CardHeader>
              <CardTitle>Listini Sconti</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrizione</TableHead>
                      <TableHead className="text-right">Prodotti</TableHead>
                      <TableHead className="text-right">Sconto Medio</TableHead>
                      <TableHead>Creato il</TableHead>
                      <TableHead>Ultimo Aggiornamento</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discountLists.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Nessun listino sconti presente. Crea il tuo primo listino!
                        </TableCell>
                      </TableRow>
                    ) : (
                      discountLists.map((list) => (
                        <TableRow key={list.id}>
                          <TableCell className="font-medium">{list.name}</TableCell>
                          <TableCell>{list.description || '-'}</TableCell>
                          <TableCell className="text-right">{list.products_count}</TableCell>
                          <TableCell className="text-right">{formatPercentage(list.average_discount)}</TableCell>
                          <TableCell>{formatDate(list.created_at)}</TableCell>
                          <TableCell>{formatDate(list.updated_at)}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button 
                              variant="outline" 
                              onClick={() => router.push(`/listini-sconti/${list.id}`)}
                            >
                              Prodotti
                            </Button>
                            <Button variant="outline">Modifica</Button>
                            <Button 
                              variant="destructive"
                              onClick={() => handleDeleteList(list.id)}
                            >
                              Elimina
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 