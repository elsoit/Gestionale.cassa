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

  useEffect(() => {
    // Controlla se esiste il token nei cookies
    const token = document.cookie.includes('token=')
    setIsAuthenticated(token)
  }, [pathname])

  const showSidebar = !publicPages.includes(pathname) && isAuthenticated

  return (
    <html lang="en" data-color-scheme="light">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryClientProvider client={queryClient}>
          {showSidebar && <Sidebar />}
          <main className={showSidebar ? "pl-16" : ""}>
            {children}
          </main>
        </QueryClientProvider>
        <Toaster />
        <SonnerToaster richColors position="top-right" />
      </body>
    </html>
  );
}


