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
  IconFileText,
} from '@tabler/icons-react'
import { createCompanyAction, checkCompanyCodeAction } from '@/actions/companies'
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
  const [code, setCode] = useState('')
  const [cif, setCif] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Errores de campos específicos
  const [nameError, setNameError] = useState('')
  const [codeError, setCodeError] = useState('')
  const [cifError, setCifError] = useState('')

  // Estados para verificación de código
  const [isCheckingCode, setIsCheckingCode] = useState(false)
  const [codeCheckMessage, setCodeCheckMessage] = useState('')
  const [isCodeUnique, setIsCodeUnique] = useState<boolean | null>(null)

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
      setCode('')
      setCif('')
      setNameError('')
      setCodeError('')
      setCifError('')
      setError(null)
      setIsLoading(false)
      setIsCheckingCode(false)
      setCodeCheckMessage('')
      setIsCodeUnique(null)
    }
  }, [isOpen])

  // Verificar unicidad del código en tiempo real
  useEffect(() => {
    const checkCodeUniqueness = async () => {
      if (!code.trim() || code.trim().length !== 3 || codeError) {
        setIsCodeUnique(null)
        setCodeCheckMessage('')
        return
      }

      setIsCheckingCode(true)
      setCodeCheckMessage('')

      try {
        const result = await checkCompanyCodeAction(code.trim())

        if (result.success) {
          setIsCodeUnique(result.isUnique)
          setCodeCheckMessage(result.message || '')
        } else {
          setIsCodeUnique(false)
          setCodeCheckMessage(result.message || 'Error verificando código')
        }
      } catch (error) {
        console.error('Error checking code uniqueness:', error)
        setIsCodeUnique(null)
        setCodeCheckMessage('Error verificando disponibilidad')
      } finally {
        setIsCheckingCode(false)
      }
    }

    // Debounce para evitar demasiadas llamadas
    const timeoutId = setTimeout(checkCodeUniqueness, 500)
    return () => clearTimeout(timeoutId)
  }, [code, codeError])

  // Validaciones
  const validateName = (value: string): string => {
    if (!value.trim()) {
      return t('errors.nameRequired')
    }
    if (value.trim().length < 2) {
      return t('errors.nameMinLength')
    }
    if (value.trim().length > 100) {
      return t('errors.nameMaxLength')
    }
    return ''
  }

  const validateCode = (value: string): string => {
    if (!value.trim()) {
      return t('errors.codeRequired')
    }

    const cleanCode = value.trim().toUpperCase()

    // Validar que sean exactamente 3 caracteres
    if (cleanCode.length !== 3) {
      return t('errors.codeMaxLength')
    }

    // Validar que sean solo letras A-Z
    if (!/^[A-Z]{3}$/.test(cleanCode)) {
      return t('errors.codeMinLength')
    }

    return ''
  }

  const validateCif = (value: string): string => {
    if (!value.trim()) {
      return t('errors.cifRequired')
    }

    const cleanCif = value.trim().toUpperCase()
    if (cleanCif.length < 9 || cleanCif.length > 20) {
      return t('errors.cifMaxLength')
    }

    if (!/^[A-Z0-9]+$/.test(cleanCif)) {
      return t('errors.cifMinLength')
    }

    return ''
  }

  // Handlers de cambio con validación
  const handleNameChange = (value: string) => {
    setName(value)
    setNameError(validateName(value))
    if (error) setError(null)
  }

  const handleCodeChange = (value: string) => {
    // Normalizar a mayúsculas y limitar a 3 caracteres
    const normalizedValue = value.toUpperCase().slice(0, 3)
    setCode(normalizedValue)
    setCodeError(validateCode(normalizedValue))
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
    const codeValid = code.trim().length === 3 && !codeError && isCodeUnique === true
    const cifValid = cif.trim().length >= 9 && !cifError
    return nameValid && codeValid && cifValid && !isLoading && !isCheckingCode
  }

  // Verificar si hay cambios
  const hasChanges = () => {
    return name.trim() !== '' || code.trim() !== '' || cif.trim() !== ''
  }

  // Handler para envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar todos los campos
    const nameErr = validateName(name)
    const codeErr = validateCode(code)
    const cifErr = validateCif(cif)

    setNameError(nameErr)
    setCodeError(codeErr)
    setCifError(cifErr)

    if (nameErr || codeErr || cifErr) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await createCompanyAction({
        name: name.trim(),
        code: code.trim(),
        cif: cif.trim(),
      })

      if (result.success && result.data) {
        toast.success(result.message || t('success'))
        onSuccess(result.data)
        onClose()
      } else {
        setError(result.message || t('errors.serverError'))
      }
    } catch (err) {
      console.error('Error creating company:', err)
      setError(t('errors.serverError'))
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
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <IconPlus className='h-5 w-5' />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Información contextual */}
          <Alert>
            <IconBuilding className='h-4 w-4' />
            <AlertDescription>{t('descriptionContext')}</AlertDescription>
          </Alert>

          {/* Nombre de la empresa */}
          <div className='space-y-2'>
            <Label htmlFor='companyName' className='flex items-center gap-1'>
              <IconBuilding className='h-4 w-4' />
              {t('name')} *
            </Label>
            <Input
              id='companyName'
              placeholder={t('namePlaceholder')}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={nameError ? 'border-destructive' : ''}
              disabled={isLoading}
              maxLength={100}
              autoFocus={!initialName}
            />
            {nameError && (
              <p className='text-sm text-destructive flex items-center gap-1'>
                <IconAlertCircle className='h-3 w-3' />
                {nameError}
              </p>
            )}
            <p className='text-xs text-muted-foreground'>
              {name.length}/100 {t('characters')}
            </p>
          </div>

          {/* Código de empresa */}
          <div className='space-y-2'>
            <Label htmlFor='companyCode' className='flex items-center gap-1'>
              <IconBuilding className='h-4 w-4' />
              {t('code')} *
            </Label>
            <div className='relative'>
              <Input
                id='companyCode'
                placeholder={t('codePlaceholder')}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                className={
                  codeError || isCodeUnique === false
                    ? 'border-destructive'
                    : isCodeUnique === true
                      ? 'border-green-500'
                      : ''
                }
                disabled={isLoading}
                maxLength={3}
                style={{ textTransform: 'uppercase' }}
              />
              {isCheckingCode && (
                <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                  <IconLoader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                </div>
              )}
              {!isCheckingCode && isCodeUnique === true && (
                <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                  <IconCheck className='h-4 w-4 text-green-600' />
                </div>
              )}
              {!isCheckingCode && isCodeUnique === false && (
                <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                  <IconAlertCircle className='h-4 w-4 text-destructive' />
                </div>
              )}
            </div>
            {codeError && (
              <p className='text-sm text-destructive flex items-center gap-1'>
                <IconAlertCircle className='h-3 w-3' />
                {codeError}
              </p>
            )}
            {!codeError && codeCheckMessage && (
              <p
                className={`text-sm flex items-center gap-1 ${
                  isCodeUnique === true
                    ? 'text-green-600'
                    : isCodeUnique === false
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                }`}
              >
                {isCodeUnique === true ? (
                  <IconCheck className='h-3 w-3' />
                ) : isCodeUnique === false ? (
                  <IconAlertCircle className='h-3 w-3' />
                ) : (
                  <IconLoader2 className='h-3 w-3 animate-spin' />
                )}
                {codeCheckMessage}
              </p>
            )}
            <p className='text-xs text-muted-foreground'>
              {t('codeUnique')}
              {isCheckingCode && ' • Verificando disponibilidad...'}
            </p>
          </div>

          {/* CIF */}
          <div className='space-y-2'>
            <Label htmlFor='companyCif' className='flex items-center gap-1'>
              <IconFileText className='h-4 w-4' />
              {t('cif')} *
            </Label>
            <Input
              id='companyCif'
              placeholder={t('cifPlaceholder')}
              value={cif}
              onChange={(e) => handleCifChange(e.target.value)}
              className={cifError ? 'border-destructive' : ''}
              disabled={isLoading}
              maxLength={20}
              style={{ textTransform: 'uppercase' }}
            />
            {cifError && (
              <p className='text-sm text-destructive flex items-center gap-1'>
                <IconAlertCircle className='h-3 w-3' />
                {cifError}
              </p>
            )}
            <p className='text-xs text-muted-foreground'>{t('cifDescription')}</p>
          </div>

          {/* Error general */}
          {error && (
            <Alert variant='destructive'>
              <IconAlertCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Vista previa de la empresa */}
          {name.trim() && code.trim() && cif.trim() && !nameError && !codeError && !cifError && (
            <Alert className='border-green-200 bg-green-50'>
              <IconCheck className='h-4 w-4 text-green-600' />
              <AlertDescription>
                <div className='flex items-center gap-2'>
                  <IconBuilding className='h-4 w-4 text-green-600' />
                  <div>
                    <p className='font-medium text-green-800'>{name.trim()}</p>
                    <p className='text-xs text-green-600'>
                      {t('code')}: {code.trim()} | {t('cif')}: {cif.trim()}
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter className='gap-2'>
          <Button type='button' variant='outline' onClick={handleCancel} disabled={isLoading}>
            {t('cancel')}
          </Button>
          <Button type='submit' onClick={handleSubmit} disabled={!isFormValid()}>
            {isLoading ? (
              <>
                <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />
                {t('creating')}
              </>
            ) : (
              <>
                <IconPlus className='mr-2 h-4 w-4' />
                {t('create')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
