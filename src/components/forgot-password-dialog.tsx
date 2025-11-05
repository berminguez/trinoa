'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { IconMail, IconLoader, IconMailCheck } from '@tabler/icons-react'
import { toast } from 'sonner'

import { forgotPassword } from '@/actions/auth/forgot-password'
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

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'El email es requerido').email('Formato de email inválido'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

interface ForgotPasswordDialogProps {
  children?: React.ReactNode
}

/**
 * Diálogo para solicitar recuperación de contraseña
 */
export function ForgotPasswordDialog({ children }: ForgotPasswordDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      setIsLoading(true)

      const result = await forgotPassword(values.email)

      if (result.success) {
        setEmailSent(true)
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado. Por favor, intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset después de un delay para evitar que se vea el reset antes de cerrar
    setTimeout(() => {
      setEmailSent(false)
      form.reset()
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant='link' size='sm' className='p-0 h-auto font-normal text-sm'>
            ¿Olvidaste tu contraseña?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <IconMail className='h-5 w-5' />
            Recuperar Contraseña
          </DialogTitle>
          <DialogDescription>
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
          </DialogDescription>
        </DialogHeader>

        {emailSent ? (
          <div className='space-y-4 py-4'>
            <div className='flex flex-col items-center justify-center text-center space-y-4'>
              <div className='h-16 w-16 rounded-full bg-green-100 flex items-center justify-center'>
                <IconMailCheck className='h-8 w-8 text-green-600' />
              </div>
              <div className='space-y-2'>
                <h3 className='text-lg font-semibold'>¡Email enviado!</h3>
                <p className='text-sm text-muted-foreground'>
                  Si existe una cuenta con este email, recibirás un correo con instrucciones para
                  recuperar tu contraseña.
                </p>
                <p className='text-sm text-muted-foreground'>
                  Revisa tu bandeja de entrada y también la carpeta de spam.
                </p>
              </div>
            </div>
            <Button onClick={handleClose} className='w-full'>
              Entendido
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='usuario@ejemplo.com'
                        autoComplete='email'
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex justify-end gap-3 pt-4'>
                <Button type='button' variant='outline' onClick={handleClose} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type='submit' disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <IconLoader className='mr-2 h-4 w-4 animate-spin' />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <IconMail className='mr-2 h-4 w-4' />
                      Enviar Enlace
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
