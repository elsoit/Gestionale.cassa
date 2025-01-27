'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2, Pencil } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { format } from 'date-fns'
import { ColumnDef, Row } from "@tanstack/react-table"

interface PriceList {
  id: number;
  price_list_id: number;
  punto_vendita_id: number;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  price_list_name: string;
}

interface Promotion {
  id: number;
  promotion_id: number;
  punto_vendita_id: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  description: string;
  query: string;
  name: string;
}

interface DiscountList {
  id: number;
  discount_list_id: number;
  punto_vendita_id: number;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  discount_list_name: string;
  description: string;
}

// API fetch function
const fetchData = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
    throw new Error(error.message || `Errore ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

function PriceListsTab({ puntoVenditaId }: { puntoVenditaId: string }) {
  const [isNewListModalOpen, setIsNewListModalOpen] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch price lists for this punto vendita
  const { data: connectedLists, isLoading } = useQuery({
    queryKey: ['puntoVenditaPriceLists', puntoVenditaId],
    queryFn: () => fetchData(`${process.env.API_URL}/api/punti-vendita-price-list/punto-vendita/${puntoVenditaId}`)
  });

  // Fetch all available price lists
  const { data: allPriceLists } = useQuery({
    queryKey: ['priceLists'],
    queryFn: () => fetchData(`${process.env.API_URL}/api/price-lists`)
  });

  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const response = await fetch(`${process.env.API_URL}/api/punti-vendita-price-list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puntoVenditaPriceLists', puntoVenditaId] });
      toast({
        title: "Successo",
        description: "Listino prezzi collegato con successo",
      });
      setIsNewListModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Errore nel collegamento del listino prezzi",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      const response = await fetch(`${process.env.API_URL}/api/punti-vendita-price-list/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['puntoVenditaPriceLists', puntoVenditaId] });
      toast({
        title: data.is_active ? "Listino attivato" : "Listino disattivato",
        description: data.is_active ? "Il listino è stato attivato con successo" : "Il listino è stato disattivato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del listino",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${process.env.API_URL}/api/punti-vendita-price-list/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puntoVenditaPriceLists', puntoVenditaId] });
      toast({
        title: "Listino eliminato",
        description: "Il listino è stato eliminato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del listino",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      punto_vendita_id: parseInt(puntoVenditaId),
      price_list_id: parseInt(selectedPriceList),
      start_time: startDate,
      end_time: endDate || null,
      is_active: false
    });
  };

  if (isLoading) return <div>Caricamento...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Listini Prezzi Collegati</h3>
        <Dialog open={isNewListModalOpen} onOpenChange={setIsNewListModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Collega Nuovo Listino
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Collega Nuovo Listino Prezzi</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price_list">Listino Prezzi</Label>
                <Select value={selectedPriceList} onValueChange={setSelectedPriceList}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un listino" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPriceLists?.map((list: any) => (
                      <SelectItem key={list.id} value={list.id.toString()}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Data Inizio</Label>
                <Input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Data Fine (opzionale)</Label>
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Collegamento in corso..." : "Collega Listino"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listino</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Data Inizio</TableHead>
              <TableHead>Data Fine</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connectedLists?.map((list: PriceList) => (
              <TableRow key={list.id}>
                <TableCell>{list.price_list_name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${list.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <Button
                      variant={list.is_active ? "default" : "outline"}
                      onClick={() => toggleMutation.mutate({ id: list.id, isActive: list.is_active })}
                      disabled={toggleMutation.isPending}
                      size="sm"
                    >
                      {list.is_active ? "Attivo" : "Non attivo"}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{format(new Date(list.start_time), 'dd/MM/yyyy')}</TableCell>
                <TableCell>{list.end_time ? format(new Date(list.end_time), 'dd/MM/yyyy') : '-'}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm('Sei sicuro di voler eliminare questo listino?')) {
                        deleteMutation.mutate(list.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DiscountListsTab({ puntoVenditaId }: { puntoVenditaId: string }) {
  const [isNewListModalOpen, setIsNewListModalOpen] = useState(false);
  const [selectedDiscountList, setSelectedDiscountList] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch discount lists for this punto vendita
  const { data: connectedLists, isLoading } = useQuery({
    queryKey: ['puntoVenditaDiscountLists', puntoVenditaId],
    queryFn: () => fetchData(`${process.env.API_URL}/api/punti-vendita-discount-list/punto-vendita/${puntoVenditaId}`)
  });

  // Fetch all available discount lists
  const { data: allDiscountLists } = useQuery({
    queryKey: ['discountLists'],
    queryFn: () => fetchData(`${process.env.API_URL}/api/discount-lists`)
  });

  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const response = await fetch(`${process.env.API_URL}/api/punti-vendita-discount-list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puntoVenditaDiscountLists', puntoVenditaId] });
      toast({
        title: "Successo",
        description: "Listino sconti collegato con successo",
      });
      setIsNewListModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Errore nel collegamento del listino sconti",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      const response = await fetch(`${process.env.API_URL}/api/punti-vendita-discount-list/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['puntoVenditaDiscountLists', puntoVenditaId] });
      toast({
        title: data.is_active ? "Listino attivato" : "Listino disattivato",
        description: data.is_active ? "Il listino è stato attivato con successo" : "Il listino è stato disattivato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento del listino",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${process.env.API_URL}/api/punti-vendita-discount-list/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puntoVenditaDiscountLists', puntoVenditaId] });
      toast({
        title: "Listino eliminato",
        description: "Il listino è stato eliminato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del listino",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      punto_vendita_id: parseInt(puntoVenditaId),
      discount_list_id: parseInt(selectedDiscountList),
      start_time: startDate,
      end_time: endDate || null,
      is_active: false
    });
  };

  if (isLoading) return <div>Caricamento...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Listini Sconti Collegati</h3>
        <Dialog open={isNewListModalOpen} onOpenChange={setIsNewListModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Collega Nuovo Listino
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Collega Nuovo Listino Sconti</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="discount_list">Listino Sconti</Label>
                <Select value={selectedDiscountList} onValueChange={setSelectedDiscountList}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un listino" />
                  </SelectTrigger>
                  <SelectContent>
                    {allDiscountLists?.map((list: any) => (
                      <SelectItem key={list.id} value={list.id.toString()}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Data Inizio</Label>
                <Input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Data Fine (opzionale)</Label>
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Collegamento in corso..." : "Collega Listino"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listino</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Data Inizio</TableHead>
              <TableHead>Data Fine</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connectedLists?.map((list: DiscountList) => (
              <TableRow key={list.id}>
                <TableCell>{list.discount_list_name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${list.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <Button
                      variant={list.is_active ? "default" : "outline"}
                      onClick={() => toggleMutation.mutate({ id: list.id, isActive: list.is_active })}
                      disabled={toggleMutation.isPending}
                      size="sm"
                    >
                      {list.is_active ? "Attivo" : "Non attivo"}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{format(new Date(list.start_time), 'dd/MM/yyyy')}</TableCell>
                <TableCell>{list.end_time ? format(new Date(list.end_time), 'dd/MM/yyyy') : '-'}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm('Sei sicuro di voler eliminare questo listino?')) {
                        deleteMutation.mutate(list.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PromotionsTab({ puntoVenditaId }: { puntoVenditaId: string }) {
  const [isNewPromotionModalOpen, setIsNewPromotionModalOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch promotions for this punto vendita
  const { data: connectedPromotions, isLoading } = useQuery({
    queryKey: ['puntoVenditaPromotions', puntoVenditaId],
    queryFn: () => fetchData(`${process.env.API_URL}/api/punti-vendita-promotions/punto-vendita/${puntoVenditaId}`)
  });

  // Fetch all available promotions
  const { data: allPromotions } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => fetchData(`${process.env.API_URL}/api/promotions`)
  });

  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const response = await fetch(`${process.env.API_URL}/api/punti-vendita-promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puntoVenditaPromotions', puntoVenditaId] });
      toast({
        title: "Successo",
        description: "Promozione collegata con successo",
      });
      setIsNewPromotionModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Errore nel collegamento della promozione",
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      const response = await fetch(`${process.env.API_URL}/api/punti-vendita-promotions/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['puntoVenditaPromotions', puntoVenditaId] });
      toast({
        title: data.is_active ? "Promozione attivata" : "Promozione disattivata",
        description: data.is_active ? "La promozione è stata attivata con successo" : "La promozione è stata disattivata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della promozione",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${process.env.API_URL}/api/punti-vendita-promotions/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puntoVenditaPromotions', puntoVenditaId] });
      toast({
        title: "Promozione eliminata",
        description: "La promozione è stata eliminata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione della promozione",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      punto_vendita_id: parseInt(puntoVenditaId),
      promotion_id: parseInt(selectedPromotion),
      start_time: startDate,
      end_time: endDate,
      is_active: false
    });
  };

  if (isLoading) return <div>Caricamento...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Promozioni Collegate</h3>
        <Dialog open={isNewPromotionModalOpen} onOpenChange={setIsNewPromotionModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Collega Nuova Promozione
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Collega Nuova Promozione</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="promotion">Promozione</Label>
                <Select value={selectedPromotion} onValueChange={setSelectedPromotion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una promozione" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPromotions?.map((promo: any) => (
                      <SelectItem key={promo.id} value={promo.id.toString()}>
                        {promo.name} - {promo.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Data Inizio</Label>
                <Input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Data Fine</Label>
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Collegamento in corso..." : "Collega Promozione"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Data Inizio</TableHead>
              <TableHead>Data Fine</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connectedPromotions?.map((promo: Promotion) => (
              <TableRow key={promo.id}>
                <TableCell>{promo.name}</TableCell>
                <TableCell>{promo.description}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${promo.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <Button
                      variant={promo.is_active ? "default" : "outline"}
                      onClick={() => toggleMutation.mutate({ id: promo.id, isActive: promo.is_active })}
                      disabled={toggleMutation.isPending}
                      size="sm"
                    >
                      {promo.is_active ? "Attiva" : "Non attiva"}
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{format(new Date(promo.start_time), 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell>{format(new Date(promo.end_time), 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm('Sei sicuro di voler eliminare questa promozione?')) {
                        deleteMutation.mutate(promo.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StoreOperatorsTab({ puntoVenditaId }: { puntoVenditaId: string }) {
  const [isNewOperatorModalOpen, setIsNewOperatorModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedOperator, setSelectedOperator] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [operatorToEdit, setOperatorToEdit] = useState<any>(null)
  
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Fetch store operators
  const { data: storeOperators, isLoading } = useQuery({
    queryKey: ['storeOperators', puntoVenditaId],
    queryFn: () => fetchData(`${process.env.API_URL}/api/operators/store/${puntoVenditaId}`)
  })

  // Fetch available operators
  const { data: availableOperators } = useQuery({
    queryKey: ['availableOperators', puntoVenditaId],
    queryFn: () => fetchData(`${process.env.API_URL}/api/operators/available/${puntoVenditaId}`)
  })

  // Fetch role types
  const { data: roleTypes } = useQuery({
    queryKey: ['roleTypes'],
    queryFn: () => fetchData(`${process.env.API_URL}/api/operators/roles/types`)
  })

  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const response = await fetch(`${process.env.API_URL}/api/operators/store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newData),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Errore durante l\'aggiunta dell\'operatore')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeOperators', puntoVenditaId] })
      queryClient.invalidateQueries({ queryKey: ['availableOperators', puntoVenditaId] })
      toast({
        title: "Successo",
        description: "Operatore aggiunto con successo",
      })
      setIsNewOperatorModalOpen(false)
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${process.env.API_URL}/api/operators/store/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeOperators', puntoVenditaId] })
      queryClient.invalidateQueries({ queryKey: ['availableOperators', puntoVenditaId] })
      toast({
        title: "Operatore rimosso",
        description: "L'operatore è stato rimosso con successo",
      })
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la rimozione dell'operatore",
        variant: "destructive",
      })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number, role: string }) => {
      const response = await fetch(`${process.env.API_URL}/api/operators/store/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Errore durante l\'aggiornamento del ruolo')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeOperators', puntoVenditaId] })
      toast({
        title: "Successo",
        description: "Ruolo aggiornato con successo",
      })
      setIsEditModalOpen(false)
      setOperatorToEdit(null)
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleEdit = (operator: any) => {
    setOperatorToEdit(operator)
    setSelectedRole(operator.role)
    setIsEditModalOpen(true)
  }

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!operatorToEdit) return
    
    updateMutation.mutate({
      id: operatorToEdit.id,
      role: selectedRole
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      punto_vendita_id: parseInt(puntoVenditaId),
      operatore_id: parseInt(selectedOperator),
      role: selectedRole
    })
  }

  if (isLoading) return <div>Caricamento...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Operatori del Punto Vendita</h3>
        <Dialog open={isNewOperatorModalOpen} onOpenChange={setIsNewOperatorModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi Operatore
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Nuovo Operatore</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="operator">Operatore</Label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un operatore" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOperators?.map((op: any) => (
                      <SelectItem key={op.id} value={op.id.toString()}>
                        {op.cognome} {op.nome} ({op.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Ruolo</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleTypes?.map((role: string) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Aggiunta in corso..." : "Aggiungi Operatore"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codice</TableHead>
              <TableHead>Cognome</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Ruolo</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {storeOperators?.map((op: any) => (
              <TableRow key={op.id}>
                <TableCell>{op.code}</TableCell>
                <TableCell>{op.cognome}</TableCell>
                <TableCell>{op.nome}</TableCell>
                <TableCell>{op.role}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(op)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Sei sicuro di voler rimuovere questo operatore?')) {
                          deleteMutation.mutate(op.id)
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Ruolo Operatore</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Operatore</Label>
              <p className="text-sm">{operatorToEdit?.cognome} {operatorToEdit?.nome} ({operatorToEdit?.code})</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Ruolo</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un ruolo" />
                </SelectTrigger>
                <SelectContent>
                  {roleTypes?.map((role: string) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Aggiornamento in corso..." : "Aggiorna Ruolo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PuntoVenditaDetail({ params }: { params: { id: string } }) {
  const { data: puntoVendita, isLoading } = useQuery({
    queryKey: ['puntoVendita', params.id],
    queryFn: () => fetchData(`${process.env.API_URL}/api/punti-vendita/${params.id}`)
  });

  if (isLoading) return <div>Caricamento...</div>;
  if (!puntoVendita) return <div>Punto vendita non trovato</div>;

  return (
    <div className="container mx-auto mt-8 p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{puntoVendita.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Codice</Label>
              <p className="text-sm">{puntoVendita.code}</p>
            </div>
            <div>
              <Label>Canale</Label>
              <p className="text-sm">{puntoVendita.channel_name}</p>
            </div>
            <div>
              <Label>Magazzino</Label>
              <p className="text-sm">{puntoVendita.warehouse_name}</p>
            </div>
            <div>
              <Label>Stato</Label>
              <p className="text-sm">{puntoVendita.status_name}</p>
            </div>
            <div className="col-span-2">
              <Label>Indirizzo</Label>
              <p className="text-sm">{puntoVendita.address}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="price-lists">
        <TabsList>
          <TabsTrigger value="price-lists">Listini Prezzi</TabsTrigger>
          <TabsTrigger value="discount-lists">Listini Sconti</TabsTrigger>
          <TabsTrigger value="promotions">Promozioni</TabsTrigger>
          <TabsTrigger value="operators">Operatori</TabsTrigger>
        </TabsList>
        <TabsContent value="price-lists">
          <Card>
            <CardContent className="pt-6">
              <PriceListsTab puntoVenditaId={params.id} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="discount-lists">
          <Card>
            <CardContent className="pt-6">
              <DiscountListsTab puntoVenditaId={params.id} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="promotions">
          <Card>
            <CardContent className="pt-6">
              <PromotionsTab puntoVenditaId={params.id} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="operators">
          <Card>
            <CardContent className="pt-6">
              <StoreOperatorsTab puntoVenditaId={params.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 