'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, MoreHorizontal, Trash2, Search, ScanBarcode } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Load {
  id: number
  code: string
  supply_id: number | null
  status_id: number
  warehouse_id: number
  total_cost?: number
  total_items?: number
  created_at: string
}

interface Supply {
  id: number
  name: string
}

interface Status {
  id: number
  name: string
}

interface Warehouse {
  id: number
  name: string
}

interface LoadProduct {
  cost: number
  quantity: number
}

export default function LoadsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loads, setLoads] = useState<Load[]>([])
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newLoad, setNewLoad] = useState({
    code: '',
    supply_id: undefined as number | undefined,
    status_id: 9, // Stato bozza (id: 9)
    warehouse_id: ''
  })

  const [isConfirming, setIsConfirming] = useState<number | null>(null)
  const [isRevoking, setIsRevoking] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [selectedLoadAction, setSelectedLoadAction] = useState<{ id: number; action: 'confirm' | 'revoke' | 'delete' } | null>(null)

  useEffect(() => {
    fetchLoads()
    fetchSupplies()
    fetchStatuses()
    fetchWarehouses()
  }, [])

  const fetchLoads = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/loads/')
      if (!response.ok) throw new Error('Failed to fetch loads')
      const data = await response.json()
      
      // Fetch totals for each load
      const loadsWithTotals = await Promise.all(data.map(async (load: Load) => {
        const productsResponse = await fetch(`http://localhost:3003/api/load-products/load/${load.id}`)
        if (!productsResponse.ok) throw new Error(`Failed to fetch products for load ${load.id}`)
        const products = await productsResponse.json()
        
        const totalCost = products.reduce((sum: number, p: LoadProduct) => sum + (p.cost * p.quantity), 0)
        const totalItems = products.reduce((sum: number, p: LoadProduct) => sum + p.quantity, 0)
        
        return {
          ...load,
          total_cost: totalCost,
          total_items: totalItems
        }
      }))
      
      setLoads(loadsWithTotals)
    } catch (error) {
      console.error('Error fetching loads:', error)
      toast({
        title: "Error",
        description: "Failed to fetch loads. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchSupplies = async () => {
    try {
      // Per ora, usa un array vuoto dato che l'endpoint non esiste
      setSupplies([])
      /* 
      Quando l'endpoint sarà disponibile, riattiva questo codice:
      const response = await fetch('http://localhost:3003/api/supplies/')
      if (!response.ok) throw new Error('Failed to fetch supplies')
      const data = await response.json()
      setSupplies(data)
      */
    } catch (error) {
      console.error('Error fetching supplies:', error)
      setSupplies([]) // Fallback a un array vuoto in caso di errore
    }
  }

  const fetchStatuses = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/statuses/')
      if (!response.ok) throw new Error('Failed to fetch statuses')
      const data = await response.json()
      setStatuses(data)
    } catch (error) {
      console.error('Error fetching statuses:', error)
      toast({
        title: "Error",
        description: "Failed to fetch statuses. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/warehouses/')
      if (!response.ok) throw new Error('Failed to fetch warehouses')
      const data = await response.json()
      setWarehouses(data)
    } catch (error) {
      console.error('Error fetching warehouses:', error)
      toast({
        title: "Error",
        description: "Failed to fetch warehouses. Please try again.",
        variant: "destructive",
      })
    }
  }

  const generateLoadCode = () => {
    const year = new Date().getFullYear().toString().slice(-2)
    const sequence = (loads.length + 1).toString().padStart(6, '0')
    return `LD${year}${sequence}`
  }

  const handleCreateLoad = async () => {
    try {
      // Verifica che i campi obbligatori siano presenti
      if (!newLoad.code || !newLoad.warehouse_id || !newLoad.status_id) {
        toast({
          title: "Errore",
          description: "Tutti i campi obbligatori devono essere compilati",
          variant: "destructive",
        });
        return;
      }

      const loadData = {
        code: newLoad.code,
        status_id: parseInt(newLoad.status_id.toString()),
        warehouse_id: parseInt(newLoad.warehouse_id.toString()),
        supply_id: newLoad.supply_id ? parseInt(newLoad.supply_id.toString()) : null
      };

      const response = await fetch('http://localhost:3003/api/loads/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loadData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create load');
      }

      const createdLoad = await response.json();
      setIsDialogOpen(false);
      fetchLoads();
      toast({
        title: "Success",
        description: "New load created successfully.",
      });
      router.push(`/loads/${createdLoad.id}`);
    } catch (error) {
      console.error('Error creating load:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create new load",
        variant: "destructive",
      });
    }
  };

  const handleConfirmLoad = async (loadId: number) => {
    if (isConfirming === loadId) return

    try {
      setIsConfirming(loadId)
      const response = await fetch(`http://localhost:3003/api/loads/${loadId}/confirm`, {
        method: 'PUT',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to confirm load')
      }

      toast({
        title: "Successo",
        description: "Carico confermato con successo",
      })

      fetchLoads() // Refresh the loads list
    } catch (error) {
      console.error(error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante la conferma del carico",
        variant: "destructive",
      })
    } finally {
      setIsConfirming(null)
    }
  }

  const handleRevokeLoad = async (loadId: number) => {
    if (isRevoking === loadId) return

    try {
      setIsRevoking(loadId)
      const response = await fetch(`http://localhost:3003/api/loads/${loadId}/revoke`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to revoke load')
      }

      toast({
        title: "Successo",
        description: "Carico revocato con successo",
      })

      fetchLoads() // Refresh the loads list
    } catch (error) {
      console.error(error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante la revoca del carico",
        variant: "destructive",
      })
    } finally {
      setIsRevoking(null)
    }
  }

  const handleDeleteLoad = async (loadId: number) => {
    if (isDeleting === loadId) return

    try {
      setIsDeleting(loadId)
      const response = await fetch(`http://localhost:3003/api/loads/${loadId}/delete`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete load')
      }

      toast({
        title: "Successo",
        description: "Carico cancellato con successo",
      })

      fetchLoads() // Refresh the loads list
    } catch (error) {
      console.error(error)
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante la cancellazione del carico",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleConfirmAction = async () => {
    if (!selectedLoadAction) return

    switch (selectedLoadAction.action) {
      case 'confirm':
        await handleConfirmLoad(selectedLoadAction.id)
        break
      case 'revoke':
        await handleRevokeLoad(selectedLoadAction.id)
        break
      case 'delete':
        await handleDeleteLoad(selectedLoadAction.id)
        break
    }
    setSelectedLoadAction(null)
  }

  const getStatusBadgeStyle = (statusId: number) => {
    switch (statusId) {
      case 9: // bozza
        return "bg-gray-100 text-gray-800 border-gray-200"
      case 10: // caricato
        return "bg-green-100 text-green-800 border-green-200"
      case 11: // revocato
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case 12: // cancellato
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const sortedLoads = loads;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Carichi</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setNewLoad({ ...newLoad, code: generateLoadCode() })}>
              <Plus className="mr-2 h-4 w-4" /> Nuovo Carico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea Nuovo Carico</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="code" className="text-right">
                  Codice
                </label>
                <Input id="code" value={newLoad.code} readOnly className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="supply" className="text-right">
                  Fornitura (opzionale)
                </label>
                <Select
                  value={newLoad.supply_id?.toString() || ""}
                  onValueChange={(value) => setNewLoad({ ...newLoad, supply_id: value ? parseInt(value) : undefined })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleziona fornitura (opzionale)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Nessuna fornitura</SelectItem>
                    {supplies.map((supply) => (
                      <SelectItem key={supply.id} value={supply.id.toString()}>
                        {supply.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="warehouse" className="text-right">
                  Magazzino
                </label>
                <Select
                  value={newLoad.warehouse_id}
                  onValueChange={(value) => setNewLoad({ ...newLoad, warehouse_id: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleziona magazzino" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreateLoad}>Crea</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codice</TableHead>
              <TableHead>Fornitura</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Magazzino</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Totale €</TableHead>
              <TableHead className="text-right">Totale Articoli</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLoads.map((load) => (
              <TableRow
                key={load.id}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => router.push(`/loads/${load.id}`)}
              >
                <TableCell>{load.code}</TableCell>
                <TableCell>{supplies.find(s => s.id === load.supply_id)?.name || '-'}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${getStatusBadgeStyle(load.status_id)}`}>
                    {statuses.find(s => s.id === load.status_id)?.name || '-'}
                  </span>
                </TableCell>
                <TableCell>{warehouses.find(w => w.id === load.warehouse_id)?.name || '-'}</TableCell>
                <TableCell>
                  {load.created_at ? new Date(load.created_at).toLocaleString('it-IT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  }) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {typeof load.total_cost === 'number' ? 
                    `€ ${Number(load.total_cost).toFixed(2)}`.replace('.', ',') : 
                    '€ 0,00'}
                </TableCell>
                <TableCell className="text-right">
                  {typeof load.total_items === 'number' ? 
                    Math.floor(load.total_items) : 
                    0}
                </TableCell>
                <TableCell className="text-right">
                  {load.status_id !== 12 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {load.status_id === 9 && (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedLoadAction({ id: load.id, action: 'confirm' })
                              }}
                              disabled={isConfirming === load.id}
                              className="text-green-600 hover:text-green-700 focus:text-green-700"
                            >
                              {isConfirming === load.id ? "Confermando..." : "Conferma Carico"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedLoadAction({ id: load.id, action: 'delete' })
                              }}
                              disabled={isDeleting === load.id}
                              className="text-red-600 hover:text-red-700 focus:text-red-700"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {isDeleting === load.id ? "Cancellando..." : "Cancella"}
                            </DropdownMenuItem>
                          </>
                        )}
                        {load.status_id === 11 && (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedLoadAction({ id: load.id, action: 'confirm' })
                              }}
                              disabled={isConfirming === load.id}
                              className="text-green-600 hover:text-green-700 focus:text-green-700"
                            >
                              {isConfirming === load.id ? "Confermando..." : "Riconferma Carico"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedLoadAction({ id: load.id, action: 'delete' })
                              }}
                              disabled={isDeleting === load.id}
                              className="text-red-600 hover:text-red-700 focus:text-red-700"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {isDeleting === load.id ? "Cancellando..." : "Cancella"}
                            </DropdownMenuItem>
                          </>
                        )}
                        {load.status_id === 10 && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedLoadAction({ id: load.id, action: 'revoke' })
                            }}
                            disabled={isRevoking === load.id}
                            className="text-red-600 hover:text-red-700 focus:text-red-700"
                          >
                            {isRevoking === load.id ? "Revocando..." : "Revoca Carico"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog di conferma */}
      <Dialog open={!!selectedLoadAction} onOpenChange={() => setSelectedLoadAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma operazione</DialogTitle>
            <DialogDescription>
              {selectedLoadAction?.action === 'confirm' && "Sei sicuro di voler confermare questo carico?"}
              {selectedLoadAction?.action === 'revoke' && "Sei sicuro di voler revocare questo carico?"}
              {selectedLoadAction?.action === 'delete' && "Sei sicuro di voler cancellare questo carico?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLoadAction(null)}>Annulla</Button>
            <Button 
              onClick={handleConfirmAction}
              variant={selectedLoadAction?.action === 'confirm' ? 'default' : 'destructive'}
              className={selectedLoadAction?.action === 'confirm' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}