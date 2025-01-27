'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MoreHorizontal, Plus } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// API fetch function
const fetchData = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
    throw new Error(error.message || `Errore ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

function DataTable({ data, onEdit, onDelete }: { data: any[], onEdit: (item: any) => void, onDelete: (item: any) => void }) {
  const columns = ['name', 'code', 'channel_name', 'warehouse_name', 'address', 'status_name'];
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/punti-vendita/${item.id}`}>
            {columns.map((column) => (
              <TableCell key={`${item.id}-${column}`}>
                {item[column]}
              </TableCell>
            ))}
            <TableCell onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    Modifica
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(item)}
                    className="text-red-600"
                  >
                    Elimina
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function EntryForm({ 
  initialData, 
  onSubmit, 
  onCancel 
}: { 
  initialData?: any, 
  onSubmit: (data: any) => Promise<any>, 
  onCancel: () => void 
}) {
  const [formData, setFormData] = useState(initialData || {});
  const [selectedChannel, setSelectedChannel] = useState(initialData?.channel_id?.toString() || '');
  const [selectedWarehouse, setSelectedWarehouse] = useState(initialData?.warehouse_id?.toString() || '');
  const [selectedStatus, setSelectedStatus] = useState(initialData?.status_id?.toString() || '');
  const [selectedAddress, setSelectedAddress] = useState(initialData?.address_id?.toString() || '');

  // Fetch delle opzioni per i punti vendita
  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => fetchData(`${process.env.API_URL}/api/channels`)
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => fetchData(`${process.env.API_URL}/api/warehouses`)
  });

  const { data: statuses } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => fetchData(`${process.env.API_URL}/api/statuses/field/Stores`)
  });

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => fetchData(`${process.env.API_URL}/api/addresses`)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const puntoVenditaData = {
        name: formData.name,
        code: formData.code,
        channel_id: parseInt(selectedChannel),
        warehouse_id: parseInt(selectedWarehouse),
        address_id: parseInt(selectedAddress),
        status_id: parseInt(selectedStatus)
      };
      
      if (initialData?.id) {
        await onSubmit({ ...puntoVenditaData, id: initialData.id });
      } else {
        await onSubmit(puntoVenditaData);
      }
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Codice</Label>
        <Input
          value={formData.code || ''}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Canale</Label>
        <Select
          value={selectedChannel}
          onValueChange={setSelectedChannel}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona canale" />
          </SelectTrigger>
          <SelectContent>
            {channels?.map((channel: any) => (
              <SelectItem key={channel.id} value={channel.id.toString()}>
                {channel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Magazzino</Label>
        <Select
          value={selectedWarehouse}
          onValueChange={setSelectedWarehouse}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona magazzino" />
          </SelectTrigger>
          <SelectContent>
            {warehouses?.map((warehouse: any) => (
              <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Indirizzo</Label>
        <Select
          value={selectedAddress}
          onValueChange={setSelectedAddress}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona indirizzo" />
          </SelectTrigger>
          <SelectContent>
            {addresses?.map((address: any) => (
              <SelectItem key={address.id} value={address.id.toString()}>
                {address.address}, {address.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Stato</Label>
        <Select
          value={selectedStatus}
          onValueChange={setSelectedStatus}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona stato" />
          </SelectTrigger>
          <SelectContent>
            {statuses?.map((status: any) => (
              <SelectItem key={status.id} value={status.id.toString()}>
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>
        <Button 
          type="submit"
          disabled={!formData.name || !formData.code || !selectedChannel || !selectedWarehouse || !selectedAddress || !selectedStatus}
        >
          Salva
        </Button>
      </div>
    </form>
  );
}

export default function PuntiVendita() {
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, error, isLoading } = useQuery({
    queryKey: ['puntiVendita'],
    queryFn: () => fetchData(`${process.env.API_URL}/api/punti-vendita`)
  });

  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const response = await fetch(`${process.env.API_URL}/api/punti-vendita`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puntiVendita'] })
      toast({
        title: "Successo",
        description: "Punto vendita creato con successo",
      })
      setIsNewEntryModalOpen(false)
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Errore nella creazione del punto vendita",
        variant: "destructive",
      })
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const response = await fetch(`${process.env.API_URL}/api/punti-vendita/${updatedData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puntiVendita'] })
      toast({
        title: "Successo",
        description: "Punto vendita aggiornato con successo",
      });
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento del punto vendita",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (item: any) => {
      return fetch(`${process.env.API_URL}/api/punti-vendita/${item.id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puntiVendita'] })
      toast({
        title: "Successo",
        description: "Punto vendita eliminato con successo",
      });
      setIsDeleteAlertOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Errore nell'eliminazione del punto vendita",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (item: Record<string, any>) => {
    setCurrentItem(item);
    setIsEditModalOpen(true);
  }

  const handleDelete = (item: Record<string, any>) => {
    setCurrentItem(item);
    setIsDeleteAlertOpen(true);
  }

  const confirmDelete = () => {
    if (currentItem) {
      deleteMutation.mutate(currentItem);
    }
  };

  if (isLoading) return <div>Caricamento...</div>;
  if (error) return <div>Si è verificato un errore nel caricamento dei dati</div>;

  return (
    <div className="container mx-auto mt-8 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Punti Vendita</span>
            <Dialog open={isNewEntryModalOpen} onOpenChange={setIsNewEntryModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuovo Punto Vendita
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuovo Punto Vendita</DialogTitle>
                </DialogHeader>
                <EntryForm 
                  onSubmit={createMutation.mutateAsync} 
                  onCancel={() => setIsNewEntryModalOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            data={data}
            onEdit={handleEdit} 
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Punto Vendita</DialogTitle>
          </DialogHeader>
          <EntryForm 
            initialData={currentItem}
            onSubmit={updateMutation.mutateAsync} 
            onCancel={() => setIsEditModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare questo punto vendita?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il punto vendita verrà eliminato permanentemente dal database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 