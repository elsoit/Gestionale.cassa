import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { toast } from 'sonner';

interface ProductEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  onProductUpdate: (updatedProduct: any) => void;
}

export default function ProductEditDialog({ isOpen, onClose, product, onProductUpdate }: ProductEditDialogProps) {
  console.log('ProductEditDialog render with props:', { 
    isOpen, 
    product: product ? {
      id: product.id,
      article_code: product.article_code,
      variant_code: product.variant_code,
      brand_id: product.brand_id,
      size_group_id: product.size_group_id,
      size_id: product.size_id,
      status_id: product.status_id,
      attributes: product.attributes,
      brand_name: product.brand_name,
      size_name: product.size_name,
      size_group_name: product.size_group_name,
      status_name: product.status_name
    } : null
  });
  
  const [formData, setFormData] = useState({
    article_codes: [] as string[],
    variant_codes: [] as string[],
    brand_id: '',
    size_group_id: '',
    size_ids: [] as string[],
    wholesale_price: '',
    retail_price: '',
    status: '',
    attributes: {} as Record<string, string>
  });

  const [brands, setBrands] = useState<any[]>([]);
  const [sizeGroups, setSizeGroups] = useState<any[]>([]);
  const [availableSizes, setAvailableSizes] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [parameters, setParameters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [attributeInputs, setAttributeInputs] = useState<Record<number, string>>({});
  const [attributeSuggestions, setAttributeSuggestions] = useState<Record<number, any[]>>({});
  const [attributeLoading, setAttributeLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    console.log('useEffect [isOpen] triggered');
    const fetchOptions = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching options...');
        const [brandsRes, sizeGroupsRes, statusesRes, parametersRes] = await Promise.all([
          fetch(`${process.env.API_URL}/api/brands`),
          fetch(`${process.env.API_URL}/api/size-groups`),
          fetch(`${process.env.API_URL}/api/statuses/field/Products`),
          fetch(`${process.env.API_URL}/api/product-attributes/parameters`)
        ]);

        const [brands, sizeGroups, statuses, parameters] = await Promise.all([
          brandsRes.json(),
          sizeGroupsRes.json(),
          statusesRes.json(),
          parametersRes.json()
        ]);

        console.log('Fetched data:', {
          brands,
          sizeGroups,
          statuses,
          parameters
        });

        setBrands(brands);
        setSizeGroups(sizeGroups);
        setStatuses(statuses);
        setParameters(parameters);

        // Se abbiamo un prodotto, carichiamo anche le taglie
        if (product?.size_group_id) {
          await fetchSizes(product.size_group_id.toString());
        }

        // Ora che abbiamo tutti i dati, inizializziamo il form
        if (product) {
          console.log('Product data received:', {
            id: product.id,
            article_code: product.article_code,
            variant_code: product.variant_code,
            brand_id: product.brand_id,
            brand_name: product.brand_name,
            size_group_id: product.size_group_id,
            size_group_name: product.size_group_name,
            size_id: product.size_id,
            size_name: product.size_name,
            status_id: product.status_id,
            status_name: product.status_name,
            attributes: product.attributes
          });

          const formDataToSet = {
            article_codes: [product.article_code || ''],
            variant_codes: [product.variant_code || ''],
            brand_id: product.brand_id?.toString() || '',
            size_group_id: product.size_group_id?.toString() || '',
            size_ids: product.size_id ? [product.size_id.toString()] : [],
            wholesale_price: product.wholesale_price?.toString() || '',
            retail_price: product.retail_price?.toString() || '',
            status: product.status_id?.toString() || '',
            attributes: {}
          };

          // Imposta gli attributi se presenti
          if (Array.isArray(product.attributes)) {
            console.log('Setting product attributes:', product.attributes);
            formDataToSet.attributes = product.attributes.reduce((acc: any, attr: any) => {
              if (attr && attr.parameter_id) {
                console.log('Setting attribute:', {
                  parameterId: attr.parameter_id,
                  attributeId: attr.attribute_id,
                  parameterName: attr.parameter_name,
                  attributeName: attr.attribute_name
                });
                acc[attr.parameter_id] = attr.attribute_id.toString();
              }
              return acc;
            }, {});
          }

          console.log('Final form data:', formDataToSet);
          setFormData(formDataToSet);
        }

      } catch (error) {
        console.error('Error fetching options:', error);
        toast.error('Errore nel caricamento delle opzioni');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen, product]);

  // Funzione per caricare le taglie di un gruppo
  const fetchSizes = async (groupId: string) => {
    if (!groupId) {
      console.log('No group ID provided');
      setAvailableSizes([]);
      return;
    }

    try {
      console.log('Fetching sizes for group:', groupId);
      const sizesRes = await fetch(`${process.env.API_URL}/api/size-group-sizes/${groupId}/sizes`, {
        mode: 'cors',
        credentials: 'include'
      });
      if (!sizesRes.ok) {
        throw new Error(`Failed to fetch sizes: ${sizesRes.status}`);
      }
      const sizesData = await sizesRes.json();
      console.log('Sizes data:', sizesData);
      setAvailableSizes(sizesData);
    } catch (error) {
      console.error('Error fetching sizes:', error);
      toast.error('Errore nel caricamento delle taglie');
    }
  };

  // Gestione del cambio gruppo taglie
  const handleSizeGroupChange = async (value: string) => {
    console.log('Size group changed:', value);
    setFormData(prev => ({
      ...prev,
      size_group_id: value,
      size_ids: [] // Reset selected sizes
    }));
    await fetchSizes(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    try {
      console.log('Submitting form data:', formData);

      // Converti gli attributi in numeri
      const processedAttributes: Record<string, number> = {};
      Object.entries(formData.attributes).forEach(([key, value]) => {
        if (value) {
          processedAttributes[key] = parseInt(value);
        }
      });

      console.log('Processed attributes:', processedAttributes);

      const payload = {
        article_code: formData.article_codes[0],
        variant_code: formData.variant_codes[0],
        brand_id: parseInt(formData.brand_id),
        size_group_id: parseInt(formData.size_group_id),
        size_id: parseInt(formData.size_ids[0]),
        wholesale_price: parseFloat(formData.wholesale_price),
        retail_price: parseFloat(formData.retail_price),
        status_id: parseInt(formData.status),
        attributes: processedAttributes
      };

      console.log('Sending payload:', payload);

      const response = await fetch(`${process.env.API_URL}/api/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update product');
      }

      const updatedProduct = await response.json();
      console.log('Product updated successfully:', updatedProduct);
      
      toast.success('Prodotto aggiornato con successo');
      onClose();
      if (onProductUpdate) {
        onProductUpdate(updatedProduct);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Errore durante l\'aggiornamento del prodotto');
    }
  };

  const toggleSize = (sizeId: string) => {
    setFormData(prev => {
      const isSelected = prev.size_ids.includes(sizeId);
      return {
        ...prev,
        size_ids: isSelected
          ? prev.size_ids.filter(id => id !== sizeId)
          : [...prev.size_ids, sizeId]
      };
    });
  };

  const normalizeText = (text: string) => {
    return text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "");
  };

  const createAttribute = async (parameterId: string, name: string) => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/product-attributes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameter_id: parameterId,
          name: name
        }),
      });

      if (!response.ok) throw new Error('Failed to create attribute');

      const newAttribute = await response.json();
      toast.success('Nuovo attributo creato');
      return newAttribute;
    } catch (error) {
      console.error('Error creating attribute:', error);
      toast.error('Errore nella creazione dell\'attributo');
      throw error;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Modifica Prodotto</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-6">
            {/* Colonna sinistra - Dati principali */}
            <div className="flex-1 space-y-4 pr-6 max-h-[calc(90vh-180px)] overflow-y-auto">
              <div className="space-y-4 px-[2px]">
                {/* Codice Articolo */}
                <div className="space-y-2">
                  <Label>Codice Articolo</Label>
                  <Input
                    value={formData.article_codes[0] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      article_codes: [e.target.value.toUpperCase()]
                    }))}
                    placeholder="Codice articolo"
                  />
                </div>

                {/* Codice Variante */}
                <div className="space-y-2">
                  <Label>Codice Variante</Label>
                  <Input
                    value={formData.variant_codes[0] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      variant_codes: [e.target.value.toUpperCase()]
                    }))}
                    placeholder="Codice variante"
                  />
                </div>

                {/* Brand */}
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select
                    value={formData.brand_id}
                    onValueChange={(value) => {
                      console.log('Selected brand:', value);
                      setFormData(prev => ({
                        ...prev,
                        brand_id: value
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona brand">
                        {brands.find(b => b.id.toString() === formData.brand_id)?.name || "Seleziona brand"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(brand => (
                        <SelectItem 
                          key={brand.id} 
                          value={brand.id.toString()}
                        >
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gruppo Taglie */}
                <div className="space-y-2">
                  <Label>Gruppo Taglie</Label>
                  <Select
                    value={formData.size_group_id}
                    onValueChange={handleSizeGroupChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona gruppo taglie">
                        {sizeGroups.find(g => g.id.toString() === formData.size_group_id)?.name || "Seleziona gruppo taglie"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {sizeGroups.map(group => (
                        <SelectItem 
                          key={group.id} 
                          value={group.id.toString()}
                        >
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Taglia */}
                <div className="space-y-2">
                  <Label>Taglia</Label>
                  <Select
                    value={formData.size_ids[0] || ''}
                    onValueChange={(value) => {
                      console.log('Selected size:', value);
                      setFormData(prev => ({
                        ...prev,
                        size_ids: [value]
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona taglia">
                        {availableSizes.find(s => s.size_id.toString() === formData.size_ids[0])?.size_name || "Seleziona taglia"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableSizes.map(size => (
                        <SelectItem 
                          key={size.id} 
                          value={size.size_id.toString()}
                        >
                          {size.size_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prezzi */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prezzo Ingrosso</Label>
                    <Input
                      type="number"
                      value={formData.wholesale_price}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        wholesale_price: e.target.value
                      }))}
                      required
                      step="0.01"
                      min="0"
                      placeholder="0.00 €"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prezzo Dettaglio</Label>
                    <Input
                      type="number"
                      value={formData.retail_price}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        retail_price: e.target.value
                      }))}
                      step="0.01"
                      min="0"
                      placeholder="0.00 €"
                    />
                  </div>
                </div>

                {/* Stato */}
                <div className="space-y-2">
                  <Label>Stato</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => {
                      console.log('Selected status:', value);
                      setFormData(prev => ({
                        ...prev,
                        status: value
                      }));
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
            </div>

            {/* Colonna destra - Attributi */}
            <div className="w-[350px] border-l pl-6 space-y-4 max-h-[calc(90vh-180px)] overflow-y-auto">
              <div className="sticky top-0 bg-white pb-2 border-b z-10">
                <h3 className="text-lg font-medium">Attributi</h3>
              </div>
              <div className="space-y-4 px-[2px]">
                {parameters && parameters.length > 0 ? (
                  parameters.map((parameter) => {
                    const attributes = parameter.attributes || [];
                    console.log('Rendering parameter:', {
                      parameterId: parameter.id,
                      parameterName: parameter.name,
                      selectedAttributeId: formData.attributes[parameter.id],
                      availableAttributes: attributes,
                      allFormAttributes: formData.attributes
                    });
                    
                    const selectedAttribute = attributes.find(
                      (attr: { id: number }) => attr.id.toString() === formData.attributes[parameter.id]?.toString()
                    );

                    if (selectedAttribute) {
                      console.log('Found selected attribute:', {
                        parameterId: parameter.id,
                        parameterName: parameter.name,
                        attributeId: selectedAttribute.id,
                        attributeName: selectedAttribute.name
                      });
                    }

                    return (
                      <div key={parameter.id} className="space-y-2">
                        <Label>{parameter.name} {parameter.required && <span className="text-red-500">*</span>}</Label>
                        <Select
                          value={formData.attributes[parameter.id]?.toString() || ''}
                          onValueChange={(value) => {
                            console.log('Attribute selection changed:', { 
                              parameter: parameter.name, 
                              parameterId: parameter.id,
                              value,
                              previousValue: formData.attributes[parameter.id],
                              allAttributes: formData.attributes
                            });
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
                              {selectedAttribute?.name || `Seleziona ${parameter.name.toLowerCase()}`}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {attributes.map((attribute: { id: number, name: string }) => (
                              <SelectItem 
                                key={attribute.id} 
                                value={attribute.id.toString()}
                              >
                                {attribute.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500">Nessun parametro disponibile</p>
                )}
              </div>
            </div>
          </form>
        )}

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            Salva
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
