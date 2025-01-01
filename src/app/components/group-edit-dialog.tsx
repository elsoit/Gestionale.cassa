import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const server = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3003'

interface GroupEditDialogProps {
  isOpen: boolean
  onClose: () => void
  groupData: {
    article_code: string
    variant_code: string
    wholesale_price: number
    retail_price: number
    status_id: string
    attributes?: Array<{ parameter_id: string, attribute_id: string, parameter_name: string, attribute_name: string }>
  }
  productIds: number[]
}

export function GroupEditDialog({
  isOpen,
  onClose,
  groupData,
  productIds
}: GroupEditDialogProps) {
  const [formData, setFormData] = useState({
    article_code: '',
    variant_code: '',
    wholesale_price: '',
    retail_price: '',
    status: '',
    attributes: {} as Record<string, string>
  })

  const [statuses, setStatuses] = useState<any[]>([])
  const [parameters, setParameters] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      
      setIsLoading(true);
      try {
        // Carica stati e parametri
        const [statusesRes, parametersRes] = await Promise.all([
          fetch(`${server}/api/statuses/field/Products`, {
            credentials: 'include'
          }),
          fetch(`${server}/api/product-attributes/parameters`, {
            credentials: 'include'
          })
        ]);

        const [statusesData, parametersData] = await Promise.all([
          statusesRes.json(),
          parametersRes.json()
        ]);

        setStatuses(statusesData);
        setParameters(parametersData);

        // Se abbiamo i dati del gruppo, inizializziamo il form
        if (groupData) {
          const attributesRecord = groupData.attributes?.reduce((acc, attr) => ({
            ...acc,
            [attr.parameter_id]: attr.attribute_id
          }), {}) || {};

          setFormData({
            article_code: groupData.article_code?.toUpperCase() || '',
            variant_code: groupData.variant_code?.toUpperCase() || '',
            wholesale_price: groupData.wholesale_price?.toString() || '',
            retail_price: groupData.retail_price?.toString() || '',
            status: groupData.status_id?.toString() || '',
            attributes: attributesRecord
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Errore nel caricamento dei dati');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, groupData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Converti gli attributi in array per l'API
      const attributesArray = Object.entries(formData.attributes)
        .filter(([_, value]) => value) // Filtra solo gli attributi che hanno un valore
        .map(([parameter_id, attribute_id]) => ({
          parameter_id: parseInt(parameter_id),
          attribute_id: parseInt(attribute_id)
        }));

      // Prepara gli aggiornamenti per tutti i prodotti
      const updates = productIds.map(id => ({
        id,
        article_code: formData.article_code.toUpperCase(),
        variant_code: formData.variant_code.toUpperCase(),
        wholesale_price: parseFloat(formData.wholesale_price),
        retail_price: parseFloat(formData.retail_price),
        status_id: parseInt(formData.status),
        attributes: attributesArray
      }));

      console.log('Sending updates:', updates);

      const updateResponse = await fetch(`${server}/api/products/update-batch`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ products: updates })
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.message || 'Failed to update products');
      }

      const result = await updateResponse.json();
      toast.success(`Aggiornati ${result.updated.length} prodotti`);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Error updating products:', error);
      toast.error('Errore nell\'aggiornamento dei prodotti');
    }
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-4">
            Caricamento...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Modifica Gruppo Prodotti</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="flex gap-6">
            {/* Colonna sinistra - Dati principali */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Codice Articolo</Label>
                  <Input
                    value={formData.article_code}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        article_code: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Codice Variante</Label>
                  <Input
                    value={formData.variant_code}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        variant_code: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prezzo Ingrosso</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.wholesale_price}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      wholesale_price: e.target.value
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Prezzo Dettaglio</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.retail_price}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      retail_price: e.target.value
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Stato</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      status: value
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona stato">
                      {statuses.find(s => s.id.toString() === formData.status)?.name || "Seleziona stato"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(status => (
                      <SelectItem 
                        key={status.id} 
                        value={status.id.toString()}
                      >
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Colonna destra - Attributi */}
            <div className="w-[350px] border-l pl-6 space-y-4 max-h-[calc(90vh-180px)] overflow-y-auto">
              <div className="sticky top-0 bg-white pb-2 border-b z-10">
                <h3 className="text-lg font-medium">Attributi</h3>
              </div>
              <div className="space-y-4 px-[2px]">
                {parameters.map((parameter) => (
                  <div key={parameter.id} className="space-y-2">
                    <Label>{parameter.name} {parameter.required && <span className="text-red-500">*</span>}</Label>
                    <Select
                      value={formData.attributes[parameter.id]?.toString() || ''}
                      onValueChange={(value) => {
                        setFormData(prev => ({
                          ...prev,
                          attributes: {
                            ...prev.attributes,
                            [parameter.id]: value
                          }
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Seleziona ${parameter.name.toLowerCase()}`}>
                          {parameter.attributes?.find((attr: any) => 
                            attr.id.toString() === formData.attributes[parameter.id]?.toString()
                          )?.name || `Seleziona ${parameter.name.toLowerCase()}`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {parameter.attributes?.map((attr: any) => (
                          <SelectItem 
                            key={attr.id} 
                            value={attr.id.toString()}
                          >
                            {attr.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit">Salva Modifiche</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
