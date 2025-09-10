'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Badge } from '@/components/ui/badge'
import { IconUser, IconMail, IconBuilding, IconAlertCircle, IconLoader2, IconBuildingSkyscraper, IconShield } from '@tabler/icons-react'
import { updateProfileAction, type UpdateProfileData } from '@/actions/auth/updateProfile'
import type { User } from '@/payload-types'
import { toast } from 'sonner'

interface EditProfileModalProps {
  user: User
  isOpen: boolean
  onClose: () => void
  onSuccess?: (updatedUser: User) => void
}

/**
 * Modal para editar el perfil propio del usuario
 *
 * Permite actualizar información personal del usuario autenticado
 */
export function EditProfileModal({ user, isOpen, onClose, onSuccess }: EditProfileModalProps) {
  const router = useRouter()
  const t = useTranslations('account.editProfile')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verificar si el usuario es admin
  const isAdmin = user.role === 'admin'

  // Obtener nombre de la empresa (puede ser string o relación)
  const getCompanyName = (empresa: string | any) => {
    if (!empresa) return null
    
    // Si es un objeto (relación), usar el nombre
    if (typeof empresa === 'object' && empresa.name) {
      return empresa.name
    }
    
    // Si es string (legacy), usar directamente
    if (typeof empresa === 'string') {
      return empresa
    }
    
    return null
  }

  // Estado del formulario - solo incluir campos editables
  const [formData, setFormData] = useState<UpdateProfileData>({
    name: user.name || '',
    ...(isAdmin && {
      empresa: typeof user.empresa === 'string' ? user.empresa : '',
      email: user.email || '',
    }),
  })

  // Estado de validación
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Validación en tiempo real
  const validateField = (name: string, value: string) => {
    const errors: Record<string, string> = {}

    switch (name) {
      case 'name':
        if (!value.trim()) {
          errors.name = t('errors.nameRequired')
        } else if (value.trim().length < 2) {
          errors.name = t('errors.nameMinLength')
        } else if (value.trim().length > 100) {
          errors.name = t('errors.nameMaxLength')
        }
        break

      case 'empresa':
        if (!value.trim()) {
          errors.empresa = t('errors.companyRequired')
        } else if (value.trim().length < 2) {
          errors.empresa = t('errors.companyMinLength')
        } else if (value.trim().length > 100) {
          errors.empresa = t('errors.companyMaxLength')
        }
        break

      case 'email':
        if (!value.trim()) {
          errors.email = t('errors.emailRequired')
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(value.trim())) {
            errors.email = t('errors.emailInvalid')
          }
        }
        break
    }

    setFieldErrors((prev) => ({
      ...prev,
      [name]: errors[name] || '',
    }))

    return !errors[name]
  }

  // Handler para cambios en el formulario
  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Limpiar error general al hacer cambios
    if (error) {
      setError(null)
    }

    // Validar campo
    validateField(name, value)
  }

  // Verificar si el formulario es válido
  const isFormValid = () => {
    const hasErrors = Object.values(fieldErrors).some((error) => error !== '')
    
    // Para usuarios normales, solo validar que tenga nombre
    if (!isAdmin) {
      return !hasErrors && formData.name?.trim()
    }
    
    // Para admins, validar todos los campos
    const hasRequiredFields =
      formData.name?.trim() && formData.empresa?.trim() && formData.email?.trim()
    return !hasErrors && hasRequiredFields
  }

  // Verificar si hay cambios
  const hasChanges = () => {
    // Para usuarios normales, solo verificar cambios en nombre
    if (!isAdmin) {
      return formData.name !== (user.name || '')
    }
    
    // Para admins, verificar todos los campos
    const empresaValue = typeof user.empresa === 'string' ? user.empresa : ''
    return (
      formData.name !== (user.name || '') ||
      formData.empresa !== empresaValue ||
      formData.email !== (user.email || '')
    )
  }

  // Handler para envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid() || !hasChanges()) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Preparar datos solo con campos modificados
      const updateData: UpdateProfileData = {}

      // Siempre permitir actualizar nombre
      if (formData.name !== (user.name || '')) {
        updateData.name = formData.name
      }
      
      // Solo admins pueden actualizar empresa y email
      if (isAdmin) {
        const empresaValue = typeof user.empresa === 'string' ? user.empresa : ''
        if (formData.empresa !== empresaValue) {
          updateData.empresa = formData.empresa
        }
        if (formData.email !== (user.email || '')) {
          updateData.email = formData.email
        }
      }

      const result = await updateProfileAction(updateData)

      if (result.success && result.data) {
        toast.success(result.message)

        // Llamar callback de éxito si existe
        if (onSuccess) {
          onSuccess(result.data)
        }

        // Refrescar página para asegurar datos actualizados
        router.refresh()
        onClose()
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error('Error actualizando perfil:', err)
      setError(t('errors.serverError'))
    } finally {
      setIsLoading(false)
    }
  }

  // Handler para cancelar
  const handleCancel = () => {
    // Resetear formulario
    setFormData({
      name: user.name || '',
      ...(isAdmin && {
        empresa: typeof user.empresa === 'string' ? user.empresa : '',
        email: user.email || '',
      }),
    })
    setFieldErrors({})
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <IconUser className='h-5 w-5' />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

          <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Información actual */}
          <div className='flex items-center justify-between p-3 bg-muted/50 rounded-lg'>
            <div className='flex items-center gap-2'>
              <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center'>
                <IconUser className='h-4 w-4 text-primary' />
              </div>
              <div>
                <p className='text-sm font-medium'>{user.name || 'Sin nombre'}</p>
                <p className='text-xs text-muted-foreground'>{user.email}</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                <IconShield className='h-3 w-3 mr-1' />
                {user.role === 'admin' && t('roles.admin')}
                {user.role === 'user' && t('roles.user')}
                {user.role === 'api' && t('roles.api')}
                {!user.role && t('roles.user')}
              </Badge>
            </div>
          </div>

          {/* Mostrar información de solo lectura para usuarios normales */}
          {!isAdmin && (
            <div className='space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
              <div className='flex items-center gap-2 text-blue-700'>
                <IconAlertCircle className='h-4 w-4' />
                <span className='text-sm font-medium'>{t('limitedAccess')}</span>
              </div>
              
              {/* Empresa (solo lectura) */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>{t('company')}</label>
                <div className='flex items-center gap-2'>
                  <IconBuilding className='h-4 w-4 text-muted-foreground' />
                  {getCompanyName(user.empresa) ? (
                    <Badge variant="secondary">
                      {getCompanyName(user.empresa)}
                    </Badge>
                  ) : (
                    <span className='text-sm text-muted-foreground'>{t('notSpecifiedCompany')}</span>
                  )}
                </div>
              </div>

              {/* Filial (solo lectura) */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>{t('branch')}</label>
                <div className='flex items-center gap-2'>
                  <IconBuildingSkyscraper className='h-4 w-4 text-muted-foreground' />
                  {user.filial ? (
                    <Badge variant="outline">
                      {user.filial}
                    </Badge>
                  ) : (
                    <span className='text-sm text-muted-foreground'>{t('notSpecifiedBranch')}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Nombre */}
          <div className='space-y-2'>
            <Label htmlFor='name'>{t('name')} *</Label>
            <Input
              id='name'
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder={t('namePlaceholder')}
              className={fieldErrors.name ? 'border-red-500' : ''}
            />
            {fieldErrors.name && <p className='text-sm text-red-500'>{fieldErrors.name}</p>}
          </div>

          {/* Solo mostrar empresa y email para admins */}
          {isAdmin && (
            <>
              {/* Empresa */}
              <div className='space-y-2'>
                <Label htmlFor='empresa'>{t('company')} *</Label>
                <div className='relative'>
                  <IconBuilding className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='empresa'
                    value={formData.empresa || ''}
                    onChange={(e) => handleInputChange('empresa', e.target.value)}
                    placeholder={t('companyPlaceholder')}
                    className={`pl-10 ${fieldErrors.empresa ? 'border-red-500' : ''}`}
                  />
                </div>
                {fieldErrors.empresa && <p className='text-sm text-red-500'>{fieldErrors.empresa}</p>}
              </div>

              {/* Email */}
              <div className='space-y-2'>
                <Label htmlFor='email'>{t('email')} *</Label>
                <div className='relative'>
                  <IconMail className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                  <Input
                    id='email'
                    type='email'
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className={`pl-10 ${fieldErrors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {fieldErrors.email && <p className='text-sm text-red-500'>{fieldErrors.email}</p>}
                {formData.email !== user.email && (
                  <p className='text-xs text-amber-600'>{t('emailWarning')}</p>
                )}
              </div>
            </>
          )}

          {/* Error general */}
          {error && (
            <Alert variant='destructive'>
              <IconAlertCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Información sobre el rol */}
          <Alert>
            <IconAlertCircle className='h-4 w-4' />
            <AlertDescription>
              {isAdmin ? t('adminRoleInfo') : t('userRoleInfo')}
            </AlertDescription>
          </Alert>

          {/* Footer */}
          <DialogFooter className='gap-2'>
            <Button type='button' variant='outline' onClick={handleCancel} disabled={isLoading}>
              {t('cancel')}
            </Button>
            <Button type='submit' disabled={!isFormValid() || !hasChanges() || isLoading}>
              {isLoading ? (
                <>
                  <IconLoader2 className='h-4 w-4 mr-2 animate-spin' />
                  {t('updating')}
                </>
              ) : (
                t('update')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
