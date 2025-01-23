'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Settings as SettingsIcon, Plus, MoreHorizontal, Euro, CreditCard, Link2, Ticket, Wallet, Banknote, QrCode, Smartphone } from 'lucide-react'
import { Switch } from "@/components/ui/switch"
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
import { AttributeDialog } from '../components/attribute-dialog'

const settingsSections = [
  { name: "Brands", apiLink: "http://localhost:3003/api/brands", defaultColumns: ['name', 'description'] },
  { name: "Channels", apiLink: "http://localhost:3003/api/channels", defaultColumns: ['name', 'code'] },
  { 
    name: "Punti Vendita", 
    apiLink: "http://localhost:3003/api/punti-vendita", 
    defaultColumns: ['name', 'code', 'channel_name', 'warehouse_name', 'address', 'status_name'],
    hasRelations: true,
    relationsConfig: {
      references: [
        { name: 'Channel', apiLink: 'http://localhost:3003/api/channels' },
        { name: 'Warehouse', apiLink: 'http://localhost:3003/api/warehouses' },
        { name: 'Address', apiLink: 'http://localhost:3003/api/addresses' },
        { name: 'Status', apiLink: 'http://localhost:3003/api/statuses' }
      ]
    }
  },
  { name: "Parameters", 
    apiLink: "http://localhost:3003/api/parameters", 
    defaultColumns: ['name', 'description', 'is_required', 'is_expandable'],
    hasAttributes: true
  },
  { name: "Payment Methods", apiLink: "http://localhost:3003/api/payment-methods", defaultColumns: ['name', 'code', 'description', 'icon'] },
  { 
    name: "Sizes", 
    apiLink: "http://localhost:3003/api/sizes", 
    defaultColumns: ['name', 'code'],
    multipleCreate: true
  },
  { 
    name: "Size Groups", 
    apiLink: "http://localhost:3003/api/size-groups", 
    defaultColumns: ['name', 'description'],
    hasRelations: true,
    relationsConfig: {
      name: "Sizes",
      apiLink: (id: number) => `http://localhost:3003/api/size-group-sizes/group/${id}/sizes`,
      createLink: "http://localhost:3003/api/size-group-sizes",
      deleteLink: (id: number) => `http://localhost:3003/api/size-group-sizes/${id}`,
      columns: ['size_name']
    }
  },
  { 
    name: "Status", 
    apiLink: "http://localhost:3003/api/statuses", 
    defaultColumns: ['name', 'field'],
    hasEnum: true,
    enumConfig: {
      apiLink: "http://localhost:3003/api/statuses/enum/fields"
    }
  },
  { name: "Types", apiLink: "http://localhost:3003/api/types", defaultColumns: ['typecategory', 'name', 'description'] },
  { name: "Warehouses", apiLink: "http://localhost:3003/api/warehouses", defaultColumns: ['name', 'code', 'address_id', 'description', 'type_id', 'status_id'] }
]

// API fetch function
const fetchData = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
    throw new Error(error.message || `Errore ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

// Aggiungi le icone disponibili per i metodi di pagamento
const paymentIcons = [
  { name: 'Euro', icon: Euro },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'Link2', icon: Link2 },
  { name: 'Ticket', icon: Ticket },
  { name: 'Wallet', icon: Wallet },
  { name: 'Banknote', icon: Banknote },
  { name: 'QrCode', icon: QrCode },
  { name: 'Smartphone', icon: Smartphone }
];

function DataTable({ data, columns, onEdit, onDelete, section }: { data: any[], columns: string[], onEdit: (item: any) => void, onDelete: (item: any) => void, section: any }) {
  // Filtra le colonne per mostrare solo quelle specificate in defaultColumns
  const visibleColumns = section.defaultColumns || columns;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {visibleColumns.map((column: string) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
            {visibleColumns.map((column: string) => (
              <TableCell key={`${item.id}-${column}`}>
                {column === 'icon' && section.name === 'Payment Methods' ? (
                  <div className="flex items-center justify-center">
                    {item[column] === 'Euro' && <Euro className="h-4 w-4" />}
                    {item[column] === 'CreditCard' && <CreditCard className="h-4 w-4" />}
                    {item[column] === 'Link2' && <Link2 className="h-4 w-4" />}
                    {item[column] === 'Ticket' && <Ticket className="h-4 w-4" />}
                    {item[column] === 'Wallet' && <Wallet className="h-4 w-4" />}
                    {item[column] === 'Banknote' && <Banknote className="h-4 w-4" />}
                    {item[column] === 'QrCode' && <QrCode className="h-4 w-4" />}
                    {item[column] === 'Smartphone' && <Smartphone className="h-4 w-4" />}
                  </div>
                ) : typeof item[column] === 'boolean' ? (
                  <Switch checked={item[column]} disabled />
                ) : (
                  item[column]
                )}
              </TableCell>
            ))}
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    Modify
                  </DropdownMenuItem>
                  {section.name === "Parameters" && (
                    <DropdownMenuItem onClick={() => section.onManageAttributes?.(item)}>
                      Manage Attributes
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => onDelete(item)}
                    className="text-red-600"
                  >
                    Delete
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

interface SubmitResult {
  id?: number;
}

interface Parameter {
  id: number;
  name: string;
  attributes: Array<{
    id: number;
    name: string;
    parameter_id?: number;
    attribute_id?: number;
    parameter_name?: string;
    attribute_name?: string;
    attribute_value?: string;
  }>;
}

interface Size {
  id: number;
  name: string;
  size_id?: number;
}

interface PriceRange {
  min: number | undefined;
  max: number | undefined;
}

interface PriceRanges {
  wholesale_price: PriceRange;
  retail_price: PriceRange;
}

interface Product {
  id: number;
  article_code: string;
  variant_code: string;
  size_id: number;
  wholesale_price: number;
  retail_price: number;
  brand_name?: string;
  brand_id?: number;
  size_group_id?: number;
  size_group_name?: string;
  status_id: number;
  status_name?: string;
  total_availability?: number;
  created_at?: string;
  updated_at?: string;
  attributes?: Array<{
    parameter_id: number;
    attribute_id: number;
    parameter_name: string;
    attribute_name: string;
    attribute_value?: string;
  }>;
}

function EntryForm({ 
  columns, 
  initialData, 
  onSubmit, 
  onCancel, 
  section,
  queryClient,
  setIsNewEntryModalOpen 
}: { 
  columns: string[], 
  initialData?: any, 
  onSubmit: (data: any) => Promise<SubmitResult>, 
  onCancel: () => void, 
  section: any,
  queryClient: any,
  setIsNewEntryModalOpen: (open: boolean) => void 
}) {
  const [formData, setFormData] = useState(() => {
    if (section.name === "Parameters") {
      return {
        name: initialData?.name || '',
        description: initialData?.description || '',
        is_required: initialData?.is_required || false,
        is_expandable: initialData?.is_expandable || false
      };
    }
    return initialData || {};
  });
  
  const [selectedSizes, setSelectedSizes] = useState<number[]>([])
  const { toast } = useToast()

  // Fetch all sizes if we're editing a size group
  const { data: allSizes } = useQuery({
    queryKey: ['sizes'],
    queryFn: () => fetchData('http://localhost:3003/api/sizes'),
    enabled: section.name === 'Size Groups'
  })

  // Fetch current sizes for this group if editing
  const { data: currentSizes } = useQuery({
    queryKey: ['sizeGroupSizes', initialData?.id],
    queryFn: async () => {
      if (!initialData?.id) return [];
      try {
        return await fetchData(`http://localhost:3003/api/size-group-sizes/${initialData.id}/sizes`);
      } catch (error) {
        console.error('Error fetching sizes:', error);
        return [];
      }
    },
    enabled: !!(section.name === 'Size Groups' && initialData?.id)
  })

  // Fetch enum values for status fields
  const { data: statusFields } = useQuery({
    queryKey: ['statusFields'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3003/api/statuses/enum/fields');
      const data = await response.json();
      return data || [];
    },
    enabled: section.name === 'Status'
  })

  // Set initial selected sizes when data is loaded
  useEffect(() => {
    if (currentSizes) {
      setSelectedSizes(currentSizes.map((s: any) => s.size_id));
    }
  }, [currentSizes])

  // Aggiungi questi stati per i punti vendita
  const [selectedChannel, setSelectedChannel] = useState(initialData?.channel_id?.toString() || '');
  const [selectedWarehouse, setSelectedWarehouse] = useState(initialData?.warehouse_id?.toString() || '');
  const [selectedStatus, setSelectedStatus] = useState(initialData?.status_id?.toString() || '');
  const [selectedAddress, setSelectedAddress] = useState(initialData?.address_id?.toString() || '');

  // Fetch delle opzioni per i punti vendita
  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => fetchData('http://localhost:3003/api/channels'),
    enabled: section.name === 'Punti Vendita'
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => fetchData('http://localhost:3003/api/warehouses'),
    enabled: section.name === 'Punti Vendita'
  });

  const { data: statuses } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => fetchData('http://localhost:3003/api/statuses/field/Stores'),
    enabled: section.name === 'Punti Vendita'
  });

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => fetchData('http://localhost:3003/api/addresses'),
    enabled: section.name === 'Punti Vendita'
  });

  // Aggiorna i valori selezionati quando initialData cambia
  useEffect(() => {
    if (initialData && section.name === 'Punti Vendita') {
      setSelectedChannel(initialData.channel_id?.toString() || '');
      setSelectedWarehouse(initialData.warehouse_id?.toString() || '');
      setSelectedStatus(initialData.status_id?.toString() || '');
      setSelectedAddress(initialData.address_id?.toString() || '');
      setFormData({
        name: initialData.name || '',
        code: initialData.code || ''
      });
    }
  }, [initialData, section.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (section.name === "Punti Vendita") {
        const puntoVenditaData = {
          name: formData.name,
          code: formData.code,
          channel_id: parseInt(selectedChannel),
          warehouse_id: parseInt(selectedWarehouse),
          address_id: parseInt(selectedAddress),
          status_id: parseInt(selectedStatus)
        };
        
        if (initialData?.id) {
          // Update
          return await onSubmit({ ...puntoVenditaData, id: initialData.id });
        } else {
          // Create
          return await onSubmit(puntoVenditaData);
        }
      }

      if (section.name === "Parameters") {
        const parameterData = {
          ...formData,
          is_required: Boolean(formData.is_required),
          is_expandable: Boolean(formData.is_expandable)
        };
        return await onSubmit(parameterData);
      }
      
      if (section.name === "Status") {
        if (!formData.field) {
          toast({
            title: "Error",
            description: "Field is required",
            variant: "destructive",
          });
          return;
        }
        const statusData = {
          name: formData.name,
          field: formData.field
        };
        console.log('Submitting status data:', statusData);
        return await onSubmit(statusData);
      }
      
      if (section.name === 'Sizes' && section.multipleCreate) {
        const sizes = formData.name.split(',').map((s: string) => s.trim()).filter(Boolean);
        const existingSizes = await fetch('http://localhost:3003/api/sizes')
          .then(res => res.json())
          .catch(() => []);

        const existingNames = new Set(existingSizes.map((s: any) => s.name.toLowerCase()));
        const newSizes = sizes.filter((size: string) => !existingNames.has(size.toLowerCase()));
        const skippedSizes = sizes.filter((size: string) => existingNames.has(size.toLowerCase()));
        
        if (newSizes.length === 0) {
          toast({
            title: "Info",
            description: "All sizes already exist",
          });
          return;
        }

        await Promise.all(
          newSizes.map(async (sizeName: string) => {
            const response = await fetch('http://localhost:3003/api/sizes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: sizeName })
            });
            
            if (!response.ok) throw new Error(`Failed to create size: ${sizeName}`);
            return response.json();
          })
        );
        
        toast({
          title: "Success",
          description: `Created ${newSizes.length} new size(s)${skippedSizes.length ? `, skipped ${skippedSizes.length} existing` : ''}`
        });
        
        // Invalidiamo la query per forzare un refresh dei dati
        queryClient.invalidateQueries({ queryKey: ['settings', section.apiLink] })
        setIsNewEntryModalOpen(false);
        return;
      }
      
      if (section.name === 'Size Groups') {
        const result = await onSubmit(formData) as SubmitResult;
        const groupId = result?.id || initialData?.id;
        
        if (groupId) {
          const currentSizeIds = currentSizes?.map((s: any) => s.size_id) || [];
          const sizesToAdd = selectedSizes.filter(id => !currentSizeIds.includes(id));
          const sizesToRemove = currentSizes?.filter((s: any) => !selectedSizes.includes(s.size_id));

          await Promise.all([
            ...sizesToAdd.map(sizeId => 
              fetch('http://localhost:3003/api/size-group-sizes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ size_group_id: groupId, size_id: sizeId })
              })
            ),
            ...(sizesToRemove || []).map((size: Size) => 
              fetch(`http://localhost:3003/api/size-group-sizes/${size.id}`, {
                method: 'DELETE'
              })
            )
          ]);

          queryClient.invalidateQueries({ queryKey: ['sizeGroupSizes', groupId] });
          
          toast({
            title: "Success",
            description: initialData?.id 
              ? "Size group and sizes updated successfully"
              : "Size group created with sizes successfully"
          });
        }
      } else {
        return await onSubmit(formData);
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive"
      });
    }
  }

  if (section.name === "Parameters") {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_required"
              checked={formData.is_required || false}
              onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
            />
            <Label htmlFor="is_required">Required</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_expandable"
              checked={formData.is_expandable || false}
              onCheckedChange={(checked) => setFormData({ ...formData, is_expandable: checked })}
            />
            <Label htmlFor="is_expandable">Expandable</Label>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    );
  }

  if (section.name === 'Sizes' && section.multipleCreate) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Sizes</Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter sizes separated by commas (e.g. S, M, L)"
          />
          <p className="text-sm text-gray-500">
            Separate multiple sizes with commas. Existing sizes will be skipped.
          </p>
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    );
  }

  if (section.name === 'Size Groups') {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {columns.map((column) => (
          <div key={column} className="space-y-2">
            <Label htmlFor={column}>{column}</Label>
            <Input
              id={column}
              value={formData[column] || ''}
              onChange={(e) => setFormData({ ...formData, [column]: e.target.value })}
            />
          </div>
        ))}
        
        <div className="space-y-2">
          <Label>Sizes</Label>
          <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
            {allSizes?.map((size: any) => (
              <div key={size.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`size-${size.id}`}
                  checked={selectedSizes.includes(size.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSizes([...selectedSizes, size.id]);
                    } else {
                      setSelectedSizes(selectedSizes.filter(id => id !== size.id));
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor={`size-${size.id}`} className="text-sm">
                  {size.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    );
  }

  if (section.name === 'Punti Vendita') {
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

  if (section.name === 'Payment Methods') {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Codice</Label>
          <Input
            id="code"
            value={formData.code || ''}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrizione</Label>
          <Input
            id="description"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Icona</Label>
          <div className="grid grid-cols-4 gap-2">
            {paymentIcons.map((iconObj) => (
              <Button
                key={iconObj.name}
                type="button"
                variant={formData.icon === iconObj.name ? "default" : "outline"}
                className="h-10 w-full p-0 flex items-center justify-center"
                onClick={() => setFormData({ ...formData, icon: iconObj.name })}
              >
                <iconObj.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>
          <Button 
            type="submit"
            disabled={!formData.name || !formData.code || !formData.icon}
          >
            Salva
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {columns.map((column) => (
        <div key={column} className="space-y-2">
          <Label htmlFor={column}>{column}</Label>
          {section.name === 'Status' && column === 'field' ? (
            <Select
              value={formData.field || ''}
              onValueChange={(value) => setFormData({ ...formData, field: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {statusFields?.map((field: string) => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={column}
              value={formData[column] || ''}
              onChange={(e) => setFormData({ ...formData, [column]: e.target.value })}
            />
          )}
        </div>
      ))}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  )
}

export default function ParameterManager() {
  const handleEdit = (item: Record<string, any>) => {
    setCurrentItem(item);
    setIsEditModalOpen(true);
  }

  const handleManageAttributes = (item: Record<string, any>) => {
    setCurrentItem(item);
    setIsAttributeDialogOpen(true);
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

  const [activeTab, setActiveTab] = useState(settingsSections[0])
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isAttributeDialogOpen, setIsAttributeDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, error, isLoading } = useQuery({
    queryKey: ['settings', activeTab.apiLink],
    queryFn: () => fetchData(activeTab.apiLink),
    retry: false
  });

  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      const response = await fetch(activeTab.apiLink, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', activeTab.apiLink] })
      toast({
        title: "Success",
        description: "New entry created successfully",
      })
      setIsNewEntryModalOpen(false)
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create new entry",
        variant: "destructive",
      })
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const id = updatedData.id || updatedData.ID || updatedData.iD || updatedData.Id;
      const response = await fetch(`${activeTab.apiLink}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to update');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', activeTab.apiLink] })
      toast({
        title: "Success",
        description: "Entry updated successfully",
      });
      setIsEditModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (item: any) => {
      const id = item.id || item.ID || item.iD || item.Id;
      return fetch(`${activeTab.apiLink}/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', activeTab.apiLink] })
      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });
      setIsDeleteAlertOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  const handleCreate = async (newData: Record<string, any>): Promise<SubmitResult> => {
    return createMutation.mutateAsync(newData);
  }

  const handleUpdate = async (updatedData: Record<string, any>): Promise<SubmitResult> => {
    if (activeTab.name === "Parameters") {
      const parameterData = {
        ...currentItem,
        ...updatedData,
        is_required: updatedData.is_required ?? currentItem.is_required ?? false,
        is_expandable: updatedData.is_expandable ?? currentItem.is_expandable ?? false
      };
      
      return updateMutation.mutateAsync(parameterData);
    } else {
      return updateMutation.mutateAsync({ ...currentItem, ...updatedData });
    }
  };

  const sortedData = useMemo(() => {
    if (!data) return [];
    const sortedItems = [...data];
    
    if (activeTab.name === "Sizes") {
      return sortedItems.sort((a, b) => {
        const aNum = parseInt(a.name);
        const bNum = parseInt(b.name);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        if (!isNaN(aNum)) return -1;
        if (!isNaN(bNum)) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    if (activeTab.name === "Status") {
      return sortedItems.sort((a, b) => {
        const fieldCompare = (a.field || '').localeCompare(b.field || '');
        if (fieldCompare !== 0) return fieldCompare;
        return (a.name || '').localeCompare(b.name || '');
      });
    }
    
    return sortedItems.sort((a, b) => {
      const aName = a.name || '';
      const bName = b.name || '';
      return aName.localeCompare(bName);
    });
  }, [data, activeTab.name]);

  const columns = useMemo(() => {
    if (data && data.length > 0) {
      return Object.keys(data[0]).filter(col => !['id', 'ID', 'iD', 'Id'].includes(col));
    }
    return activeTab.defaultColumns;
  }, [data, activeTab.defaultColumns]);

  const activeTabWithHandlers = useMemo(() => {
    if (activeTab.name === "Parameters") {
      return {
        ...activeTab,
        onManageAttributes: handleManageAttributes
      };
    }
    return activeTab;
  }, [activeTab]);

  const [selectedSection, setSelectedSection] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedSection')
      if (saved) {
        const section = parseInt(saved)
        setSelectedSection(section)
        setActiveTab(settingsSections[section])
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedSection', selectedSection.toString())
      localStorage.setItem('settingsActiveTab', activeTab.name)
    }
  }, [selectedSection, activeTab])

  if (isLoading) return <div>Caricamento...</div>;
  if (error) {
    toast({
      title: "Errore",
      description: error instanceof Error ? error.message : 'Si è verificato un errore',
      variant: "destructive",
    });
    return <div>Si è verificato un errore nel caricamento dei dati</div>;
  }

  const filteredSections = settingsSections.filter(section =>
    section.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto mt-8 p-4">
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="w-full md:w-64 h-[calc(100vh-8rem)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 py-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search parameters" 
                  className="pl-8" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-1 p-2">
                {filteredSections.map((section) => (
                  <Button
                    key={section.name}
                    variant={activeTab.name === section.name ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab(section)}
                  >
                    {section.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{activeTab.name}</span>
              <Dialog open={isNewEntryModalOpen} onOpenChange={setIsNewEntryModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New {activeTab.name}</DialogTitle>
                  </DialogHeader>
                  <EntryForm 
                    columns={columns} 
                    onSubmit={handleCreate} 
                    onCancel={() => setIsNewEntryModalOpen(false)} 
                    section={activeTab}
                    queryClient={queryClient}
                    setIsNewEntryModalOpen={setIsNewEntryModalOpen}
                  />
                </DialogContent>
              </Dialog>
            </CardTitle>
            <CardDescription>Manage your {activeTab.name.toLowerCase()} settings.</CardDescription>
          </CardHeader>
          <CardContent>
            {!data || isLoading ? (
              <div>Caricamento...</div>
            ) : error ? (
              <div>Si è verificato un errore nel caricamento dei dati</div>
            ) : (
              <DataTable 
                data={sortedData}
                columns={columns} 
                onEdit={handleEdit} 
                onDelete={handleDelete} 
                section={activeTabWithHandlers}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify {activeTab.name}</DialogTitle>
          </DialogHeader>
          <EntryForm 
            columns={columns} 
            initialData={currentItem}
            onSubmit={handleUpdate} 
            onCancel={() => setIsEditModalOpen(false)} 
            section={activeTabWithHandlers}
            queryClient={queryClient}
            setIsNewEntryModalOpen={setIsNewEntryModalOpen}
          />
        </DialogContent>
      </Dialog>

      {activeTab.hasAttributes && currentItem && (
        <AttributeDialog
          parameterId={currentItem.id}
          parameterName={currentItem.name}
          open={isAttributeDialogOpen}
          onClose={() => setIsAttributeDialogOpen(false)}
        />
      )}

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}