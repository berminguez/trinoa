'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { IconUser, IconMail, IconBuilding, IconAlertCircle, IconLoader2 } from '@tabler/icons-react'
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estado del formulario
  const [formData, setFormData] = useState<UpdateProfileData>({
    name: user.name || '',
    empresa: user.empresa || '',
    email: user.email || '',
  })

  // Estado de validación
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Validación en tiempo real
  const validateField = (name: string, value: string) => {
    const errors: Record<string, string> = {}

    switch (name) {
      case 'name':
        if (!value.trim()) {
          errors.name = 'El nombre es requerido'
        } else if (value.trim().length < 2) {
          errors.name = 'El nombre debe tener al menos 2 caracteres'
        } else if (value.trim().length > 100) {
          errors.name = 'El nombre no puede exceder 100 caracteres'
        }
        break

      case 'empresa':
        if (!value.trim()) {
          errors.empresa = 'La empresa es requerida'
        } else if (value.trim().length < 2) {
          errors.empresa = 'La empresa debe tener al menos 2 caracteres'
        } else if (value.trim().length > 100) {
          errors.empresa = 'La empresa no puede exceder 100 caracteres'
        }
        break

      case 'email':
        if (!value.trim()) {
          errors.email = 'El email es requerido'
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(value.trim())) {
            errors.email = 'El email no tiene un formato válido'
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
    const hasRequiredFields =
      formData.name?.trim() && formData.empresa?.trim() && formData.email?.trim()
    return !hasErrors && hasRequiredFields
  }

  // Verificar si hay cambios
  const hasChanges = () => {
    return (
      formData.name !== (user.name || '') ||
      formData.empresa !== (user.empresa || '') ||
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

      if (formData.name !== (user.name || '')) {
        updateData.name = formData.name
      }
      if (formData.empresa !== (user.empresa || '')) {
        updateData.empresa = formData.empresa
      }
      if (formData.email !== (user.email || '')) {
        updateData.email = formData.email
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
      setError('Error interno del servidor. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handler para cancelar
  const handleCancel = () => {
    // Resetear formulario
    setFormData({
      name: user.name || '',
      empresa: user.empresa || '',
      email: user.email || '',
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
            Editar Perfil
          </DialogTitle>
          <DialogDescription>
            Actualiza tu información personal. Los campos marcados con * son obligatorios.
          </DialogDescription>
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
            <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
              {user.role === 'admin' && 'Administrador'}
              {user.role === 'user' && 'Usuario'}
              {user.role === 'api' && 'API'}
              {!user.role && 'Usuario'}
            </Badge>
          </div>

          {/* Nombre */}
          <div className='space-y-2'>
            <Label htmlFor='name'>Nombre *</Label>
            <Input
              id='name'
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder='Tu nombre completo'
              className={fieldErrors.name ? 'border-red-500' : ''}
            />
            {fieldErrors.name && <p className='text-sm text-red-500'>{fieldErrors.name}</p>}
          </div>

          {/* Empresa */}
          <div className='space-y-2'>
            <Label htmlFor='empresa'>Empresa *</Label>
            <div className='relative'>
              <IconBuilding className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                id='empresa'
                value={formData.empresa || ''}
                onChange={(e) => handleInputChange('empresa', e.target.value)}
                placeholder='Nombre de tu empresa'
                className={`pl-10 ${fieldErrors.empresa ? 'border-red-500' : ''}`}
              />
            </div>
            {fieldErrors.empresa && <p className='text-sm text-red-500'>{fieldErrors.empresa}</p>}
          </div>

          {/* Email */}
          <div className='space-y-2'>
            <Label htmlFor='email'>Email *</Label>
            <div className='relative'>
              <IconMail className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                id='email'
                type='email'
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder='tu.email@empresa.com'
                className={`pl-10 ${fieldErrors.email ? 'border-red-500' : ''}`}
              />
            </div>
            {fieldErrors.email && <p className='text-sm text-red-500'>{fieldErrors.email}</p>}
            {formData.email !== user.email && (
              <p className='text-xs text-amber-600'>
                ⚠️ Cambiar el email puede afectar tu acceso a la cuenta
              </p>
            )}
          </div>

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
              Tu rol de usuario no puede ser modificado desde aquí. Para cambios de rol, contacta
              con un administrador.
            </AlertDescription>
          </Alert>

          {/* Footer */}
          <DialogFooter className='gap-2'>
            <Button type='button' variant='outline' onClick={handleCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type='submit' disabled={!isFormValid() || !hasChanges() || isLoading}>
              {isLoading ? (
                <>
                  <IconLoader2 className='h-4 w-4 mr-2 animate-spin' />
                  Actualizando...
                </>
              ) : (
                'Actualizar Perfil'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
