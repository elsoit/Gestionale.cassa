'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CreditCard, Package, Boxes, Settings, Table } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Cassa', href: '/cassa', icon: CreditCard },
    { name: 'Loads', href: '/loads', icon: Package },
    { name: 'Bulk', href: '/bulk', icon: Boxes },
    { name: 'Params', href: '/params', icon: Settings },
    { name: 'Table', href: '/table', icon: Table },
  ];

  return (
    <div className="flex h-full w-16 flex-col fixed left-0 top-0 bottom-0 bg-gray-900">
      <div className="flex flex-col flex-1 gap-y-4 pt-5">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-center p-3 text-sm font-semibold ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              title={item.name}
            >
              <item.icon className="h-6 w-6" />
            </Link>
          );
        })}
      </div>
    </div>
  );
} 