'use client'

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Option {
  value: string | number
  label: string
}

interface SelectWithNullOptionProps {
  options: Option[]
  value: string | number | null
  onValueChange: (value: string | number | null) => void
  placeholder: string
  label: string
  nullOptionLabel: string
}

export function SelectWithNullOption({
  options,
  value,
  onValueChange,
  placeholder,
  label,
  nullOptionLabel
}: SelectWithNullOptionProps) {
  const handleValueChange = (newValue: string) => {
    if (newValue === 'null') {
      onValueChange(null)
    } else {
      onValueChange(newValue)
    }
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <Select value={value?.toString() ?? 'null'} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="null">{nullOptionLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}