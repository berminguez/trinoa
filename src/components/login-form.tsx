'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { IconLoader, IconEye, IconEyeOff, IconAlertCircle } from '@tabler/icons-react'
import { toast } from 'sonner'

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
import { loginWithRedirect } from '@/actions/auth/login'

// Esquema de validación con Zod
const loginSchema = z.object({
  email: z.string().min(1, 'El email es requerido').email('Formato de email inválido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(3, 'La contraseña debe tener al menos 3 caracteres'),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginFormProps extends React.ComponentProps<'div'> {
  className?: string
}

export function LoginForm({ className, ...props }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  const router = useRouter()
  const searchParams = useSearchParams()

  // Obtener parámetros de la URL
  const redirectUrl = searchParams.get('redirect')
  const reason = searchParams.get('reason')
  const error = searchParams.get('error')

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Mostrar mensajes de error de URL params
  useEffect(() => {
    if (error) {
      setErrorMessage(error)
    }
    if (reason === 'auth_required') {
      toast.info('Debes iniciar sesión para acceder a esta página')
    }
  }, [error, reason])

  // Limpiar error cuando el usuario empiece a escribir
  useEffect(() => {
    const subscription = form.watch(() => {
      if (errorMessage) {
        setErrorMessage('')
      }
    })
    return () => subscription.unsubscribe()
  }, [form, errorMessage])

  async function onSubmit(values: LoginFormValues) {
    try {
      setIsLoading(true)
      setErrorMessage('')

      // Crear FormData para el server action
      const formData = new FormData()
      formData.append('email', values.email)
      formData.append('password', values.password)

      // Llamar al server action con redirección
      await loginWithRedirect(formData, redirectUrl || undefined)

      // Si llegamos aquí, hubo éxito (normalmente se redirige)
      toast.success('Inicio de sesión exitoso')
    } catch (error) {
      console.error('Error en login:', error)
      setErrorMessage('Ha ocurrido un error inesperado. Por favor, intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className='text-center'>
          <CardTitle className='text-xl'>Bienvenido</CardTitle>
          <CardDescription>Inicia sesión con tu cuenta para continuar</CardDescription>
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

              {/* Campo Email */}
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='usuario@ejemplo.com'
                        type='email'
                        autoComplete='email'
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo Contraseña */}
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          placeholder='Tu contraseña'
                          type={showPassword ? 'text' : 'password'}
                          autoComplete='current-password'
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

              {/* Botón de envío */}
              <Button type='submit' className='w-full' disabled={isLoading}>
                {isLoading ? (
                  <>
                    <IconLoader className='mr-2 h-4 w-4 animate-spin' />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
