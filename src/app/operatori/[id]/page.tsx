'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Loader2 } from 'lucide-react'
import { format, parseISO, parse, isValid } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'
import AddressForm from '../components/AddressForm'

const server = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

interface Address {
  id?: number
  name?: string
  address: string
  city: string
  province?: string
  zipcode?: string
  country: string
}

interface Operatore {
  id?: number
  code: string
  nome: string
  cognome: string
  data_assunzione: string
  codice_fiscale: string
  data_nascita: string
  telefono?: string
  indirizzo_residenza_id?: number
  indirizzo_domicilio_id?: number
}

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

// Funzione per formattare la data in modo sicuro
const formatDateSafe = (date: Date | null, formatStr: string = 'yyyy-MM-dd'): string => {
  if (!date) return ''
  try {
    return format(date, formatStr)
  } catch (e) {
    console.error('Errore nella formattazione della data:', date, e)
    return ''
  }
}

export default function OperatorePage() {
  const params = useParams()
  const router = useRouter()
  const isNew = params.id === 'nuovo'
  const [isLoading, setIsLoading] = useState(false)
  const [operatore, setOperatore] = useState<Operatore>({
    code: '',
    nome: '',
    cognome: '',
    data_assunzione: format(new Date(), 'yyyy-MM-dd'),
    codice_fiscale: '',
    data_nascita: '',
    telefono: '',
  })

  const [indirizzoResidenza, setIndirizzoResidenza] = useState<Address>({
    address: '',
    city: '',
    country: 'Italia'
  })

  const [indirizzoDomicilio, setIndirizzoDomicilio] = useState<Address>({
    address: '',
    city: '',
    country: 'Italia'
  })

  const [copiaDaResidenza, setCopiaDaResidenza] = useState(false)

  const [suggestedAddresses, setSuggestedAddresses] = useState<Address[]>([])

  // Fetch operatore se in modalità modifica
  const { data: operatoreData, isLoading: isLoadingOperatore } = useQuery({
    queryKey: ['operatore', params.id],
    queryFn: async () => {
      if (isNew) return null
      const response = await fetch(`${server}/api/operators/${params.id}`)
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json()
    },
    enabled: !isNew
  })

  // Fetch indirizzi se in modalità modifica
  const { data: indirizzoResidenzaData } = useQuery({
    queryKey: ['indirizzo-residenza', operatoreData?.indirizzo_residenza_id],
    queryFn: async () => {
      if (!operatoreData?.indirizzo_residenza_id) return null
      const response = await fetch(`${server}/api/addresses/${operatoreData.indirizzo_residenza_id}`)
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json()
    },
    enabled: !!operatoreData?.indirizzo_residenza_id
  })

  const { data: indirizzoDomicilioData } = useQuery({
    queryKey: ['indirizzo-domicilio', operatoreData?.indirizzo_domicilio_id],
    queryFn: async () => {
      if (!operatoreData?.indirizzo_domicilio_id) return null
      const response = await fetch(`${server}/api/addresses/${operatoreData.indirizzo_domicilio_id}`)
      if (!response.ok) throw new Error('Network response was not ok')
      return response.json()
    },
    enabled: !!operatoreData?.indirizzo_domicilio_id
  })

  useEffect(() => {
    if (operatoreData) {
      console.log('Data ricevuta dal backend:', {
        data_nascita: operatoreData.data_nascita,
        data_assunzione: operatoreData.data_assunzione
      })

      // Formatta le date nel formato corretto per gli input date
      const formattedOperatore = {
        ...operatoreData,
        data_nascita: formatDateSafe(parseDateSafe(operatoreData.data_nascita)),
        data_assunzione: formatDateSafe(parseDateSafe(operatoreData.data_assunzione)) || format(new Date(), 'yyyy-MM-dd')
      }

      console.log('Date formattate:', {
        data_nascita: formattedOperatore.data_nascita,
        data_assunzione: formattedOperatore.data_assunzione
      })

      setOperatore(formattedOperatore)
    }
  }, [operatoreData])

  useEffect(() => {
    if (indirizzoResidenzaData) {
      setIndirizzoResidenza(indirizzoResidenzaData)
    }
  }, [indirizzoResidenzaData])

  useEffect(() => {
    if (indirizzoDomicilioData) {
      setIndirizzoDomicilio(indirizzoDomicilioData)
    }
  }, [indirizzoDomicilioData])

  useEffect(() => {
    if (copiaDaResidenza) {
      setIndirizzoDomicilio(indirizzoResidenza)
    }
  }, [copiaDaResidenza, indirizzoResidenza])

  // Funzione per normalizzare l'indirizzo (minuscolo e senza spazi)
  const normalizeAddress = (address: Address) => {
    return {
      address: address.address.toLowerCase().replace(/\s+/g, ''),
      city: address.city.toLowerCase().replace(/\s+/g, ''),
      province: address.province?.toLowerCase().replace(/\s+/g, ''),
      zipcode: address.zipcode?.replace(/\s+/g, ''),
      country: address.country.toLowerCase().replace(/\s+/g, '')
    }
  }

  // Cerca indirizzi esistenti quando l'utente scrive
  const searchAddresses = async (searchTerm: string) => {
    if (!searchTerm) {
      setSuggestedAddresses([])
      return
    }

    try {
      const response = await fetch(`${server}/api/addresses/search?q=${searchTerm}`)
      if (!response.ok) throw new Error('Network response was not ok')
      const data = await response.json()
      setSuggestedAddresses(data)
    } catch (error) {
      console.error('Error searching addresses:', error)
      setSuggestedAddresses([])
    }
  }

  // Funzione per salvare un indirizzo
  const saveAddress = async (address: Address): Promise<number> => {
    // Controlla se esiste un indirizzo simile
    const normalizedNew = normalizeAddress(address)
    
    const existingAddress = suggestedAddresses.find(existing => {
      const normalizedExisting = normalizeAddress(existing)
      return normalizedExisting.address === normalizedNew.address &&
             normalizedExisting.city === normalizedNew.city &&
             normalizedExisting.province === normalizedNew.province &&
             normalizedExisting.zipcode === normalizedNew.zipcode &&
             normalizedExisting.country === normalizedNew.country
    })

    if (existingAddress?.id) {
      return existingAddress.id
    }

    // Se non esiste, crea nuovo indirizzo
    const response = await fetch(`${server}/api/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(address)
    })

    if (!response.ok) throw new Error('Errore nel salvare indirizzo')
    const result = await response.json()
    return result.id
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Salva indirizzi
      let residenzaId = undefined
      let domicilioId = undefined

      if (indirizzoResidenza.address && indirizzoResidenza.city) {
        residenzaId = await saveAddress(indirizzoResidenza)
      }

      if (!copiaDaResidenza && indirizzoDomicilio.address && indirizzoDomicilio.city) {
        domicilioId = await saveAddress(indirizzoDomicilio)
      } else if (copiaDaResidenza && residenzaId) {
        domicilioId = residenzaId
      }

      // Formatta le date nel formato ISO per il backend
      const operatoreToSave = {
        ...operatore,
        codice_fiscale: operatore.codice_fiscale.toUpperCase(),
        data_nascita: operatore.data_nascita ? formatDateSafe(parseDateSafe(operatore.data_nascita)) : null,
        data_assunzione: operatore.data_assunzione ? formatDateSafe(parseDateSafe(operatore.data_assunzione)) : null,
        indirizzo_residenza_id: residenzaId,
        indirizzo_domicilio_id: domicilioId
      }

      const url = isNew 
        ? `${server}/api/operators`
        : `${server}/api/operators/${params.id}`

      console.log('----------------------')
      console.log('DATI OPERATORE INVIATI:')
      console.log('----------------------')
      console.log('Operatore originale:', operatore)
      console.log('Operatore da salvare:', operatoreToSave)
      console.log('Metodo:', isNew ? 'POST' : 'PUT')
      console.log('URL:', url)
      console.log('----------------------')
      
      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operatoreToSave)
      })

      const data = await response.json()
      console.log('API Response:', data)

      if (!response.ok) {
        throw new Error(data.message || 'Errore durante il salvataggio')
      }

      toast.success(isNew ? 'Operatore creato con successo' : 'Operatore aggiornato con successo')
      router.push('/operatori')
    } catch (error) {
      console.error('Error details:', error)
      toast.error(`${error instanceof Error ? error.message : 'Errore sconosciuto'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setOperatore(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/operatori">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          {isNew ? 'Nuovo Operatore' : 'Modifica Operatore'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-8 bg-white p-6 rounded-lg shadow">
        {/* Dati Anagrafici */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Dati Anagrafici</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Codice</Label>
              <Input
                id="code"
                name="code"
                value={operatore.code}
                onChange={handleChange}
                required
                maxLength={12}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codice_fiscale">Codice Fiscale</Label>
              <Input
                id="codice_fiscale"
                name="codice_fiscale"
                value={operatore.codice_fiscale}
                onChange={handleChange}
                required
                maxLength={16}
                className="uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cognome">Cognome</Label>
              <Input
                id="cognome"
                name="cognome"
                value={operatore.cognome}
                onChange={handleChange}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                value={operatore.nome}
                onChange={handleChange}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_nascita">Data di Nascita</Label>
              <Input
                type="date"
                id="data_nascita"
                name="data_nascita"
                value={operatore.data_nascita}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_assunzione">Data Assunzione</Label>
              <Input
                type="date"
                id="data_assunzione"
                name="data_assunzione"
                value={operatore.data_assunzione}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Telefono</Label>
              <Input
                id="telefono"
                name="telefono"
                value={operatore.telefono || ''}
                onChange={handleChange}
                maxLength={20}
              />
            </div>
          </div>
        </div>

        {/* Indirizzo Residenza */}
        <div>
          <AddressForm 
            label="Indirizzo di Residenza"
            address={indirizzoResidenza}
            onChange={setIndirizzoResidenza}
          />
        </div>

        {/* Indirizzo Domicilio */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Checkbox 
              id="copia-residenza"
              checked={copiaDaResidenza}
              onCheckedChange={(checked) => setCopiaDaResidenza(checked as boolean)}
            />
            <label 
              htmlFor="copia-residenza"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Domicilio coincide con la residenza
            </label>
          </div>

          {!copiaDaResidenza && (
            <AddressForm 
              label="Indirizzo di Domicilio"
              address={indirizzoDomicilio}
              onChange={setIndirizzoDomicilio}
            />
          )}
        </div>

        <div className="flex justify-end gap-4">
          <Link href="/operatori">
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