'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DialogFooter } from "@/components/ui/dialog"
import { ShoppingCart, ArrowLeft, Clock, DollarSign, CreditCard, Link2, MoreHorizontal, FileText, Plus, Eye, ChevronDown, Search, Euro, Snowflake, ScanBarcode, Shirt, Wallet, Banknote, QrCode, Smartphone } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { loadOrderFromDB } from './loadOrder';

interface Product {
  id: number;
  article_code: string;
  variant_code: string;
  size: string;
  quantity: number;
  retail_price: string;
  brand_id?: number;
  status_id?: number;
  isFromReservation?: boolean;
}

interface Brand {
  id: number;
  name: string;
}

interface Size {
  id: number;
  name: string;
}

interface SizeGroup {
  id: number;
  name: string;
}

interface Status {
  id: number;
  name: string;
}

interface CartItem extends Product {
  quantity: number;
  discount: number;
  total: number;
}

interface Filters {
  [key: string]: number[]
}

interface PriceRange {
  min?: number
  max?: number
}

interface PriceRanges {
  wholesale_price: PriceRange
  retail_price: PriceRange
}

interface AvailabilityFilter {
  type?: 'available' | 'not_available' | 'greater_than' | 'less_than'
  value?: number
}

interface DiscountVoucher {
  id: number;
  code: string;  // BSC + 7 caratteri alfanumerici
  client_id?: number;
  origin_order_id?: number;
  total_amount: number;
  status_id: number;
  validity_start_date: string;
  validity_end_date: string;
  destination_order_id?: number;
  used_amount: number;
  date_of_use?: string;
  created_at: string;
  updated_at: string;
  barcode_id?: number;
}

interface OrderPayment {
  id: number;
  internal_code: string;
  payment_code?: string;
  order_id: number;
  payment_method_id: number;
  amount: number;
  tax: number;
  payment_date: string;
  charge_date: string;
  payment_prove_document_url?: string;
  invoice_document_url?: string;
  status_id: number;
  created_at: string;
  updated_at: string;
}

interface PaymentType {
  id: string;
  name: string;
}

interface Operator {
  id: number;
  code: string;
  nome: string;
  cognome: string;
}

interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  description: string | null;
  icon: string;
}

interface Order {
  id: number;
  code: string;
  total_price: string;
  final_total: string;
  status_id: number;
  created_at: string;
  client?: {
    id: number;
    name: string;
  };
  order_payments: OrderPayment[];
}

const documentTypes = [
  { id: 'invoice', name: 'Fattura' }
]

const clients = [
  { id: '1233', name: 'elsayed alorabi 2221' },
  { id: '1234', name: 'Jane Smith' },
]

interface FrozenOrder {
  id: string;
  cart: CartItem[];
  totalDiscount: number;
  orderNumber: string;
  orderDate: Date;
  deposit: number;
  previousPayments: OrderPayment[];
}

// Aggiungi l'icona Sneaker come componente SVG personalizzato
const Sneaker = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M19 16h3a2 2 0 0 0 2-2v-3.38a2 2 0 0 0-.38-1.17L19 3.87a2 2 0 0 0-1.62-.87H8a2 2 0 0 0-1.62.87L2 9.38a2 2 0 0 0-.38 1.17V14a2 2 0 0 0 2 2h3" />
    <path d="M19 16v-3a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
  </svg>
)

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
  
  // Query per ottenere i punti vendita
  const { data: puntiVendita } = useQuery({
    queryKey: ['puntiVendita'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3003/api/punti-vendita');
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
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
    fetchData()
  }, [])

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [cart])

  const server = 'http://localhost:3003'

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

      const productsWithAvailability = productData.map((product: Product) => ({
        ...product,
        total_availability: availabilityMap[product.id] || 0
      }));

      setProducts(productsWithAvailability)
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
      const price = parseFloat(item.retail_price);
      const discountedPrice = price * (1 - item.discount / 100);
      return sum + (discountedPrice * item.quantity);
    }, 0);
  };

  // Funzione per calcolare lo sconto totale
  const calculateTotalDiscount = (currentCart: CartItem[]) => {
    const totalPrice = currentCart.reduce((sum, item) => 
      sum + (parseFloat(item.retail_price) * item.quantity), 0
    );
    
    const discountedTotal = currentCart.reduce((sum, item) => {
      const price = parseFloat(item.retail_price);
      const discountedPrice = price * (1 - item.discount / 100);
      return sum + (discountedPrice * item.quantity);
    }, 0);

    if (totalPrice === 0) return 0;
    return Math.round(((totalPrice - discountedTotal) / totalPrice) * 100 * 1000) / 1000;
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

  // Modifica addToCart per includere l'effetto shake e generare il numero ordine
  const addToCart = async (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    // Se il carrello è vuoto, genera un nuovo numero ordine
    if (cart.length === 0) {
      await generateOrderNumber();
    }
    
    if (existingItem) {
      // Se il prodotto è già nel carrello, incrementa la quantità
      const newCart = cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * parseFloat(item.retail_price) * (1 - item.discount / 100) }
          : item
      );
      setCart(newCart);
      shakeRow(product.id);
    } else {
      // Altrimenti, aggiungi il nuovo prodotto
      const newItem: CartItem = {
        ...product,
        quantity: 1,
        discount: 0,
        total: parseFloat(product.retail_price)
      };
      setCart([...cart, newItem]);
      shakeRow(product.id);
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

  // Modifica updateQuantity per includere l'effetto shake
  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
    shakeRow(productId);
  };

  // Aggiorna il totale scontato quando cambia il carrello
  useEffect(() => {
    const newDiscountedTotal = calculateDiscountedTotal(cart);
    setDiscountedTotal(newDiscountedTotal);
  }, [cart]);

  // Funzione per aggiornare lo sconto di un singolo prodotto
  const updateDiscount = (productId: number, newDiscount: number) => {
    if (newDiscount < 0 || newDiscount > 100) return;
    
    setCart(prevCart => {
      const updatedCart = prevCart.map(item =>
        item.id === productId ? { 
          ...item, 
          discount: Math.round(newDiscount * 1000) / 1000
        } : item
      );
      
      // Aggiorna lo sconto totale
      const newTotalDiscount = calculateTotalDiscount(updatedCart);
      setTotalDiscount(newTotalDiscount);
      
      return updatedCart;
    });
  };

  // Funzione per gestire il cambio dello sconto totale
  const handleTotalDiscountChange = (newTotalDiscount: number) => {
    if (newTotalDiscount < 0 || newTotalDiscount > 100) return;
    
    setCart(prevCart => {
      if (prevCart.length === 0) return prevCart;

      // Calcola il fattore di scala per gli sconti
      const scaleFactor = newTotalDiscount / (totalDiscount || 1);

      // Aggiorna gli sconti dei prodotti proporzionalmente
      return prevCart.map(item => ({
        ...item,
        discount: Math.min(100, Math.round(item.discount * scaleFactor * 1000) / 1000)
      }));
    });

    setTotalDiscount(newTotalDiscount);
  };

  const handleSearchChange = async (value: string) => {
    if (value.trim() === '') return;
    
    try {
      const response = await fetch(`${server}/api/barcode/barcodes/${value}/product`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const product = await response.json();
        addToCart(product);
        setSearchTerm('');
      } else if (response.status === 404) {
        toast({
          title: "Prodotto non trovato",
          description: "Nessun prodotto trovato per questo codice.",
          variant: "destructive",
        });
      } else {
        throw new Error('Failed to fetch product');
      }
    } catch (error) {
      console.error('Error searching product:', error);
      toast({
        title: "Errore",
        description: "Errore durante la ricerca del prodotto. Riprova.",
        variant: "destructive",
      });
    }
  }

  const handlePaymentMethodSelection = (method: string) => {
    if (selectedPaymentMethods.includes(method)) {
      setSelectedPaymentMethods(selectedPaymentMethods.filter(m => m !== method))
      setPaymentMethods(prev => ({ ...prev, [method]: 0 }))
    } else {
      setSelectedPaymentMethods([...selectedPaymentMethods, method])
      if (selectedPaymentMethods.length === 0) {
        setPaymentMethods(prev => ({ ...prev, [method]: remainingAmount }))
      }
    }
  }

  const handlePaymentMethodChange = (method: string, amount: number) => {
    const newAmount = Math.min(Math.max(0, amount), remainingAmount)
    const newPaymentMethods = { ...paymentMethods, [method]: newAmount }

    if (selectedPaymentMethods.length === 2) {
      const otherMethod = selectedPaymentMethods.find(m => m !== method)!
      newPaymentMethods[otherMethod] = Math.max(0, remainingAmount - newAmount)
    }

    setPaymentMethods(newPaymentMethods)
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <DollarSign className="h-4 w-4" />
      case 'card': return <CreditCard className="h-4 w-4" />
      case 'transfer': return <Link2 className="h-4 w-4" />
      case 'check': return <FileText className="h-4 w-4" />
      default: return null
    }
  }

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
      deposit: deposit,  // Salva il deposit nell'ordine congelato
      previousPayments: previousPayments  // Salva i pagamenti precedenti
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
      setCart(frozenOrder.cart)
      setTotalDiscount(frozenOrder.totalDiscount)
      setOrderNumber(frozenOrder.orderNumber)
      setOrderDate(new Date(frozenOrder.orderDate))
      
      const newFrozenOrders = frozenOrders.filter(order => order.id !== frozenOrder.id)
      setFrozenOrders(newFrozenOrders)
        localStorage.setItem('frozenOrders', JSON.stringify(newFrozenOrders))
      
      toast({
        title: "Ordine Scongelato",
        description: "L'ordine è stato caricato nel carrello.",
      })
    } else {
      setIsCartShaking(true)
      setTimeout(() => setIsCartShaking(false), 820)
      toast({
        title: "Carrello non vuoto",
        description: "Svuota il carrello corrente prima di caricare un ordine congelato.",
        variant: "destructive",
      })
    }
  }

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
    setCart([])
    setTotalDiscount(0)
    setDeposit(0)  // Reset deposit solo quando si annulla o congela
    setVoucher(0)
    setPaymentMethods({ cash: 0, card: 0, transfer: 0, check: 0 })
    setSelectedPaymentMethods([])
    setIsFullPayment(true)
    setOrderNumber('')
    setOrderDate(new Date())
    setSelectedPaymentTypes([])
    setPaymentAmounts({})
    setSelectedDocumentType('')
    setPreviousPayments([])  // Reset dei pagamenti precedenti
    setCurrentOrderId(null)
    
    // Rimuovi il carrello e i dati correlati dal localStorage
    localStorage.removeItem('cart')
    localStorage.removeItem('orderNumber')
    localStorage.removeItem('orderDate')
  }

  const handleResetClick = () => {
    setIsResetDialogOpen(true)
  }

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      toast({
        title: "Errore",
        description: "Seleziona un metodo di pagamento",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart,
          total: calculateTotal(),
          payment_method: selectedPaymentMethod,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const order = await response.json();

      setShowPaymentDialog(false);
      setCart([]);
      setSelectedPaymentMethod('');
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      toast({
        title: "Successo",
        description: "Ordine completato con successo",
      });

    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il pagamento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per calcolare il prezzo con IVA
  const getPriceWithVAT = (price: string) => {
    return parseFloat(price) * 1.22;
  };

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
      const itemPrice = parseFloat(item.retail_price) * item.quantity;
      return sum + (itemPrice * (1 - item.discount / 100));
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
    return formatRemainingAmount(remaining);
  };

  // Funzione per formattare il totale da pagare
  const formatRemainingAmount = (amount: number) => {
    if (isNaN(amount)) return 0;
    return Math.abs(amount) <= 0.05 ? 0 : amount;
  };

  // Calcola il totale da pagare
  const totalToPay = calculateTotalToPay();

  // Aggiorna la visualizzazione del totale da pagare
  const displayRemainingAmount = formatRemainingAmount(remainingAmount);

  const fetchPreviousPayments = async (orderId: number) => {
    try {
      // Ottieni i dettagli dei pagamenti
      const paymentsResponse = await fetch(`${server}/api/order-payments/order/${orderId}`);
      if (!paymentsResponse.ok) throw new Error('Failed to fetch payments');
      const payments = await paymentsResponse.json();
      
      // Calcola il totale degli acconti con precisione
      const totalDeposit = payments.reduce((sum: number, payment: any) => {
        const amount = typeof payment.amount === 'string' ? 
          parseFloat(payment.amount) : Number(payment.amount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      // Arrotonda a 2 decimali per evitare errori di precisione
      const roundedDeposit = Math.round(totalDeposit * 100) / 100;
      
      setPreviousPayments(payments);
      setDeposit(roundedDeposit);

      console.log('Pagamenti recuperati:', payments);
      console.log('Totale acconti calcolato:', roundedDeposit);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPreviousPayments([]);
      setDeposit(0);
      toast({
        title: "Errore",
        description: "Impossibile recuperare i pagamenti",
        variant: "destructive",
      });
    }
  };

  const applyVoucher = async (voucherCode: string) => {
    try {
      const response = await fetch(`${server}/api/discount-vouchers/${voucherCode}`)
      if (!response.ok) throw new Error('Invalid voucher code')
      const voucher = await response.json()
      
      // Verifica validità
      const now = new Date()
      const startDate = new Date(voucher.validity_start_date)
      const endDate = new Date(voucher.validity_end_date)
      
      if (now < startDate || now > endDate) {
        throw new Error('Voucher expired or not yet valid')
      }

      // Verifica se è già stato usato completamente
      if (voucher.used_amount >= voucher.total_amount) {
        throw new Error('Voucher already fully used')
      }

      setAppliedVouchers(prev => [...prev, voucher])
    } catch (error) {
      console.error('Error applying voucher:', error)
      toast({
        title: "Errore",
        description: "Buono sconto non valido",
        variant: "destructive",
      })
    }
  }

  const handlePaymentTypeChange = (code: string) => {
    setSelectedPaymentTypes(prev => {
      const newTypes = prev.includes(code)
        ? prev.filter(t => t !== code)
        : prev.length >= 2 
          ? prev 
          : [...prev, code];
      
      // Reset degli importi quando cambiano i tipi di pagamento
      const newAmounts: {[key: string]: number} = {};
      if (newTypes.length === 1) {
        // Se c'è solo un tipo, assegna tutto l'importo rimanente da pagare
        newAmounts[newTypes[0]] = Number(totalAmount) - Number(totalPreviousPayments);
      } else if (newTypes.length === 2) {
        // Se ci sono due tipi, dividi l'importo equamente
        const amountPerType = (Number(totalAmount) - Number(totalPreviousPayments)) / 2;
        newTypes.forEach(t => {
          newAmounts[t] = amountPerType;
        });
      }
      setPaymentAmounts(newAmounts);
      
      return newTypes;
    });
  };

  const handlePaymentAmountChange = (code: string, isDecimal: boolean, value: string) => {
    // Rimuovi caratteri non numerici
    const cleanValue = value.replace(/[^0-9]/g, '');
    
    const newAmounts = { ...paymentAmounts };
    const currentAmount = newAmounts[code] || 0;
    
    // Converti il numero corrente in parti
    const [currentInt, currentDec] = currentAmount.toFixed(2).split('.');
    
    if (isDecimal) {
      // Se stiamo modificando la parte decimale, limitala a 2 cifre
      const newDec = cleanValue.slice(0, 2).padEnd(2, '0');
      newAmounts[code] = parseFloat(`${currentInt}.${newDec}`);
    } else {
      // Se stiamo modificando la parte intera
      newAmounts[code] = parseFloat(`${cleanValue || '0'}.${currentDec}`);
    }

    // Aggiorna l'altro campo se presente
    const otherType = selectedPaymentTypes.find(t => t !== code);
    if (otherType) {
      const remainingToPay = Number(totalAmount) - Number(totalPreviousPayments);
      const otherAmount = Math.max(0, remainingToPay - newAmounts[code]);
      newAmounts[otherType] = Math.round(otherAmount * 100) / 100;
    }

    setPaymentAmounts(newAmounts);
  };

  // Funzione per formattare il valore visualizzato nell'input
  const formatInputValue = (amount: number | undefined) => {
    if (!amount) return '';
    const [intPart, decPart] = amount.toString().split('.');
    if (!decPart) return intPart;
    return `${intPart},${decPart.slice(0, 2)}`;
  };

  const totalSelected = Object.values(paymentAmounts).reduce((sum, amount) => sum + (amount || 0), 0);
  const remainingToPay = Number(totalAmount) - Number(totalPreviousPayments);
  const isPartialPayment = totalSelected < remainingToPay;

  // Funzione per verificare se ci sono prodotti con quantità superiore alla disponibilità
  const hasInsufficientStock = () => {
    return cart.some(item => {
      const availableQuantity = productsData.find(p => p.id === item.id)?.quantity || 0;
      return item.quantity > availableQuantity;
    });
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
          status_id: totalSelected >= finalTotal ? 4 : 3,
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
          if (paymentAmounts[code] > 0) {
            const paymentMethod = paymentMethodsData.find(pm => pm.code === code);
            if (!paymentMethod) continue;

            const paymentAmount = paymentAmounts[code];
            const paymentTax = paymentAmount - (paymentAmount / 1.22);

            const paymentData = {
              internal_code: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              order_id: currentOrderId,
              payment_method_id: paymentMethod.id,
              amount: paymentAmount,
              tax: paymentTax,
              payment_date: new Date().toISOString(),
              charge_date: new Date().toISOString(),
              status_id: 1
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
        }
      } else {
        // Creo un nuovo ordine
        const orderData = {
          type_id: 1,
          code: uniqueOrderCode,
          client_id: selectedClient ? parseInt(selectedClient) : null,
          total_price: totalPrice,
          status_id: totalSelected >= finalTotal ? 4 : 3,
          punto_vendita_id: selectedPuntoVendita.id,
          discount: effectiveDiscount,
          final_total: finalTotal,
          operator_id: parseInt(selectedOperator),
          tax: tax
        };

        const orderResponse = await fetch('http://localhost:3003/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData)
        });

        if (!orderResponse.ok) throw new Error('Errore nel salvataggio dell\'ordine');
        const savedOrder = await orderResponse.json();

        // Salvo gli items dell'ordine
        for (const item of cart) {
          const itemTotal = parseFloat(item.retail_price) * item.quantity * (1 - item.discount / 100);
          const itemTax = itemTotal - (itemTotal / 1.22);

          const orderItemData = {
            order_id: savedOrder.id,
            product_id: item.id,
            quantity: item.quantity,
            unit_cost: parseFloat(item.retail_price),
            discount: item.discount,
            final_cost: parseFloat(item.retail_price) * (1 - item.discount / 100),
            total: itemTotal,
            tax: itemTax
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
          if (paymentAmounts[code] > 0) {
            const paymentMethod = paymentMethodsData.find(pm => pm.code === code);
            if (!paymentMethod) continue;

            const paymentAmount = paymentAmounts[code];
            const paymentTax = paymentAmount - (paymentAmount / 1.22);

            const paymentData = {
              internal_code: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              order_id: savedOrder.id,
              payment_method_id: paymentMethod.id,
              amount: paymentAmount,
              tax: paymentTax,
              payment_date: new Date().toISOString(),
              charge_date: new Date().toISOString(),
              status_id: 1
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
              quantity_change: -item.quantity
            })
          });

          if (!updateAvailabilityResponse.ok) {
            throw new Error('Errore nell\'aggiornamento delle disponibilità');
          }
        }
      }

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
      
      // Pulisco il localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart');
        localStorage.removeItem('orderNumber');
        localStorage.removeItem('orderDate');
      }
      
      toast({
        title: currentOrderId ? "Prenotazione aggiornata" : "Ordine completato",
        description: currentOrderId ? "La prenotazione è stata aggiornata con successo" : "L'ordine è stato salvato con successo",
      });

      // Ricarica i dati aggiornati
      queryClient.invalidateQueries({ queryKey: ['products', selectedPuntoVendita?.warehouse_id] });
      queryClient.invalidateQueries({ queryKey: ['partialOrders', selectedPuntoVendita?.id] });

    } catch (error) {
      console.error('Errore:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio dell'ordine",
      });
    }
  };

  const updateProductDiscount = (productId: number, newPrice: number) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === productId) {
          const originalPrice = parseFloat(item.retail_price)
          const newDiscount = ((originalPrice - newPrice) / originalPrice) * 100
          return { ...item, discount: Math.max(0, Math.min(100, newDiscount)) }
        }
        return item
      })
    )
  }

  const updateRowDiscount = (productId: number, newTotal: number) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === productId) {
          const originalTotal = parseFloat(item.retail_price) * item.quantity
          const newDiscount = ((originalTotal - newTotal) / originalTotal) * 100
          return { ...item, discount: Math.max(0, Math.min(100, newDiscount)) }
        }
        return item
      })
    )
  }

  // Carica i dati salvati dal localStorage al mount del componente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Carica il carrello
        const savedCart = localStorage.getItem('cart')
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart)
          setCart(parsedCart)
          
          // Ricalcola lo sconto totale
          const totalPrice = parsedCart.reduce((sum: number, item: CartItem) => 
            sum + (parseFloat(item.retail_price) * item.quantity), 0
          );
          
          const discountedTotal = parsedCart.reduce((sum: number, item: CartItem) => {
            const price = parseFloat(item.retail_price);
            const discountedPrice = price * (1 - item.discount / 100);
            return sum + (discountedPrice * item.quantity);
          }, 0);

          if (totalPrice > 0) {
            const effectiveDiscount = ((totalPrice - discountedTotal) / totalPrice) * 100;
            setTotalDiscount(Math.round(effectiveDiscount * 1000) / 1000);
          }
        }
        
        // Carica il numero d'ordine
        const savedOrderNumber = localStorage.getItem('orderNumber')
        if (savedOrderNumber) {
          setOrderNumber(savedOrderNumber)
        }
        
        // Carica la data dell'ordine
        const savedOrderDate = localStorage.getItem('orderDate')
        if (savedOrderDate) {
          setOrderDate(new Date(savedOrderDate))
        }
        
        // Carica gli ordini congelati
        const savedFrozenOrders = localStorage.getItem('frozenOrders')
        if (savedFrozenOrders) {
          const parsed = JSON.parse(savedFrozenOrders)
          const orders = parsed.map((order: any) => ({
            ...order,
            orderDate: new Date(order.orderDate)
          }))
          setFrozenOrders(orders)
        }
      } catch (error) {
        console.error('Error loading data from localStorage:', error)
        // In caso di errore, pulisci tutto
        localStorage.removeItem('cart')
        localStorage.removeItem('orderNumber')
        localStorage.removeItem('orderDate')
        localStorage.removeItem('frozenOrders')
        resetForm()
      }
    }
  }, [])

  // Salva il carrello quando cambia
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
    queryKey: ['paymentMethods'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3003/api/payment-methods');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      // Ordine desiderato secondo i dati del database
      const orderMap: { [key: string]: number } = {
        'CRD': 1,  // CARTA
        'CSH': 2,  // CONTANTI
        'BNK': 3   // BONIFICO BANCARIO
      };

      // Rimuovi duplicati basandoti sul codice invece che sull'ID
      const uniqueData = data.filter((item: PaymentMethod, index: number, self: PaymentMethod[]) =>
        index === self.findIndex((t) => t.code === item.code)
      );

      return uniqueData.sort((a: PaymentMethod, b: PaymentMethod) => {
        const orderA = orderMap[a.code] || 999;
        const orderB = orderMap[b.code] || 999;
        return orderA - orderB;
      });
    }
  });

  // Query per ottenere i prodotti
  const { data: productsData = [] } = useQuery<Product[]>({
    queryKey: ['products', selectedPuntoVendita?.warehouse_id],
    queryFn: async () => {
      if (!selectedPuntoVendita) return [];
      
      const response = await fetch(`http://localhost:3003/api/product-availability/products/${selectedPuntoVendita.warehouse_id}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      return data;
    },
    enabled: !!selectedPuntoVendita
  });

  // Funzione per ottenere la disponibilità di un prodotto
  const getProductAvailability = (productId: number) => {
    const product = productsData.find(p => p.id === productId);
    return product?.quantity || 0;
  };

  // Stato per il filtro disponibilità
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  // Funzione per filtrare i prodotti
  const filteredProducts = showOnlyAvailable 
    ? productsData.filter(product => product.quantity > 0)
    : productsData;

  // Componente ProductsDialog
  const ProductsDialog = () => {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            Prodotti
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[90vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Prodotti</DialogTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Switch
                checked={showOnlyAvailable}
                onCheckedChange={setShowOnlyAvailable}
                id="available-switch"
              />
              <Label htmlFor="available-switch">Solo prodotti disponibili</Label>
            </div>
          </DialogHeader>
          <div className="flex-grow overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-white">Codice Articolo</TableHead>
                  <TableHead className="sticky top-0 bg-white">Codice Variante</TableHead>
                  <TableHead className="sticky top-0 bg-white">Taglia</TableHead>
                  <TableHead className="sticky top-0 bg-white">Quantità Disponibile</TableHead>
                  <TableHead className="sticky top-0 bg-white">Prezzo al Dettaglio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} onClick={() => { addToCart(product); setIsProductDialogOpen(false); }} className="cursor-pointer hover:bg-gray-100">
                    <TableCell className="flex items-center gap-2">
                      {product.article_code} - {product.variant_code}
                      {product.quantity === 0 && (
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded font-medium">
                          ESAURITO
                        </span>
                      )}
                      {product.quantity > 0 && product.quantity < 4 && (
                        <span className="bg-yellow-100 text-yellow-600 text-[11px] px-1.5 py-0.5 rounded">
                          BASSA
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{product.variant_code}</TableCell>
                    <TableCell>{product.size}</TableCell>
                    <TableCell className={product.quantity === 0 ? 'text-red-500' : ''}>{product.quantity}</TableCell>
                    <TableCell>{product.retail_price} €</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Funzione per gestire il cambio del totale manualmente
  const handleTotalChange = (newTotal: number) => {
    if (newTotal < 0) return;
    
    const totalPrice = cart.reduce((sum, item) => 
      sum + (parseFloat(item.retail_price) * item.quantity), 0
    );
    
    if (totalPrice === 0) return;

    // Assicurati che il nuovo totale non sia maggiore del totale originale
    const validNewTotal = Math.min(newTotal, totalPrice);

    setCart(prevCart => {
      // Calcola la percentuale di sconto totale desiderata
      const targetTotalDiscount = ((totalPrice - validNewTotal) / totalPrice) * 100;

      // Verifica se ci sono sconti iniziali
      const hasInitialDiscounts = prevCart.some(item => item.discount > 0);

      if (!hasInitialDiscounts) {
        // Se non ci sono sconti iniziali, applica lo stesso sconto a tutti i prodotti
        return prevCart.map(item => ({
          ...item,
          discount: Math.round(targetTotalDiscount * 1000) / 1000
        }));
      } else {
        // Se ci sono sconti iniziali, mantieni le proporzioni
        const initialDiscounts = prevCart.map(item => ({
          ...item,
          initialDiscount: item.discount
        }));

        // Ordina i prodotti per sconto decrescente
        const sortedItems = [...initialDiscounts].sort((a, b) => b.initialDiscount - a.initialDiscount);

        // Calcola il fattore di scala per gli sconti
        const currentTotalDiscount = prevCart.reduce((sum, item) => {
          const itemPrice = parseFloat(item.retail_price) * item.quantity;
          return sum + (itemPrice * (item.discount / 100));
        }, 0);

        const targetDiscountAmount = totalPrice - validNewTotal;
        const scaleFactor = targetDiscountAmount / currentTotalDiscount;

        // Applica il nuovo sconto mantenendo le proporzioni
        sortedItems.forEach(item => {
          if (item.initialDiscount > 0) {
            item.discount = Math.min(100, Math.round(item.initialDiscount * scaleFactor * 1000) / 1000);
          } else {
            item.discount = 0;
          }
        });

        // Se c'è ancora differenza da compensare e alcuni prodotti hanno raggiunto il 100%,
        // distribuisci la differenza sui prodotti rimanenti
        let remainingDifference = totalPrice - validNewTotal - sortedItems.reduce((sum, item) => {
          const itemPrice = parseFloat(item.retail_price) * item.quantity;
          return sum + (itemPrice * (item.discount / 100));
        }, 0);

        while (Math.abs(remainingDifference) > 0.01) {
          // Trova i prodotti che non sono ancora al 100% di sconto
          const availableItems = sortedItems.filter(item => item.discount < 100)
            .sort((a, b) => b.initialDiscount - a.initialDiscount);

          if (availableItems.length === 0) break;

          // Prendi il prodotto con lo sconto più alto tra quelli disponibili
          const item = availableItems[0];
          const itemPrice = parseFloat(item.retail_price) * item.quantity;
          const maxAdditionalDiscount = 100 - item.discount;
          const requiredDiscount = Math.min(
            maxAdditionalDiscount,
            (remainingDifference / itemPrice) * 100
          );

          item.discount = Math.min(100, Math.round((item.discount + requiredDiscount) * 1000) / 1000);
          remainingDifference -= (itemPrice * (requiredDiscount / 100));
        }

        // Riordina gli items nell'ordine originale e restituisci il risultato
        const updatedCart = prevCart.map(originalItem => {
          const updatedItem = sortedItems.find(item => item.id === originalItem.id);
          return {
            ...originalItem,
            discount: updatedItem?.discount || 0
          };
        });

        return updatedCart;
      }
    });
  };

  // Query per ottenere gli ordini parzialmente pagati
  const { data: partialOrders = [], isLoading: isLoadingPartialOrders } = useQuery<Order[]>({
    queryKey: ['partialOrders', selectedPuntoVendita?.id, reservationSearchTerm],
    queryFn: async () => {
      if (!selectedPuntoVendita) return [];
      
      try {
        const searchParam = reservationSearchTerm ? `?search=${encodeURIComponent(reservationSearchTerm)}` : '';
        const response = await fetch(`${server}/api/orders/partial-payments/${selectedPuntoVendita.id}${searchParam}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch partial orders');
        }
        
        return response.json();
      } catch (error) {
        console.error('Error in partial orders query:', error);
        throw error;
      }
    },
    enabled: !!selectedPuntoVendita && isReservationsDialogOpen,
    refetchInterval: isReservationsDialogOpen ? 5000 : false
  });

  // Funzione per calcolare il totale rimanente da pagare
  const calculateRemainingAmount = (order: Order) => {
    const totalPaid = order.order_payments.reduce((sum, payment) => sum + payment.amount, 0);
    return parseFloat(order.final_total) - totalPaid;
  };

  // Funzione per caricare un ordine nel carrello
  const loadOrderInCart = async (order: Order) => {
    console.log('Loading order:', order);
    
    if (cart.length > 0) {
      setIsCartShaking(true);
      setTimeout(() => setIsCartShaking(false), 820);
      toast({
        title: "Carrello non vuoto",
        description: "Svuota il carrello prima di caricare una prenotazione.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Recupera i dettagli dell'ordine con i prodotti
      const response = await fetch(`http://localhost:3003/api/order-items/order/${order.id}`);
      if (!response.ok) throw new Error('Failed to fetch order items');
      const orderItems = await response.json();
      console.log('Order items:', orderItems);

      // Converti gli items in formato CartItem
      const cartItems: CartItem[] = orderItems.map((item: any) => ({
        id: item.product_id,
        article_code: item.product.article_code,
        variant_code: item.product.variant_code,
        size: item.product.size,
        quantity: item.quantity,
        retail_price: item.unit_cost.toString(),
        discount: item.discount,
        total: item.total,
        isFromReservation: true
      }));

      // Imposta i dati
      setCart(cartItems);
      if (order.client) {
        setSelectedClient(order.client.id.toString());
      }
      setCurrentOrderId(order.id);
      setOrderNumber(order.code);
      await fetchPreviousPayments(order.id);
      setIsReservationsDialogOpen(false);

      toast({
        title: "Prenotazione caricata",
        description: "La prenotazione è stata caricata correttamente",
      });

    } catch (error) {
      console.error('Error loading order:', error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento della prenotazione",
        variant: "destructive",
      });
    }
  };

  // Nuova funzione per gestire il pagamento delle prenotazioni
  const handleReservationPayment = async () => {
    if (!currentOrderId) {
      console.log('Nessun ordine corrente');
      toast({
        title: "Errore",
        description: "ID ordine non valido",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Inizio handleReservationPayment per ordine:', currentOrderId);
      
      // Recupera l'ordine con i pagamenti
      const orderResponse = await fetch(`http://localhost:3003/api/orders/${currentOrderId}`);
      if (!orderResponse.ok) throw new Error('Errore nel recupero dell\'ordine');
      const order = await orderResponse.json();
      console.log('Ordine recuperato:', order);

      // Recupera i pagamenti precedenti
      const paymentsResponse = await fetch(`http://localhost:3003/api/order-payments/order/${currentOrderId}`);
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
            status_id: 4  // 4 = saldato
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
            status_id: 1
          };

          const paymentResponse = await fetch('http://localhost:3003/api/order-payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
          });

          if (!paymentResponse.ok) throw new Error('Errore nel salvataggio dei pagamenti');
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
  };

  // Funzione per formattare l'acconto in modo sicuro
  const formatDeposit = (value: any): string => {
    const amount = Number(value || 0);
    return isNaN(amount) ? "0.00" : amount.toFixed(2);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + parseFloat(item.retail_price) * item.quantity, 0)
  }

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
              <Button variant="default" className="bg-[#2C2C2C] hover:bg-[#3C3C3C] text-white">
                <Sneaker className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                className="text-gray-400 hover:text-white hover:bg-[#2C2C2C] w-10 h-10 p-0"
                title="Resi"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                className="text-gray-400 hover:text-white hover:bg-[#2C2C2C] w-10 h-10 p-0"
                title="Prenotazioni"
                onClick={() => setIsReservationsDialogOpen(true)}
              >
                <Clock className="h-4 w-4" />
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
                  />
                </div>
              
                <div className="flex items-center justify-center col-span-3">
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#1E1E1E] hover:bg-[#2C2C2C] text-white w-full flex items-center justify-center gap-2">
                      <Shirt className="h-4 w-4" />
                      Cerca prodotto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-screen overflow-hidden flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Prodotti</DialogTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        <Switch
                          checked={showOnlyAvailable}
                          onCheckedChange={setShowOnlyAvailable}
                          id="available-switch"
                        />
                        <Label htmlFor="available-switch">Solo prodotti disponibili</Label>
                      </div>
                    </DialogHeader>
                    <div className="flex-grow overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky top-0 bg-white">Codice Articolo</TableHead>
                            <TableHead className="sticky top-0 bg-white">Codice Variante</TableHead>
                            <TableHead className="sticky top-0 bg-white">Taglia</TableHead>
                            <TableHead className="sticky top-0 bg-white">Quantità Disponibile</TableHead>
                            <TableHead className="sticky top-0 bg-white">Prezzo al Dettaglio</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((product) => (
                            <TableRow key={product.id} onClick={() => { addToCart(product); setIsProductDialogOpen(false); }} className="cursor-pointer hover:bg-gray-100">
                              <TableCell className="flex items-center gap-2">
                                {product.article_code} - {product.variant_code}
                                {product.quantity === 0 && (
                                  <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded font-medium">
                                    ESAURITO
                                  </span>
                                )}
                                {product.quantity > 0 && product.quantity < 4 && (
                                  <span className="bg-yellow-100 text-yellow-600 text-[11px] px-1.5 py-0.5 rounded">
                                    BASSA
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{product.variant_code}</TableCell>
                              <TableCell>{product.size}</TableCell>
                              <TableCell className={product.quantity === 0 ? 'text-red-500' : ''}>{product.quantity}</TableCell>
                              <TableCell>{product.retail_price} €</TableCell>
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
                        const isOverQuantity = !item.isFromReservation && item.quantity > (productsData.find(p => p.id === item.id)?.quantity || 0);
                        return (
                          <TableRow 
                            key={item.id} 
                            id={`cart-row-${item.id}`}
                            className={`${isOverQuantity ? 'bg-red-50' : ''} ${shakingRows[item.id] ? 'shake-slow' : ''}`}
                          >
                            <TableCell className="flex items-center">
                              <div className="w-8 h-8 bg-gray-200 rounded mr-2"></div>
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
                              <Input
                                type="number"
                                value={item.discount}
                                onChange={(e) => updateDiscount(item.id, Number(e.target.value))}
                                className="w-16"
                                step="1"
                                min="0"
                                max="100"
                                disabled={item.isFromReservation}
                              />
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
                                        updateProductDiscount(item.id, parseFloat(editedProductPrice))
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
                                        updateRowDiscount(item.id, parseFloat(editedRowTotal))
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
                                    setEditingRowTotal(item.id)
                                    setEditedRowTotal((parseFloat(item.retail_price) * item.quantity * (1 - item.discount / 100)).toFixed(2))
                                    }
                                  }}
                                >
                                  {(parseFloat(item.retail_price) * item.quantity * (1 - item.discount / 100)).toFixed(2)} €
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 w-8 rounded-full" 
                                  onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                                  disabled={item.isFromReservation}
                                >
                                  -
                                </Button>
                                <span className={`mx-2 w-8 text-center ${
                                  !item.isFromReservation && item.quantity > (productsData.find(p => p.id === item.id)?.quantity || 0) 
                                    ? 'text-red-500 font-bold' 
                                    : ''
                                }`}>
                                  {item.quantity}
                                </span>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 w-8 rounded-full" 
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  disabled={item.isFromReservation}
                                >
                                  +
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  className="ml-2 h-8 w-8 rounded-full" 
                                  onClick={() => removeFromCart(item.id)}
                                  disabled={item.isFromReservation}
                                >
                                  X
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
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
                    <p className={`text-xl font-semibold ${totalDiscount > 0 ? 'line-through text-red-500' : ''}`}>
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
        
        <aside className="w-96 bg-white border-l">
          <Card className="border-0 rounded-none h-full flex flex-col">
            <CardHeader className="pb-1 px-6 pt-4 border-b">
              <CardTitle className="flex flex-col">
                <Select value={selectedOperator} onValueChange={handleOperatorChange}>
                  <SelectTrigger className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md mb-2 font-medium">
                    <SelectValue>
                      {operators.find(op => op.id.toString() === selectedOperator)?.nome} {operators.find(op => op.id.toString() === selectedOperator)?.cognome} ({operators.find(op => op.id.toString() === selectedOperator)?.code})
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op.id} value={op.id.toString()}>
                        {op.nome} {op.cognome} ({op.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex justify-between items-center">
                  <span>{orderNumber || 'CASSA 1'}</span>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </Button>
                </div>
                <span className="text-sm text-gray-500 font-normal">
                  {orderDate.toLocaleDateString('it-IT', { 
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow px-6 py-3 space-y-3">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Acconti</span>
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <Input 
                        className="w-32 text-right bg-gray-50 pr-6" 
                        value={formatDeposit(deposit)}
                        readOnly 
                        placeholder="0.00"
                      />
                      <span className="absolute right-2 text-gray-500">€</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Buono sconto</span>
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <Input 
                        className="w-32 text-right bg-gray-50 pr-6" 
                        value={voucher.toFixed(2)} 
                        readOnly
                        placeholder="0.00"
                      />
                      <span className="absolute right-2 text-gray-500">€</span>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {totalPreviousPayments > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Pagato precedentemente</span>
                    <span className="text-green-600 font-semibold text-lg">{Number(totalPreviousPayments).toFixed(2)} €</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 -mx-6 px-6 py-2">
                <p className="text-sm font-medium text-gray-600 mb-1">Totale da pagare</p>
                <p className="text-3xl font-bold text-[#EF4444]">
                  {totalToPay.toFixed(2)} €
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Modalità pagamento</p>
                  <div className="flex gap-2 mb-2">
                    {paymentMethodsData.map((method: PaymentMethod) => {
                      console.log('Rendering method:', method); // Debug per vedere ogni metodo
                      return (
                        <Button
                          key={method.id}
                          variant={selectedPaymentTypes.includes(method.code) ? 'default' : 'outline'}
                          onClick={() => handlePaymentTypeChange(method.code)}
                          disabled={cart.length === 0 || (selectedPaymentTypes.length >= 2 && !selectedPaymentTypes.includes(method.code))}
                          className="h-10 w-10 p-0 relative group"
                        >
                          {method.icon === 'Euro' && <Euro className="h-4 w-4" />}
                          {method.icon === 'CreditCard' && <CreditCard className="h-4 w-4" />}
                          {method.icon === 'FileText' && <FileText className="h-4 w-4" />}
                          {method.icon === 'Wallet' && <Wallet className="h-4 w-4" />}
                          {method.icon === 'Link2' && <Link2 className="h-4 w-4" />}
                          {method.icon === 'Banknote' && <Banknote className="h-4 w-4" />}
                          {method.icon === 'QrCode' && <QrCode className="h-4 w-4" />}
                          {method.icon === 'Smartphone' && <Smartphone className="h-4 w-4" />}
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {method.name}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                  
                  <div className="space-y-2">
                    {selectedPaymentTypes.map((code) => {
                      const paymentMethod = paymentMethodsData.find((pm: PaymentMethod) => pm.code === code);
                      const value = paymentAmounts[code] || 0;
                      const [intPart, decPart] = value.toFixed(2).split('.');
                      
                      return (
                        <div key={code} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">{paymentMethod?.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex relative w-40">
                              <div className="flex h-10 bg-white rounded-md border overflow-hidden">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={intPart}
                                  onChange={(e) => handlePaymentAmountChange(code, false, e.target.value)}
                                  className="w-[70%] text-right focus:outline-none px-3 h-full text-base font-medium"
                                  placeholder="0"
                                />
                                <span className="text-gray-400 flex items-center text-base font-medium">,</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={decPart}
                                  onChange={(e) => handlePaymentAmountChange(code, true, e.target.value)}
                                  className="w-[30%] focus:outline-none px-1 h-full text-base font-medium"
                                  placeholder="00"
                                />
                              </div>
                            </div>
                            <span className="text-lg font-medium text-gray-600">€</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600 mb-2">Totale pagamento</span>
                    <span className="font-bold text-lg">
                      {totalSelected.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-600">
                      {totalSelected > remainingToPay ? 'Resto da dare' : 'Resto da pagare'}
                    </span>
                    <span className={`font-bold text-lg ${Math.abs(totalSelected - remainingToPay) === 0 ? 'text-gray-400' : totalSelected > remainingToPay ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(totalSelected - remainingToPay).toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Documento</p>
                <div className="flex gap-2">
                  {documentTypes.map((type) => (
                    <Button
                      key={type.id}
                      variant={selectedDocumentType === type.id ? 'default' : 'outline'}
                      onClick={() => setSelectedDocumentType(type.id)}
                      disabled={cart.length === 0}
                      className="flex-1 h-10"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {type.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>

            <CardFooter className="mt-auto px-6 pb-4 pt-2 border-t grid grid-cols-4 gap-3">
              <div className="col-span-4">
                {!cart.some(item => item.isFromReservation) && hasInsufficientStock() && (
                  <div className="bg-red-50 text-red-600 p-2 rounded mb-2 text-sm text-center">
                    Controlla le quantità nel carrello. Alcuni prodotti superano la disponibilità.
                  </div>
                )}
              </div>
              <Button 
                className="col-span-2 bg-[#22C55E] hover:bg-[#16A34A] text-white font-medium"
                onClick={handleConfirmClick}
                disabled={cart.length === 0 || totalSelected === 0 || (!cart.some(item => item.isFromReservation) && hasInsufficientStock())}
              >
                {isPartialPayment ? 'Conferma Acconto' : 'Conferma'}
              </Button>
              <Button 
                variant="outline" 
                className="text-[#EF4444] border-[#EF4444] hover:bg-red-50 font-medium" 
                onClick={handleResetClick}
                disabled={cart.length === 0}
              >
                Annulla
              </Button>
              <Button 
                variant="outline" 
                className="text-gray-600 font-medium" 
                onClick={handleFreezeOperation}
                disabled={cart.length === 0}
              >
                Congela
              </Button>
            </CardFooter>
          </Card>
        </aside>
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

      {/* Dialog delle prenotazioni */}
      <Dialog open={isReservationsDialogOpen} onOpenChange={setIsReservationsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Prenotazioni</DialogTitle>
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
                  <TableHead></TableHead>
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
                      Nessuna prenotazione trovata
                    </TableCell>
                  </TableRow>
                ) : (
                  partialOrders.map((order) => {
                    const totalPaid = order.order_payments.reduce((sum, payment) => sum + payment.amount, 0);
                    const remainingAmount = calculateRemainingAmount(order);
                    
                    return (
                      <TableRow 
                        key={order.id} 
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={async () => {
                          if (cart.length > 0) {
                            toast({
                              title: "Carrello non vuoto",
                              description: "Svuota il carrello prima di caricare una prenotazione.",
                              variant: "destructive",
                            });
                            return;
                          }

                          try {
                            const response = await fetch(`http://localhost:3003/api/order-items/order/${order.id}`);
                            if (!response.ok) throw new Error('Failed to fetch order items');
                            const data = await response.json();
                            
                            // Assicuriamoci che orderItems sia un array
                            const orderItems = Array.isArray(data) ? data : data.items || [];
                            
                            const cartItems = orderItems.map((item: any) => ({
                              id: item.product_id,
                              article_code: item.article_code,
                              variant_code: item.variant_code,
                              size: item.size || '',
                              quantity: item.quantity,
                              retail_price: item.unit_cost.toString(),
                              discount: item.discount,
                              total: item.total,
                              isFromReservation: true
                            }));

                            setCart(cartItems);
                            if (order.client) {
                              setSelectedClient(order.client.id.toString());
                            }
                            setCurrentOrderId(order.id);
                            setOrderNumber(order.code);
                            
                            // Recupera i pagamenti precedenti
                            const paymentsResponse = await fetch(`http://localhost:3003/api/order-payments/order/${order.id}`);
                            if (!paymentsResponse.ok) throw new Error('Failed to fetch payments');
                            const payments = await paymentsResponse.json();
                            setPreviousPayments(payments);
                            
                            // Calcola il totale degli acconti
                            const totalAcconti = payments.reduce((sum: number, payment: OrderPayment) => sum + payment.amount, 0);
                            setDeposit(totalAcconti);
                            
                            setIsReservationsDialogOpen(false);
                            
                            toast({
                              title: "Prenotazione caricata",
                              description: "La prenotazione è stata caricata correttamente",
                            });
                          } catch (error) {
                            console.error('Error loading order:', error);
                            toast({
                              title: "Errore",
                              description: "Errore nel caricamento della prenotazione",
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
                        <TableCell>{parseFloat(order.final_total).toFixed(2)} €</TableCell>
                        <TableCell className="text-green-600">{totalPaid.toFixed(2)} €</TableCell>
                        <TableCell className="text-red-600 font-medium">{remainingAmount.toFixed(2)} €</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Qui puoi aggiungere la logica per visualizzare i dettagli
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
    </div>
  )
}