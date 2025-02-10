'use client'
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "./components/sidebar";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { usePathname } from 'next/navigation'
import { Toaster as SonnerToaster } from 'sonner'
import { cn } from "@/lib/utils"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Pagine pubbliche che non richiedono la sidebar
const publicPages = ['/login', '/reset-password']

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient())
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Controlla se esiste il token nei cookies
    const token = document.cookie.includes('token=')
    setIsAuthenticated(token)

    // Controlla se il dispositivo è mobile
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [pathname])

  const showSidebar = !publicPages.includes(pathname) && isAuthenticated

  return (
    <html lang="en" data-color-scheme="light">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryClientProvider client={queryClient}>
          {showSidebar && <Sidebar />}
          <main className={cn(
            "min-h-screen transition-all duration-300",
            showSidebar && !isMobile ? "pl-14" : "pl-0",
            isMobile ? "pt-16" : "pt-0"
          )}>
            {children}
          </main>
        </QueryClientProvider>
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </body>
    </html>
  );
}


