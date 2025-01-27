'use client'

import React from 'react'
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
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Operator {
  id: number
  code: string
  nome: string
  cognome: string
}

interface User {
  id: number
  nome: string
  cognome: string
  email: string
  telefono?: string
  attivo: boolean
  operator?: Operator
}

export default function UsersPage() {
  // Fetch users
  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch(`${process.env.API_URL}/api/users`)
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json()
    }
  })

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestione Utenti</h1>
        <Link href="/users/nuovo">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuovo Utente
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cognome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefono</TableHead>
              <TableHead>Operatore</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user: User) => (
              <TableRow key={user.id}>
                <TableCell>{user.nome}</TableCell>
                <TableCell>{user.cognome}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.telefono || '-'}</TableCell>
                <TableCell>
                  {user.operator ? `${user.operator.cognome} ${user.operator.nome} (${user.operator.code})` : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={user.attivo ? "default" : "destructive"}>
                    {user.attivo ? 'Attivo' : 'Inattivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/users/${user.id}`}>
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
            {users.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-4">
                  Nessun utente trovato
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 