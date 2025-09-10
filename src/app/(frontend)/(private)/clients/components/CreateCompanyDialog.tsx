'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  IconBuilding, 
  IconPlus, 
  IconAlertCircle, 
  IconLoader2,
  IconCheck,
  IconFileText
} from '@tabler/icons-react'
import { createCompanyAction } from '@/actions/companies'
import type { Company } from '@/payload-types'
import { toast } from 'sonner'

interface CreateCompanyDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (company: Company) => void
  initialName?: string
}

/**
 * Dialog para crear nueva empresa desde formularios de usuario
 * 
 * Funcionalidades:
 * - Formulario con validación en tiempo real
 * - Pre-población del nombre si se proporciona
 * - Validación de duplicados
 * - Manejo de errores específicos
 * - Integración con server actions
 */
export function CreateCompanyDialog({
  isOpen,
  onClose,
  onSuccess,
  initialName = '',
}: CreateCompanyDialogProps) {
  const t = useTranslations('clients.createCompanyDialog')
  
  // Estado del formulario
  const [name, setName] = useState('')
  const [cif, setCif] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Errores de campos específicos
  const [nameError, setNameError] = useState('')
  const [cifError, setCifError] = useState('')

  // Pre-poblar nombre inicial cuando se abre el dialog
  useEffect(() => {
    if (isOpen && initialName) {
      setName(initialName)
      setNameError('')
    }
  }, [isOpen, initialName])

  // Limpiar formulario al cerrar
  useEffect(() => {
    if (!isOpen) {
      setName('')
      setCif('')
      setNameError('')
      setCifError('')
      setError(null)
      setIsLoading(false)
    }
  }, [isOpen])

  // Validaciones
  const validateName = (value: string): string => {
    if (!value.trim()) {
      return 'El nombre de la empresa es requerido'
    }
    if (value.trim().length < 2) {
      return 'El nombre debe tener al menos 2 caracteres'
    }
    if (value.trim().length > 100) {
      return 'El nombre no puede exceder 100 caracteres'
    }
    return ''
  }

  const validateCif = (value: string): string => {
    if (!value.trim()) {
      return 'El CIF es requerido'
    }
    
    const cleanCif = value.trim().toUpperCase()
    if (cleanCif.length < 9 || cleanCif.length > 20) {
      return 'El CIF debe tener entre 9 y 20 caracteres'
    }
    
    if (!/^[A-Z0-9]+$/.test(cleanCif)) {
      return 'El CIF debe contener solo letras y números'
    }
    
    return ''
  }

  // Handlers de cambio con validación
  const handleNameChange = (value: string) => {
    setName(value)
    setNameError(validateName(value))
    if (error) setError(null)
  }

  const handleCifChange = (value: string) => {
    // Normalizar a mayúsculas mientras se escribe
    const normalizedValue = value.toUpperCase()
    setCif(normalizedValue)
    setCifError(validateCif(normalizedValue))
    if (error) setError(null)
  }

  // Verificar si el formulario es válido
  const isFormValid = () => {
    const nameValid = name.trim().length >= 2 && !nameError
    const cifValid = cif.trim().length >= 9 && !cifError
    return nameValid && cifValid && !isLoading
  }

  // Verificar si hay cambios
  const hasChanges = () => {
    return name.trim() !== '' || cif.trim() !== ''
  }

  // Handler para envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar todos los campos
    const nameErr = validateName(name)
    const cifErr = validateCif(cif)

    setNameError(nameErr)
    setCifError(cifErr)

    if (nameErr || cifErr) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await createCompanyAction({
        name: name.trim(),
        cif: cif.trim(),
      })

      if (result.success && result.data) {
        toast.success(result.message || 'Empresa creada exitosamente')
        onSuccess(result.data)
        onClose()
      } else {
        setError(result.message || 'Error al crear la empresa')
      }
    } catch (err) {
      console.error('Error creating company:', err)
      setError('Error interno del servidor')
    } finally {
      setIsLoading(false)
    }
  }

  // Handler para cancelar
  const handleCancel = () => {
    if (hasChanges() && !isLoading) {
      // Podrías añadir un confirmation dialog aquí si quieres
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconPlus className="h-5 w-5" />
            Nueva Empresa
          </DialogTitle>
          <DialogDescription>
            Crear una nueva empresa para asignar a usuarios
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información contextual */}
          <Alert>
            <IconBuilding className="h-4 w-4" />
            <AlertDescription>
              Solo los administradores pueden crear nuevas empresas. 
              Esta empresa estará disponible para todos los usuarios.
            </AlertDescription>
          </Alert>

          {/* Nombre de la empresa */}
          <div className="space-y-2">
            <Label htmlFor="companyName" className="flex items-center gap-1">
              <IconBuilding className="h-4 w-4" />
              Nombre de la Empresa *
            </Label>
            <Input
              id="companyName"
              placeholder="Ej: Tecnologías Avanzadas S.L."
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={nameError ? 'border-destructive' : ''}
              disabled={isLoading}
              maxLength={100}
              autoFocus={!initialName}
            />
            {nameError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <IconAlertCircle className="h-3 w-3" />
                {nameError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {name.length}/100 caracteres
            </p>
          </div>

          {/* CIF */}
          <div className="space-y-2">
            <Label htmlFor="companyCif" className="flex items-center gap-1">
              <IconFileText className="h-4 w-4" />
              CIF *
            </Label>
            <Input
              id="companyCif"
              placeholder="Ej: A12345678"
              value={cif}
              onChange={(e) => handleCifChange(e.target.value)}
              className={cifError ? 'border-destructive' : ''}
              disabled={isLoading}
              maxLength={20}
              style={{ textTransform: 'uppercase' }}
            />
            {cifError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <IconAlertCircle className="h-3 w-3" />
                {cifError}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Código de Identificación Fiscal (solo letras y números)
            </p>
          </div>

          {/* Error general */}
          {error && (
            <Alert variant="destructive">
              <IconAlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Vista previa de la empresa */}
          {name.trim() && cif.trim() && !nameError && !cifError && (
            <Alert className="border-green-200 bg-green-50">
              <IconCheck className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <IconBuilding className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">{name.trim()}</p>
                    <p className="text-xs text-green-600">CIF: {cif.trim()}</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={!isFormValid()}
          >
            {isLoading ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <IconPlus className="mr-2 h-4 w-4" />
                Crear Empresa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
