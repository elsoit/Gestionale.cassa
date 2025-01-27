'use client'

import React, { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Address {
  id?: number
  name?: string
  address: string
  city: string
  province?: string
  zipcode?: string
  country: string
}

interface AddressFormProps {
  label: string
  address: Address
  onChange: (address: Address) => void
}

export default function AddressForm({ label, address, onChange }: AddressFormProps) {
  const [suggestions, setSuggestions] = useState<Address[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Cerca indirizzi quando l'utente scrive il nome
  const searchAddresses = async (searchTerm: string) => {
    if (!searchTerm) {
      setSuggestions([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`${process.env.API_URL}/api/addresses/search?q=${searchTerm}`)
      if (!response.ok) throw new Error('Network response was not ok')
      const data = await response.json()
      setSuggestions(data)
    } catch (error) {
      console.error('Error searching addresses:', error)
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }

  // Gestisce la selezione di un indirizzo suggerito
  const handleSelectAddress = (selectedAddress: Address) => {
    onChange(selectedAddress)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{label}</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Indirizzo</Label>
          <Input
            id="name"
            name="name"
            value={address?.name || ''}
            onChange={(e) => {
              const newAddress = { ...address, name: e.target.value };
              onChange(newAddress);
            }}
            placeholder="Nome Indirizzo (opzionale)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Indirizzo</Label>
          <Input
            id="address"
            value={address.address}
            onChange={(e) => onChange({ ...address, address: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Città</Label>
          <Input
            id="city"
            value={address.city}
            onChange={(e) => onChange({ ...address, city: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="province">Provincia</Label>
          <Input
            id="province"
            value={address.province || ''}
            onChange={(e) => onChange({ ...address, province: e.target.value.toUpperCase() })}
            maxLength={2}
            className="uppercase"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipcode">CAP</Label>
          <Input
            id="zipcode"
            value={address.zipcode || ''}
            onChange={(e) => onChange({ ...address, zipcode: e.target.value })}
            maxLength={5}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Nazione</Label>
          <Input
            id="country"
            value={address.country}
            onChange={(e) => onChange({ ...address, country: e.target.value })}
            required
            defaultValue="Italia"
          />
        </div>
      </div>
    </div>
  )
} 