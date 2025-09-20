'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  IconUser,
  IconMail,
  IconBuilding,
  IconShield,
  IconEdit,
  IconDeviceFloppy,
  IconX,
  IconAlertCircle,
  IconLoader2,
  IconBuildingSkyscraper,
} from '@tabler/icons-react'
import { updateProfileAction, type UpdateProfileData } from '@/actions/auth/updateProfile'
import type { User, Company } from '@/payload-types'
import { toast } from 'sonner'

interface UserProfileFormProps {
  user: User
  onSuccess?: (updatedUser: User) => void
}

/**
 * Formulario de perfil de usuario con campos limitados según rol
 *
 * Usuarios normales: solo pueden editar nombre
 * Administradores: pueden editar todos los campos
 */
export function UserProfileForm({ user, onSuccess }: UserProfileFormProps) {
  const t = useTranslations('account.profileForm')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verificar si el usuario es admin
  const isAdmin = user.role === 'admin'

  // Obtener nombre de la empresa (puede ser string o relación)
  const getCompanyName = (empresa: string | Company | null | undefined) => {
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

    // Para admins, validar nombre y email
    const hasRequiredFields = formData.name?.trim() && formData.email?.trim()
    return !hasErrors && hasRequiredFields
  }

  // Verificar si hay cambios
  const hasChanges = () => {
    // Para usuarios normales, solo verificar cambios en nombre
    if (!isAdmin) {
      return formData.name !== (user.name || '')
    }

    // Para admins, verificar nombre y email
    return formData.name !== (user.name || '') || formData.email !== (user.email || '')
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

      // Solo admins pueden actualizar email
      if (isAdmin && formData.email !== (user.email || '')) {
        updateData.email = formData.email
      }

      const result = await updateProfileAction(updateData)

      if (result.success && result.data) {
        toast.success(result.message)

        // Llamar callback de éxito si existe
        if (onSuccess) {
          onSuccess(result.data)
        }

        setIsEditing(false)
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

  // Handler para cancelar edición
  const handleCancel = () => {
    // Resetear formulario
    setFormData({
      name: user.name || '',
      ...(isAdmin && {
        email: user.email || '',
      }),
    })
    setFieldErrors({})
    setError(null)
    setIsEditing(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2'>
            <IconUser className='h-5 w-5' />
            {t('title')}
          </CardTitle>
          {!isEditing && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsEditing(true)}
              className='flex items-center gap-2'
            >
              <IconEdit className='h-4 w-4' />
              {t('edit')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className='space-y-6'>
        {isEditing ? (
          <form onSubmit={handleSubmit} className='space-y-4'>
            {/* Información sobre permisos para usuarios normales */}
            {!isAdmin && (
              <Alert>
                <IconAlertCircle className='h-4 w-4' />
                <AlertDescription>{t('limitedAccess')}</AlertDescription>
              </Alert>
            )}

            {/* Nombre (siempre editable) */}
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

            {/* Email (solo para admins) */}
            {isAdmin && (
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
              </div>
            )}

            {/* Mostrar empresa y filial como solo lectura para usuarios normales */}
            {!isAdmin && (
              <div className='space-y-4 p-3 bg-muted/50 rounded-lg'>
                <h4 className='text-sm font-medium text-muted-foreground'>{t('readOnlyFields')}</h4>

                {/* Empresa (solo lectura) */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-muted-foreground'>
                    {t('company')}
                  </label>
                  <div className='flex items-center gap-2'>
                    <IconBuilding className='h-4 w-4 text-muted-foreground' />
                    {getCompanyName(user.empresa) ? (
                      <Badge variant='secondary'>{getCompanyName(user.empresa)}</Badge>
                    ) : (
                      <span className='text-sm text-muted-foreground'>
                        {t('notSpecifiedCompany')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Filial (solo lectura) */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium text-muted-foreground'>{t('branch')}</label>
                  <div className='flex items-center gap-2'>
                    <IconBuildingSkyscraper className='h-4 w-4 text-muted-foreground' />
                    {user.filial ? (
                      <Badge variant='outline'>{user.filial}</Badge>
                    ) : (
                      <span className='text-sm text-muted-foreground'>
                        {t('notSpecifiedBranch')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error general */}
            {error && (
              <Alert variant='destructive'>
                <IconAlertCircle className='h-4 w-4' />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Botones de acción */}
            <div className='flex items-center gap-2'>
              <Button
                type='submit'
                disabled={!isFormValid() || !hasChanges() || isLoading}
                className='flex items-center gap-2'
              >
                {isLoading ? (
                  <>
                    <IconLoader2 className='h-4 w-4 animate-spin' />
                    {t('updating')}
                  </>
                ) : (
                  <>
                    <IconDeviceFloppy className='h-4 w-4' />
                    {t('save')}
                  </>
                )}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={handleCancel}
                disabled={isLoading}
                className='flex items-center gap-2'
              >
                <IconX className='h-4 w-4' />
                {t('cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <div className='space-y-4'>
            {/* Vista de solo lectura */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {/* Nombre */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>{t('name')}</label>
                <div className='flex items-center gap-2 p-3 bg-muted/50 rounded-lg'>
                  <IconUser className='h-4 w-4 text-muted-foreground' />
                  <span className='text-sm'>{user.name || t('notSpecified')}</span>
                </div>
              </div>

              {/* Email */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>{t('email')}</label>
                <div className='flex items-center gap-2 p-3 bg-muted/50 rounded-lg'>
                  <IconMail className='h-4 w-4 text-muted-foreground' />
                  <span className='text-sm truncate'>{user.email}</span>
                </div>
              </div>

              {/* Empresa */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>{t('company')}</label>
                <div className='flex items-center gap-2 p-3 bg-muted/50 rounded-lg'>
                  <IconBuilding className='h-4 w-4 text-muted-foreground' />
                  {getCompanyName(user.empresa) ? (
                    <Badge variant='secondary' className='text-sm'>
                      {getCompanyName(user.empresa)}
                    </Badge>
                  ) : (
                    <span className='text-sm text-muted-foreground'>
                      {t('notSpecifiedCompany')}
                    </span>
                  )}
                </div>
              </div>

              {/* Filial */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>{t('branch')}</label>
                <div className='flex items-center gap-2 p-3 bg-muted/50 rounded-lg'>
                  <IconBuildingSkyscraper className='h-4 w-4 text-muted-foreground' />
                  {user.filial ? (
                    <Badge variant='outline' className='text-sm'>
                      {user.filial}
                    </Badge>
                  ) : (
                    <span className='text-sm text-muted-foreground'>{t('notSpecifiedBranch')}</span>
                  )}
                </div>
              </div>

              {/* Rol */}
              <div className='space-y-2'>
                <label className='text-sm font-medium text-muted-foreground'>{t('role')}</label>
                <div className='flex items-center gap-2 p-3 bg-muted/50 rounded-lg'>
                  <IconShield className='h-4 w-4 text-muted-foreground' />
                  <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                    <IconShield className='h-3 w-3 mr-1' />
                    {user.role === 'admin' && t('roles.admin')}
                    {user.role === 'user' && t('roles.user')}
                    {user.role === 'api' && t('roles.api')}
                    {!user.role && t('roles.user')}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Indicador de permisos para usuarios normales */}
            {!isAdmin && (
              <Alert>
                <IconAlertCircle className='h-4 w-4' />
                <AlertDescription>{t('userPermissions')}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
