import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

interface Parameter {
  id: number;
  name: string;
  is_required: boolean;
  is_expandable: boolean;
  attributes: Array<{
    id: number;
    name: string;
  }>;
}

interface ProductAttribute {
  parameter_id: number;
  attribute_id: number;
}

interface FormData {
  article_codes: string[];
  variant_codes: string[];
  size_ids: string[];
  size_group_id: string;
  brand_id: string;
  wholesale_price: string;
  retail_price: string;
  status: string;
  attributes: Record<string, string>;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Attivo' },
  { value: 'inactive', label: 'Inattivo' }
] as const

interface ProductDialogProps {
  product?: any
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  refreshData: () => Promise<void>
  isGroupedView?: boolean
  isDuplicating?: boolean
}


const ProductDialog = ({
  product,
  isOpen,
  onClose,
  onSave,
  refreshData,
  isGroupedView,
  isDuplicating
}: ProductDialogProps) => {
  const initialFormData: FormData = {
    article_codes: product ? [product.article_code] : [''],
    variant_codes: product ? [product.variant_code] : [''],
    size_ids: product ? [product.size_id.toString()] : [],
    size_group_id: product?.size_group_id?.toString() || '',
    brand_id: product?.brand_id?.toString() || '',
    wholesale_price: product?.wholesale_price?.toString() || '',
    retail_price: product?.retail_price?.toString() || '',
    status: product?.status_id?.toString() || '1',
    attributes: {}
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [availableSizes, setAvailableSizes] = useState<any[]>([]);
  const [sizeGroups, setSizeGroups] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [articleInput, setArticleInput] = useState('');
  const [variantInput, setVariantInput] = useState('');
  const [newSizeIds, setNewSizeIds] = useState<number[]>([]);
  const [attributeInputs, setAttributeInputs] = useState<Record<number, string>>({});
  const [attributeSuggestions, setAttributeSuggestions] = useState<Record<number, any[]>>({});
  const [attributeLoading, setAttributeLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setIsLoadingOptions(true)
        console.log('Fetching parameters...');
        
        // Fetch parameters with attributes
        const parametersResponse = await fetch(`${process.env.API_URL}/api/product-attributes/parameters`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })
        const parametersData = await parametersResponse.json()
        console.log('Parameters data:', JSON.stringify(parametersData, null, 2))
        
        if (!Array.isArray(parametersData)) {
          console.error('Parameters data is not an array:', parametersData)
          return
        }

        // Inizializza un oggetto vuoto per gli attributi
        const initialAttributes: { [key: string]: string } = {}
        parametersData.forEach((param: Parameter) => {
          if (param && param.id) {
            initialAttributes[param.id.toString()] = ''
          } else {
            console.error('Invalid parameter:', param)
          }
        })
        
        console.log('Initial attributes:', initialAttributes)
        setParameters(parametersData)
        setFormData(prev => {
          const newFormData = {
            ...prev,
            attributes: initialAttributes
          }
          console.log('Updated form data:', newFormData)
          return newFormData
        })

        // If editing a product, fetch its attributes
        if (product?.id) {
          console.log('Fetching product attributes for product:', product.id)
          const productAttributesResponse = await fetch(`${process.env.API_URL}/api/product-attributes/product/${product.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          })
          const productAttributesData: ProductAttribute[] = await productAttributesResponse.json()
          console.log('Product attributes data:', JSON.stringify(productAttributesData, null, 2))
          
          // Aggiorna gli attributi con i valori esistenti
          const attributesMap: { [key: string]: string } = { ...initialAttributes }
          productAttributesData.forEach((attr) => {
            if (attr && attr.parameter_id && attr.attribute_id) {
              attributesMap[attr.parameter_id.toString()] = attr.attribute_id.toString()
            } else {
              console.error('Invalid product attribute:', attr)
            }
          })
          
          console.log('Final attributes map:', attributesMap)
          setFormData(prev => {
            const newFormData = {
              ...prev,
              attributes: attributesMap
            }
            console.log('Updated form data with product attributes:', newFormData)
            return newFormData
          })
        }

        // Fetch brands
        const brandsResponse = await fetch(`${process.env.API_URL}/api/brands`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })
        const brandsData = await brandsResponse.json()
        setBrands(brandsData || [])

        // Fetch size groups
        const sizeGroupsResponse = await fetch(`${process.env.API_URL}/api/size-groups`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })
        const sizeGroupsData = await sizeGroupsResponse.json()
        setSizeGroups(sizeGroupsData || [])

        // Fetch product statuses
        const statusesResponse = await fetch(`${process.env.API_URL}/api/statuses/field/Products`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        })
        const statusesData = await statusesResponse.json()
        console.log('Product Statuses:', statusesData) // Debug
        setStatuses(statusesData.map((status: any) => ({
          value: status.id.toString(),
          label: status.name
        })))
      } catch (error) {
        console.error('Errore nel caricamento delle opzioni:', error)
        toast.error('Errore nel caricamento delle opzioni')
      } finally {
        setIsLoadingOptions(false)
      }
    }

    fetchOptions()
  }, [])

  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        article_codes: [product.article_code?.toUpperCase()],
        variant_codes: [product.variant_code?.toUpperCase()],
        brand_id: product.brand_id?.toString() || '',
        size_group_id: product.size_group_id?.toString() || '',
        wholesale_price: product.wholesale_price?.toString() || '',
        retail_price: product.retail_price?.toString() || '',
        status: product.status_id?.toString() || '1',
        size_ids: product.sizes || [],
        attributes: {}
      })
    }
  }, [isOpen, product])

  useEffect(() => {
    if (product?.id) {
      console.log('Editing product:', product); // Debug
      setFormData({
        article_codes: product.article_code ? [product.article_code] : [],
        variant_codes: product.variant_code ? [product.variant_code] : [],
        size_ids: isGroupedView 
          ? (product.sizes?.map((s: any) => s.id) || [])
          : (product.size_id ? [product.size_id] : []),
        size_group_id: product.size_group_id?.toString() || '',
        brand_id: product.brand_id?.toString() || '',
        wholesale_price: product.wholesale_price?.toString() || '',
        retail_price: product.retail_price?.toString() || '',
        status: product.status_id?.toString() || '',
        attributes: {}
      });
      // Imposta i valori dei campi di input
      setArticleInput(product.article_code || '');
      setVariantInput(product.variant_code || '');
    } else {
      setFormData({
        article_codes: [],
        variant_codes: [],
        size_ids: [],
        size_group_id: product?.size_group_id?.toString() || '',
        brand_id: '',
        wholesale_price: '',
        retail_price: '',
        status: '1',
        attributes: {}
      });
      setArticleInput('');
      setVariantInput('');
    }
  }, [product, isGroupedView]);

  useEffect(() => {
    if (formData.size_group_id) {
      const fetchSizes = async () => {
        try {
          const response = await fetch(`${process.env.API_URL}/api/size-group-sizes/${formData.size_group_id}/sizes`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          })
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()
          
          if (Array.isArray(data)) {
            const sortedSizes = sortSizes(data)
            setAvailableSizes(sortedSizes)
            
            // Se è un nuovo prodotto o se il gruppo è UNICA, seleziona tutte le taglie
            if (!product?.id || data.length === 1) {
              setFormData(prev => ({
                ...prev,
                size_ids: sortedSizes.map(size => size.size_id)
              }))
            }
          } else {
            console.error('Unexpected response format:', data)
            setAvailableSizes([])
          }
        } catch (error) {
          console.error('Errore nel caricamento delle taglie:', error)
          toast.error('Errore nel caricamento delle taglie')
          setAvailableSizes([])
        }
      }
      fetchSizes()
    } else {
      setAvailableSizes([])
    }
  }, [formData.size_group_id, product])

  const sortSizes = (sizes: any[]) => {
    return sizes.sort((a, b) => {
      // Se è un numero, converti in numero e confronta
      const aNum = parseInt(a.size_name)
      const bNum = parseInt(b.size_name)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum
      }
      // Altrimenti confronta come stringhe
      return a.size_name.localeCompare(b.size_name)
    })
  }

  const normalizeCode = (code: string) => {
    return code.trim().toUpperCase()
  }

  const formatCode = (code: string): string => {
    return code
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Rimuove gli accenti
      .replace(/[^a-zA-Z0-9]/g, '-') // Sostituisce caratteri speciali con -
      .replace(/\s+/g, '') // Rimuove gli spazi
      .replace(/-+/g, '-') // Sostituisce più trattini consecutivi con uno solo
      .replace(/^-+|-+$/g, ''); // Rimuove i trattini all'inizio e alla fine
  };

  const handleArticleInputBlur = () => {
    if (articleInput.trim()) {
      const codes = articleInput
        .split(',')
        .map(code => formatCode(code.trim()))
        .filter(code => code.length > 0);
      const uniqueCodes = Array.from(new Set([...formData.article_codes, ...codes]));
      setFormData(prev => ({
        ...prev,
        article_codes: uniqueCodes
      }));
      setArticleInput('');
    }
  };

  const handleVariantInputBlur = () => {
    if (variantInput.trim()) {
      const codes = variantInput
        .split(',')
        .map(code => formatCode(code.trim()))
        .filter(code => code.length > 0);
      const uniqueCodes = Array.from(new Set([...formData.variant_codes, ...codes]));
      setFormData(prev => ({
        ...prev,
        variant_codes: uniqueCodes
      }));
      setVariantInput('');
    }
  };

  const handleArticleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!product?.id) {
      setArticleInput(value);
    } else {
      const formattedValue = formatCode(value);
      setArticleInput(formattedValue);
      setFormData(prev => ({
        ...prev,
        article_codes: [formattedValue]
      }));
    }
  };

  const handleVariantInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!product?.id) {
      setVariantInput(value);
    } else {
      const formattedValue = formatCode(value);
      setVariantInput(formattedValue);
      setFormData(prev => ({
        ...prev,
        variant_codes: [formattedValue]
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'article' | 'variant') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'article') {
        handleArticleInputBlur();
      } else {
        handleVariantInputBlur();
      }
    }
  };

  const handleRemoveArticleCode = (code: string) => {
    setFormData(prev => ({
      ...prev,
      article_codes: prev.article_codes.filter(c => c !== code)
    }))
  }

  const handleRemoveVariantCode = (code: string) => {
    setFormData(prev => ({
      ...prev,
      variant_codes: prev.variant_codes.filter(c => c !== code)
    }))
  }

  const handleSizeSelection = (sizeId: string) => {
    const numericSizeId = parseInt(sizeId)
    setFormData(prev => {
      const newSizeIds = prev.size_ids.includes(numericSizeId.toString())
        ? prev.size_ids.filter(id => id !== numericSizeId.toString())
        : [...prev.size_ids, numericSizeId.toString()]
      return {
        ...prev,
        size_ids: newSizeIds
      }
    })

    // Gestione delle nuove taglie per prodotti esistenti
    if (product?.id && !isDuplicating) {
      setNewSizeIds(prev => {
        if (prev.includes(parseInt(sizeId))) {
          return prev.filter(id => id !== parseInt(sizeId))
        } else {
          return [...prev, parseInt(sizeId)]
        }
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Form data before submission:', formData);

      // Crea un array di prodotti combinando tutti i codici articolo e variante
      const products = [];
      for (const articleCode of formData.article_codes) {
        for (const variantCode of formData.variant_codes) {
          for (const sizeId of Array.from(new Set(formData.size_ids))) {
            products.push({
              article_code: articleCode,
              variant_code: variantCode,
              size_id: parseInt(sizeId),
              size_group_id: parseInt(formData.size_group_id),
              brand_id: parseInt(formData.brand_id),
              wholesale_price: parseFloat(formData.wholesale_price) || 0,
              retail_price: parseFloat(formData.retail_price) || 0,
              status_id: parseInt(formData.status)
            });
          }
        }
      }

      console.log('Products to create:', products);

      const response = await fetch(`${process.env.API_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products,
          attributes: formData.attributes
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nella creazione dei prodotti');
      }

      // Success toast
      toast.success('Prodotti creati con successo', {
        description: `Creati ${products.length} prodotti`,
      });
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating products:', error);
      
      // Error toast
      if (error instanceof Error) {
        if (error.message.includes('già un prodotto')) {
          toast.error('Prodotto duplicato', {
            description: error.message
          });
        } else if (error.message.includes('mancanti')) {
          toast.error('Dati mancanti', {
            description: error.message
          });
        } else {
          toast.error('Errore', {
            description: error.message
          });
        }
      } else {
        toast.error('Errore', {
          description: 'Si è verificato un errore imprevisto'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (product?.id) {
      fetch(`${process.env.API_URL}/api/product-attributes/${product.id}`, {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(attributes => {
          setFormData(prev => ({
            ...prev,
            attributes: attributes.reduce((acc: Record<string, string>, attr: any) => {
              acc[attr.parameter_id] = attr.attribute_id.toString();
              return acc;
            }, {})
          }));
        })
        .catch(error => {
          console.error('Error loading product attributes:', error);
          toast.error('Error loading product attributes');
        });
    }
  }, [product]);

  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const createAttribute = async (parameterId: string, attributeName: string) => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/attributes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parameter_id: parseInt(parameterId),
          name: attributeName
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to create attribute');
      }

      const newAttribute = await response.json();
      return newAttribute;
    } catch (error) {
      console.error('Error creating attribute:', error);
      throw error;
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Nuovo Prodotto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex gap-6 flex-1 p-6 pt-4">
          {/* Sezione 1 - Prodotti */}
          <div className="w-[250px] border-r pr-6 overflow-y-auto">
            <div className="sticky top-0 bg-white pb-2 border-b z-10">
              <h3 className="text-lg font-medium">Prodotti</h3>
            </div>
            <div className="space-y-4 px-[2px] mt-4">
              {/* Contenuto della sezione prodotti - vuota per ora */}
            </div>
          </div>

          {/* Sezione 2 - Dati principali (senza titolo) */}
          <div className="flex-1 space-y-4">
            <div className="space-y-4">
              {/* Tutto il contenuto esistente della sezione centrale */}
              {/* Brand */}
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select
                  value={formData.brand_id?.toString() || ''}
                  onValueChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      brand_id: value.toString()
                    }))
                  }}
                >
                  <SelectTrigger className="w-full focus:ring-1 focus:ring-offset-0 focus-visible:ring-1 focus-visible:ring-offset-0">
                    <SelectValue placeholder="Seleziona brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Codici Articolo */}
              <div className="space-y-2">
                <Label>Codici Articolo (separati da virgola)</Label>
                <Input
                  type="text"
                  value={articleInput}
                  onChange={handleArticleInputChange}
                  onBlur={handleArticleInputBlur}
                  onKeyDown={(e) => handleKeyDown(e, 'article')}
                  placeholder="es: ART1, ART2, ART3"
                  className="focus-visible:ring-1 focus-visible:ring-offset-0"
                />
                <div className="flex flex-wrap gap-1">
                  {formData.article_codes.map((code, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      onClick={() => handleRemoveArticleCode(code)}
                    >
                      {code.toUpperCase()}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Codici Variante */}
              <div className="space-y-2">
                <Label>Codici Variante (separati da virgola)</Label>
                <Input
                  type="text"
                  value={variantInput}
                  onChange={handleVariantInputChange}
                  onBlur={handleVariantInputBlur}
                  onKeyDown={(e) => handleKeyDown(e, 'variant')}
                  placeholder="es: 001, 002, 003"
                  className="focus-visible:ring-1 focus-visible:ring-offset-0"
                />
                <div className="flex flex-wrap gap-1">
                  {formData.variant_codes.map((code, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      onClick={() => handleRemoveVariantCode(code)}
                    >
                      {code.toUpperCase()}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Gruppo Taglie */}
              <div className="space-y-2">
                <Label>Gruppo Taglie</Label>
                <Select
                  value={formData.size_group_id?.toString() || ''}
                  onValueChange={async (value) => {
                    try {
                      // Aggiorna il form data
                      setFormData(prev => ({
                        ...prev,
                        size_group_id: value || '',
                        size_ids: [],
                        attributes: prev.attributes
                      }));

                      // Carica le taglie con l'URL corretto
                      const response = await fetch(
                        `${process.env.API_URL}/api/size-group-sizes/${value}/sizes`, 
                        { credentials: 'include' }
                      );
                      
                      if (!response.ok) throw new Error('Errore nel caricamento delle taglie');
                      
                      const data = await response.json();
                      const sortedSizes = sortSizes(data);
                      setAvailableSizes(sortedSizes);
                      
                      // Se è un nuovo prodotto o se il gruppo è UNICA, seleziona tutte le taglie
                      if (!product?.id || data.length === 1) {
                        setFormData(prev => ({
                          ...prev,
                          size_ids: sortedSizes.map(size => size.size_id)
                        }));
                      }
                    } catch (error) {
                      console.error('Errore nel caricamento delle taglie:', error);
                      toast.error('Errore nel caricamento delle taglie');
                    }
                  }}
                >
                  <SelectTrigger className="w-full focus:ring-1 focus:ring-offset-0 focus-visible:ring-1 focus-visible:ring-offset-0">
                    <SelectValue placeholder="Seleziona gruppo taglie" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeGroups.map(group => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Taglie */}
              {formData.size_group_id && (
                <div className="space-y-2">
                  <Label>Taglie</Label>
                  <div className="flex flex-wrap gap-1 border rounded-md p-2">
                    {availableSizes.map(size => (
                      <Badge
                        key={size.size_id}
                        variant={formData.size_ids.includes(size.size_id) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          setFormData(prev => {
                            const isSelected = prev.size_ids.includes(size.size_id);
                            return {
                              ...prev,
                              size_ids: isSelected
                                ? prev.size_ids.filter(id => id !== size.size_id)
                                : [...prev.size_ids, size.size_id]
                            };
                          });
                        }}
                      >
                        {size.size_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

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
                    className="focus-visible:ring-1 focus-visible:ring-offset-0"
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
                    className="focus-visible:ring-1 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sezione 3 - Attributi */}
          <div className="w-[350px] border-l pl-6 flex flex-col h-full">
            <div className="sticky top-0 bg-white pb-2 border-b z-10">
              <h3 className="text-lg font-medium">Attributi</h3>
            </div>

            <Tabs defaultValue="main" className="w-full flex-1 flex flex-col">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="main">Principali</TabsTrigger>
                <TabsTrigger value="details">Dettagli</TabsTrigger>
              </TabsList>

              {/* Tab Principali */}
              <TabsContent 
                value="main" 
                className="flex-1 overflow-y-auto"
              >
                <div className="space-y-4">
                  {/* Stato */}
                  <div className="space-y-2">
                    <Label>Stato</Label>
                    <Select
                      defaultValue="1"
                      value={formData.status?.toString()}
                      onValueChange={(value) => {
                        setFormData(prev => ({
                          ...prev,
                          status: value
                        }))
                      }}
                    >
                      <SelectTrigger className="w-full focus:ring-1 focus:ring-offset-0 focus-visible:ring-1 focus-visible:ring-offset-0">
                        <SelectValue>
                          {statuses.find(s => s.value === formData.status)?.label || 'Active'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Primi 4 attributi principali */}
                  {parameters && parameters
                    .sort((a: Parameter, b: Parameter) => {
                      if (a.is_required === b.is_required) return 0;
                      return a.is_required ? -1 : 1;
                    })
                    .slice(0, 4)
                    .map((parameter: Parameter) => (
                      <div key={parameter.id} className="space-y-2">
                        <Label className="flex items-center">
                          {parameter.name}
                          {parameter.is_required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {parameter.is_expandable ? (
                          <div className="relative">
                            <Input
                              value={attributeInputs[parameter.id] || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setAttributeInputs(prev => ({
                                  ...prev,
                                  [parameter.id]: value
                                }));
                                
                                // Filtra i suggerimenti
                                const normalizedInput = normalizeText(value);
                                const filteredSuggestions = parameter.attributes.filter(attr =>
                                  normalizeText(attr.name).includes(normalizedInput)
                                );
                                setAttributeSuggestions(prev => ({
                                  ...prev,
                                  [parameter.id]: filteredSuggestions
                                }));
                              }}
                              onBlur={async () => {
                                const value = attributeInputs[parameter.id];
                                if (!value) return;

                                // Cerca un attributo esistente (ignorando case e caratteri speciali)
                                const normalizedValue = normalizeText(value);
                                const existingAttribute = parameter.attributes.find(attr =>
                                  normalizeText(attr.name) === normalizedValue
                                );

                                try {
                                  if (existingAttribute) {
                                    // Usa l'attributo esistente
                                    setFormData(prev => ({
                                      ...prev,
                                      attributes: {
                                        ...prev.attributes,
                                        [parameter.id]: existingAttribute.id.toString()
                                      }
                                    }));
                                  } else {
                                    // Crea un nuovo attributo
                                    setAttributeLoading(prev => ({ ...prev, [parameter.id]: true }));
                                    const newAttribute = await createAttribute(parameter.id.toString(), value);
                                    setAttributeLoading(prev => ({ ...prev, [parameter.id]: false }));
                                    setFormData(prev => ({
                                      ...prev,
                                      attributes: {
                                        ...prev.attributes,
                                        [parameter.id]: newAttribute.id.toString()
                                      }
                                    }));
                                    
                                    // Aggiorna la lista dei parametri
                                    parameter.attributes.push(newAttribute);
                                  }
                                } catch (error) {
                                  toast.error('Errore nella gestione dell\'attributo');
                                }
                              }}
                              placeholder={`Inserisci ${parameter.name.toLowerCase()}`}
                              className="focus-visible:ring-1 focus-visible:ring-offset-0"
                            />
                            {/* Suggerimenti con z-index più alto */}
                            {attributeSuggestions[parameter.id]?.length > 0 && (
                              <div className="absolute z-50 w-full bg-white border rounded-md mt-1 shadow-lg">
                                {attributeSuggestions[parameter.id].map(attr => (
                                  <div
                                    key={attr.id}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                      setAttributeInputs(prev => ({
                                        ...prev,
                                        [parameter.id]: attr.name
                                      }));
                                      setFormData(prev => ({
                                        ...prev,
                                        attributes: {
                                          ...prev.attributes,
                                          [parameter.id]: attr.id.toString()
                                        }
                                      }));
                                      setAttributeSuggestions(prev => ({
                                        ...prev,
                                        [parameter.id]: []
                                      }));
                                    }}
                                  >
                                    {attr.name}
                                  </div>
                                ))}
                              </div>
                            )}
                            {attributeLoading[parameter.id] && (
                              <div className="absolute z-50 w-full bg-white border rounded-md mt-1 shadow-lg">
                                <div className="px-3 py-2 text-gray-500">
                                  Caricamento...
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Select
                            value={formData?.attributes?.[parameter.id.toString()] ?? ''}
                            onValueChange={(value) => {
                              setFormData(prev => ({
                                ...prev,
                                attributes: {
                                  ...prev.attributes,
                                  [parameter.id.toString()]: value
                                }
                              }));
                            }}
                          >
                            <SelectTrigger className="w-full focus:ring-1 focus:ring-offset-0 focus-visible:ring-1 focus-visible:ring-offset-0">
                              <SelectValue placeholder={`Seleziona ${parameter.name.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {parameter.attributes?.map(attribute => (
                                <SelectItem 
                                  key={attribute.id} 
                                  value={attribute.id.toString()}
                                >
                                  {attribute.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                </div>
              </TabsContent>

              {/* Tab Dettagli */}
              <TabsContent 
                value="details" 
                className="flex-1 overflow-y-auto"
              >
                <div className="space-y-4">
                  {parameters && parameters
                    .sort((a: Parameter, b: Parameter) => {
                      if (a.is_required === b.is_required) return 0;
                      return a.is_required ? -1 : 1;
                    })
                    .slice(4)
                    .map((parameter: Parameter) => (
                      <div key={parameter.id} className="space-y-2">
                        <Label className="flex items-center">
                          {parameter.name}
                          {parameter.is_required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {parameter.is_expandable ? (
                          <div className="relative">
                            <Input
                              value={attributeInputs[parameter.id] || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setAttributeInputs(prev => ({
                                  ...prev,
                                  [parameter.id]: value
                                }));
                                
                                // Filtra i suggerimenti
                                const normalizedInput = normalizeText(value);
                                const filteredSuggestions = parameter.attributes.filter(attr =>
                                  normalizeText(attr.name).includes(normalizedInput)
                                );
                                setAttributeSuggestions(prev => ({
                                  ...prev,
                                  [parameter.id]: filteredSuggestions
                                }));
                              }}
                              onBlur={async () => {
                                const value = attributeInputs[parameter.id];
                                if (!value) return;

                                // Cerca un attributo esistente (ignorando case e caratteri speciali)
                                const normalizedValue = normalizeText(value);
                                const existingAttribute = parameter.attributes.find(attr =>
                                  normalizeText(attr.name) === normalizedValue
                                );

                                try {
                                  if (existingAttribute) {
                                    // Usa l'attributo esistente
                                    setFormData(prev => ({
                                      ...prev,
                                      attributes: {
                                        ...prev.attributes,
                                        [parameter.id]: existingAttribute.id.toString()
                                      }
                                    }));
                                  } else {
                                    // Crea un nuovo attributo
                                    setAttributeLoading(prev => ({ ...prev, [parameter.id]: true }));
                                    const newAttribute = await createAttribute(parameter.id.toString(), value);
                                    setAttributeLoading(prev => ({ ...prev, [parameter.id]: false }));
                                    setFormData(prev => ({
                                      ...prev,
                                      attributes: {
                                        ...prev.attributes,
                                        [parameter.id]: newAttribute.id.toString()
                                      }
                                    }));
                                    
                                    // Aggiorna la lista dei parametri
                                    parameter.attributes.push(newAttribute);
                                  }
                                } catch (error) {
                                  toast.error('Errore nella gestione dell\'attributo');
                                }
                              }}
                              placeholder={`Inserisci ${parameter.name.toLowerCase()}`}
                              className="focus-visible:ring-1 focus-visible:ring-offset-0"
                            />
                            {/* Suggerimenti con z-index più alto */}
                            {attributeSuggestions[parameter.id]?.length > 0 && (
                              <div className="absolute z-50 w-full bg-white border rounded-md mt-1 shadow-lg">
                                {attributeSuggestions[parameter.id].map(attr => (
                                  <div
                                    key={attr.id}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                      setAttributeInputs(prev => ({
                                        ...prev,
                                        [parameter.id]: attr.name
                                      }));
                                      setFormData(prev => ({
                                        ...prev,
                                        attributes: {
                                          ...prev.attributes,
                                          [parameter.id]: attr.id.toString()
                                        }
                                      }));
                                      setAttributeSuggestions(prev => ({
                                        ...prev,
                                        [parameter.id]: []
                                      }));
                                    }}
                                  >
                                    {attr.name}
                                  </div>
                                ))}
                              </div>
                            )}
                            {attributeLoading[parameter.id] && (
                              <div className="absolute z-50 w-full bg-white border rounded-md mt-1 shadow-lg">
                                <div className="px-3 py-2 text-gray-500">
                                  Caricamento...
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Select
                            value={formData?.attributes?.[parameter.id.toString()] ?? ''}
                            onValueChange={(value) => {
                              setFormData(prev => ({
                                ...prev,
                                attributes: {
                                  ...prev.attributes,
                                  [parameter.id.toString()]: value
                                }
                              }));
                            }}
                          >
                            <SelectTrigger className="w-full focus:ring-1 focus:ring-offset-0 focus-visible:ring-1 focus-visible:ring-offset-0">
                              <SelectValue placeholder={`Seleziona ${parameter.name.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {parameter.attributes?.map(attribute => (
                                <SelectItem 
                                  key={attribute.id} 
                                  value={attribute.id.toString()}
                                >
                                  {attribute.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </form>

        <div className="flex justify-end gap-2 px-6 py-4 border-t mt-auto">
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                Salvataggio...
              </>
            ) : (
              'Salva'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProductDialog
