'use client';

import { useEffect, useState } from 'react';
import { Promotion } from '@/types/promotion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusIcon, Trash2Icon, PencilIcon, BookOpenIcon, XIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";

type RuleCondition = 'nessuna' | 'totale_articoli' | 'totale_prezzo' | 'attributo_articolo' | 'prezzo_articolo' | 'quantita_stesso_articolo';
type RuleOperator = '<' | '>' | '=' | '>=';
type AttributeOperator = '=' | '!=';

interface Attribute {
  id: number;
  name: string;
  parameter_id?: number;
}

interface Parameter {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

interface Size {
  id: number;
  name: string;
}

interface Rule {
  condition: RuleCondition;
  operator?: RuleOperator;
  parameter_id?: number;
  attribute_operator?: AttributeOperator;
  attribute_ids?: number[];
  value?: string;
}

interface DiscountAction {
  type: 'percentuale' | 'fisso';
  target: 'tutti' | 'meno_caro' | 'da_n';
  n_articoli?: number;
  value: string;
}

interface PromotionRule {
  conditions: Rule[];
  productOperator: 'AND' | 'OR';
  cartOperator: 'AND' | 'OR';
  actions: DiscountAction[];
}

interface PromotionData {
  id: number;
  description: string;
  query: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface PromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion: PromotionData | null;
  onSave: (promotion: Partial<PromotionData>) => void;
}

interface PromotionFormData {
  name?: string;
  description: string;
}

// Definizione delle condizioni possibili
const PRODUCT_CONDITIONS = {
  price: 'price',           // prezzo_articolo
  quantity: 'quantity',     // quantita_stesso_articolo
  brand_id: 'brand_id',     // attributo_articolo (brand)
  size_id: 'size_id',       // attributo_articolo (taglia)
  // altri attributi prodotto...
};

const CART_CONDITIONS = {
  count: 'COUNT(*)',        // totale_articoli
  total: 'SUM(price)'       // totale_prezzo
};

function PromotionDialog({ open, onOpenChange, promotion, onSave }: PromotionDialogProps) {
  const [name, setName] = useState(promotion?.name || '');
  const [description, setDescription] = useState(promotion?.description || '');

  useEffect(() => {
    if (promotion) {
      setName(promotion.name || '');
      setDescription(promotion.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [promotion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: promotion?.id,
      name,
      description,
      query: promotion?.query || ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{promotion ? 'Modifica Promozione' : 'Nuova Promozione'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inserisci il nome"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Inserisci la descrizione"
            />
          </div>
          <Button type="submit">
            {promotion ? 'Salva Modifiche' : 'Crea Promozione'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PromozioniPage() {
  const [promotions, setPromotions] = useState<PromotionData[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [selectedPromotionId, setSelectedPromotionId] = useState<number | null>(null);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [newPromotion, setNewPromotion] = useState<PromotionFormData>({
    name: '',
    description: ''
  });
  const [newPromotionRule, setNewPromotionRule] = useState<PromotionRule>({
    conditions: [],
    productOperator: 'AND',
    cartOperator: 'AND',
    actions: []
  });
  const [tempAction, setTempAction] = useState<DiscountAction | null>(null);
  const [newRule, setNewRule] = useState<Rule>({
    condition: 'totale_articoli',
  });
  const [selectedPromotion, setSelectedPromotion] = useState<PromotionData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPromotions();
    fetchParameters();
    fetchBrands();
    fetchSizes();
  }, []);

  const fetchPromotions = async () => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/promotions`);
      if (!response.ok) throw new Error('Errore nel caricamento delle promozioni');
      const data = await response.json();
      setPromotions(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare le promozioni"
      });
    }
  };

  const fetchParameters = async () => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/parameters`);
      if (!response.ok) throw new Error('Errore nel caricamento dei parametri');
      const data = await response.json();
      setParameters(data);
    } catch (error) {
      console.error('Error fetching parameters:', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/brands`);
      if (!response.ok) throw new Error('Errore nel caricamento dei brand');
      const data = await response.json();
      setBrands(data);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const fetchSizes = async () => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/sizes`);
      if (!response.ok) throw new Error('Errore nel caricamento delle taglie');
      const data = await response.json();
      setSizes(data);
    } catch (error) {
      console.error('Error fetching sizes:', error);
    }
  };

  const fetchAttributesByParameterId = async (parameterId: number) => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/attributes/parameter/${parameterId}`);
      if (!response.ok) throw new Error('Errore nel caricamento degli attributi');
      const data = await response.json();
      setAttributes(data);
    } catch (error) {
      console.error('Error fetching attributes:', error);
    }
  };

  const handleParameterChange = async (parameterId: string) => {
    const numericId = Number(parameterId);
    setNewRule(prev => ({ 
      ...prev, 
      parameter_id: numericId,
      attribute_ids: [] // Reset gli attributi selezionati quando cambia il parametro
    }));
    
    if (parameterId) {
      if (numericId > 0) { // Se è un parametro normale
        await fetchAttributesByParameterId(numericId);
      } else if (numericId === -1) { // Se è Brand
        setAttributes(brands.map(brand => ({
          id: brand.id,
          name: brand.name
        })));
      } else if (numericId === -2) { // Se è Taglia
        setAttributes(sizes.map(size => ({
          id: size.id,
          name: size.name
        })));
      }
    } else {
      setAttributes([]);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa promozione?')) return;

    try {
      const response = await fetch(`${process.env.API_URL}/api/promotions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Errore nell\'eliminazione della promozione');

      toast({
        title: "Successo",
        description: "Promozione eliminata con successo"
      });

      fetchPromotions();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile eliminare la promozione"
      });
    }
  };

  const handleCreatePromotion = async () => {
    try {
      const response = await fetch(`${process.env.API_URL}/api/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...newPromotion, query: '' }),
      });

      if (!response.ok) throw new Error('Errore nella creazione della promozione');

      toast({
        title: "Successo",
        description: "Promozione creata con successo"
      });

      setIsDialogOpen(false);
      setNewPromotion({
        name: '',
        description: ''
      });
      fetchPromotions();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile creare la promozione"
      });
    }
  };

  const parseRuleFromQuery = (query: string) => {
    try {
      const conditions: Rule[] = [];
      const actions: DiscountAction[] = [];
      
      // Rimuoviamo WHERE e THEN per isolare le condizioni
      const [conditionsStr, actionsStr] = query.replace('WHERE ', '').split(' THEN ');
      
      // Troviamo l'indice dove iniziano le condizioni del carrello
      const cartStartIndex = conditionsStr.search(/\(\s*(COUNT\(\*\)|SUM\(price\))/);
      
      if (cartStartIndex !== -1) {
        // Abbiamo sia condizioni prodotto che carrello
        const productPart = conditionsStr.substring(0, cartStartIndex).trim();
        const cartPart = conditionsStr.substring(cartStartIndex).trim();

        // Parsing condizioni prodotto
        if (productPart) {
          const productContent = productPart.slice(1, -1).trim(); // Rimuove le parentesi
          const productOperator = productContent.includes(' OR ') ? 'OR' : 'AND';
          const productConditions = productContent.split(productOperator === 'OR' ? ' OR ' : ' AND ');
          
          productConditions.forEach(condition => {
            condition = condition.trim();
            if (condition.includes(PRODUCT_CONDITIONS.price)) {
              const match = condition.match(/price\s*([<>=]+)\s*(\d+(\.\d+)?)/);
              if (match) {
                conditions.push({
                  condition: 'prezzo_articolo',
                  operator: match[1] as RuleOperator,
                  value: match[2]
                });
              }
            } else if (condition.includes(PRODUCT_CONDITIONS.quantity)) {
              const match = condition.match(/quantity\s*([<>=]+)\s*(\d+)/);
              if (match) {
                conditions.push({
                  condition: 'quantita_stesso_articolo',
                  operator: match[1] as RuleOperator,
                  value: match[2]
                });
              }
            } else if (condition.includes(PRODUCT_CONDITIONS.brand_id)) {
              const match = condition.match(/brand_id\s*([=!]+)\s*(\d+)/);
              if (match) {
                conditions.push({
              condition: 'attributo_articolo',
                  parameter_id: -1,
                  attribute_operator: match[1] === '=' ? '=' : '!=' as AttributeOperator,
                  attribute_ids: [parseInt(match[2])]
                });
              }
            }
          });

          setNewPromotionRule(prev => ({
            ...prev,
            productOperator
          }));
        }

        // Parsing condizioni carrello
        if (cartPart) {
          const cartContent = cartPart.slice(1, -1).trim(); // Rimuove le parentesi
          const cartOperator = cartContent.includes(' OR ') ? 'OR' : 'AND';
          const cartConditions = cartContent.split(cartOperator === 'OR' ? ' OR ' : ' AND ');
          
          cartConditions.forEach(condition => {
            condition = condition.trim();
            if (condition.includes(CART_CONDITIONS.count)) {
              const match = condition.match(/COUNT\(\*\)\s*([<>=]+)\s*(\d+)/);
              if (match) {
                conditions.push({
                  condition: 'totale_articoli',
                  operator: match[1] as RuleOperator,
                  value: match[2]
                });
              }
            } else if (condition.includes(CART_CONDITIONS.total)) {
              const match = condition.match(/SUM\(price\)\s*([<>=]+)\s*(\d+(\.\d+)?)/);
              if (match) {
                conditions.push({
                  condition: 'totale_prezzo',
                  operator: match[1] as RuleOperator,
                  value: match[2]
                });
              }
            }
          });

          setNewPromotionRule(prev => ({
            ...prev,
            cartOperator
          }));
        }
      } else {
        // Solo condizioni prodotto
        const productContent = conditionsStr.slice(1, -1).trim();
        const productOperator = productContent.includes(' OR ') ? 'OR' : 'AND';
        const productConditions = productContent.split(productOperator === 'OR' ? ' OR ' : ' AND ');
        
        productConditions.forEach(condition => {
          condition = condition.trim();
          if (condition.includes(PRODUCT_CONDITIONS.price)) {
            const match = condition.match(/price\s*([<>=]+)\s*(\d+(\.\d+)?)/);
            if (match) {
              conditions.push({
                condition: 'prezzo_articolo',
                operator: match[1] as RuleOperator,
                value: match[2]
              });
            }
          } else if (condition.includes(PRODUCT_CONDITIONS.quantity)) {
            const match = condition.match(/quantity\s*([<>=]+)\s*(\d+)/);
            if (match) {
              conditions.push({
                condition: 'quantita_stesso_articolo',
                operator: match[1] as RuleOperator,
                value: match[2]
              });
            }
          } else if (condition.includes(PRODUCT_CONDITIONS.brand_id)) {
            const match = condition.match(/brand_id\s*([=!]+)\s*(\d+)/);
            if (match) {
              conditions.push({
                condition: 'attributo_articolo',
                parameter_id: -1,
                attribute_operator: match[1] === '=' ? '=' : '!=' as AttributeOperator,
                attribute_ids: [parseInt(match[2])]
              });
            }
          }
        });

        setNewPromotionRule(prev => ({
          ...prev,
          productOperator
        }));
      }

      // Parsing delle azioni di sconto
      if (actionsStr) {
        const actionParts = actionsStr.split(' AND ');
        actionParts.forEach(part => {
          const match = part.match(/APPLY_DISCOUNT\((PERCENT|FIXED),\s*(\d+(?:\.\d+)?),\s*(ALL|CHEAPEST|FROM_N)(?:,\s*(\d+))?\)/);
          if (match) {
            const action: DiscountAction = {
              type: match[1].toLowerCase() === 'percent' ? 'percentuale' : 'fisso',
              value: match[2],
              target: match[3] === 'ALL' ? 'tutti' : 
                     match[3] === 'CHEAPEST' ? 'meno_caro' : 'da_n',
            };
            
            if (action.target === 'da_n' && match[4]) {
              action.n_articoli = parseInt(match[4]);
            }
            
            actions.push(action);
          }
        });
      }

      setNewPromotionRule(prev => ({
        ...prev,
        conditions,
        actions
      }));
    } catch (error) {
      console.error('Errore nel parsing della query:', error);
    }
  };

  const handleAddRule = (promotionId: number) => {
    setSelectedPromotionId(promotionId);
    const promotion = promotions.find(p => p.id === promotionId);
    
    if (promotion?.query) {
      parseRuleFromQuery(promotion.query);
    } else {
      // Reset to default state
      setNewPromotionRule({
        conditions: [],
        productOperator: 'AND',
        cartOperator: 'AND',
        actions: []
      });
    }
    
    // Inizializza newRule con un valore di default
    setNewRule({ condition: 'nessuna' });
    setIsRuleDialogOpen(true);
  };

  const handleAddCondition = () => {
    setNewPromotionRule(prev => ({
      ...prev,
      conditions: [...prev.conditions, newRule]
    }));
    setNewRule({ condition: 'totale_articoli' });
  };

  const handleRemoveCondition = (index: number, type: 'product' | 'cart') => {
    setNewPromotionRule(prev => {
      const conditions = [...prev.conditions];
      const startIndex = type === 'product' 
        ? conditions.findIndex(c => ['prezzo_articolo', 'quantita_stesso_articolo', 'attributo_articolo'].includes(c.condition))
        : conditions.findIndex(c => ['totale_articoli', 'totale_prezzo'].includes(c.condition));
      
      conditions.splice(startIndex + index, 1);
      
      return {
      ...prev,
        conditions
      };
    });
  };

  const handleAddAction = () => {
    if (!tempAction) return;
    setNewPromotionRule(prev => ({
      ...prev,
      actions: [...prev.actions, tempAction]
    }));
    setTempAction(null);
  };

  const handleRemoveAction = (index: number) => {
    setNewPromotionRule(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const generateQuery = (rule: PromotionRule): string => {
    // Raggruppa le condizioni per tipo
    const productConditions = rule.conditions
      .filter(c => ['prezzo_articolo', 'quantita_stesso_articolo', 'attributo_articolo'].includes(c.condition))
      .map(condition => {
        switch (condition.condition) {
          case 'prezzo_articolo':
            return `price ${condition.operator} ${condition.value}`;
          case 'quantita_stesso_articolo':
            return `quantity ${condition.operator} ${condition.value}`;
          case 'attributo_articolo':
            const paramName = getParameterName(condition.parameter_id);
            return `${paramName}_id ${condition.attribute_operator} ${condition.attribute_ids?.[0]}`;
          default:
            return '';
        }
      })
      .filter(Boolean);

    const cartConditions = rule.conditions
      .filter(c => ['totale_articoli', 'totale_prezzo'].includes(c.condition))
      .map(condition => {
        switch (condition.condition) {
          case 'totale_articoli':
            return `COUNT(*) ${condition.operator} ${condition.value}`;
          case 'totale_prezzo':
            return `SUM(price) ${condition.operator} ${condition.value}`;
          default:
            return '';
        }
      })
      .filter(Boolean);

    // Costruisci le parti della query con gli operatori corretti
    const productQuery = productConditions.length > 0 
      ? `(${productConditions.join(` ${rule.productOperator} `)})`
      : '';

    const cartQuery = cartConditions.length > 0
      ? `(${cartConditions.join(` ${rule.cartOperator} `)})`
      : '';

    // Combina le condizioni sempre con AND tra gruppi
    const conditions = [productQuery, cartQuery]
      .filter(Boolean)
      .join(' AND ');

    // Genera la parte delle azioni
      const actions = rule.actions.map(action => {
      const type = action.type === 'percentuale' ? 'PERCENT' : 'FIXED';
        const target = action.target === 'tutti' ? 'ALL' : 
                    action.target === 'meno_caro' ? 'CHEAPEST' : 'FROM_N';

      if (action.target === 'da_n' && action.n_articoli) {
        return `APPLY_DISCOUNT(${type}, ${action.value}, ${target}, ${action.n_articoli})`;
      }
      return `APPLY_DISCOUNT(${type}, ${action.value}, ${target})`;
    });

    // Costruisci la query finale
    return conditions ? `WHERE ${conditions} THEN ${actions.join(' AND ')}` : '';
  };

  const handleCreateRule = async () => {
    const query = generateQuery(newPromotionRule);
    console.log('Query generata:', query);

    try {
      const response = await fetch(`${process.env.API_URL}/api/promotions/${selectedPromotionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error('Errore nel salvataggio della regola');

      toast({
        title: "Successo",
        description: "Regola salvata con successo"
      });

      setIsRuleDialogOpen(false);
      setNewPromotionRule({ conditions: [], productOperator: 'AND', cartOperator: 'AND', actions: [] });
      setNewRule({ condition: 'nessuna' });
      fetchPromotions();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile salvare la regola"
      });
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMMM yyyy HH:mm', { locale: it });
  };

  // Combina parametri, brand e taglie per la select
  const allParameters = [
    { id: -1, name: 'Brand' },
    { id: -2, name: 'Taglia' },
    ...parameters
  ];

  // Determina i valori disponibili per la seconda select
  const getAvailableValues = () => {
    if (!newRule.parameter_id) return [];
    
    if (newRule.parameter_id === -1) {
      return brands.map(brand => ({
        id: brand.id,
        name: brand.name
      }));
    }
    
    if (newRule.parameter_id === -2) {
      return sizes.map(size => ({
        id: size.id,
        name: size.name
      }));
    }
    
    return attributes;
  };

  const getParameterName = (parameterId?: number) => {
    if (!parameterId) return '';
    const parameter = allParameters.find(p => p.id === parameterId);
    return parameter ? parameter.name.toLowerCase() : '';
  };

  const formatCondition = (condition: Rule): string => {
    switch (condition.condition) {
      case 'prezzo_articolo':
        return `Prezzo articolo ${condition.operator} ${condition.value}€`;
      case 'quantita_stesso_articolo':
        return `Quantità stesso articolo ${condition.operator} ${condition.value}`;
      case 'attributo_articolo':
        if (condition.parameter_id === -1) {
          const brandName = brands.find(b => b.id === condition.attribute_ids?.[0])?.name || '';
          return `Brand ${condition.attribute_operator} ${brandName}`;
        }
        const parameter = allParameters.find(p => p.id === condition.parameter_id);
        const attributeNames = attributes
          .filter(attr => condition.attribute_ids?.includes(attr.id))
          .map(attr => attr.name)
            .join(', ');
        return `${parameter?.name} ${condition.attribute_operator} ${attributeNames}`;
      case 'totale_articoli':
        return `Totale articoli ${condition.operator} ${condition.value}`;
      case 'totale_prezzo':
        return `Totale prezzo ${condition.operator} ${condition.value}€`;
      default:
        return '';
    }
  };

  const isRuleValid = () => {
    if (newRule.condition === 'nessuna') {
      return true;
    }
    if (newRule.condition === 'attributo_articolo') {
      return (
        newRule.parameter_id !== undefined &&
        newRule.attribute_operator !== undefined &&
        newRule.attribute_ids !== undefined &&
        newRule.attribute_ids.length > 0
      );
    } else {
      return (
        newRule.operator !== undefined &&
        newRule.value !== undefined &&
        newRule.value !== ''
      );
    }
  };

  const handleEditClick = (promotion: PromotionData) => {
    setSelectedPromotion(promotion);
    setIsDialogOpen(true);
  };

  const handleSavePromotion = async (promotionData: Partial<PromotionData>) => {
    try {
      const url = promotionData.id 
        ? `${process.env.API_URL}/api/promotions/${promotionData.id}`
        : `${process.env.API_URL}/api/promotions`;
      
      const method = promotionData.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promotionData),
      });

      if (!response.ok) throw new Error('Errore nel salvataggio della promozione');

      toast({
        title: "Successo",
        description: promotionData.id 
          ? "Promozione modificata con successo"
          : "Promozione creata con successo"
      });

      setIsDialogOpen(false);
      setSelectedPromotion(null);
      fetchPromotions();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile salvare la promozione"
      });
    }
  };

  // Aggiungo un type guard per verificare il tipo di condizione
  function isProductPriceOrQuantityCondition(condition: RuleCondition): boolean {
    return condition === 'prezzo_articolo' || condition === 'quantita_stesso_articolo';
  }

  function isAttributeCondition(condition: RuleCondition): boolean {
    return condition === 'attributo_articolo';
  }

  useEffect(() => {
    if (selectedPromotion?.query) {
      parseRuleFromQuery(selectedPromotion.query);
    }
  }, [selectedPromotion]);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Promozioni</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" /> Nuova Promozione
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead>Query</TableHead>
            <TableHead>Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {promotions?.map((promotion: PromotionData) => (
            <TableRow key={promotion.id}>
              <TableCell>{promotion.id}</TableCell>
              <TableCell>{promotion.name}</TableCell>
              <TableCell>{promotion.description}</TableCell>
              <TableCell>{promotion.query}</TableCell>
              <TableCell className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditClick(promotion)}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(promotion.id)}
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleAddRule(promotion.id)}
                >
                  <BookOpenIcon className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <PromotionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        promotion={selectedPromotion}
        onSave={handleSavePromotion}
      />

      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-[1200px] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="px-8 py-6 border-b">
            <DialogTitle className="text-2xl font-semibold">Gestione Regole Promozione</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              Configura le condizioni e le regole di sconto per questa promozione
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="grid grid-cols-2 gap-8">
            {/* Colonna Sinistra - Condizioni */}
            <div className="space-y-6">
                {/* Condizioni sui Prodotti */}
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">Condizioni sui Prodotti</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Definisci le condizioni che si applicano ai singoli prodotti
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewRule({ condition: 'prezzo_articolo' })}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Aggiungi
                    </Button>
                  </div>
                  
                  {/* Lista delle condizioni sui prodotti esistenti */}
                  {newPromotionRule.conditions
                    .filter(c => ['prezzo_articolo', 'quantita_stesso_articolo', 'attributo_articolo'].includes(c.condition))
                    .length > 0 && (
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-2 bg-white p-3 rounded-md border shadow-sm">
                        <Label htmlFor="product-operator" className="font-medium">Operatore Logico tra Condizioni Prodotto</Label>
                      <Select
                          value={newPromotionRule.productOperator}
                        onValueChange={(value: 'AND' | 'OR') => setNewPromotionRule(prev => ({
                          ...prev,
                            productOperator: value
                        }))}
                      >
                          <SelectTrigger id="product-operator" className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND (E)</SelectItem>
                          <SelectItem value="OR">OR (O)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                        {newPromotionRule.conditions
                          .filter(c => ['prezzo_articolo', 'quantita_stesso_articolo', 'attributo_articolo'].includes(c.condition))
                          .map((condition, index, array) => (
                          <div key={index} className="relative">
                            {index > 0 && (
                              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-gray-100 rounded-full text-sm font-medium z-10">
                                {newPromotionRule.productOperator}
                              </div>
                            )}
                            <div className="flex items-center gap-2 p-4 bg-white rounded-md border shadow-sm">
                          <span className="flex-1 font-medium">
                            {formatCondition(condition)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon"
                                onClick={() => handleRemoveCondition(index, 'product')}
                            className="hover:bg-red-100 hover:text-red-600"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                            </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                  {/* Form per aggiungere nuova condizione sui prodotti */}
                  {newRule.condition && ['prezzo_articolo', 'quantita_stesso_articolo', 'attributo_articolo'].includes(newRule.condition) && (
                    <div className="bg-white p-4 rounded-md border shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Nuova Condizione sul Prodotto</h4>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setNewRule({ condition: 'nessuna' })}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                          <Label>Tipo di Condizione</Label>
                      <Select
                        value={newRule.condition}
                        onValueChange={(value: RuleCondition) => {
                          setNewRule({ condition: value });
                          setAttributes([]);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona condizione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prezzo_articolo">Prezzo Articolo</SelectItem>
                          <SelectItem value="quantita_stesso_articolo">Quantità Stesso Articolo</SelectItem>
                          <SelectItem value="attributo_articolo">Attributo Articolo</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>

                    {newRule.condition === 'attributo_articolo' && (
                      <>
                        <div className="grid gap-2">
                          <Label>Parametro</Label>
                          <Select
                            value={newRule.parameter_id?.toString()}
                            onValueChange={handleParameterChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona parametro" />
                            </SelectTrigger>
                            <SelectContent>
                              {allParameters.map((param) => (
                                <SelectItem key={param.id} value={param.id.toString()}>
                                  {param.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {newRule.parameter_id && (
                          <>
                            <div className="grid gap-2">
                              <Label>Operatore</Label>
                              <Select
                                value={newRule.attribute_operator}
                                onValueChange={(value: AttributeOperator) => setNewRule(prev => ({ ...prev, attribute_operator: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona operatore" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="=">Uguale a (=)</SelectItem>
                                  <SelectItem value="!=">Diverso da (≠)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid gap-2">
                              <Label>Valore</Label>
                              <MultiSelect
                                options={attributes.map(attr => ({
                                  label: attr.name,
                                  value: attr.id.toString()
                                }))}
                                selected={newRule.attribute_ids?.map(id => id.toString()) || []}
                                onChange={(values) => {
                                  setNewRule(prev => ({
                                    ...prev,
                                    attribute_ids: values.map(v => Number(v))
                                  }));
                                }}
                                placeholder="Seleziona valori..."
                                className="w-full"
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}

                        {(newRule.condition === 'prezzo_articolo' || newRule.condition === 'quantita_stesso_articolo') && (
                          <>
                            <div className="grid gap-2">
                              <Label>Operatore</Label>
                              <Select
                                value={newRule.operator}
                                onValueChange={(value: RuleOperator) => setNewRule(prev => ({ ...prev, operator: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona operatore" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="<">Minore (&lt;)</SelectItem>
                                  <SelectItem value=">">Maggiore (&gt;)</SelectItem>
                                  <SelectItem value="=">Uguale (=)</SelectItem>
                                  <SelectItem value=">=">Maggiore o Uguale (&gt;=)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid gap-2">
                              <Label>Valore</Label>
                              <Input
                                type="number"
                                step={newRule.condition === 'prezzo_articolo' ? '0.01' : '1'}
                                min="0"
                                value={newRule.value || ''}
                                onChange={(e) => setNewRule(prev => ({ ...prev, value: e.target.value }))}
                                placeholder={newRule.condition === 'prezzo_articolo' ? '€' : 'quantità'}
                              />
                            </div>
                          </>
                        )}

                        <Button 
                          onClick={handleAddCondition}
                          disabled={!isRuleValid()}
                          className="mt-2"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Aggiungi Condizione
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Condizioni sul Carrello */}
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">Condizioni sul Carrello</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Definisci le condizioni che si applicano all&apos;intero carrello
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewRule({ condition: 'totale_articoli' })}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Aggiungi
                    </Button>
                  </div>

                  {/* Lista delle condizioni sul carrello esistenti */}
                  {newPromotionRule.conditions
                    .filter(c => ['totale_articoli', 'totale_prezzo'].includes(c.condition))
                    .length > 0 && (
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-2 bg-white p-3 rounded-md border shadow-sm">
                        <Label htmlFor="cart-operator" className="font-medium">Operatore Logico tra Condizioni Carrello</Label>
                        <Select
                          value={newPromotionRule.cartOperator}
                          onValueChange={(value: 'AND' | 'OR') => setNewPromotionRule(prev => ({
                            ...prev,
                            cartOperator: value
                          }))}
                        >
                          <SelectTrigger id="cart-operator" className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">AND (E)</SelectItem>
                            <SelectItem value="OR">OR (O)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4">
                        {newPromotionRule.conditions
                          .filter(c => ['totale_articoli', 'totale_prezzo'].includes(c.condition))
                          .map((condition, index, array) => (
                          <div key={index} className="relative">
                            {index > 0 && (
                              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-gray-100 rounded-full text-sm font-medium z-10">
                                {newPromotionRule.cartOperator}
                              </div>
                            )}
                            <div className="flex items-center gap-2 p-4 bg-white rounded-md border shadow-sm">
                              <span className="flex-1 font-medium">
                                {formatCondition(condition)}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleRemoveCondition(index, 'cart')}
                                className="hover:bg-red-100 hover:text-red-600"
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Form per aggiungere nuova condizione sul carrello */}
                  {newRule.condition && ['totale_articoli', 'totale_prezzo'].includes(newRule.condition) && (
                    <div className="bg-white p-4 rounded-md border shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Nuova Condizione sul Carrello</h4>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setNewRule({ condition: 'nessuna' })}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label>Tipo di Condizione</Label>
                          <Select
                            value={newRule.condition}
                            onValueChange={(value: RuleCondition) => {
                              setNewRule({ condition: value });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona condizione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="totale_articoli">Totale Articoli</SelectItem>
                              <SelectItem value="totale_prezzo">Totale Prezzo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label>Operatore</Label>
                          <Select
                            value={newRule.operator}
                            onValueChange={(value: RuleOperator) => setNewRule(prev => ({ ...prev, operator: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona operatore" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="<">Minore (&lt;)</SelectItem>
                              <SelectItem value=">">Maggiore (&gt;)</SelectItem>
                              <SelectItem value="=">Uguale (=)</SelectItem>
                              <SelectItem value=">=">Maggiore o Uguale (&gt;=)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {newRule.operator && (
                          <div className="grid gap-2">
                            <Label>Valore</Label>
                            <Input
                              type="number"
                              step={newRule.condition === 'totale_prezzo' ? '0.01' : '1'}
                              min="0"
                              value={newRule.value || ''}
                              onChange={(e) => setNewRule(prev => ({ ...prev, value: e.target.value }))}
                              placeholder={newRule.condition === 'totale_prezzo' ? '€' : 'quantità'}
                            />
                          </div>
                    )}

                    <Button 
                      onClick={handleAddCondition}
                      disabled={!isRuleValid()}
                      className="mt-2"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Aggiungi Condizione
                    </Button>
                  </div>
                </div>
                  )}
              </div>
            </div>

            {/* Colonna Destra - Regole di Sconto */}
            <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">Regole di Sconto</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Definisci gli sconti da applicare quando le condizioni sono soddisfatte
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setTempAction({ type: 'percentuale', target: 'tutti', value: '' })}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Aggiungi
                    </Button>
                  </div>
                
                {/* Lista delle regole di sconto esistenti */}
                {newPromotionRule.actions.length > 0 && (
                  <div className="space-y-2 mb-6">
                    {newPromotionRule.actions.map((action, index) => (
                        <div key={index} className="flex items-center gap-2 p-4 bg-white rounded-md border shadow-sm">
                        <span className="flex-1 font-medium">
                          Sconto {action.type === 'percentuale' ? 'del' : 'di'} {action.value}
                          {action.type === 'percentuale' ? '%' : '€'} 
                          {action.target === 'tutti' && ' su tutti gli articoli'}
                          {action.target === 'meno_caro' && ' sull&apos;articolo meno caro'}
                          {action.target === 'da_n' && ` su articoli dal ${action.n_articoli}° in poi`}
                        </span>
                        {index < newPromotionRule.actions.length - 1 && (
                            <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium">
                            AND
                          </span>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveAction(index)}
                          className="hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form per aggiungere nuova regola di sconto */}
                  {tempAction && (
                    <div className="bg-white p-4 rounded-md border shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Nuovo Sconto</h4>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setTempAction(null)}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Tipo di Sconto</Label>
                      <Select
                            value={tempAction.type}
                        onValueChange={(value: 'percentuale' | 'fisso') => setTempAction({ 
                          type: value, 
                          target: 'tutti',
                          value: '' 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona tipo di sconto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentuale">Sconto Percentuale (%)</SelectItem>
                          <SelectItem value="fisso">Sconto Fisso (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                        <div className="grid gap-2">
                          <Label>Applica Sconto</Label>
                          <Select
                            value={tempAction.target}
                            onValueChange={(value: 'tutti' | 'meno_caro' | 'da_n') => setTempAction(prev => ({
                              ...prev!,
                              target: value,
                              n_articoli: value === 'da_n' ? 1 : undefined
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona modalità" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tutti">Su tutti gli articoli</SelectItem>
                              <SelectItem value="meno_caro">Sull&apos;articolo meno caro</SelectItem>
                              <SelectItem value="da_n">Su articoli a partire dal...</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {tempAction.target === 'da_n' && (
                          <div className="grid gap-2">
                            <Label>A partire dal n° articolo</Label>
                            <Input
                              type="number"
                              min="1"
                              value={tempAction.n_articoli || ''}
                              onChange={(e) => setTempAction(prev => ({
                                ...prev!,
                                n_articoli: parseInt(e.target.value)
                              }))}
                            />
                          </div>
                        )}

                        <div className="grid gap-2">
                          <Label>Valore Sconto</Label>
                          <Input
                            type="number"
                            step={tempAction.type === 'percentuale' ? '1' : '0.01'}
                            min="0"
                            max={tempAction.type === 'percentuale' ? '100' : undefined}
                            value={tempAction.value}
                            placeholder={tempAction.type === 'percentuale' ? '%' : '€'}
                            onChange={(e) => setTempAction(prev => ({
                              ...prev!,
                              value: e.target.value
                            }))}
                          />
                        </div>

                        <Button 
                          onClick={handleAddAction}
                          disabled={!tempAction.value}
                          className="mt-2"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Aggiungi Sconto
                        </Button>
                  </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t px-8 py-6">
            <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateRule}>
              Salva Regola
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 