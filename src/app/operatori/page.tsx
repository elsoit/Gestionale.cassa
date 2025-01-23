'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { format, parseISO, parse, isValid } from 'date-fns'
import { it } from 'date-fns/locale'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'

const server = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

// Funzione per gestire in modo sicuro il parsing delle date
const parseDateSafe = (dateString: string | null): Date | null => {
  if (!dateString || dateString === 'null') return null
  
  try {
    // Prima prova con parseISO per date in formato ISO
    const isoDate = parseISO(dateString)
    if (isValid(isoDate)) return isoDate

    // Prova con il formato dd/MM/yyyy
    const italianDate = parse(dateString, 'dd/MM/yyyy', new Date())
    if (isValid(italianDate)) return italianDate

    // Se nessun formato funziona, ritorna null
    console.error('Formato data non valido:', dateString)
    return null
  } catch (e) {
    console.error('Errore nel parsing della data:', dateString, e)
    return null
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  
  const parsedDate = parseDateSafe(dateString)
  if (!parsedDate) return '-'
  
  try {
    return format(parsedDate, 'dd/MM/yyyy', { locale: it })
  } catch (e) {
    console.error('Errore formato data:', dateString)
    return '-'
  }
}

export default function OperatoriPage() {
  // Fetch operatori
  const { data: operatori = [], isLoading, error } = useQuery({
    queryKey: ['operatori'],
    queryFn: async () => {
      const response = await fetch(`${server}/api/operators`
        
      )
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json()
    }
  })

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestione Operatori</h1>
        <Link href="/operatori/nuovo">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuovo Operatore
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codice</TableHead>
              <TableHead>Cognome</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Data Assunzione</TableHead>
              <TableHead>Codice Fiscale</TableHead>
              <TableHead>Telefono</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operatori.map((operatore: any) => (
              <TableRow key={operatore.id}>
                <TableCell className="font-medium">{operatore.code}</TableCell>
                <TableCell>{operatore.cognome}</TableCell>
                <TableCell>{operatore.nome}</TableCell>
                <TableCell>
                  {formatDate(operatore.data_assunzione)}
                </TableCell>
                <TableCell>{operatore.codice_fiscale}</TableCell>
                <TableCell>{operatore.telefono || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/operatori/${operatore.id}`}>
                      <Button variant="outline" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {operatori.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-4">
                  Nessun operatore trovato
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 