'use client'
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

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



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <html lang="en" className = " color-scheme:light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
                <QueryClientProvider client={queryClient}>

        {children}
        </QueryClientProvider>

      </body>
    </html>
  );
}


