'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { IconKey, IconLoader, IconEye, IconEyeOff } from '@tabler/icons-react'
import { toast } from 'sonner'

import { changePassword } from '@/actions/auth/change-password'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

interface ChangePasswordModalProps {
  children?: React.ReactNode
}

/**
 * Modal para cambiar la contraseña del usuario autenticado
 */
export function ChangePasswordModal({ children }: ChangePasswordModalProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (values: ChangePasswordFormValues) => {
    try {
      setIsLoading(true)

      const result = await changePassword(values.currentPassword, values.newPassword)

      if (result.success) {
        toast.success(result.message)
        form.reset()
        setOpen(false)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado. Por favor, intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant='outline' size='sm'>
            <IconKey className='h-4 w-4 mr-2' />
            Cambiar Contraseña
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <IconKey className='h-5 w-5' />
            Cambiar Contraseña
          </DialogTitle>
          <DialogDescription>
            Ingresa tu contraseña actual y elige una nueva contraseña segura.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            {/* Contraseña actual */}
            <FormField
              control={form.control}
              name='currentPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña Actual</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder='Tu contraseña actual'
                        autoComplete='current-password'
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        disabled={isLoading}
                      >
                        {showCurrentPassword ? (
                          <IconEyeOff className='h-4 w-4' />
                        ) : (
                          <IconEye className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nueva contraseña */}
            <FormField
              control={form.control}
              name='newPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Contraseña</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder='Mínimo 8 caracteres'
                        autoComplete='new-password'
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        disabled={isLoading}
                      >
                        {showNewPassword ? (
                          <IconEyeOff className='h-4 w-4' />
                        ) : (
                          <IconEye className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirmar contraseña */}
            <FormField
              control={form.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder='Repite tu nueva contraseña'
                        autoComplete='new-password'
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
                          <IconEyeOff className='h-4 w-4' />
                        ) : (
                          <IconEye className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botones */}
            <div className='flex justify-end gap-3 pt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  form.reset()
                  setOpen(false)
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading ? (
                  <>
                    <IconLoader className='mr-2 h-4 w-4 animate-spin' />
                    Actualizando...
                  </>
                ) : (
                  'Cambiar Contraseña'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
