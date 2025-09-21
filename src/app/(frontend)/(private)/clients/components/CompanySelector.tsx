'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import {
  IconBuilding,
  IconPlus,
  IconAlertCircle,
  IconLoader2,
  IconCheck,
  IconX,
} from '@tabler/icons-react'
import { getCompaniesAction } from '@/actions/companies'
import type { Company } from '@/payload-types'
import { CreateCompanyDialog } from './CreateCompanyDialog'

interface CompanySelectorProps {
  value?: string | Company | null
  onValueChange: (company: Company | null) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  label?: string
  className?: string
}

/**
 * Selector de empresas con autocompletado y opción de crear nueva
 *
 * Funcionalidades:
 * - Lista todas las empresas disponibles
 * - Búsqueda/filtrado en tiempo real
 * - Opción de crear nueva empresa
 * - Soporte para empresa como string o objeto
 * - Validación integrada
 */
export function CompanySelector({
  value,
  onValueChange,
  placeholder = 'Seleccionar empresa...',
  disabled = false,
  required = false,
  error,
  label = 'Empresa',
  className = '',
}: CompanySelectorProps) {
  const t = useTranslations('clients.companySelector')

  // Estados
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Valor seleccionado actual
  const selectedCompany = useMemo(() => {
    if (!value) return null

    // Si es un objeto Company, usarlo directamente
    if (typeof value === 'object' && value.id) {
      return value
    }

    // Si es string, buscar en la lista de empresas
    if (typeof value === 'string') {
      return companies.find((company) => company.id === value || company.name === value) || null
    }

    return null
  }, [value, companies])

  // Convertir empresas a opciones del combobox
  const companyOptions: ComboboxOption[] = useMemo(() => {
    return companies.map((company) => ({
      value: company.id,
      label: company.name,
      searchLabel: `${company.name} ${company.code || ''} ${company.cif}`, // Para búsqueda por nombre, código y CIF
    }))
  }, [companies])

  // Cargar empresas al montar el componente
  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const result = await getCompaniesAction()

      if (result.success && result.data) {
        setCompanies(result.data)
      } else {
        setLoadError(result.message || 'Error al cargar empresas')
      }
    } catch (error) {
      console.error('Error loading companies:', error)
      setLoadError('Error interno al cargar empresas')
    } finally {
      setIsLoading(false)
    }
  }

  // Handler para selección de empresa
  const handleSelectCompany = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId)
    onValueChange(company || null)
  }

  // Handler para limpiar selección
  const handleClearSelection = () => {
    onValueChange(null)
  }

  // Valor actual para el combobox
  const currentValue = selectedCompany?.id || ''

  // Handler para crear nueva empresa exitosa
  const handleCompanyCreated = (newCompany: Company) => {
    setCompanies((prev) => [...prev, newCompany].sort((a, b) => a.name.localeCompare(b.name)))
    onValueChange(newCompany)
  }

  // Mostrar loading state
  if (isLoading && companies.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <Label className='flex items-center gap-1'>
            {label}
            {required && <span className='text-destructive'>*</span>}
          </Label>
        )}
        <div className='flex items-center justify-center h-10 border border-input rounded-md bg-muted'>
          <IconLoader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          <span className='ml-2 text-sm text-muted-foreground'>{t('loading')}</span>
        </div>
      </div>
    )
  }

  // Mostrar error de carga
  if (loadError) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <Label className='flex items-center gap-1'>
            {label}
            {required && <span className='text-destructive'>*</span>}
          </Label>
        )}
        <Alert variant='destructive'>
          <IconAlertCircle className='h-4 w-4' />
          <AlertDescription className='flex items-center justify-between'>
            <span>{loadError}</span>
            <Button size='sm' variant='outline' onClick={loadCompanies}>
              {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <Label className='flex items-center gap-1'>
          <IconBuilding className='h-4 w-4' />
          {label}
          {required && <span className='text-destructive'>*</span>}
        </Label>
      )}

      {/* Empresa seleccionada - Vista compacta */}
      {selectedCompany && (
        <div className='flex items-center justify-between p-3 border border-input rounded-md bg-muted/50'>
          <div className='flex items-center gap-2'>
            <IconBuilding className='h-4 w-4 text-muted-foreground' />
            <div>
              <p className='text-sm font-medium'>{selectedCompany.name}</p>
              <p className='text-xs text-muted-foreground'>
                {selectedCompany.code && `${selectedCompany.code} • `}CIF: {selectedCompany.cif}
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant='secondary' className='text-xs'>
              <IconCheck className='h-3 w-3 mr-1' />
              {t('selected')}
            </Badge>
            {!disabled && (
              <Button
                size='sm'
                variant='ghost'
                onClick={handleClearSelection}
                className='h-6 w-6 p-0'
              >
                <IconX className='h-3 w-3' />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Combobox de empresas */}
      {!selectedCompany && (
        <Combobox
          options={companyOptions}
          value={currentValue}
          onValueChange={handleSelectCompany}
          placeholder={placeholder}
          searchPlaceholder='Buscar empresa por nombre, código o CIF...'
          emptyText={t('noCompanies')}
          disabled={disabled}
          className={error ? 'border-destructive' : ''}
          footer={
            <Button
              variant='ghost'
              size='sm'
              className='w-full justify-start gap-2 h-10 rounded-none'
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowCreateDialog(true)
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              style={{
                pointerEvents: 'auto',
                position: 'relative',
                zIndex: 10001,
              }}
            >
              <IconPlus className='h-4 w-4' />
              {t('createCompany')}
            </Button>
          }
        />
      )}

      {/* Error */}
      {error && (
        <p className='text-sm text-destructive flex items-center gap-1'>
          <IconAlertCircle className='h-3 w-3' />
          {error}
        </p>
      )}

      {/* Información adicional */}
      {!selectedCompany && !error && (
        <p className='text-xs text-muted-foreground'>{t('selectCompany')}</p>
      )}

      {/* Dialog para crear nueva empresa */}
      <CreateCompanyDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCompanyCreated}
      />
    </div>
  )
}
