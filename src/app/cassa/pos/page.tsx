'use client'
import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import type {
  Product,
  CartItem,
  Brand,
  Size,
  SizeGroup,
  Status,
  Filters,
  PriceRange,
  PriceRanges,
  AvailabilityFilter,
  DiscountVoucher,
  OrderPayment,
  PaymentType,
  Operator,
  PaymentMethod,
  Order,
  FrozenOrder,
  OrderItem,
  GroupedItems
} from './@types'

const server = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

// UI Components imports
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

// Icons imports
import { 
  ShoppingCart, 
  ArrowLeft, 
  Clock, 
  DollarSign, 
  CreditCard, 
  Link2, 
  MoreHorizontal, 
  FileText, 
  Plus, 
  Eye, 
  ChevronDown, 
  Search, 
  Euro, 
  Snowflake, 
  ScanBarcode,
  Wallet, 
  QrCode, 
  Smartphone, 
  Receipt, 
  ReceiptText, 
  Ban, 
  Camera, 
  Trash,
  CirclePercent,
  Minus,
  CreditCardIcon,
  EuroIcon,
  TicketIcon,
  X,
  BanknoteIcon,
  RotateCcw,
  RefreshCw,
  Coins
} from 'lucide-react'

// Hooks and Utils imports
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { loadOrderFromDB } from './loadOrder'
import Cookies from 'js-cookie'

// Definizione dei tipi di documento
const allDocumentTypes = [
  { 
    id: 'no_document', 
    name: 'Nessun documento', 
    icon: 'Ban',
    description: 'Non stampare alcun documento'
  },
  { 
    id: 'fiscal_receipt', 
    name: 'Scontrino Fiscale', 
    icon: 'Receipt',
    description: 'Stampa scontrino con prezzi e IVA'
  },
  { 
    id: 'courtesy_receipt', 
    name: 'Scontrino Cortesia', 
    icon: 'ReceiptText',
    description: 'Stampa scontrino senza prezzi'
  },
  { 
    id: 'payment_receipt', 
    name: 'Ricevuta di Pagamento', 
    icon: 'Receipt',
    description: 'Stampa ricevuta con dettaglio pagamenti'
  },
  { 
    id: 'invoice', 
    name: 'Fattura', 
    icon: 'FileText',
    description: 'Genera fattura completa'
  }
]

const clients = [
  { id: '1233', name: 'elsayed alorabi 2221' },
  { id: '1234', name: 'Jane Smith' },
]


// Aggiungi questa funzione prima del componente principale
const fetchMainPhoto = async (article_code: string, variant_code: string) => {
  try {
    const response = await fetch(`${server}/api/products/photos/${article_code}/${variant_code}/main`);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.url || null;
  } catch (error) {
    console.error('Error fetching main photo:', error);
    return null;
  }
};

import { CancelReservationModal } from './components/CancelReservationModal'
import { cancelReservation } from './utils/cancelReservation'
import type { RefundMethod } from './components/CancelReservationModal'
import { VoucherModal } from './components/VoucherModal'
import CartTable from './components/CartTable'
import { DefaultSidebar } from './components/DefaultSidebar'
import { ReturnSidebar } from './components/ReturnSidebar'
import { handleReturn } from './utils/handleReturn'

// Definizione dei tipi
interface FrozenOrderType extends Omit<FrozenOrder, 'previousSuccessfulPayments'> {
  previousSuccessfulPayments: OrderPayment[];
  id: string;
  cart: CartItem[];
  totalDiscount: number;
  orderNumber: string;
  orderDate: Date;
  deposit: number;
  voucher: number;
  previousPayments: OrderPayment[];
  currentOrderId: number | null;
  isReservation: boolean;
}

interface LoadOrderDependenciesType {
  setCart: (cart: CartItem[]) => void;
  setSelectedClient: React.Dispatch<React.SetStateAction<string>>;
  setCurrentOrderId: React.Dispatch<React.SetStateAction<number | null>>;
  setIsReservationsDialogOpen: () => void;
  fetchPreviousPayments: (orderId: number) => Promise<void>;
  fetchPreviousSuccessfulPayments: (orderId: number) => Promise<void>;
  setOrderNumber: React.Dispatch<React.SetStateAction<string>>;
  toast: any;
}

// Aggiorno i tipi per i parametri impliciti
interface OrderWithPayments {
  order_payments: OrderPayment[];
  created_at: string;
  status_id: number;
  id: number;
  code: string;
  client?: {
    id: number;
    name: string;
  };
  final_total: string;
  total_price: string;
}

// Aggiorno il tipo per handleReturn
interface HandleReturnProps {
  refundMethod: RefundMethod;
  amount: number;
  isPartialReturn: boolean;
  returnQuantities: { [key: number]: number };
}

// Aggiorno CartItem e PaymentMethod per includere i campi mancanti
interface ExtendedCartItem extends CartItem {
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ExtendedPaymentMethod extends Omit<PaymentMethod, 'description'> {
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function POSSystem() {
  const [saleType, setSaleType] = useState('sale')
  const [searchTerm, setSearchTerm] = useState('')
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedOperator, setSelectedOperator] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderNumber, setOrderNumber] = useState<string>('')
  const [orderDate, setOrderDate] = useState<Date>(new Date())
  const [totalDiscount, setTotalDiscount] = useState(0)
  const [discountedTotal, setDiscountedTotal] = useState(0)
  const [deposit, setDeposit] = useState(0)
  const [voucher, setVoucher] = useState(0)
  const [paymentMethods, setPaymentMethods] = useState<{[key: string]: number}>({
    cash: 0,
    card: 0,
    transfer: 0,
    check: 0
  })
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([])
  const [isFullPayment, setIsFullPayment] = useState(true)
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [sizes, setSizes] = useState<Size[]>([])
  const [sizeGroups, setSizeGroups] = useState<SizeGroup[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [frozenOrders, setFrozenOrders] = useState<FrozenOrder[]>([])
  const { toast } = useToast()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [filters, setFilters] = useState<Filters>({})
  const [priceRanges, setPriceRanges] = useState<PriceRanges>({
    wholesale_price: {},
    retail_price: {}
  })
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>({})
  const [previousPayments, setPreviousPayments] = useState<OrderPayment[]>([])
  const [previousSuccessfulPayments, setPreviousSuccessfulPayments] = useState<OrderPayment[]>([])
  const [appliedVouchers, setAppliedVouchers] = useState<DiscountVoucher[]>([])
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<string[]>([])
  const [paymentAmounts, setPaymentAmounts] = useState<{[key: string]: number}>({})
  const [selectedDocumentType, setSelectedDocumentType] = useState('')
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null)
  const [isShaking, setIsShaking] = useState(false)
  const [isCartShaking, setIsCartShaking] = useState(false)
  const [isEditingTotal, setIsEditingTotal] = useState(false)
  const [editedTotal, setEditedTotal] = useState<string>('')
  const [editingProductPrice, setEditingProductPrice] = useState<number | null>(null)
  const [editedProductPrice, setEditedProductPrice] = useState<string>('')
  const [editingRowTotal, setEditingRowTotal] = useState<number | null>(null)
  const [editedRowTotal, setEditedRowTotal] = useState<string>('')
  const queryClient = useQueryClient();
  const [isReservationsDialogOpen, setIsReservationsDialogOpen] = useState(false)
  const [reservationSearchTerm, setReservationSearchTerm] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [isPaymentsDialogOpen, setIsPaymentsDialogOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  // Aggiungi questi stati all'inizio del componente
  const [editingUnitPrice, setEditingUnitPrice] = useState<{productId: number, unitIndex: number} | null>(null);
  const [editedUnitPrice, setEditedUnitPrice] = useState<string>('');
  // Aggiungi questi nuovi stati all'inizio del componente
  const [activePromotion, setActivePromotion] = useState<any>(null);
  const [isProcessingPromotion, setIsProcessingPromotion] = useState(false);
  const [showCancelReservationModal, setShowCancelReservationModal] = useState(false)
  const [isCurrentOrderReservation, setIsCurrentOrderReservation] = useState(false)
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)
  const [voucherAmount, setVoucherAmount] = useState(0)
  // Aggiungo le variabili di stato per il voucher
  const [currentVoucherId, setCurrentVoucherId] = useState<number | null>(null)
  const [currentVoucherOriginOrderId, setCurrentVoucherOriginOrderId] = useState<number | null>(null)
  // Aggiungo lo stato per tracciare se l'ordine è saldato
  const [isSaldato, setIsSaldato] = useState(false)
  const [tempDiscounts, setTempDiscounts] = useState<{[key: number]: string}>({});
  const [tempUnitDiscounts, setTempUnitDiscounts] = useState<{[key: string]: string}>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Query per ottenere i punti vendita
  const { data: puntiVendita } = useQuery({
    queryKey: ['puntiVendita'],
    queryFn: async () => {
      try {
        // Ottieni il token dai cookies
        const token = Cookies.get('token');
        if (!token) return [];
        
        // Decodifica il token JWT per ottenere gli storeAccess
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        const storeIds = decodedToken.storeAccess?.map((access: any) => access.storeId) || [];
        
        // Ottieni tutti i punti vendita
        console.log('Recupero tutti i punti vendita');
        const response = await fetch(`${server}/api/punti-vendita`);
        if (!response.ok) throw new Error('Network response was not ok');
        const allPuntiVendita = await response.json();
        
        // Filtra i punti vendita in base agli store IDs dell'operatore
        if (storeIds.length > 0) {
          console.log('Filtro punti vendita per operatore:', storeIds);
          return allPuntiVendita.filter((pv: any) => storeIds.includes(pv.id));
        }
        
        // Se non ci sono store IDs o l'utente è admin, ritorna tutti i punti vendita
        return allPuntiVendita;
      } catch (error) {
        console.error('Errore nel recupero dei punti vendita:', error);
        return [];
      }
    }
  });

  // Query per ottenere gli operatori per la select
  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ['operatorsForSelect'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3003/api/operators/select');
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    }
  });

  // Query per ottenere l'operatore selezionato dal localStorage
  const { data: savedOperator, refetch: refetchSelectedOperator } = useQuery({
    queryKey: ['selectedOperator'],
    queryFn: () => {
      const cached = localStorage.getItem('selectedOperator');
      return cached ? JSON.parse(cached) : null;
    },
    initialData: null
  });

  // Funzione per gestire la selezione dell'operatore
  const handleOperatorChange = (value: string) => {
    const selected = operators.find(op => op.id.toString() === value);
    if (selected) {
      localStorage.setItem('selectedOperator', JSON.stringify(selected));
      setSelectedOperator(value);
      queryClient.setQueryData(['selectedOperator'], selected);
      refetchSelectedOperator();
    }
  };

  // Imposta l'operatore dal localStorage al caricamento
  useEffect(() => {
    if (savedOperator?.id) {
      setSelectedOperator(savedOperator.id.toString());
    } else if (operators.length > 0) {
      handleOperatorChange(operators[0].id.toString());
    }
  }, [operators, savedOperator]);

  // Query per ottenere/salvare il punto vendita selezionato
  const { data: selectedPuntoVendita, refetch: refetchSelectedPuntoVendita } = useQuery({
    queryKey: ['selectedPuntoVendita'],
    queryFn: () => {
      const cached = localStorage.getItem('selectedPuntoVendita');
      return cached ? JSON.parse(cached) : null;
    },
    initialData: null
  });

  // Funzione per gestire la selezione del punto vendita
  const handlePuntoVenditaChange = (value: string) => {
    const selected = puntiVendita?.find((pv: any) => pv.id.toString() === value);
    if (selected) {
      localStorage.setItem('selectedPuntoVendita', JSON.stringify(selected));
      queryClient.setQueryData(['selectedPuntoVendita'], selected);
      refetchSelectedPuntoVendita();
    }
  };

  useEffect(() => {
    handleOperatorChange(selectedOperator)
  }, [selectedOperator])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (cart.length > 0) {
      applyAutomaticDiscounts()
    }
  }, [cart.length])

  useEffect(() => {
    if (cart && cart.length > 0) {
      applyAutomaticDiscounts()
    }
  }, [cart])

  const fetchData = async () => {
    try {
      const [productResponse, brandData, sizeData, sizeGroupData, statusData, availabilityData] = await Promise.all([
        fetch(`${server}/api/products`).then(res => res.json()),
        fetch(`${server}/api/brands`).then(res => res.json()),
        fetch(`${server}/api/sizes`).then(res => res.json()),
        fetch(`${server}/api/size-groups`).then(res => res.json()),
        fetch(`${server}/api/statuses`).then(res => res.json()),
        fetch(`${server}/api/product-availability`).then(res => res.json())
      ])

      const availabilityMap = availabilityData.reduce((acc: {[key: number]: number}, item: { product_id: number, quantity: number }) => {
        acc[item.product_id] = (acc[item.product_id] || 0) + item.quantity;
        return acc;
      }, {});

      // Estrai i prodotti dalla risposta
      const productData = productResponse.products || [];

      // Recupera le foto per ogni prodotto
      const productsWithPhotos = await Promise.all(productData.map(async (product: Product) => {
        const mainPhotoUrl = await fetchMainPhoto(product.article_code, product.variant_code);
        return {
          ...product,
          total_availability: availabilityMap[product.id] || 0,
          mainPhotoUrl
        };
      }));

      setProducts(productsWithPhotos)
      setBrands(brandData)
      setSizes(sizeData)
      setSizeGroups(sizeGroupData)
      setStatuses(statusData)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch data. Please try again.",
        variant: "destructive",
      })
    }
  }

  const generateOrderNumber = async () => {
    try {
      console.log('Generating order number with frozen orders:', frozenOrders);
      const response = await fetch(`${server}/api/orders/generate-number`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ frozenOrders })
      });
      console.log('Response status:', response.status);
      if (!response.ok) throw new Error('Failed to generate order number');
      const data = await response.json();
      console.log('Generated order number:', data);
      setOrderNumber(data.orderNumber);
      setOrderDate(new Date());
    } catch (error) {
      console.error('Error generating order number:', error);
      toast({
        title: "Errore",
        description: "Impossibile generare il numero d'ordine",
        variant: "destructive",
      });
    }
  };

  // Calcolo del totale senza IVA
  const totalAmount = cart.reduce((sum, item) => {
    const price = parseFloat(item.retail_price);
    const discountedPrice = price * (1 - item.discount / 100);
    return sum + (discountedPrice * item.quantity);
  }, 0);

  // Funzione per calcolare il totale scontato
  const calculateDiscountedTotal = (currentCart: CartItem[]) => {
    return currentCart.reduce((sum, item) => {
      if (item.unitDiscounts && item.isExpanded) {
        // Se la riga è espansa, usa gli sconti individuali
        const basePrice = parseFloat(item.retail_price);
        return sum + item.unitDiscounts.reduce((itemSum, discount) => 
          itemSum + (basePrice * (1 - discount / 100)), 0);
      } else {
        // Altrimenti usa lo sconto della riga
        const price = parseFloat(item.retail_price);
        const discountedPrice = price * (1 - item.discount / 100);
        return sum + (discountedPrice * item.quantity);
      }
    }, 0);
  };


  // Stato per tenere traccia delle righe che devono shakerare
  const [shakingRows, setShakingRows] = useState<{[key: number]: boolean}>({});

  // Funzione per far shakerare una riga
  const shakeRow = (productId: number) => {
    setShakingRows(prev => ({ ...prev, [productId]: true }));
    setTimeout(() => {
      setShakingRows(prev => ({ ...prev, [productId]: false }));
    }, 820); // Durata dell'animazione
  };

  // Aggiungi questa funzione per generare ID univoci
  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Modifica l'interfaccia CartItem per includere gli ID univoci

  // Modifica la funzione addToCart per includere gli ID univoci
  const addToCart = async (product: Product) => {
    try {
      // Verifica la disponibilità del prodotto
      const productQuantityResponse = await fetch(`${server}/api/product-availability/product/${product.id}/warehouse/${selectedPuntoVendita?.warehouse_id}`);
      if (!productQuantityResponse.ok) {
        toast({
          title: "Errore",
          description: "Impossibile verificare la disponibilità del prodotto",
          variant: "destructive"
        });
        return;
      }

      let productQuantity = { quantity: 0 };
      const responseText = await productQuantityResponse.text();
      try {
        if (responseText) {
          productQuantity = JSON.parse(responseText);
        }
      } catch (error) {
        console.error('Errore nel parsing della risposta:', error);
        toast({
          title: "Errore",
          description: "Errore nel controllo della disponibilità",
          variant: "destructive"
        });
        return;
      }

      const initialQuantity = productQuantity.quantity === 0 ? 0 : 1;
      const existingItem = cart.find(item => item.id === product.id);

      // Se il carrello è vuoto, genera un nuovo numero ordine
      if (cart.length === 0) {
        await generateOrderNumber();
      }

      // Calcola il prezzo scontato e lo sconto per la nuova unità
      const basePrice = parseFloat(product.retail_price);
      const discountedPrice = product.discounted_price ? parseFloat(product.discounted_price) : basePrice;
      const discount = ((basePrice - discountedPrice) / basePrice) * 100;

      if (existingItem) {
        // Se il prodotto esiste già nel carrello
        const newQuantity = existingItem.quantity + 1;
        if (newQuantity > (productQuantity.quantity || 0)) {
          toast({
            title: "Attenzione",
            description: "Quantità non disponibile in magazzino",
            variant: "destructive"
          });
          return;
        }

        setCart(prevCart =>
          prevCart.map(item => {
            if (item.id === product.id) {
              const basePrice = parseFloat(item.retail_price);
              // Aggiungi una nuova unità con il prezzo scontato dal listino
              const newUnitDiscounts = [...(item.unitDiscounts || []), discount];
              
              // Calcola il nuovo totale basato sui prezzi scontati di ogni unità
              const total = newUnitDiscounts.reduce((sum, unitDiscount) => 
                sum + (basePrice * (1 - unitDiscount / 100)), 0
              );
              
              // Calcola la media degli sconti
              const averageDiscount = newUnitDiscounts.reduce((sum, d) => sum + d, 0) / newQuantity;

              return {
                ...item,
                quantity: newQuantity,
                unitIds: [...(item.unitIds || []), generateUniqueId()],
                unitDiscounts: newUnitDiscounts,
                discount: Math.round(averageDiscount * 1000) / 1000,
                total: total
              };
            }
            return item;
          })
        );
        shakeRow(product.id);
      } else {
        // Se è un nuovo prodotto
        if (initialQuantity === 0) {
          toast({
            title: "Attenzione",
            description: "Prodotto non disponibile in magazzino",
            variant: "destructive"
          });
          return;
        }

        // Crea il nuovo prodotto con la prima unità
        const newItem = {
          ...product,
          quantity: initialQuantity,
          unitIds: [generateUniqueId()],
          unitDiscounts: [discount],
          discount: discount,
          total: discountedPrice,
          rowId: generateUniqueId()
        };
        setCart(prevCart => [newItem, ...prevCart]);
      }

      // Applica gli sconti automatici dopo l'aggiunta del prodotto
      setTimeout(() => {
        applyAutomaticDiscounts();
      }, 0);
    } catch (error) {
      console.error('Errore durante l\'aggiunta al carrello:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiunta del prodotto al carrello",
        variant: "destructive"
      });
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.id !== productId)
      if (newCart.length === 0) {
        // Reset solo quando il carrello diventa vuoto
        resetForm()
      }
      return newCart
    })
  }

  // Modifica la funzione updateQuantity per gestire gli ID delle unità
  const updateQuantity = async (productId: number, action: 'increase' | 'decrease') => {
    const item = cart.find(item => item.id === productId);
    if (!item) return;

    if (action === 'increase') {
      // Verifica disponibilità prima di aumentare
      const response = await fetch(`${server}/api/product-availability/product/${productId}/warehouse/${selectedPuntoVendita?.warehouse_id}`);
      if (!response.ok) {
        toast({
          title: "Errore",
          description: "Impossibile verificare la disponibilità",
          variant: "destructive"
        });
        return;
      }

      const data = await response.json();
      if (item.quantity + 1 > data.quantity) {
        toast({
          title: "Attenzione",
          description: "Quantità non disponibile in magazzino",
          variant: "destructive"
        });
        return;
      }

      // Aggiungi una nuova unità con il prezzo scontato dal listino
      const basePrice = parseFloat(item.retail_price);
      const discountedPrice = item.discounted_price ? parseFloat(item.discounted_price) : basePrice;
      const discount = ((basePrice - discountedPrice) / basePrice) * 100;

      setCart(prevCart =>
        prevCart.map(cartItem => {
          if (cartItem.id === productId) {
            // Calcola il nuovo totale basato sui prezzi scontati di ogni unità
            const newUnitDiscounts = [...(cartItem.unitDiscounts || []), discount];
            const total = newUnitDiscounts.reduce((sum, unitDiscount) => 
              sum + (basePrice * (1 - unitDiscount / 100)), 0
            );
            
            // Calcola la media degli sconti
            const averageDiscount = newUnitDiscounts.reduce((sum, d) => sum + d, 0) / (cartItem.quantity + 1);

            return {
              ...cartItem,
              quantity: cartItem.quantity + 1,
              unitIds: [...(cartItem.unitIds || []), generateUniqueId()],
              unitDiscounts: newUnitDiscounts,
              discount: Math.round(averageDiscount * 1000) / 1000,
              total: total
            };
          }
          return cartItem;
        })
      );
    } else {
      // Rimuovi l'ultima unità e ricalcola i totali
      setCart(prevCart =>
        prevCart.map(cartItem => {
          if (cartItem.id === productId && cartItem.quantity > 1) {
            const basePrice = parseFloat(cartItem.retail_price);
            const newUnitDiscounts = cartItem.unitDiscounts?.slice(0, -1) || [];
            
            // Calcola il nuovo totale basato sui prezzi scontati delle unità rimanenti
            const total = newUnitDiscounts.reduce((sum, unitDiscount) => 
              sum + (basePrice * (1 - unitDiscount / 100)), 0
            );
            
            // Calcola la media degli sconti rimanenti
            const averageDiscount = newUnitDiscounts.reduce((sum, d) => sum + d, 0) / (cartItem.quantity - 1);

            return {
              ...cartItem,
              quantity: cartItem.quantity - 1,
              unitIds: cartItem.unitIds?.slice(0, -1) || [],
              unitDiscounts: newUnitDiscounts,
              discount: Math.round(averageDiscount * 1000) / 1000,
              total: total
            };
          }
          return cartItem;
        })
      );
    }

    // Applica gli sconti automatici dopo la modifica della quantità
    setTimeout(() => {
      applyAutomaticDiscounts();
    }, 0);
  };

  // Aggiorna il totale scontato quando cambia il carrello
  useEffect(() => {
    const newDiscountedTotal = calculateDiscountedTotal(cart);
    setDiscountedTotal(newDiscountedTotal);
  }, [cart]);

  // Modifica la funzione updateDiscount per la riga principale
  const updateDiscount = (productId: number, newDiscount: number) => {
    if (newDiscount < 0 || newDiscount > 100) return;
    
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === productId) {
          const basePrice = parseFloat(item.retail_price);
          const totalBasePrice = basePrice * item.quantity;
          const newTotal = totalBasePrice * (1 - newDiscount / 100);
          
          // Se la riga è espansa o ha sconti differenziati
          const hasUniformDiscounts = !item.unitDiscounts || 
            item.unitDiscounts.every(d => d === item.unitDiscounts![0]);

          if (hasUniformDiscounts) {
            // Se gli sconti sono uniformi, applica lo stesso sconto a tutte le unità
            return {
              ...item,
              discount: newDiscount,
              unitDiscounts: new Array(item.quantity).fill(newDiscount),
              total: newTotal
            };
          } else {
            // Se gli sconti sono differenziati, distribuisci proporzionalmente
            const currentTotalDiscount = item.unitDiscounts!.reduce((sum, d) => 
              sum + (basePrice * (d / 100)), 0
            );
            const targetTotalDiscount = totalBasePrice - newTotal;
            const scaleFactor = targetTotalDiscount / currentTotalDiscount;

            const newUnitDiscounts = item.unitDiscounts!.map(discount => 
              Number(Math.min(Math.max(0, discount * scaleFactor), 100).toFixed(15))
            );

            return {
              ...item,
              discount: newDiscount,
              unitDiscounts: newUnitDiscounts,
              total: newTotal
            };
          }
        }
        return item;
      });
    });
  };

  // Modifica la funzione updateUnitDiscount per le sottorighe
  const updateUnitDiscount = (productId: number, unitIndex: number, newDiscount: number) => {
    if (newDiscount < 0 || newDiscount > 100) return;

    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === productId) {
          const basePrice = parseFloat(item.retail_price);
          const newUnitDiscounts = [...(item.unitDiscounts || [])];
          newUnitDiscounts[unitIndex] = newDiscount;
          
          // Calcola il prezzo scontato per questa unità
          const unitDiscountedPrice = basePrice * (1 - newDiscount / 100);
          
          // Calcola la media degli sconti per il totale della riga
          const averageDiscount = newUnitDiscounts.reduce((sum, d) => sum + d, 0) / item.quantity;
          
          // Calcola il totale della riga basato sui prezzi scontati di ogni unità
          const total = newUnitDiscounts.reduce((sum, discount) => 
            sum + (basePrice * (1 - discount / 100)), 0);

          return {
            ...item,
            unitDiscounts: newUnitDiscounts,
            discount: Math.round(averageDiscount * 1000) / 1000,
            total: total
          };
        }
        return item;
      })
    );
  };

  // Funzione per gestire il cambio dello sconto totale


  const handleSearchChange = async (value: string) => {
    if (value.trim() === '') return;
    
    try {
      // Cerca il prodotto tramite codice a barre
      const productResponse = await fetch(`${server}/api/pos/store/${selectedPuntoVendita?.id}/barcode/${value}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (productResponse.ok) {
        const product = await productResponse.json();
        
        // Calcola quanti pezzi di questo prodotto sono già nel carrello
        const cartQuantity = cart.filter(item => 
          item.article_code === product.article_code && 
          item.variant_code === product.variant_code
        ).length;

        // Verifica se possiamo aggiungere un altro pezzo
        if (cartQuantity >= product.quantity) {
          toast({
            title: "Attenzione",
            description: "Quantità non disponibile in magazzino",
            variant: "destructive"
          });
          setSearchTerm('');
          return;
        }

        // Se il prodotto è disponibile, aggiungilo al carrello con il prezzo scontato
        if (product.discounted_price) {
          addToCart({
            ...product,
            retail_price: product.retail_price,
            discounted_price: product.discounted_price
          });
        } else {
          addToCart(product);
        }
        setSearchTerm('');
      } else {
        toast({
          title: "Non trovato",
          description: "Nessun prodotto trovato per questo codice.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast({
        title: "Errore",
        description: "Errore durante la ricerca. Riprova.",
        variant: "destructive",
      });
    }
  };

  const handleFreezeOperation = () => {
    if (cart.length === 0) {
      toast({
        title: "Carrello vuoto",
        description: "Aggiungi prodotti al carrello prima di congelare l'ordine.",
        variant: "destructive",
      })
      return
    }

    if (frozenOrders.length >= 3) {
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 820)
      
      toast({
        title: "Limite ordini congelati raggiunto",
        description: "Chiudi almeno un ordine congelato prima di congelarne altri.",
        variant: "destructive",
      })
      return
    }

    const newFrozenOrder = {
      id: `FROZEN-${Date.now()}`,
      cart: [...cart],
      totalDiscount,
      orderNumber,
      orderDate,
      deposit,
      voucher,
      previousPayments,
      previousSuccessfulPayments: [],
      currentOrderId,
      isReservation: cart.some(item => item.isFromReservation)
    }
    
    const updatedFrozenOrders = [...frozenOrders, newFrozenOrder]
    setFrozenOrders(updatedFrozenOrders)
    localStorage.setItem('frozenOrders', JSON.stringify(updatedFrozenOrders))
    
    // Resetta il form e svuota il carrello
    resetForm()
    
    toast({
      title: "Ordine Congelato",
      description: "L'ordine è stato congelato e può essere ripreso successivamente.",
    })
  }

  const handleUnfreezeOrder = (frozenOrder: FrozenOrder) => {
    if (cart.length === 0) {
      // Imposta subito lo stato dell'ordine
      setIsCurrentOrderReservation(frozenOrder.isReservation);
      
      // Controlla se l'ordine è saldato (status_id === 18)
      const order = frozenOrder.cart[0];
      const isSaldatoStatus = order && order.status_id === 18;
      setIsSaldato(isSaldatoStatus);

      // Imposta tutti gli altri dati
      setCart(frozenOrder.cart.map(item => ({
        ...item,
        isFromReservation: frozenOrder.isReservation,
        status_id: order.status_id // Assicurati che ogni item abbia lo status_id dell'ordine
      })));
      setTotalDiscount(frozenOrder.totalDiscount);
      setOrderNumber(frozenOrder.orderNumber);
      setOrderDate(new Date(frozenOrder.orderDate));
      
      // Ripristina i dati dei pagamenti se è una prenotazione
      if (frozenOrder.isReservation) {
        setDeposit(frozenOrder.deposit || 0);
        setVoucher(frozenOrder.voucher || 0);
        setPreviousPayments(frozenOrder.previousPayments || []);
        setCurrentOrderId(frozenOrder.currentOrderId || null);
        
        // Salva i dati dei pagamenti nel localStorage
        const paymentData = {
          deposit: frozenOrder.deposit,
          voucher: frozenOrder.voucher,
          previousPayments: frozenOrder.previousPayments,
          currentOrderId: frozenOrder.currentOrderId
        };
        localStorage.setItem('paymentData', JSON.stringify(paymentData));
      }
      
      const newFrozenOrders = frozenOrders.filter(order => order.id !== frozenOrder.id);
      setFrozenOrders(newFrozenOrders);
      localStorage.setItem('frozenOrders', JSON.stringify(newFrozenOrders));
      
      toast({
        title: isSaldatoStatus ? "Vendita saldata scongelata" : "Prenotazione scongelata",
        description: "L'ordine è stato caricato nel carrello.",
      });
    } else {
      setIsCartShaking(true);
      setTimeout(() => setIsCartShaking(false), 820);
      toast({
        title: "Carrello non vuoto",
        description: "Svuota il carrello corrente prima di caricare un ordine congelato.",
        variant: "destructive",
      });
    }
  };

  // Carica gli ordini congelati dal localStorage all'avvio
  useEffect(() => {
    const savedFrozenOrders = localStorage.getItem('frozenOrders')
    if (savedFrozenOrders) {
      try {
        const parsedOrders = JSON.parse(savedFrozenOrders)
        // Assicurati che le date siano convertite correttamente
        const ordersWithDates = parsedOrders.map((order: FrozenOrder) => ({
          ...order,
          orderDate: new Date(order.orderDate)
        }))
        setFrozenOrders(ordersWithDates)
      } catch (error) {
        console.error('Error parsing frozen orders:', error)
        localStorage.removeItem('frozenOrders')
      }
    }
  }, [])

  // Salva gli ordini congelati nel localStorage quando cambiano
  useEffect(() => {
    if (frozenOrders.length > 0) {
      localStorage.setItem('frozenOrders', JSON.stringify(frozenOrders))
    } else {
      localStorage.removeItem('frozenOrders')
    }
  }, [frozenOrders])

  const resetForm = () => {
    setCart([]);
    setTotalDiscount(0);
    setSelectedPaymentTypes([]);
    setPaymentAmounts({});
    setSelectedClient('');
    setCurrentOrderId(null);
    setDeposit(0);
    setVoucher(0);
    setPreviousPayments([]);
    setVoucherAmount(0);
    setCurrentVoucherId(null);
    setCurrentVoucherOriginOrderId(null);
    setIsCurrentOrderReservation(false);
    setIsSaldato(false); // Reset dello stato isSaldato
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cart');
      localStorage.removeItem('orderNumber');
      localStorage.removeItem('orderDate');
      localStorage.removeItem('paymentData');
    }
  };

  const handleResetClick = () => {
    setIsResetDialogOpen(true)
  }




  // Calcolo dei totali
  const totalPreviousPayments = previousPayments.reduce((sum, payment) => 
    sum + (typeof payment.amount === 'number' ? payment.amount : parseFloat(payment.amount) || 0), 0
  );
  const totalVouchersAmount = appliedVouchers.reduce((sum, voucher) => 
    sum + ((voucher.total_amount || 0) - (voucher.used_amount || 0)), 0
  );
  const totalPaid = Number(deposit || 0) + Number(voucher || 0) + Number(totalPreviousPayments || 0) + Number(totalVouchersAmount || 0);
  const remainingAmount = Math.max(0, totalAmount - totalPaid);



  // Calcolo dei totali
  const calculateTotalToPay = () => {
    // 1. Totale scontato dell'ordine (prezzo finale dopo gli sconti)
    const discountedTotal = cart.reduce((sum, item) => {
      const price = parseFloat(item.retail_price);
      const discountedPrice = price * (1 - item.discount / 100);
      return sum + (discountedPrice * item.quantity);
    }, 0);
    // 2. Totale degli acconti (pagamenti precedenti) - assicurati che sia un numero valido
    const depositsTotal = Number(deposit || 0);
    console.log('Acconti considerati nel calcolo:', depositsTotal);

    // 3. Totale dei buoni sconto applicati
    const vouchersTotal = appliedVouchers.reduce((sum, voucher) => 
      sum + ((voucher.total_amount || 0) - (voucher.used_amount || 0)), 0
    );

    // 4. Calcola quanto resta da pagare
    const remaining = Math.max(0, discountedTotal - depositsTotal - vouchersTotal);
    console.log('Calcolo totale da pagare:', {
      discountedTotal,
      depositsTotal,
      vouchersTotal,
      remaining
    });

    // 5. Formatta il risultato (gestisce i ±5 centesimi)
    return formatRemainingAmount(parseFloat(remaining.toFixed(2)));
  };

  // Funzione per formattare il totale da pagare
  const formatRemainingAmount = (amount: number) => {
    if (isNaN(amount)) return 0;
    return Math.abs(amount) <= 0.05 ? 0 : amount;
  };

  // Calcola il totale da pagare
  const totalToPay = calculateTotalToPay();


  const handlePaymentTypeChange = (code: string) => {
    if (!selectedPaymentTypes.includes(code)) {
      // Se stiamo aggiungendo un nuovo tipo di pagamento
      const updatedTypes = [...selectedPaymentTypes, code];
      setSelectedPaymentTypes(updatedTypes);

      // Calcola l'importo da impostare
      const voucherAmount = paymentAmounts['BSC'] || 0;
      const updatedPayments = { ...paymentAmounts };
      
      if (code !== 'BSC') {
        // Se è il primo metodo di pagamento non-voucher
        if (updatedTypes.filter(t => t !== 'BSC').length === 1) {
          updatedPayments[code] = Math.max(0, totalToPay - voucherAmount);
        } else {
          // Se è il secondo metodo, imposta la differenza rimanente
          const existingAmount = Object.entries(updatedPayments)
            .filter(([key]) => key !== 'BSC' && key !== code)
            .reduce((sum, [_, amount]) => sum + amount, 0);
          updatedPayments[code] = Math.max(0, totalToPay - voucherAmount - existingAmount);
        }
        
        setPaymentAmounts(updatedPayments);
      }
    } else {
      // Se stiamo rimuovendo un tipo di pagamento
      setSelectedPaymentTypes(prev => prev.filter(type => type !== code));
      const updatedPayments = { ...paymentAmounts };
      delete updatedPayments[code];
      setPaymentAmounts(updatedPayments);

      // Se rimane solo un metodo di pagamento non-voucher, aggiorna il suo importo
      const remainingTypes = selectedPaymentTypes.filter(type => type !== code);
      if (remainingTypes.length === 1 && remainingTypes[0] !== 'BSC') {
        const voucherAmount = paymentAmounts['BSC'] || 0;
        updatedPayments[remainingTypes[0]] = Math.max(0, totalToPay - voucherAmount);
        setPaymentAmounts(updatedPayments);
      }
    }
  }

  const handlePaymentAmountChange = (code: string, isDecimal: boolean, value: string) => {
    // Rimuovi caratteri non numerici
    const cleanValue = value.replace(/[^0-9]/g, '');
    
    const newAmounts = { ...paymentAmounts };
    const currentAmount = newAmounts[code] || 0;
    
    // Converti il numero corrente in parti
    const [currentInt, currentDec] = currentAmount.toFixed(2).split('.');
    
    let newAmount;
    if (isDecimal) {
      // Se stiamo modificando la parte decimale, limitala a 2 cifre
      const newDec = cleanValue.slice(0, 2).padEnd(2, '0');
      newAmount = parseFloat(`${currentInt}.${newDec}`);
    } else {
      // Se stiamo modificando la parte intera
      newAmount = parseFloat(`${cleanValue || '0'}.${currentDec}`);
    }

    newAmounts[code] = newAmount;
    setPaymentAmounts(newAmounts);
  };

  const handlePaymentAmountBlur = (code: string) => {
    const newAmounts = { ...paymentAmounts };
    const currentAmount = newAmounts[code] || 0;
    const totalToPayValue = calculateTotalToPay();
    const voucherAmount = paymentAmounts['BSC'] || 0;

    // Se non è un voucher
    if (code !== 'BSC') {
      // Se il valore supera il totale da pagare meno il voucher, lo limitiamo
      const maxAmount = totalToPayValue - voucherAmount;
      if (currentAmount > maxAmount) {
        newAmounts[code] = maxAmount;
      }

      // Aggiorna l'altro campo se presente (escludendo il voucher)
      const otherType = selectedPaymentTypes.find(t => t !== code && t !== 'BSC');
      if (otherType) {
        const otherAmount = Math.max(0, totalToPayValue - voucherAmount - newAmounts[code]);
        newAmounts[otherType] = Math.round(otherAmount * 100) / 100;
      }
    }

    setPaymentAmounts(newAmounts);
  };



  const totalSelected = Object.values(paymentAmounts).reduce((sum, amount) => sum + (amount || 0), 0);
  const remainingToPay = Number(totalAmount) - Number(totalPreviousPayments);
  const isPartialPayment = totalSelected < remainingToPay && (remainingToPay - totalSelected) > 0.02;

  // Funzione per verificare se ci sono prodotti con quantità superiore alla disponibilità
  const hasInsufficientStock = () => {
    return cart.some(item => {
      const availableQuantity = productsData.find(p => p.id === item.id)?.quantity || 0;
      return item.quantity > availableQuantity;
    });
  };

  // Aggiungi questa funzione prima di handleConfirmPayment
  const prepareOrderItems = (cartItems: CartItem[]) => {
    const preparedItems: any[] = [];

    cartItems.forEach(item => {
      // Se la quantità è 1 o non ha sconti differenziati, aggiungi l'item così com'è
      if (item.quantity === 1 || !item.unitDiscounts || 
          item.unitDiscounts.every(d => d === item.unitDiscounts![0])) {
        preparedItems.push({
          product_id: item.id,
          quantity: item.quantity,
          unit_cost: parseFloat(item.retail_price),
          discount: item.discount,
          final_cost: parseFloat(item.retail_price) * (1 - item.discount / 100),
          total: parseFloat(item.retail_price) * item.quantity * (1 - item.discount / 100),
          tax: (parseFloat(item.retail_price) * item.quantity * (1 - item.discount / 100)) - 
               ((parseFloat(item.retail_price) * item.quantity * (1 - item.discount / 100)) / 1.22)
        });
      } else {
        // Separa gli items con sconti differenti
        for (let i = 0; i < item.quantity; i++) {
          const unitDiscount = item.unitDiscounts[i] || 0;
          const unitCost = parseFloat(item.retail_price);
          const finalCost = unitCost * (1 - unitDiscount / 100);
          const total = finalCost;
          const tax = total - (total / 1.22);

          preparedItems.push({
            product_id: item.id,
            quantity: 1,
            unit_cost: unitCost,
            discount: unitDiscount,
            final_cost: finalCost,
            total: total,
            tax: tax
          });
        }
      }
    });

    return preparedItems;
  };

  const handleConfirmPayment = async () => {
    try {
      const timestamp = new Date().getTime();
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const uniqueOrderCode = `CS${timestamp}${randomSuffix}`;

      // Uso i valori esatti mostrati nell'interfaccia
      const totalPrice = cart.reduce((sum, item) => 
        sum + (parseFloat(item.retail_price) * item.quantity), 0
      );

      const finalTotal = cart.reduce((sum, item) => {
        const price = parseFloat(item.retail_price);
        const discountedPrice = price * (1 - item.discount / 100);
        return sum + (discountedPrice * item.quantity);
      }, 0);

      // Calcolo la percentuale di sconto effettiva dal totale carrello e totale scontato
      const effectiveDiscount = ((totalPrice - finalTotal) / totalPrice) * 100;

      // Calcolo l'imponibile e l'IVA
      const imponibile = finalTotal / 1.22;
      const tax = finalTotal - imponibile;

      // Se c'è un currentOrderId, stiamo aggiornando una prenotazione esistente
      if (currentOrderId) {
        // Aggiorno solo lo stato dell'ordine e aggiungo i nuovi pagamenti
        const orderUpdateData = {
          status_id: totalSelected >= finalTotal || !isPartialPayment ? 18 : 17, // Saldato se totale raggiunto OR non è pagamento parziale
        };

        const orderResponse = await fetch(`http://localhost:3003/api/orders/${currentOrderId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderUpdateData)
        });

        if (!orderResponse.ok) throw new Error('Errore nell\'aggiornamento dell\'ordine');

        // Salvo i nuovi pagamenti
        for (const code of selectedPaymentTypes) {
          const paymentAmount = paymentAmounts[code] || 0;
          // Salta i pagamenti con importo 0
          if (paymentAmount <= 0) continue;

          const paymentMethod = paymentMethodsData.find(pm => pm.code === code);
          if (!paymentMethod) continue;

          const paymentTax = paymentAmount - (paymentAmount / 1.22);

          const paymentData = {
            internal_code: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            order_id: currentOrderId,
            payment_method_id: paymentMethod.id,
            amount: paymentAmount,
            tax: paymentTax,
            payment_date: new Date().toISOString(),
            charge_date: new Date().toISOString(),
            status_id: 6
          };

          const paymentResponse = await fetch('http://localhost:3003/api/order-payments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData)
          });

          if (!paymentResponse.ok) throw new Error('Errore nel salvataggio dei pagamenti');
        }
      } else {
        // Creo un nuovo ordine
        const orderData = {
          type_id: 1,
          code: uniqueOrderCode,
          client_id: selectedClient ? parseInt(selectedClient) : null,
          total_price: totalPrice,
          status_id: totalSelected >= finalTotal || !isPartialPayment ? 18 : 17,
          punto_vendita_id: selectedPuntoVendita.id,
          discount: effectiveDiscount,
          final_total: finalTotal,
          operator_id: parseInt(selectedOperator),
          tax: tax
        };

        const orderResponse = await fetch(`${server}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });

        if (!orderResponse.ok) {
          throw new Error('Errore nella creazione dell\'ordine');
        }

        const orderResult = await orderResponse.json();
        const newOrderId = orderResult.id;

        // Salvo gli items dell'ordine
        const preparedItems = prepareOrderItems(cart);
        for (const item of preparedItems) {
          const orderItemData = {
            order_id: newOrderId,
            ...item
          };

          const itemResponse = await fetch('http://localhost:3003/api/order-items', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderItemData)
          });

          if (!itemResponse.ok) throw new Error('Errore nel salvataggio degli items');
        }

        // Salvo i pagamenti
        for (const code of selectedPaymentTypes) {
          let paymentAmount = paymentAmounts[code] || 0;
          // Salta i pagamenti con importo 0
          if (paymentAmount <= 0) continue;

          const paymentMethod = paymentMethodsData.find(pm => pm.code === code);
          if (!paymentMethod) continue;

          // Se è un voucher, limita l'importo al totale da pagare
          if (code === 'BSC') {
            const totalToPay = calculateTotalToPay();
            paymentAmount = Math.min(paymentAmount, totalToPay);
          }

          const paymentTax = Math.round((paymentAmount - (paymentAmount / 1.22)) * 100) / 100;

          const paymentData = {
            internal_code: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            order_id: newOrderId,
            payment_method_id: paymentMethod.id,
            amount: paymentAmount,
            tax: paymentTax,
            payment_date: new Date().toISOString(),
            charge_date: new Date().toISOString(),
            status_id: 6
          };

          const paymentResponse = await fetch('http://localhost:3003/api/order-payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
          });

          if (!paymentResponse.ok) throw new Error('Errore nel salvataggio dei pagamenti');
        }

        // Se c'è un voucher usato, aggiorniamo il suo stato
        if (voucherAmount > 0 && currentVoucherId) {
          const totalToPay = calculateTotalToPay()
          const voucherTotal = parseFloat(voucherAmount.toString())
          
          // Determina lo stato del voucher
          const isFullyUsed = voucherTotal <= totalToPay
          const statusId = isFullyUsed ? 24 : 25 // 24 = Usato totalmente, 25 = Usato parzialmente
          
          console.log('Aggiornamento voucher:', {
            id: currentVoucherId,
            status_id: statusId,
            destination_order_id: newOrderId,
            used_amount: Math.min(voucherTotal, totalToPay),
            date_of_use: new Date().toISOString()
          })

          // Aggiorna il voucher esistente - CORRETTO L'ENDPOINT
          const updateVoucherResponse = await fetch(`${server}/api/vouchers/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: currentVoucherId,
              status_id: statusId,
              destination_order_id: newOrderId,
              used_amount: Math.min(voucherTotal, totalToPay),
              date_of_use: new Date().toISOString()
            })
          })

          if (!updateVoucherResponse.ok) {
            const errorData = await updateVoucherResponse.json()
            console.error('Errore aggiornamento voucher:', errorData)
            throw new Error('Errore nell\'aggiornamento del voucher: ' + (errorData.error || 'Errore sconosciuto'))
          }

          // Se il voucher è stato usato parzialmente, crea un nuovo voucher per la differenza
          if (!isFullyUsed) {
            const remainingAmount = voucherTotal - totalToPay
            
            const createVoucherResponse = await fetch(`${server}/api/vouchers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                origin_order_id: currentVoucherOriginOrderId,
                total_amount: remainingAmount,
                validity_start_date: new Date().toISOString(),
                validity_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
              })
            })

            if (!createVoucherResponse.ok) {
              throw new Error('Errore nella creazione del nuovo voucher')
            }
          }
        }

        // Aggiorno le disponibilità nel magazzino
        for (const item of cart) {
          const updateAvailabilityResponse = await fetch(`http://localhost:3003/api/product-availability/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              product_id: item.id,
              warehouse_id: selectedPuntoVendita.warehouse_id,
              quantity: item.quantity,
              operation: 'delete'
            })
          });

          if (!updateAvailabilityResponse.ok) {
            throw new Error('Errore nell\'aggiornamento delle disponibilità');
          }
        }
      }

      // Ricarica i dati aggiornati
      queryClient.invalidateQueries({ queryKey: ['products', selectedPuntoVendita?.warehouse_id] });
      queryClient.invalidateQueries({ queryKey: ['partialOrders', selectedPuntoVendita?.id] });

      // Pulisco il carrello e resetto i valori
      setCart([]);
      setTotalDiscount(0);
      setSelectedPaymentTypes([]);
      setPaymentAmounts({});
      setSelectedClient('');
      setCurrentOrderId(null);
      setDeposit(0);
      setVoucher(0);
      setPreviousPayments([]);
      setVoucherAmount(0);
      setCurrentVoucherId(null);
      setCurrentVoucherOriginOrderId(null);
      
      // Pulisco il localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart')
        localStorage.removeItem('orderNumber')
        localStorage.removeItem('orderDate')
        localStorage.removeItem('paymentData')
      }
      
      toast({
        title: currentOrderId ? "Prenotazione aggiornata" : "Ordine completato",
        description: currentOrderId ? "La prenotazione è stata aggiornata con successo" : "L'ordine è stato salvato con successo",
      });

    } catch (error) {
      console.error('Errore:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio dell'ordine",
      });
    }
  };


  // Modifica la funzione che salva nel localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && cart.length > 0) {
      const cartForStorage = cart.map(item => {
        if (item.isFromReservation) {
          // Se è una prenotazione, mantieni tutti i dati inclusi gli sconti
          return {
            ...item,
            unitDiscounts: item.unitDiscounts || new Array(item.quantity).fill(item.discount),
            isFromReservation: true,
            isExpanded: item.isExpanded || false
          };
        } else {
          // Per gli items normali, azzera gli sconti
          return {
            ...item,
            discount: 0,
            unitDiscounts: new Array(item.quantity).fill(0),
            total: parseFloat(item.retail_price) * item.quantity,
            isFromReservation: false
          };
        }
      });
      localStorage.setItem('cart', JSON.stringify(cartForStorage));
    }
  }, [cart]);

  // Modifica la parte che carica dal localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Carica il carrello
        const savedCart = localStorage.getItem('cart')
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart)
          // Assicurati che ogni elemento abbia un rowId e azzera gli sconti se non è una prenotazione
          const cartWithRowIds = parsedCart.map((item: CartItem) => {
            const basePrice = parseFloat(item.retail_price);
            const discountedPrice = item.discounted_price ? parseFloat(item.discounted_price) : basePrice;
            const defaultDiscount = ((basePrice - discountedPrice) / basePrice) * 100;

            return {
              ...item,
              rowId: item.rowId || `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              // Usa il discounted_price se disponibile, altrimenti azzera gli sconti
              discount: item.isFromReservation ? item.discount : defaultDiscount,
              unitDiscounts: item.isFromReservation ? 
                item.unitDiscounts : 
                new Array(item.quantity).fill(defaultDiscount),
              total: item.isFromReservation ? 
                item.total : 
                discountedPrice * item.quantity
            }
          })
          setCart(cartWithRowIds)
          
          // Se c'è una prenotazione nel carrello, carica anche i dati dei pagamenti
          const hasReservation = cartWithRowIds.some((item: CartItem) => item.isFromReservation);
          if (hasReservation) {
            const savedPaymentData = localStorage.getItem('paymentData')
            if (savedPaymentData) {
              const parsedPaymentData = JSON.parse(savedPaymentData)
              setDeposit(parsedPaymentData.deposit || 0)
              setVoucher(parsedPaymentData.voucher || 0)
              setPreviousPayments(parsedPaymentData.previousPayments || [])
              setCurrentOrderId(parsedPaymentData.currentOrderId || null)
              setSelectedClient(parsedPaymentData.selectedClient || '')
            }

            // Imposta isCurrentOrderReservation a true se c'è una prenotazione nel carrello
            setIsCurrentOrderReservation(true);
          } else {
            // Se non c'è una prenotazione nel carrello, rimuovi isCurrentOrderReservation
            setIsCurrentOrderReservation(false);
          }
          
          // Ricalcola lo sconto totale solo per le prenotazioni
          const totalPrice = cartWithRowIds.reduce((sum: number, item: CartItem) => 
            sum + (parseFloat(item.retail_price) * item.quantity), 0
          );
          
          const discountedTotal = cartWithRowIds.reduce((sum: number, item: CartItem) => {
            if (!item.isFromReservation) return sum + (parseFloat(item.retail_price) * item.quantity);
            const price = parseFloat(item.retail_price);
            const discountedPrice = price * (1 - item.discount / 100);
            return sum + (discountedPrice * item.quantity);
          }, 0);

          if (totalPrice > 0 && cartWithRowIds.some((item: CartItem) => item.isFromReservation)) {
            const effectiveDiscount = ((totalPrice - discountedTotal) / totalPrice) * 100;
            setTotalDiscount(Math.round(effectiveDiscount * 1000000) / 1000000);
          } else {
            setTotalDiscount(0);
          }
        }

        // Carica il numero d'ordine
        const savedOrderNumber = localStorage.getItem('orderNumber');
        if (savedOrderNumber) {
          setOrderNumber(savedOrderNumber);
        }
        
        // Carica la data dell'ordine
        const savedOrderDate = localStorage.getItem('orderDate');
        if (savedOrderDate) {
          setOrderDate(new Date(savedOrderDate));
        }
        
        // Carica gli ordini congelati (anche qui, azzera gli sconti)
        const savedFrozenOrders = localStorage.getItem('frozenOrders');
        if (savedFrozenOrders) {
          const parsed = JSON.parse(savedFrozenOrders);
          const ordersWithoutDiscounts = parsed.map((order: FrozenOrder) => ({
            ...order,
            cart: order.cart.map((item: CartItem) => {
              const basePrice = parseFloat(item.retail_price);
              const discountedPrice = item.discounted_price ? parseFloat(item.discounted_price) : basePrice;
              const defaultDiscount = ((basePrice - discountedPrice) / basePrice) * 100;

              return {
                ...item,
                discount: defaultDiscount,
                unitDiscounts: new Array(item.quantity).fill(defaultDiscount),
                total: discountedPrice * item.quantity
              }
            }),
            totalDiscount: 0,
            orderDate: new Date(order.orderDate)
          }));
          setFrozenOrders(ordersWithoutDiscounts);
        }
      } catch (error) {
        console.error('Error loading data from localStorage:', error);
        localStorage.removeItem('cart');
        localStorage.removeItem('orderNumber');
        localStorage.removeItem('orderDate');
        localStorage.removeItem('frozenOrders');
        resetForm();
      }
    }
  }, []);

  // Salva i dati di pagamento quando cambiano
  useEffect(() => {
    if (typeof window !== 'undefined' && cart.some(item => item.isFromReservation)) {
      const paymentData = {
        deposit,
        voucher,
        previousPayments,
        currentOrderId,
        selectedClient
      }
      localStorage.setItem('paymentData', JSON.stringify(paymentData))
    }
  }, [deposit, voucher, previousPayments, currentOrderId, selectedClient, cart])

  useEffect(() => {
    if (typeof window !== 'undefined' && cart.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cart))
    }
  }, [cart]);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && orderNumber) {
      localStorage.setItem('orderNumber', orderNumber)
    }
  }, [orderNumber])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('orderDate', orderDate.toISOString())
    }
  }, [orderDate])

  // Imposta l'operatore predefinito al caricamento dei dati
  useEffect(() => {
    if (operators.length > 0 && !selectedOperator) {
      setSelectedOperator(operators[0].id.toString());
    }
  }, [operators]);

  // Query per ottenere i metodi di pagamento
  const { data: paymentMethodsData = [] } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const response = await fetch(`${server}/api/payment-methods`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      return data;
    }
  });

  // Query per ottenere i prodotti
  const { data: productsData = [] } = useQuery<Product[]>({
    queryKey: ['products', selectedPuntoVendita?.id],
    queryFn: async () => {
      if (!selectedPuntoVendita) return [];
      
      console.log('Fetching products for store:', selectedPuntoVendita.id);
      const response = await fetch(`${server}/api/pos/store/${selectedPuntoVendita.id}/products`);
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Attenzione",
            description: "Nessun listino attivo trovato per questo punto vendita",
            variant: "destructive",
          });
          return [];
        }
        throw new Error('Network response was not ok');
      }
      const data = await response.json();

      if (!data.products || !Array.isArray(data.products)) {
        console.error('Invalid products data structure:', data);
        return [];
      }

      // Recupera le disponibilità dal magazzino del punto vendita
      const availabilityResponse = await fetch(`${server}/api/product-availability/warehouse/${selectedPuntoVendita.warehouse_id}`);
      if (!availabilityResponse.ok) throw new Error('Failed to fetch availability');
      const availabilityData = await availabilityResponse.json();

      // Crea un map delle disponibilità per prodotto
      const availabilityMap = availabilityData.reduce((acc: {[key: number]: number}, item: any) => {
        acc[item.product_id] = item.quantity;
        return acc;
      }, {});

      // Recupera le foto per ogni prodotto e aggiungi la disponibilità corretta
      const productsWithPhotos = await Promise.all(data.products.map(async (product: Product) => {
        const mainPhotoUrl = await fetchMainPhoto(product.article_code, product.variant_code);
        return {
          ...product,
          retail_price: product.list_price?.toString() || "0",
          quantity: availabilityMap[product.id] || 0,  // Usa la disponibilità dal magazzino
          mainPhotoUrl
        };
      }));

      console.log('Processed products:', productsWithPhotos);
      return productsWithPhotos;
    },
    enabled: !!selectedPuntoVendita
  });

  // Funzione per ottenere la disponibilità di un prodotto
  const getProductAvailability = (productId: number) => {
    const product = productsData.find(p => p.id === productId);
    return product?.quantity || 0;
  };

  // Stato per il filtro disponibilità
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);

  // Funzione per filtrare i prodotti
  const filteredProducts = productsData
    .filter(product => {
      // Prima applica il filtro di disponibilità se attivo
      if (showOnlyAvailable && product.quantity <= 0) {
        return false;
      }
      
      // Poi applica il filtro di ricerca se c'è un termine
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          product.article_code.toLowerCase().includes(searchLower) ||
          product.variant_code.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });



  // Funzione di utilità per arrotondamento preciso
  const roundToTwo = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  // Modifica la funzione che calcola lo sconto
  const calculateDiscount = (originalPrice: number, discountedPrice: number): number => {
    // Arrotonda i prezzi a 2 decimali per evitare errori di precisione
    const roundedOriginal = roundToTwo(originalPrice);
    const roundedDiscounted = roundToTwo(discountedPrice);
    
    // Se i prezzi sono uguali dopo l'arrotondamento, non c'è sconto
    if (roundedOriginal === roundedDiscounted) return 0;
    
    const discount = ((roundedOriginal - roundedDiscounted) / roundedOriginal) * 100;
    return Number(Math.min(Math.max(0, discount), 100).toFixed(15));
  };

  // Modifica la funzione che aggiorna il totale del carrello
  const handleTotalChange = (newTotal: number) => {
    if (newTotal < 0) return;
    
    const totalBasePrice = roundToTwo(cart.reduce((sum, item) => 
      sum + (parseFloat(item.retail_price) * item.quantity), 0
    ));
    
    if (totalBasePrice === 0) return;

    // Arrotonda il nuovo totale a 2 decimali
    const validNewTotal = roundToTwo(Math.min(Math.max(0, newTotal), totalBasePrice));
    
    // Se i totali sono uguali dopo l'arrotondamento, azzera gli sconti
    if (validNewTotal === totalBasePrice) {
      setCart(prevCart => 
        prevCart.map(item => ({
          ...item,
          discount: 0,
          unitDiscounts: new Array(item.quantity).fill(0),
          total: roundToTwo(parseFloat(item.retail_price) * item.quantity)
        }))
      );
      return;
    }

    const targetTotalDiscount = ((totalBasePrice - validNewTotal) / totalBasePrice) * 100;

    setCart(prevCart => {
      const hasInitialDiscounts = prevCart.some(item => 
        item.unitDiscounts?.some(d => d > 0) || item.discount > 0
      );

      if (!hasInitialDiscounts) {
        return prevCart.map(item => {
          const itemDiscount = Number(Math.min(Math.max(0, targetTotalDiscount), 100).toFixed(15));
          const itemTotal = roundToTwo(parseFloat(item.retail_price) * item.quantity * (1 - itemDiscount / 100));
          
          return {
            ...item,
            discount: itemDiscount,
            unitDiscounts: new Array(item.quantity).fill(itemDiscount),
            total: itemTotal
          };
        });
      } else {
        const currentTotalDiscount = prevCart.reduce((sum, item) => {
          const basePrice = parseFloat(item.retail_price);
          return sum + item.unitDiscounts!.reduce((itemSum, discount) => 
            itemSum + (basePrice * (discount / 100)), 0
          );
        }, 0);

        const scaleFactor = (totalBasePrice - validNewTotal) / currentTotalDiscount;

        return prevCart.map(item => {
          const newUnitDiscounts = item.unitDiscounts!.map(discount => 
            Number(Math.min(Math.max(0, discount * scaleFactor), 100).toFixed(15))
          );

          return {
            ...item,
            discount: Number(Math.min(Math.max(0, item.discount * scaleFactor), 100).toFixed(15)),
            unitDiscounts: newUnitDiscounts
          };
        });
      }
    });
  };

  // Query per ottenere gli ordini parziali e saldati
  const { data: partialOrders = [], isLoading: isLoadingPartialOrders } = useQuery({
    queryKey: ['partialOrders', selectedPuntoVendita?.id, reservationSearchTerm],
    queryFn: async () => {
      if (!selectedPuntoVendita) return [];
      
        const searchParam = reservationSearchTerm ? `?search=${encodeURIComponent(reservationSearchTerm)}` : '';
      const response = await fetch(`${server}/api/orders/sold-orders/${selectedPuntoVendita.id}${searchParam}`);
        
      if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    },
    enabled: !!selectedPuntoVendita
  });

  // Funzione per calcolare il totale rimanente da pagare
  const calculateRemainingAmount = (order: Order) => {
    const totalPaid = order.order_payments.reduce((sum, payment) => sum + payment.amount, 0);
    return parseFloat(order.final_total) - totalPaid;
  };

  // Funzione per caricare un ordine nel carrello
  const loadOrderInCart = async (order: any) => {
    try {
      // Imposta subito lo stato dell'ordine
      setIsCurrentOrderReservation(true);
      // Un ordine è saldato se il suo status_id è 18
      const isSaldatoStatus = order.status_id === 18;
      setIsSaldato(isSaldatoStatus);
      
      // Carica i dettagli dell'ordine usando l'endpoint corretto
      const orderItemsResponse = await fetch(`${server}/api/order-items/order/${order.id}`);
      if (!orderItemsResponse.ok) throw new Error('Failed to fetch order items');
      const orderItems = await orderItemsResponse.json();

      // Imposta i dettagli dell'ordine
      setCurrentOrderId(order.id);
      setOrderNumber(order.code);
      if (order.client) {
        setSelectedClient(order.client.id.toString());
      }

      // Carica i pagamenti precedenti
      const paymentsResponse = await fetch(`${server}/api/order-payments/order/${order.id}/success`);
      if (!paymentsResponse.ok) throw new Error('Failed to fetch payments');
      const payments = await paymentsResponse.json();
      setPreviousPayments(payments);

      // Calcola il totale degli acconti
      const totalAcconti = payments.reduce((sum: number, payment: OrderPayment) => sum + payment.amount, 0);
      setDeposit(totalAcconti);

      // Prepara gli items del carrello e assicurati che abbiano lo status_id corretto
      const cartItems = prepareCartItems(orderItems).map(item => ({
        ...item,
        isFromReservation: true,
        status_id: order.status_id // Assicurati che ogni item abbia lo status_id dell'ordine
      }));
      setCart(cartItems);

      setIsReservationsDialogOpen(false);

      toast({
        title: isSaldatoStatus ? "Vendita saldata caricata" : "Prenotazione caricata",
        description: "L'ordine è stato caricato correttamente",
      });
    } catch (error) {
      console.error('Error loading order:', error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento dell'ordine",
        variant: "destructive",
      });
    }
  };

  // Nuova funzione per gestire il pagamento delle prenotazioni
  const handleReservationPayment = async () => {
    try {
      console.log('Inizio handleReservationPayment per ordine:', currentOrderId);
      
      // Recupera l'ordine con i pagamenti
      const orderResponse = await fetch(`http://localhost:3003/api/orders/${currentOrderId}`);
      if (!orderResponse.ok) throw new Error('Errore nel recupero dell\'ordine');
      const order = await orderResponse.json();
      console.log('Ordine recuperato:', order);

      // Recupera i pagamenti precedenti
      const paymentsResponse = await fetch(`http://localhost:3003/api/order-payments/order/${currentOrderId}/success`);
      if (!paymentsResponse.ok) throw new Error('Errore nel recupero dei pagamenti');
      const previousPayments = await paymentsResponse.json();
      console.log('Pagamenti precedenti:', previousPayments);

      // Calcola il totale pagato finora (arrotondato a 2 decimali)
      const totalPreviouslyPaid = Math.round(previousPayments.reduce((sum: number, payment: OrderPayment) => sum + payment.amount, 0) * 100) / 100;
      const currentPayment = Math.round(Object.values(paymentAmounts).reduce((sum, amount) => sum + (amount || 0), 0) * 100) / 100;
      const totalPaid = Math.round((totalPreviouslyPaid + currentPayment) * 100) / 100;
      console.log('Totale pagato:', totalPaid, 'di cui precedente:', totalPreviouslyPaid, 'e corrente:', currentPayment);

      // Verifica se l'ordine è stato saldato completamente (con tolleranza di 0.01€)
      const orderTotal = Math.round(parseFloat(order.final_total) * 100) / 100;
      const isFullyPaid = totalPaid >= orderTotal || Math.abs(totalPaid - orderTotal) <= 0.01;
      console.log('Ordine saldato completamente:', isFullyPaid, 'totale ordine:', orderTotal);

      // Aggiorna lo stato dell'ordine se necessario
      if (isFullyPaid) {
        console.log('Aggiorno stato ordine a saldato (4)');
        const orderUpdateResponse = await fetch(`http://localhost:3003/api/orders/${currentOrderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status_id: 18  // 4 = saldato
          })
        });

        if (!orderUpdateResponse.ok) {
          console.error('Errore aggiornamento stato ordine:', await orderUpdateResponse.text());
          throw new Error('Errore nell\'aggiornamento dello stato dell\'ordine');
        }
        
        const updatedOrder = await orderUpdateResponse.json();
        console.log('Ordine aggiornato:', updatedOrder);
      }

      // Salva i nuovi pagamenti
      for (const code of selectedPaymentTypes) {
        if (paymentAmounts[code] > 0) {
          const paymentMethod = paymentMethodsData.find(pm => pm.code === code);
          if (!paymentMethod) continue;

          const paymentAmount = Math.round(paymentAmounts[code] * 100) / 100;
          const paymentTax = Math.round((paymentAmount - (paymentAmount / 1.22)) * 100) / 100;

          const paymentData = {
            internal_code: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            order_id: currentOrderId,
            payment_method_id: paymentMethod.id,
            amount: paymentAmount,
            tax: paymentTax,
            payment_date: new Date().toISOString(),
            charge_date: new Date().toISOString(),
            status_id: 6
          };

          const paymentResponse = await fetch('http://localhost:3003/api/order-payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
          });

          if (!paymentResponse.ok) throw new Error('Errore nel salvataggio dei pagamenti');
        }
      }

      // Se c'è un voucher usato, aggiorniamo il suo stato
      if (voucherAmount > 0 && currentVoucherId) {
        const totalToPay = calculateTotalToPay()
        const voucherTotal = parseFloat(voucherAmount.toString())
        
        // Determina lo stato del voucher
        const isFullyUsed = voucherTotal <= totalToPay
        const statusId = isFullyUsed ? 24 : 25 // 24 = Usato totalmente, 25 = Usato parzialmente
        
        console.log('Aggiornamento voucher in prenotazione:', {
          id: currentVoucherId,
          status_id: statusId,
          destination_order_id: currentOrderId,
          used_amount: Math.min(voucherTotal, totalToPay),
          date_of_use: new Date().toISOString()
        })

        // Aggiorna il voucher esistente
        const updateVoucherResponse = await fetch(`${server}/api/vouchers/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentVoucherId,
            status_id: statusId,
            destination_order_id: currentOrderId,
            used_amount: Math.min(voucherTotal, totalToPay),
            date_of_use: new Date().toISOString()
          })
        })

        if (!updateVoucherResponse.ok) {
          const errorData = await updateVoucherResponse.json()
          console.error('Errore aggiornamento voucher in prenotazione:', errorData)
          throw new Error('Errore nell\'aggiornamento del voucher: ' + (errorData.error || 'Errore sconosciuto'))
        }

        // Se il voucher è stato usato parzialmente, crea un nuovo voucher per la differenza
        if (!isFullyUsed) {
          const remainingAmount = voucherTotal - totalToPay
          
          const createVoucherResponse = await fetch(`${server}/api/vouchers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin_order_id: currentVoucherOriginOrderId,
              total_amount: remainingAmount,
              validity_start_date: new Date().toISOString(),
              validity_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            })
          })

          if (!createVoucherResponse.ok) {
            throw new Error('Errore nella creazione del nuovo voucher')
          }
        }
      }

      // Pulisci il carrello e resetta i valori
      setCart([]);
      setTotalDiscount(0);
      setSelectedPaymentTypes([]);
      setPaymentAmounts({});
      setSelectedClient('');
      setCurrentOrderId(null);
      setDeposit(0); // Aggiungo il reset del deposit
      setVoucher(0); // Aggiungo il reset del voucher
      setPreviousPayments([]); // Aggiungo il reset dei pagamenti precedenti
      
      // Pulisci il localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart');
        localStorage.removeItem('orderNumber');
        localStorage.removeItem('orderDate');
        localStorage.removeItem('paymentData');
      }
      
      toast({
        title: isFullyPaid ? "Ordine saldato" : "Pagamento registrato",
        description: isFullyPaid ? "L'ordine è stato completamente saldato" : "Il pagamento è stato registrato correttamente",
      });

      // Ricarica i dati aggiornati
      queryClient.invalidateQueries({ queryKey: ['products', selectedPuntoVendita?.warehouse_id] });
      queryClient.invalidateQueries({ queryKey: ['partialOrders', selectedPuntoVendita?.id] });

    } catch (error) {
      console.error('Errore:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio del pagamento",
      });
    }
  };

  // Modifica il pulsante Conferma per usare la nuova funzione
  const handleConfirmClick = () => {
    if (currentOrderId) {
      handleReservationPayment();
    } else {
      handleConfirmPayment();
    }
    // Pulisco il tipo di documento selezionato e il numero ordine
    setSelectedDocumentType('');
    setOrderNumber('');
  };

  // Funzione per formattare l'acconto in modo sicuro
  const formatDeposit = (value: any): string => {
    const amount = Number(value || 0);
    return isNaN(amount) ? "0.00" : amount.toFixed(2);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + parseFloat(item.retail_price) * item.quantity, 0)
  }

  useEffect(() => {
    if (previousPayments && previousPayments.length > 0) {
      const totalDeposit = previousPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      setDeposit(totalDeposit);
    }
  }, [previousPayments]);

  const generateDocument = async () => {
    if (!selectedDocumentType) return;

    try {
      const documentData = {
        type: selectedDocumentType,
        order: {
          id: currentOrderId,
          number: orderNumber,
          date: orderDate,
          items: cart.map(item => ({
            ...item,
            total: parseFloat(item.retail_price) * item.quantity * (1 - item.discount / 100)
          })),
          total: totalAmount,
          totalDiscount,
          deposit,
          voucher,
          previousPayments: previousPayments,
          currentPayment: selectedPaymentTypes.map(code => ({
            method: paymentMethodsData.find(pm => pm.code === code)?.name || code,
            amount: paymentAmounts[code] || 0
          })),
          remainingAmount: remainingToPay - totalSelected,
          operator: operators.find(op => op.id.toString() === selectedOperator),
          client: clients.find(c => c.id === selectedClient),
          puntoVendita: selectedPuntoVendita
        }
      };

      const response = await fetch(`${server}/api/documents/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentData)
      });

      if (!response.ok) throw new Error('Failed to generate document');

      // Scarica il PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDocumentType}_${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Documento generato",
        description: "Il documento è stato generato e scaricato con successo",
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "Errore",
        description: "Errore nella generazione del documento",
        variant: "destructive",
      });
    }
  };

  const handlePhotoManagement = (product: any) => {
    setSelectedProduct({
      article_code: product.article_code,
      variant_code: product.variant_code
    });
    setPhotoDialogOpen(true);
  };

  // Aggiungi questa funzione per gestire l'espansione
  const toggleRowExpansion = (productId: number) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === productId) {
          // Se non esistono già gli sconti individuali, inizializzali tutti a 0
          // invece di copiare lo sconto della riga principale
          const unitDiscounts = item.unitDiscounts || 
            new Array(item.quantity).fill(0);
          
          return {
            ...item,
            isExpanded: !item.isExpanded,
            unitDiscounts
          };
        }
        return item;
      })
    );
  };

  // Aggiungi questa funzione per azzerare gli sconti
  const resetDiscounts = (productId: number) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === productId) {
          return {
            ...item,
            discount: 0,
            unitDiscounts: new Array(item.quantity).fill(0),
            total: parseFloat(item.retail_price) * item.quantity
          };
        }
        return item;
      })
    );
  };

  // Funzione per aggiornare il prezzo scontato di una riga
  const updateDiscountedPrice = (productId: number, newDiscountedPrice: number) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === productId) {
          const basePrice = parseFloat(item.retail_price);
          // Assicurati che il nuovo prezzo scontato non sia maggiore del prezzo base
          const validNewPrice = Math.min(Math.max(0, newDiscountedPrice), basePrice);
          const newDiscount = calculateDiscount(basePrice, validNewPrice);

          // Se non ci sono sconti differenziati nelle sottorighe o sono tutti uguali
          const hasUniformDiscounts = !item.unitDiscounts || 
            item.unitDiscounts.every(d => d === item.unitDiscounts![0]);

          if (hasUniformDiscounts) {
            return {
              ...item,
              discount: newDiscount,
              unitDiscounts: new Array(item.quantity).fill(newDiscount)
            };
          } else {
            const currentTotalDiscount = item.unitDiscounts!.reduce((sum, d) => sum + (basePrice * (d / 100)), 0);
            const targetTotalDiscount = item.quantity * (basePrice - validNewPrice);
            const scaleFactor = targetTotalDiscount / currentTotalDiscount;

            const newUnitDiscounts = item.unitDiscounts!.map(discount => 
              Number(Math.min(Math.max(0, discount * scaleFactor), 100).toFixed(15))
            );

            return {
              ...item,
              discount: newDiscount,
              unitDiscounts: newUnitDiscounts
            };
          }
        }
        return item;
      })
    );
  };

  // Funzione per aggiornare il totale di una riga
  const updateRowTotal = (productId: number, newTotal: number) => {
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === productId) {
          const basePrice = parseFloat(item.retail_price);
          const totalBasePrice = basePrice * item.quantity;
          // Assicurati che il nuovo totale non sia maggiore del totale base o negativo
          const validNewTotal = Math.min(Math.max(0, newTotal), totalBasePrice);
          const newAverageDiscount = calculateDiscount(totalBasePrice, validNewTotal);

          // Usa la stessa logica di updateDiscount
          const hasUniformDiscounts = !item.unitDiscounts || 
            item.unitDiscounts.every(d => d === item.unitDiscounts![0]);

          if (hasUniformDiscounts) {
            // Se gli sconti sono uniformi, applica lo stesso sconto a tutte le unità
            return {
              ...item,
              discount: newAverageDiscount,
              unitDiscounts: new Array(item.quantity).fill(newAverageDiscount),
              total: validNewTotal
            };
          } else {
            // Se gli sconti sono differenziati, distribuisci proporzionalmente
            const currentTotalDiscount = item.unitDiscounts!.reduce((sum, d) => 
              sum + (basePrice * (d / 100)), 0
            );
            const targetTotalDiscount = totalBasePrice - validNewTotal;
            const scaleFactor = targetTotalDiscount / currentTotalDiscount;

            const newUnitDiscounts = item.unitDiscounts!.map(discount => 
              Number(Math.min(Math.max(0, discount * scaleFactor), 100).toFixed(15))
            );

            return {
              ...item,
              discount: newAverageDiscount,
              unitDiscounts: newUnitDiscounts,
              total: validNewTotal
            };
          }
        }
        return item;
      })
    );
  };

  // Aggiungi questa funzione per preparare gli items del carrello
  const prepareCartItems = (orderItems: OrderItem[]) => {
    // Raggruppa gli items per product_id
    const groupedItems = orderItems.reduce((acc: GroupedItems, item) => {
      if (!acc[item.product_id]) {
        acc[item.product_id] = [];
      }
      acc[item.product_id].push(item);
      return acc;
    }, {});

    return Object.values(groupedItems).map((items: OrderItem[]) => {
      const basePrice = parseFloat(items[0].unit_cost.toString()) || 0;
      const itemQuantity = items.reduce((sum: number, item) => 
        sum + (parseInt(item.quantity.toString()) || 0), 0
      );
      const uniqueId = `${items[0].product_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const baseItemData = {
        id: items[0].product_id,
        article_code: items[0].article_code,
        variant_code: items[0].variant_code,
        size: items[0].size || '',
        retail_price: basePrice.toFixed(2),
        isFromReservation: true,
        isExpanded: false,
        rowId: uniqueId
      };

      if (items.length === 1 && items[0].quantity > 1) {
        const itemDiscount = parseFloat(items[0].discount.toString()) || 0;
        return {
          ...baseItemData,
          quantity: items[0].quantity,
          discount: itemDiscount,
          total: parseFloat(items[0].total.toString()) || 0,
          unitDiscounts: new Array(items[0].quantity).fill(itemDiscount)
        };
      }
      
      if (items.length === 1 && items[0].quantity === 1) {
        const itemDiscount = parseFloat(items[0].discount.toString()) || 0;
        return {
          ...baseItemData,
          quantity: 1,
          discount: itemDiscount,
          total: parseFloat(items[0].total.toString()) || 0,
          unitDiscounts: [itemDiscount]
        };
      }

      const totalScontato = items.reduce((sum: number, item) => 
        sum + (parseFloat(item.total.toString()) || 0), 0
      );
      const listinoPriceTotal = basePrice * itemQuantity;
      const calculatedDiscount = listinoPriceTotal > 0 
        ? Math.max(0, Math.min(100, ((listinoPriceTotal - totalScontato) / listinoPriceTotal) * 100))
        : 0;

      return {
        ...baseItemData,
        quantity: itemQuantity,
        discount: calculatedDiscount,
        total: totalScontato,
        unitDiscounts: items.map(item => parseFloat(item.discount.toString()) || 0)
      };
    });
  };

  // Utilizzo di loadOrderFromDB invece della funzione duplicata
  const handleLoadOrder = async (order: Order) => {
    const dependencies = {
      setCart: (cart: CartItem[]) => setCart(cart),
      setSelectedClient,
      setCurrentOrderId,
      setIsReservationsDialogOpen: () => {},
      fetchPreviousPayments: async (orderId: number) => {
        const paymentsResponse = await fetch(`${server}/api/order-payments/order/${orderId}`);
        if (!paymentsResponse.ok) throw new Error('Failed to fetch payments');
        const payments = await paymentsResponse.json();
        setPreviousPayments(payments);
        
        const totalAcconti = payments.reduce((sum: number, payment: OrderPayment) => sum + payment.amount, 0);
        setDeposit(totalAcconti);
      },
      fetchPreviousSuccessfulPayments: async (orderId: number) => {
        const paymentsResponse = await fetch(`${server}/api/order-payments/order/${orderId}/successful`);
        if (!paymentsResponse.ok) throw new Error('Failed to fetch successful payments');
        const payments = await paymentsResponse.json();
        setPreviousSuccessfulPayments(payments);
      },
      setOrderNumber,
      toast
    };

    await loadOrderFromDB(order, dependencies);
  };

  // Funzione per recuperare la promozione attiva
  const fetchActivePromotion = async (puntoVenditaId: number) => {
    console.log('🏪 Recupero promozioni per punto vendita ID:', puntoVenditaId);
    try {
      console.log('📍 URL chiamata:', `http://localhost:3003/api/punti-vendita-promotions/active/${puntoVenditaId}`);
      const response = await fetch(`http://localhost:3003/api/punti-vendita-promotions/active/${puntoVenditaId}`);
      console.log('📡 Status risposta:', response.status);
      
      if (!response.ok) {
        console.log('❌ Risposta non ok:', await response.text());
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      console.log('📢 Promozione attiva ricevuta:', data);
      
      if (!data) {
        console.log('⚠️ Nessuna promozione trovata per il punto vendita');
        setActivePromotion(null);
        return;
      }
      
      console.log('✨ Imposto la promozione attiva:', data);
      setActivePromotion(data);
      console.log('✅ Promozione impostata correttamente');
    } catch (error) {
      console.error('❌ Errore nel recupero della promozione:', error);
      setActivePromotion(null);
    }
  };

  // Modifica useEffect per aggiungere più log
  useEffect(() => {
    console.log('🔄 Punto vendita corrente:', selectedPuntoVendita);
    if (selectedPuntoVendita?.id) {
      console.log('✨ Punto vendita valido trovato, ID:', selectedPuntoVendita.id);
      fetchActivePromotion(selectedPuntoVendita.id);
    } else {
      console.log('⚠️ Nessun punto vendita selezionato o ID mancante');
      setActivePromotion(null);
    }
  }, [selectedPuntoVendita]);

  // Aggiungi un useEffect per monitorare i cambiamenti di activePromotion
  useEffect(() => {
    console.log('🔄 Stato promozione attiva cambiato:', activePromotion);
    if (activePromotion && cart.length > 0) {
      console.log('✨ Avvio applicazione automatica sconti');
      applyAutomaticDiscounts();
    }
  }, [activePromotion]);

  // Modifica l'useEffect esistente per il carrello
  useEffect(() => {
    if (cart.length > 0 && activePromotion) {
      console.log('🛒 Carrello modificato con promozione attiva');
      console.log('Carrello:', cart);
      console.log('Promozione:', activePromotion);
      applyAutomaticDiscounts();
    }
  }, [cart.length, activePromotion, cart.map(item => item.quantity).join(',')]);

  // Funzione per verificare le condizioni del prodotto
  const checkProductConditions = (conditions: any[], item: any) => {
    return conditions.every(condition => {
      switch (condition.condition) {
        case 'prezzo_articolo':
          const price = parseFloat(item.retail_price);
          switch (condition.operator) {
            case '<': return price < parseFloat(condition.value);
            case '>': return price > parseFloat(condition.value);
            case '=': return price === parseFloat(condition.value);
            case '>=': return price >= parseFloat(condition.value);
            default: return false;
          }
        case 'quantita_stesso_articolo':
          switch (condition.operator) {
            case '<': return item.quantity < parseInt(condition.value);
            case '>': return item.quantity > parseInt(condition.value);
            case '=': return item.quantity === parseInt(condition.value);
            case '>=': return item.quantity >= parseInt(condition.value);
            default: return false;
          }
        case 'attributo_articolo':
          if (condition.parameter_id === -1) { // Brand
            return condition.attribute_operator === '=' 
              ? item.brand_id === condition.attribute_ids[0]
              : item.brand_id !== condition.attribute_ids[0];
          }
          // Aggiungi altri casi per parametri personalizzati se necessario
          return false;
        default:
          return false;
      }
    });
  };

  // Funzione per verificare le condizioni del carrello
  const checkCartConditions = (conditions: any[], cart: any[]) => {
    return conditions.every(condition => {
      switch (condition.condition) {
        case 'totale_articoli':
          const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
          switch (condition.operator) {
            case '<': return totalItems < parseInt(condition.value);
            case '>': return totalItems > parseInt(condition.value);
            case '=': return totalItems === parseInt(condition.value);
            case '>=': return totalItems >= parseInt(condition.value);
            default: return false;
          }
        case 'totale_prezzo':
          const totalPrice = cart.reduce((sum, item) => 
            sum + (parseFloat(item.retail_price) * item.quantity), 0);
          switch (condition.operator) {
            case '<': return totalPrice < parseFloat(condition.value);
            case '>': return totalPrice > parseFloat(condition.value);
            case '=': return totalPrice === parseFloat(condition.value);
            case '>=': return totalPrice >= parseFloat(condition.value);
            default: return false;
          }
        default:
          return false;
      }
    });
  };

  // Funzione per applicare gli sconti automatici
  const applyAutomaticDiscounts = () => {
    console.log("🔄 Inizio applicazione sconti automatici");
    
    if (!activePromotion || !activePromotion.query || isProcessingPromotion) {
      console.log('❌ Nessuna promozione attiva o già in elaborazione');
      return;
    }

    setIsProcessingPromotion(true);
    console.log('🚀 Promozione attiva:', activePromotion);
    console.log('📝 Query completa:', activePromotion.query);

    try {
      const newCart = [...cart];
      let hasChanges = false;

      // Reset degli sconti prima di applicare le nuove promozioni
      newCart.forEach(item => {
        if (item.discount !== 0) {
          item.discount = 0;
          hasChanges = true;
        }
      });

      // Analizza la query della promozione
      const [conditions, actions] = activePromotion.query.split(' THEN ');
      console.log('🔍 Query analizzata:', {
        condizioni_raw: conditions,
        azioni_raw: actions
      });

      // Estrai le condizioni
      if (conditions.startsWith('WHERE ')) {
        const conditionsStr = conditions.substring(6);
        console.log('📋 Condizioni estratte:', conditionsStr);

        // Verifica COUNT(*)
        const countMatch = conditionsStr.match(/COUNT\(\*\)\s*>=\s*(\d+)/);
        if (countMatch) {
          const requiredCount = parseInt(countMatch[1]);
          console.log('🔢 Numero minimo di articoli richiesto:', requiredCount);

          // Calcola il numero totale di articoli nel carrello
          const totalItems = newCart.reduce((sum, item) => sum + item.quantity, 0);
          console.log('🛒 Totale articoli nel carrello:', totalItems);
          console.log('✅ Condizione soddisfatta?', totalItems >= requiredCount);

          if (totalItems >= requiredCount) {
            // Estrai l'azione di sconto
            const discountMatch = actions.match(/APPLY_DISCOUNT\((\w+),\s*(\d+),\s*(\w+)\)/);
            if (discountMatch) {
              const [_, type, value, target] = discountMatch;
              console.log('💰 Azione di sconto estratta:', { type, value, target });

              if (target === 'CHEAPEST') {
                // Trova l'articolo meno costoso
                const sortedItems = [...newCart].sort((a, b) => 
                  parseFloat(a.retail_price) - parseFloat(b.retail_price)
                );
                const cheapestItem = sortedItems[0];
                console.log('🏷️ Articolo meno costoso trovato:', {
                  id: cheapestItem.id,
                  prezzo: cheapestItem.retail_price,
                  codice: cheapestItem.article_code
                });

                // Applica lo sconto solo all'articolo meno costoso
                newCart.forEach(item => {
                  if (item.id === cheapestItem.id) {
                    const discountValue = parseInt(value);
                    console.log('✅ Applico sconto del', discountValue, '% all\'articolo:', {
                      id: item.id,
                      prezzo_originale: item.retail_price,
                      sconto: discountValue
                    });
                    item.discount = discountValue;
                    item.total = parseFloat(item.retail_price) * item.quantity * (1 - discountValue / 100);
                    item.unitDiscounts = new Array(item.quantity).fill(discountValue);
                    hasChanges = true;
                  }
                });
              }
            } else {
              console.log('❌ Formato azione non valido:', actions);
            }
          } else {
            console.log('❌ Numero di articoli insufficiente');
          }
        } else {
          console.log('❌ Pattern COUNT(*) non trovato nella query');
        }
      } else {
        console.log('❌ Query non inizia con WHERE');
      }

      if (hasChanges) {
        console.log('✅ Carrello aggiornato con sconti:', newCart);
        setCart(newCart);
      } else {
        console.log('ℹ️ Nessuna modifica necessaria al carrello');
      }

    } catch (error) {
      console.error('❌ Errore durante l\'applicazione degli sconti:', error);
    } finally {
      setIsProcessingPromotion(false);
    }
  };

  // Aggiungi un nuovo useEffect per applicare gli sconti automatici
  useEffect(() => {
    if (cart.length > 0 && activePromotion) {
      applyAutomaticDiscounts();
    }
  }, [cart.length, activePromotion, cart.map(item => item.quantity).join(',')]);

  const handleProductSelect = (product: Product) => {
    addToCart(product);
    setIsProductDialogOpen(false);
  };

  const handleCancelReservation = async (refundMethod: RefundMethod) => {
    if (!selectedPuntoVendita || !currentOrderId) return

    try {
      await cancelReservation({
        orderId: currentOrderId,
        warehouseId: selectedPuntoVendita.warehouse_id,
        refundMethod,
        deposit
      })
      
      // Resetta il carrello e aggiorna lo stato
      resetForm()
      toast({
        title: "Successo",
        description: refundMethod === 'voucher' 
          ? "Prenotazione annullata e buono spesa creato con successo"
          : "Prenotazione annullata con successo",
      })
    } catch (error) {
      console.error('Errore durante l\'annullamento:', error)
      toast({
        title: "Errore",
        description: "Errore durante l'annullamento della prenotazione",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isCurrentOrderReservation) {
        localStorage.setItem('isCurrentOrderReservation', 'true');
      } else {
        localStorage.removeItem('isCurrentOrderReservation');
      }
    }
  }, [isCurrentOrderReservation]);

  const getStatusColor = (statusId: number) => {
    switch (statusId) {
      case 16: return 'text-gray-600 bg-gray-50'      // Bozza
      case 17: return 'text-orange-600 bg-orange-50'  // Pagato parzialmente
      case 18: return 'text-green-600 bg-green-50'    // Saldato
      case 19: return 'text-red-600 bg-red-50'        // Annullato
      case 20: return 'text-purple-600 bg-purple-50'  // Reso
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (statusId: number) => {
    switch (statusId) {
      case 16: return 'Bozza'
      case 17: return 'Pagato parzialmente'
      case 18: return 'Saldato'
      case 19: return 'Annullato'
      case 20: return 'Reso'
      default: return 'Sconosciuto'
    }
  }

  const handleApplyVoucher = (amount: number, voucherId: number, originOrderId: number | null) => {
    const updatedPayments = { ...paymentAmounts };
    
    // Imposta il valore fisso del voucher
    updatedPayments['BSC'] = amount;
    
    // Controlla gli altri metodi di pagamento
    const otherPaymentTypes = selectedPaymentTypes.filter(type => type !== 'BSC');
    otherPaymentTypes.forEach(type => {
      const currentAmount = updatedPayments[type] || 0;
      
      // Rimuovi il metodo se il totale da pagare è minore o uguale al valore del voucher
      if (totalToPay <= amount) {
        delete updatedPayments[type];
        setSelectedPaymentTypes(prev => prev.filter(t => t !== type));
      } else {
        // Altrimenti sottrai il valore del voucher
        updatedPayments[type] = Math.max(0, currentAmount - amount);
        if (updatedPayments[type] === 0) {
          delete updatedPayments[type];
          setSelectedPaymentTypes(prev => prev.filter(t => t !== type));
        }
      }
    });

    setPaymentAmounts(updatedPayments);
    
    // Aggiungi il voucher ai metodi selezionati se non è già presente
    if (!selectedPaymentTypes.includes('BSC')) {
      setSelectedPaymentTypes(prev => [...prev, 'BSC']);
    }
    
    setVoucherAmount(amount)
    setCurrentVoucherId(voucherId)
    setCurrentVoucherOriginOrderId(originOrderId)
    setIsVoucherModalOpen(false)
  }

  const handleRemovePaymentType = (typeToRemove: string) => {
    setSelectedPaymentTypes(prev => prev.filter(type => type !== typeToRemove));
    const updatedPayments = { ...paymentAmounts };
    delete updatedPayments[typeToRemove];
    setPaymentAmounts(updatedPayments);
  }

  // Aggiungi questo useEffect dopo gli altri useEffect
  useEffect(() => {
    // Se c'è un ordine nel carrello
    if (cart.length > 0) {
      const order = cart[0]; // Prendiamo il primo item perché tutti gli item dell'ordine avranno lo stesso stato
      // Controlliamo che sia una prenotazione e che sia saldato (status_id === 18)
      if (order.isFromReservation && order.status_id === 18) {
        setIsSaldato(true);
        setIsCurrentOrderReservation(true);
      } else {
        setIsSaldato(false);
      }
    } else {
      setIsSaldato(false);
      setIsCurrentOrderReservation(false);
    }
  }, [cart]); // La dipendenza è cart, così quando cambia il carrello, viene ricalcolato isSaldato

  const onReturn = async (
    refundMethod: RefundMethod, 
    amount: number, 
    isPartialReturn: boolean,
    returnQuantities: { [key: number]: number }
  ) => {
    try {
      console.log('page.tsx - isPartialReturn ricevuto dal modal:', isPartialReturn);
      await handleReturn({
        orderId: currentOrderId!,
        warehouseId: selectedPuntoVendita!.warehouse_id,
        refundMethod,
        deposit: amount,
        isPartialReturn,
        returnQuantities,
        setIsProcessing: setIsProcessing,
        toast: ({ title, description, variant }) => toast({
          title,
          description,
          variant: variant === 'default' || variant === 'destructive' ? variant : 'default'
        }),
        router: { refresh: () => window.location.reload() }
      });
      toast({
        title: "Successo",
        description: "Reso effettuato con successo",
      });
      resetForm();
      setIsCurrentOrderReservation(false);
      setIsSaldato(false);
      setOrderNumber(''); // Resetto il codice ordine
      setCurrentOrderId(null); // Resetto anche l'ID dell'ordine
    } catch (error) {
      console.error('Errore durante il reso:', error);
      toast({
        title: "Errore",
        description: "Errore durante il reso",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F4F4F4]">
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .shake-slow {
          animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex justify-between items-center p-2 bg-[#1E1E1E] text-white">
            <div className="flex space-x-2">
              <Button variant="default" className="bg-[#2C2C2C] text-white hover:bg-[#2C2C2C]">
                <Coins className="h-4 w-4" />
              </Button>

              <Button 
                variant="ghost" 
                className="text-gray-300 bg-[#2C2C2C] hover:text-white hover:bg-[#3C3C3C] "
                title="Prenotazioni"
                onClick={() => setIsReservationsDialogOpen(true)}
              >
                <Clock className="h-4 w-4 mr-2" /> Vendite e prenotazioni
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Select
                value={selectedPuntoVendita?.id?.toString()}
                onValueChange={handlePuntoVenditaChange}
              >
                <SelectTrigger className="w-[250px] bg-[#2C2C2C] border-0 text-white">
                  <SelectValue placeholder="Seleziona punto vendita" />
                </SelectTrigger>
                <SelectContent>
                  {puntiVendita?.map((pv: any) => (
                    <SelectItem key={pv.id} value={pv.id.toString()}>
                      {pv.name || `${pv.channel_name} - ${pv.warehouse_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className={`flex items-center space-x-4 text-sm ${isShaking ? 'shake' : ''}`}>
                <div className="flex gap-2">
                  {frozenOrders.map((order) => (
                    <Button
                      key={order.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnfreezeOrder(order)}
                      className="bg-[#2C2C2C] hover:bg-[#3C3C3C] text-white border-0 h-7 px-2 flex items-center gap-1"
                    >
                      <Snowflake className="h-3 w-3" />
                      {order.orderNumber}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </header>
          
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F4F4F4]">
            <div className="container mx-auto px-4 py-4">
              <div className="grid grid-cols-12 gap-6 items-center mb-4">
                <div className="relative flex items-center col-span-6">
                  <ScanBarcode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Inserisci codice a barre o cerca prodotto..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      handleSearchChange(e.target.value);
                    }}
                    onBlur={() => setSearchTerm('')}
                    ref={searchInputRef}
                    className="w-full appearance-none bg-background pl-10 shadow-none"
                    disabled={cart.some(item => item.isFromReservation)}
                  />
                </div>
              
                <div className="flex items-center justify-center col-span-3">
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-[#1E1E1E] hover:bg-[#2C2C2C] text-white w-full flex items-center justify-center gap-2"
                      disabled={cart.some(item => item.isFromReservation)}
                    >
                      <Plus className="h-4 w-4" />
                      Cerca prodotto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="border-b pb-4">
                      <DialogTitle className="text-xl font-bold">Catalogo Prodotti</DialogTitle>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={showOnlyAvailable}
                              onCheckedChange={setShowOnlyAvailable}
                              id="available-switch"
                            />
                            <Label htmlFor="available-switch">
                              {showOnlyAvailable ? "Solo disponibili" : "Tutti i prodotti"}
                            </Label>
                          </div>
                        </div>
                        <div className="relative w-72">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="search"
                            placeholder="Cerca per codice articolo o variante..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                    </DialogHeader>
                    <div className="flex-grow overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                          <TableRow>
                            <TableHead className="w-16">Foto</TableHead>
                            <TableHead className="w-32">Codice Art.</TableHead>
                            <TableHead className="w-32">Codice Var.</TableHead>
                            <TableHead className="w-32">Brand</TableHead>
                            <TableHead className="w-24">Taglia</TableHead>
                            <TableHead className="w-24 text-center">Disp.</TableHead>
                            <TableHead className="w-28 text-right">Prezzo</TableHead>
                            <TableHead className="w-28 text-right">Prezzo Scontato</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((product) => (
                            <TableRow
                              key={product.id}
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => handleProductSelect(product)}
                            >
                              <TableCell>
                                <div className="relative h-12 w-12 rounded-md overflow-hidden border border-gray-200">
                                  <Image
                                    src={product.mainPhotoUrl || '/placeholder.png'}
                                    alt={product.article_code}
                                    className="object-cover"
                                    fill
                                    sizes="(max-width: 48px) 100vw"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{product.article_code}</TableCell>
                              <TableCell>{product.variant_code}</TableCell>
                              <TableCell>{product.brand_name}</TableCell>
                              <TableCell className="text-center">
                                <span className="px-2 py-1 bg-gray-100 rounded-md text-sm">
                                  {product.size}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`px-2 py-1 rounded-md text-sm ${
                                  product.quantity === 0 
                                    ? 'bg-red-100 text-red-700' 
                                    : product.quantity < 3
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {product.quantity}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={product.discounted_price ? 'text-gray-400 line-through' : 'font-medium'}>
                                  {parseFloat(product.retail_price).toFixed(2)} €
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {product.discounted_price ? (
                                  <span className="text-red-600">
                                    {parseFloat(product.discounted_price).toFixed(2)} €
                                  </span>
                                ) : (
                                  <span>
                                    {parseFloat(product.retail_price).toFixed(2)} €
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>

                <div className="flex items-center col-span-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="bg-white text-black border-gray-300 h-10 w-full">
                        {selectedClient ? 
                          clients.find(c => c.id === selectedClient)?.name : 
                          'Seleziona cliente'
                        }
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Seleziona Cliente</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        {clients.map((client) => (
                          <Button
                            key={client.id}
                            variant="ghost"
                            className="w-full justify-start mb-1"
                            onClick={() => setSelectedClient(client.id)}
                          >
                            {client.name}
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <Card className={`mb-4 shadow-sm ${isCartShaking ? 'shake' : ''}`}>
                <CardContent className="p-0">
                  <Table className="h-[100]">
                    <TableHeader>
                      <TableRow className="bg-[#F9FAFB]">
                        <TableHead className="w-1/3">Articolo</TableHead>
                        <TableHead>P.listino</TableHead>
                        <TableHead>sconto %</TableHead>
                        <TableHead>P.scontato</TableHead>
                        <TableHead>totale</TableHead>
                        <TableHead>Quantità</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item) => {
                        const isOverQuantity = !item.isFromReservation && 
                          item.quantity > (productsData.find(p => p.id === item.id)?.quantity || 0);
                        
                        return (
                          <>
                            <TableRow 
                              key={item.id} 
                              id={`cart-row-${item.id}`}
                              className={`${isOverQuantity || item.quantity === 0 ? 'bg-red-50' : ''} 
                                ${shakingRows[item.id] ? 'shake-slow' : ''}`}
                            >
                              <TableCell className="flex items-center gap-2">
                                {item.mainPhotoUrl ? (
                                  <div className="relative w-12 h-12 bg-white rounded border">
                                    <div className="absolute inset-1">
                                      <Image
                                        src={item.mainPhotoUrl}
                                        alt={`${item.article_code} - ${item.variant_code}`}
                                        fill
                                        sizes="(max-width: 48px) 100vw"
                                        className="rounded object-contain p-1"
                                        style={{ aspectRatio: "1/1" }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                                    <Plus className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                                {item.article_code} - {item.variant_code} {' '}- 
                                <span className="font-semibold bg-gray-100 px-1.5 py-0.5 rounded ml-1 text-xs">{item.size}</span>
                                {!item.isFromReservation && (productsData.find(p => p.id === item.id)?.quantity || 0) === 0 && (
                                  <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded font-medium ml-2">
                                    ESAURITO
                                  </span>
                                )}
                                {!item.isFromReservation && (productsData.find(p => p.id === item.id)?.quantity || 0) > 0 && 
                                 (productsData.find(p => p.id === item.id)?.quantity || 0) < 4 && (
                                  <span className="bg-yellow-100 text-yellow-600 text-[11px] px-1.5 py-0.5 rounded ml-2">
                                    BASSA
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className={item.discount > 0 ? 'text-red-500 line-through' : ''}>
                                  {parseFloat(item.retail_price).toFixed(2)}€
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="text"
                                    value={tempDiscounts[item.id] !== undefined ? tempDiscounts[item.id] : item.discount}
                                    onChange={(e) => {
                                      // Permette solo numeri, virgola e punto
                                      const value = e.target.value.replace(/[^0-9,.]/, '');
                                      setTempDiscounts(prev => ({
                                        ...prev,
                                        [item.id]: value
                                      }));
                                    }}
                                    onBlur={(e) => {
                                      const value = e.target.value;
                                      // Converte la virgola in punto per il parsing
                                      const numValue = parseFloat(value.replace(',', '.'));
                                      if (!isNaN(numValue) && numValue <= 100) {
                                        // Formatta il numero con due decimali
                                        updateDiscount(item.id, parseFloat(numValue.toFixed(2)));
                                      } else {
                                        // Se il valore non è valido, resetta a 0
                                        updateDiscount(item.id, 0);
                                      }
                                      // Rimuovi il valore temporaneo
                                      setTempDiscounts(prev => {
                                        const newTemp = { ...prev };
                                        delete newTemp[item.id];
                                        return newTemp;
                                      });
                                    }}
                                    className="w-20"
                                    disabled={item.isFromReservation}
                                  />
                                  {!item.isFromReservation && (item.discount > 0 || (item.unitDiscounts && item.unitDiscounts.some(d => d > 0))) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => resetDiscounts(item.id)}
                                      title="Azzera sconti"
                                    >
                                      <CirclePercent className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {editingProductPrice === item.id && !item.isFromReservation ? (
                                  <div className="flex items-center">
                                    <Input
                                      type="number"
                                      value={editedProductPrice}
                                      onChange={(e) => setEditedProductPrice(e.target.value)}
                                      onBlur={() => {
                                        setEditingProductPrice(null)
                                        if (editedProductPrice) {
                                          const newPrice = parseFloat(editedProductPrice);
                                          if (!isNaN(newPrice)) {
                                            const basePrice = parseFloat(item.retail_price);
                                            const newDiscount = calculateDiscount(basePrice, newPrice);
                                            // Usa updateDiscount che applicherà lo sconto a tutte le unità
                                            updateDiscount(item.id, newDiscount);
                                          }
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur()
                                        }
                                      }}
                                      className="w-24"
                                      autoFocus
                                    />
                                    <span className="ml-1">€</span>
                                  </div>
                                ) : (
                                  <span
                                    className={`${!item.isFromReservation ? 'cursor-pointer hover:bg-gray-100' : ''} px-2 py-1 rounded font-semibold`}
                                    onClick={() => {
                                      if (!item.isFromReservation) {
                                        setEditingProductPrice(item.id)
                                        setEditedProductPrice((parseFloat(item.retail_price) * (1 - item.discount / 100)).toFixed(2))
                                      }
                                    }}
                                  >
                                    {(parseFloat(item.retail_price) * (1 - item.discount / 100)).toFixed(2)} €
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {editingRowTotal === item.id && !item.isFromReservation ? (
                                  <div className="flex items-center">
                                    <Input
                                      type="number"
                                      value={editedRowTotal}
                                      onChange={(e) => setEditedRowTotal(e.target.value)}
                                      onBlur={() => {
                                        setEditingRowTotal(null)
                                        if (editedRowTotal) {
                                          const newTotal = parseFloat(editedRowTotal);
                                          if (!isNaN(newTotal)) {
                                            updateRowTotal(item.id, newTotal);
                                          }
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur()
                                        }
                                      }}
                                      className="w-24"
                                      autoFocus
                                    />
                                    <span className="ml-1">€</span>
                                  </div>
                                ) : (
                                  <span
                                    className={`${!item.isFromReservation ? 'cursor-pointer hover:bg-gray-100' : ''} px-2 py-1 rounded font-semibold`}
                                    onClick={() => {
                                      if (!item.isFromReservation) {
                                        setEditingRowTotal(item.id);
                                        setEditedRowTotal((parseFloat(item.retail_price) * item.quantity * (1 - item.discount / 100)).toFixed(2));
                                      }
                                    }}
                                  >
                                    {(parseFloat(item.retail_price) * item.quantity * (1 - item.discount / 100)).toFixed(2)} €
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {/* Controlli quantità */}
                                  <div className="flex items-center">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8 w-8 rounded-full" 
                                      onClick={() => updateQuantity(item.id, 'decrease')}
                                      disabled={item.isFromReservation || item.quantity <= 1 || (productsData.find(p => p.id === item.id)?.quantity || 0) === 0}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="mx-2 w-8 text-center ">
                                      {item.quantity}
                                    </span>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8 w-8 rounded-full" 
                                      onClick={() => updateQuantity(item.id, 'increase')}
                                      disabled={
                                        item.isFromReservation || 
                                        (productsData.find(p => p.id === item.id)?.quantity || 0) === 0 ||
                                        item.quantity >= (productsData.find(p => p.id === item.id)?.quantity || 0)
                                      }
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  {/* Bottone espandi (più visibile ora) */}
                                  {item.quantity > 1 && (
                                    <Button
                                      variant="secondary"  // Cambiato da ghost a secondary per maggiore visibilità
                                      size="sm"
                                      className="h-8 px-2 flex items-center gap-1 bg-gray-100 hover:bg-gray-200"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRowExpansion(item.id);
                                      }}
                                    >
                                      <ChevronDown 
                                        className={`h-4 w-4 transition-transform ${
                                          item.isExpanded ? 'transform rotate-180' : ''
                                        }`}
                                      />
                                    </Button>
                                  )}

                                  {/* Bottone elimina */}
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0" 
                                    onClick={() => removeFromCart(item.id)}
                                    disabled={item.isFromReservation}
                                  >
                                    <Trash className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* Righe espanse per le singole unità */}
                            {item.isExpanded && item.quantity > 1 && (
                              Array.from({ length: item.quantity }).map((_, index) => {
                                const unitId = item.unitIds?.[index] || generateUniqueId();
                                const unitDiscount = item.unitDiscounts?.[index] || 0;
                                const basePrice = parseFloat(item.retail_price);
                                const discountedPrice = basePrice * (1 - unitDiscount / 100);

                                return (
                                  <TableRow 
                                    key={unitId}
                                    id={`unit-row-${unitId}`}
                                    className="bg-gray-50"
                                  >
                                    <TableCell className="pl-12">
                                      Unità {index + 1}
                                    </TableCell>
                                    <TableCell>
                                      <span className={unitDiscount > 0 ? 'text-red-500 line-through' : ''}>
                                        {basePrice.toFixed(2)}€
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="text"
                                          value={tempUnitDiscounts[`${item.id}-${index}`] !== undefined 
                                            ? tempUnitDiscounts[`${item.id}-${index}`] 
                                            : unitDiscount}
                                          onChange={(e) => {
                                            // Permette solo numeri, virgola e punto
                                            const value = e.target.value.replace(/[^0-9,.]/, '');
                                            setTempUnitDiscounts(prev => ({
                                              ...prev,
                                              [`${item.id}-${index}`]: value
                                            }));
                                          }}
                                          onBlur={(e) => {
                                            const value = e.target.value;
                                            // Converte la virgola in punto per il parsing
                                            const numValue = parseFloat(value.replace(',', '.'));
                                            if (!isNaN(numValue) && numValue <= 100) {
                                              // Formatta il numero con due decimali
                                              updateUnitDiscount(item.id, index, parseFloat(numValue.toFixed(2)));
                                            } else {
                                              // Se il valore non è valido, resetta a 0
                                              updateUnitDiscount(item.id, index, 0);
                                            }
                                            // Rimuovi il valore temporaneo
                                            setTempUnitDiscounts(prev => {
                                              const newTemp = { ...prev };
                                              delete newTemp[`${item.id}-${index}`];
                                              return newTemp;
                                            });
                                          }}
                                          className="w-20"
                                          disabled={item.isFromReservation}
                                        />
                                        {!item.isFromReservation && unitDiscount > 0 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => {
                                              const newUnitDiscounts = [...(item.unitDiscounts || [])];
                                              newUnitDiscounts[index] = 0;
                                              updateUnitDiscount(item.id, index, 0);
                                            }}
                                            title="Azzera sconto"
                                          >
                                            <CirclePercent className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {discountedPrice.toFixed(2)}€
                                    </TableCell>
                                    <TableCell>
                                      {discountedPrice.toFixed(2)}€
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
                <CardFooter className="flex justify-between bg-[#F9FAFB] px-4 py-3">
                  <div>
                    <p className="text-sm text-gray-500">Totale pezzi</p>
                    <p className="text-xl font-semibold">{cart.reduce((sum, item) => sum + item.quantity, 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Totale carrello</p>
                    <p className={`text-xl font-semibold ${totalDiscount > 0 || cart.some(item => item.discount > 0) ? 'line-through text-red-500' : ''}`}>
                      {cart.reduce((sum, item) => 
                        sum + (parseFloat(item.retail_price) * item.quantity), 0
                      ).toFixed(2)} €
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sconto sul totale</p>
                    <p className="text-xl font-semibold">
                      {(() => {
                        const totalPrice = cart.reduce((sum, item) => 
                          sum + (parseFloat(item.retail_price) * item.quantity), 0
                        );
                        const discountedTotal = cart.reduce((sum, item) => {
                          const price = parseFloat(item.retail_price);
                          const discountedPrice = price * (1 - item.discount / 100);
                          return sum + (discountedPrice * item.quantity);
                        }, 0);
                        if (totalPrice === 0) return "0.00";
                        const effectiveDiscount = ((totalPrice - discountedTotal) / totalPrice) * 100;
                        return `${Math.round(effectiveDiscount * 1000) / 1000}%`;
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Totale scontato</p>
                    {isEditingTotal ? (
                      <div className="flex items-center">
                        <Input
                          type="number"
                          value={editedTotal}
                          onChange={(e) => setEditedTotal(e.target.value)}
                          onBlur={() => {
                            setIsEditingTotal(false);
                            if (editedTotal) {
                              handleTotalChange(parseFloat(editedTotal));
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-32 text-xl font-semibold"
                          autoFocus
                        />
                        <span className="ml-1 text-xl font-semibold">€</span>
                      </div>
                    ) : (
                      <p 
                        className={`text-xl font-semibold ${!cart.some(item => item.isFromReservation) ? 'cursor-pointer hover:bg-gray-100' : ''} px-2 py-1 rounded`}
                        onClick={() => {
                          if (!cart.some(item => item.isFromReservation)) {
                          setEditedTotal(totalAmount.toFixed(2));
                          setIsEditingTotal(true);
                          }
                        }}
                      >
                        {totalAmount.toFixed(2)} €
                      </p>
                    )}
                  </div>
                </CardFooter>
              </Card>
            </div>
          </main>
        </div>
        
        {cart.some(item => item.isFromReservation) && isSaldato ? (
          <ReturnSidebar
            orderNumber={orderNumber}
            orderDate={orderDate}
            totalAmount={totalAmount}
            currentOrderId={currentOrderId!}
            onReturn={onReturn}
            onClose={() => {
              resetForm();
              setIsCurrentOrderReservation(false);
            }}
            onFreeze={() => {
              handleFreezeOperation();
              setIsCurrentOrderReservation(false);
            }}
          />
        ) : (
          <DefaultSidebar
            operators={operators}
            selectedOperator={selectedOperator}
            orderNumber={orderNumber}
            orderDate={orderDate}
            currentOrderId={currentOrderId}
            deposit={deposit}
            totalToPay={totalToPay}
            cart={cart as ExtendedCartItem[]}
            selectedPaymentTypes={selectedPaymentTypes}
            paymentMethodsData={paymentMethodsData as ExtendedPaymentMethod[]}
            paymentAmounts={paymentAmounts}
            totalSelected={totalSelected}
            remainingToPay={remainingToPay}
            selectedDocumentType={selectedDocumentType}
            isPartialPayment={isPartialPayment}
            allDocumentTypes={allDocumentTypes}
            isCurrentOrderReservation={isCurrentOrderReservation}
            isSaldato={isSaldato}
            onOperatorChange={handleOperatorChange}
            onPaymentTypeChange={handlePaymentTypeChange}
            onPaymentAmountChange={handlePaymentAmountChange}
            onPaymentAmountBlur={handlePaymentAmountBlur}
            onDocumentTypeChange={setSelectedDocumentType}
            onConfirm={async () => {
                  await handleConfirmClick();
                  if (selectedDocumentType && selectedDocumentType !== 'no_document') {
                    await generateDocument();
                  }
                }}
            onClose={() => {
                  if (cart.some(item => item.isFromReservation)) {
                    resetForm();
                setIsCurrentOrderReservation(false);
                  } else {
                    handleResetClick();
                  }
                }}
            onFreeze={() => {
              handleFreezeOperation();
              setIsCurrentOrderReservation(false);
            }}
            onShowPayments={() => setIsPaymentsDialogOpen(true)}
            onShowVoucherModal={() => setIsVoucherModalOpen(true)}
            onRemovePaymentType={handleRemovePaymentType}
            onCancelReservation={() => setShowCancelReservationModal(true)}
            hasInsufficientStock={hasInsufficientStock}
          />
        )}
      </div>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conferma annullamento</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">Sei sicuro di voler annullare l&apos;operazione? Tutti i dati inseriti verranno persi.</p>
          </div>
          <DialogFooter className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsResetDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetForm()
                setIsResetDialogOpen(false)
              }}
            >
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog delle vendite */}
      <Dialog open={isReservationsDialogOpen} onOpenChange={setIsReservationsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Vendite e prenotazioni</DialogTitle>
          </DialogHeader>
          
          <div className="relative flex items-center mb-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cerca per codice ordine o cliente..."
              value={reservationSearchTerm}
              onChange={(e) => setReservationSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-grow overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Totale</TableHead>
                  <TableHead>Pagato</TableHead>
                  <TableHead>Da pagare</TableHead>
                  <TableHead>Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPartialOrders ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Caricamento...
                    </TableCell>
                  </TableRow>
                ) : partialOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      Nessuna vendita trovata
                    </TableCell>
                  </TableRow>
                ) : (
                  partialOrders.map((order: OrderWithPayments, index: number, array: OrderWithPayments[]) => {
                    const totalPaid = order.order_payments.reduce((sum: number, payment: {amount: number}) => sum + payment.amount, 0);
                    const remainingAmount = calculateRemainingAmount(order);
                    const isSaldato = order.status_id === 18;
                    
                    // Confronta la data con l'ordine precedente
                    const currentDate = new Date(order.created_at).toLocaleDateString('it-IT');
                    const previousDate = index > 0 
                      ? new Date(array[index - 1].created_at).toLocaleDateString('it-IT')
                      : null;
                    
                    // Determina se cambiare lo sfondo
                    const shouldChangeBackground = currentDate !== previousDate;
                    // Alterna tra bianco e grigio chiaro
                    const bgColor = index === 0 || shouldChangeBackground
                      ? (array.findIndex(o => new Date(o.created_at).toLocaleDateString('it-IT') === currentDate) % 2 === 0
                        ? 'bg-white'
                        : 'bg-gray-50')
                      : (array.findIndex(o => new Date(o.created_at).toLocaleDateString('it-IT') === currentDate) % 2 === 0
                        ? 'bg-white'
                        : 'bg-gray-50');
                    
                    return (
                      <TableRow 
                        key={order.id} 
                        className={`cursor-pointer hover:bg-gray-100 ${bgColor}`}
                        onClick={async () => {
                          if (cart.length > 0) {
                            toast({
                              title: "Carrello non vuoto",
                              description: "Svuota il carrello prima di caricare una vendita.",
                              variant: "destructive",
                            });
                            return;
                          }

                          try {
                            await loadOrderInCart(order);
                          } catch (error) {
                            console.error('Error loading order:', error);
                            toast({
                              title: "Errore",
                              description: "Errore nel caricamento della vendita",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <TableCell className="font-medium">{order.code}</TableCell>
                        <TableCell>{order.client?.name || 'Cliente generico'}</TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-bold">{parseFloat(order.final_total).toFixed(2)} €</TableCell>
                        <TableCell className="text-green-600">{totalPaid.toFixed(2)} €</TableCell>
                        <TableCell className={remainingAmount === 0 ? "text-gray-400 font-medium" : "text-red-600 font-medium"}>
                          {remainingAmount.toFixed(2)} €
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status_id)}>
                            {isSaldato ? "VENDITA" : order.status_id === 17 ? "PRENOTAZIONE" : getStatusText(order.status_id)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog dei pagamenti precedenti */}
      <Dialog open={isPaymentsDialogOpen} onOpenChange={setIsPaymentsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dettagli Pagamenti Precedenti</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Pagamento</TableHead>
                  <TableHead>Modalità</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead>IVA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previousPayments.length > 0 ? (
                  previousPayments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        {payment.payment_method_id === 4 ? 'CARTA' : 
                         payment.payment_method_id === 2 ? 'CONTANTI' : 
                         payment.payment_method_id === 3 ? 'BONIFICO BANCARIO' : 
                         'ALTRO'}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {parseFloat(payment.amount).toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        {parseFloat(payment.tax).toFixed(2)} €
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-4">
                      Nessun pagamento precedente
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <CancelReservationModal
        isOpen={showCancelReservationModal}
        onClose={() => setShowCancelReservationModal(false)}
        onConfirm={handleCancelReservation}
        deposit={deposit}
      />
      <VoucherModal 
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        onApplyVoucher={handleApplyVoucher}  // Correggiamo il nome della prop
      />
    </div>
  )
}