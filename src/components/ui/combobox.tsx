'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface ComboboxOption {
  value: string
  label: string
  searchLabel?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  footer?: React.ReactNode
}

export function Combobox({
  options = [],
  value,
  onValueChange,
  placeholder = 'Seleccionar opción...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'No se encontraron resultados',
  disabled = false,
  className,
  footer,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState('')

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options

    return options.filter((option) => {
      const searchIn = option.searchLabel || option.label
      return searchIn.toLowerCase().includes(searchValue.toLowerCase())
    })
  }, [options, searchValue])

  const handleSelect = (selectedValue: string) => {
    console.log('🔴 handleSelect called with:', selectedValue)
    console.log('🔴 Current value:', value)

    if (selectedValue === value) {
      console.log('🔴 Clearing value')
      onValueChange?.('')
    } else {
      console.log('🔴 Setting new value:', selectedValue)
      onValueChange?.(selectedValue)
    }

    console.log('🔴 Closing popover')
    setOpen(false)
    setSearchValue('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          disabled={disabled}
        >
          <span className={cn('truncate', !selectedOption && 'text-muted-foreground')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-full p-0'
        style={{
          width: 'var(--radix-popover-trigger-width)',
          zIndex: 9999,
        }}
        side='bottom'
        sideOffset={4}
        avoidCollisions={true}
        onInteractOutside={(e) => {
          console.log('🔵 Popover onInteractOutside triggered')
          // Solo prevenir si es en el footer
          const target = e.target as Element
          if (target?.closest('[data-footer]')) {
            console.log('🔵 Preventing close because click was in footer')
            e.preventDefault()
          }
        }}
      >
        <Command style={{ pointerEvents: 'auto', position: 'relative', zIndex: 9999 }}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList style={{ pointerEvents: 'auto' }}>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    console.log('🟡 CommandItem onSelect called with:', currentValue)
                    handleSelect(currentValue)
                  }}
                  onMouseEnter={() => {
                    console.log('🟡 CommandItem mouse enter:', option.label)
                  }}
                  onClick={() => {
                    console.log('🟡 CommandItem clicked:', option.label)
                  }}
                  className='cursor-pointer'
                  style={{ pointerEvents: 'auto' }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {footer && (
          <div
            className='border-t border-border bg-popover relative'
            data-footer
            style={{
              pointerEvents: 'auto',
              zIndex: 10000,
              position: 'relative',
            }}
            onPointerDown={(e) => {
              console.log('🟠 Footer onPointerDown')
              e.stopPropagation()
            }}
            onClick={(e) => {
              console.log('🟠 Footer onClick')
              e.stopPropagation()
            }}
          >
            {footer}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
