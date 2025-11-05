'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  IconLoader,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconCheck,
  IconKey,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import Link from 'next/link'

import { resetPassword } from '@/actions/auth/reset-password'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  // Verificar que existe el token
  useEffect(() => {
    if (!token) {
      setErrorMessage('Enlace de recuperación inválido. Por favor, solicita uno nuevo.')
    }
  }, [token])

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      toast.error('Token inválido')
      return
    }

    try {
      setIsLoading(true)
      setErrorMessage('')

      const result = await resetPassword(token, values.password)

      if (result.success) {
        setSuccess(true)
        toast.success(result.message)
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        setErrorMessage(result.message)
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error al resetear contraseña:', error)
      setErrorMessage('Ha ocurrido un error inesperado. Por favor, intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Si fue exitoso, mostrar mensaje de confirmación
  if (success) {
    return (
      <Card>
        <CardContent className='pt-6'>
          <div className='flex flex-col items-center justify-center text-center space-y-4 py-6'>
            <div className='h-16 w-16 rounded-full bg-green-100 flex items-center justify-center'>
              <IconCheck className='h-8 w-8 text-green-600' />
            </div>
            <div className='space-y-2'>
              <h3 className='text-xl font-semibold'>¡Contraseña actualizada!</h3>
              <p className='text-sm text-muted-foreground'>
                Tu contraseña ha sido actualizada exitosamente.
              </p>
              <p className='text-sm text-muted-foreground'>
                Serás redirigido al inicio de sesión automáticamente...
              </p>
            </div>
            <Link href='/login'>
              <Button className='mt-4'>Ir al inicio de sesión</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Si no hay token, mostrar error
  if (!token) {
    return (
      <Card>
        <CardContent className='pt-6'>
          <div className='flex flex-col items-center justify-center text-center space-y-4 py-6'>
            <div className='h-16 w-16 rounded-full bg-red-100 flex items-center justify-center'>
              <IconAlertCircle className='h-8 w-8 text-red-600' />
            </div>
            <div className='space-y-2'>
              <h3 className='text-xl font-semibold'>Enlace inválido</h3>
              <p className='text-sm text-muted-foreground'>{errorMessage}</p>
            </div>
            <Link href='/login'>
              <Button className='mt-4'>Volver al inicio de sesión</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className='text-center'>
        <div className='flex justify-center mb-2'>
          <div className='h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center'>
            <IconKey className='h-6 w-6 text-primary' />
          </div>
        </div>
        <CardTitle className='text-xl'>Crear Nueva Contraseña</CardTitle>
        <CardDescription>
          Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {/* Mensaje de error general */}
            {errorMessage && (
              <div className='flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md'>
                <IconAlertCircle className='h-4 w-4' />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Campo Nueva Contraseña */}
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Contraseña</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Input
                        placeholder='Mínimo 8 caracteres'
                        type={showPassword ? 'text' : 'password'}
                        autoComplete='new-password'
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <IconEyeOff className='h-4 w-4' />
                        ) : (
                          <IconEye className='h-4 w-4' />
                        )}
                        <span className='sr-only'>
                          {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo Confirmar Contraseña */}
            <FormField
              control={form.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Contraseña</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Input
                        placeholder='Repite tu contraseña'
                        type={showConfirmPassword ? 'text' : 'password'}
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
                        <span className='sr-only'>
                          {showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        </span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botón de envío */}
            <Button type='submit' className='w-full' disabled={isLoading}>
              {isLoading ? (
                <>
                  <IconLoader className='mr-2 h-4 w-4 animate-spin' />
                  Actualizando contraseña...
                </>
              ) : (
                'Actualizar Contraseña'
              )}
            </Button>

            {/* Enlace para volver */}
            <div className='text-center'>
              <Link href='/login' className='text-sm text-muted-foreground hover:text-primary'>
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
