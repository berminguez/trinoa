'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  IconBuilding, 
  IconPlus, 
  IconSearch, 
  IconAlertCircle, 
  IconLoader2,
  IconCheck,
  IconX
} from '@tabler/icons-react'
import { getCompaniesAction } from '@/actions/companies'
import type { Company } from '@/payload-types'
import { CreateCompanyDialog } from './CreateCompanyDialog'

interface CompanySelectorProps {
  value?: string | Company
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
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
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
      return companies.find(company => 
        company.id === value || 
        company.name === value
      ) || null
    }
    
    return null
  }, [value, companies])

  // Empresas filtradas por búsqueda
  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) return companies
    
    const search = searchTerm.toLowerCase()
    return companies.filter(company =>
      company.name.toLowerCase().includes(search) ||
      company.cif.toLowerCase().includes(search)
    )
  }, [companies, searchTerm])

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
    const company = companies.find(c => c.id === companyId)
    onValueChange(company || null)
    setIsOpen(false)
    setSearchTerm('')
  }

  // Handler para limpiar selección
  const handleClearSelection = () => {
    onValueChange(null)
  }

  // Handler para crear nueva empresa exitosa
  const handleCompanyCreated = (newCompany: Company) => {
    setCompanies(prev => [...prev, newCompany].sort((a, b) => a.name.localeCompare(b.name)))
    onValueChange(newCompany)
    setShowCreateDialog(false)
  }

  // Mostrar loading state
  if (isLoading && companies.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <Label className="flex items-center gap-1">
            {label}
            {required && <span className="text-destructive">*</span>}
          </Label>
        )}
        <div className="flex items-center justify-center h-10 border border-input rounded-md bg-muted">
          <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Cargando empresas...
          </span>
        </div>
      </div>
    )
  }

  // Mostrar error de carga
  if (loadError) {
    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <Label className="flex items-center gap-1">
            {label}
            {required && <span className="text-destructive">*</span>}
          </Label>
        )}
        <Alert variant="destructive">
          <IconAlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{loadError}</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={loadCompanies}
            >
              Reintentar
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
        <Label className="flex items-center gap-1">
          <IconBuilding className="h-4 w-4" />
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      {/* Empresa seleccionada */}
      {selectedCompany && (
        <div className="flex items-center justify-between p-3 border border-input rounded-md bg-muted/50">
          <div className="flex items-center gap-2">
            <IconBuilding className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{selectedCompany.name}</p>
              <p className="text-xs text-muted-foreground">CIF: {selectedCompany.cif}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              <IconCheck className="h-3 w-3 mr-1" />
              Seleccionada
            </Badge>
            {!disabled && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearSelection}
                className="h-6 w-6 p-0"
              >
                <IconX className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Selector */}
      {!selectedCompany && (
        <Select
          open={isOpen}
          onOpenChange={setIsOpen}
          onValueChange={handleSelectCompany}
          disabled={disabled}
        >
          <SelectTrigger className={error ? 'border-destructive' : ''}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="w-full">
            {/* Búsqueda */}
            <div className="flex items-center gap-2 p-2 border-b">
              <IconSearch className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Opción de crear nueva empresa */}
            <div className="p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8"
                onClick={() => {
                  setShowCreateDialog(true)
                  setIsOpen(false)
                }}
              >
                <IconPlus className="h-4 w-4" />
                Crear nueva empresa
              </Button>
            </div>

            {/* Lista de empresas */}
            {filteredCompanies.length > 0 ? (
              <div className="max-h-60 overflow-y-auto">
                {filteredCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">CIF: {company.cif}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchTerm.trim() ? (
                  <>
                    No se encontraron empresas con "{searchTerm}"
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2 h-auto p-0"
                      onClick={() => {
                        setShowCreateDialog(true)
                        setIsOpen(false)
                      }}
                    >
                      <IconPlus className="h-4 w-4 mr-1" />
                      Crear "{searchTerm}"
                    </Button>
                  </>
                ) : (
                  'No hay empresas disponibles'
                )}
              </div>
            )}
          </SelectContent>
        </Select>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <IconAlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* Información adicional */}
      {!selectedCompany && !error && (
        <p className="text-xs text-muted-foreground">
          Selecciona una empresa existente o crea una nueva
        </p>
      )}

      {/* Dialog para crear nueva empresa */}
      <CreateCompanyDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCompanyCreated}
        initialName={searchTerm.trim()}
      />
    </div>
  )
}
