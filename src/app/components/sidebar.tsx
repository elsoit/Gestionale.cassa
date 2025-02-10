'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { 
  CreditCard, 
  Package, 
  Boxes, 
  Settings, 
  Table,
  Store,
  Receipt,
  Building2,
  LogOut,
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Users,
  Tag,
  Menu,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userAccess, setUserAccess] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Recupera il tipo di accesso dal localStorage
    const access = localStorage.getItem('userAccess');
    setUserAccess(access || '');

    // Controlla se il dispositivo è mobile
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleLogout = () => {
    // Rimuovi token e user da localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userAccess');
    
    // Rimuovi il cookie del token
    Cookies.remove('token');
    
    // Reindirizza alla pagina di login
    router.push('/login');
  };

  // Menu completo
  const fullNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Cassa', href: '/cassa', icon: ShoppingCart },
    { name: 'Prodotti', href: '/products', icon: Package },
    { name: 'Listini', href: '/listini', icon: Tag },
    { name: 'Carichi', href: '/loads', icon: Truck },
    { name: 'Punti Vendita', href: '/punti-vendita', icon: Store },
    { name: 'Utenti', href: '/users', icon: Users },
    { name: 'Bulk', href: '/bulk', icon: Boxes },
    { name: 'Params', href: '/params', icon: Settings },
    { name: 'Etichette', href: '/etichette', icon: Table },
  ];

  // Menu limitato per store operator
  const limitedNavigation = [
    { name: 'Cassa', href: '/cassa', icon: ShoppingCart },
    { name: 'Prodotti', href: '/products', icon: Package },
    { name: 'Carichi', href: '/loads', icon: Truck },
    { name: 'Etichette', href: '/etichette', icon: Table },
  ];

  // Seleziona il menu appropriato in base al tipo di accesso
  const navigation = userAccess === 'limited' ? limitedNavigation : fullNavigation;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed top-3 left-3 z-50 bg-white shadow-md rounded-full h-10 w-10"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[250px] p-0">
          <div className="flex flex-col h-full">
            <div className="flex-1 py-4">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-4 px-4 py-2 h-12",
                      isActive && "bg-muted"
                    )}
                    onClick={() => {
                      router.push(item.href);
                      setIsOpen(false);
                    }}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="ghost"
              className="w-full justify-start gap-4 px-4 py-2 h-12 text-red-500 hover:text-red-700 hover:bg-red-100/50"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              <span>Esci</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="flex h-full w-14 flex-col fixed left-0 top-0 bottom-0 bg-background border-r">
      <div className="flex flex-col flex-1 gap-y-2 pt-3">
        <TooltipProvider delayDuration={0}>
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="icon"
                    className={cn(
                      "h-12 w-14 rounded-none",
                      isActive && "bg-muted"
                    )}
                    asChild
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          })}

          <div className="flex-grow" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-14 rounded-none mt-auto text-red-500 hover:text-red-700 hover:bg-red-100/50"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Esci
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
} 