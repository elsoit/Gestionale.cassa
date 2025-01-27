'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Operator {
  id: number
  code: string
  nome: string
  cognome: string
}

interface User {
  id?: number
  nome: string
  cognome: string
  email: string
  password?: string
  telefono?: string
  attivo: boolean
  operator_id?: number | null
}

export default function UserPage() {
  const params = useParams()
  const router = useRouter()
  const isNew = params.id === 'nuovo'
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<User>({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    telefono: '',
    attivo: true,
    operator_id: null
  })

  // Fetch operators
  const { data: operators = [] } = useQuery<Operator[]>({
    queryKey: ['operators'],
    queryFn: async () => {
      const response = await fetch(`${process.env.API_URL}/api/operators/select`)
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json()
    }
  })

  // Fetch user se in modalità modifica
  const { data, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user', params.id],
    queryFn: async () => {
      if (isNew) return null
      const response = await fetch(`${process.env.API_URL}/api/users/${params.id}`)
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json()
    },
    enabled: !isNew
  })

  useEffect(() => {
    if (data) {
      setUser(data)
    }
  }, [data])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const url = isNew 
        ? `${process.env.API_URL}/api/users`
        : `${process.env.API_URL}/api/users/${params.id}`
      
      console.log('Saving user:', user)
      
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      })

      const data = await response.json()
      console.log('API Response:', data)

      if (!response.ok) {
        if (data.code === '23505' && data.constraint === 'users_email_key') {
          throw new Error('Email già utilizzata da un altro utente')
        }
        throw new Error(data.message || 'Errore durante il salvataggio')
      }

      toast.success(isNew ? 'Utente creato con successo' : 'Utente aggiornato con successo')
      router.push('/users')
    } catch (error) {
      console.error('Error details:', error)
      toast.error(`${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUser(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/users">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {isNew ? 'Nuovo Utente' : 'Modifica Utente'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              name="nome"
              value={user.nome}
              onChange={handleChange}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cognome">Cognome</Label>
            <Input
              id="cognome"
              name="cognome"
              value={user.cognome}
              onChange={handleChange}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={user.email}
              onChange={handleChange}
              required
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password {!isNew && '(lascia vuoto per non modificare)'}
            </Label>
            <Input
              type="password"
              id="password"
              name="password"
              value={user.password || ''}
              onChange={handleChange}
              required={isNew}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Telefono</Label>
            <Input
              id="telefono"
              name="telefono"
              value={user.telefono || ''}
              onChange={handleChange}
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label>Stato</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="attivo"
                checked={user.attivo}
                onCheckedChange={(checked) => 
                  setUser(prev => ({ ...prev, attivo: checked }))
                }
              />
              <Label htmlFor="attivo">Attivo</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Operatore Associato</Label>
            <Select
              value={user.operator_id?.toString() || 'null'}
              onValueChange={(value) => 
                setUser(prev => ({
                  ...prev,
                  operator_id: value === 'null' ? null : parseInt(value)
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona operatore" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">Nessuno</SelectItem>
                {operators.map((operator) => (
                  <SelectItem key={operator.id} value={operator.id.toString()}>
                    {operator.cognome} {operator.nome} ({operator.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link href="/users">
            <Button variant="outline" type="button">
              Annulla
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              'Salva'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
} 