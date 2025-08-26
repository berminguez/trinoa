import { IconCheck, IconArrowRight } from '@tabler/icons-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface SuccessPageProps {
  searchParams: Promise<{
    session_id?: string
  }>
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams

  return (
    <div className='container mx-auto px-4 py-16'>
      <div className='max-w-2xl mx-auto text-center'>
        {/* Success Icon */}
        <div className='flex justify-center mb-8'>
          <div className='w-20 h-20 bg-green-100 rounded-full flex items-center justify-center'>
            <IconCheck className='w-10 h-10 text-green-600' />
          </div>
        </div>

        {/* Success Message */}
        <h1 className='text-4xl font-bold mb-4'>¡Suscripción activada!</h1>
        <p className='text-lg text-muted-foreground mb-8'>
          Tu suscripción se ha activado correctamente. Ya puedes disfrutar de todas las
          funcionalidades de tu nuevo plan.
        </p>

        {/* Success Card */}
        <Card className='mb-8'>
          <CardHeader>
            <h2 className='text-xl font-semibold'>¿Qué puedes hacer ahora?</h2>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-left'>
              <div className='flex items-start gap-3'>
                <IconCheck className='w-5 h-5 text-green-600 mt-1 flex-shrink-0' />
                <div>
                  <h3 className='font-medium'>Procesa videos</h3>
                  <p className='text-sm text-muted-foreground'>
                    Sube y analiza videos según los límites de tu plan
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-3'>
                <IconCheck className='w-5 h-5 text-green-600 mt-1 flex-shrink-0' />
                <div>
                  <h3 className='font-medium'>Chat con IA</h3>
                  <p className='text-sm text-muted-foreground'>
                    Haz preguntas sobre el contenido de tus videos
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-3'>
                <IconCheck className='w-5 h-5 text-green-600 mt-1 flex-shrink-0' />
                <div>
                  <h3 className='font-medium'>Almacenamiento</h3>
                  <p className='text-sm text-muted-foreground'>
                    Guarda y organiza todo tu contenido
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-3'>
                <IconCheck className='w-5 h-5 text-green-600 mt-1 flex-shrink-0' />
                <div>
                  <h3 className='font-medium'>Análisis avanzado</h3>
                  <p className='text-sm text-muted-foreground'>
                    Obtén insights detallados de tus videos
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className='flex flex-col sm:flex-row gap-4 justify-center'>
          <Button asChild size='lg'>
            <Link href='/dashboard'>
              Ir al Dashboard
              <IconArrowRight className='w-4 h-4 ml-2' />
            </Link>
          </Button>

          <Button variant='outline' size='lg' asChild>
            <Link href='/pricing'>Ver mi suscripción</Link>
          </Button>
        </div>

        {/* Additional Info */}
        <div className='mt-12 p-6 bg-muted rounded-lg'>
          <h3 className='font-semibold mb-2'>Información importante</h3>
          <div className='text-sm text-muted-foreground space-y-2'>
            <p>• Tu suscripción se renueva automáticamente cada mes</p>
            <p>• Puedes cancelar en cualquier momento desde tu cuenta</p>
            <p>• Recibirás un recibo por email en breve</p>
            <p>• ¿Necesitas ayuda? Contáctanos en support@trinoa.es</p>
          </div>
        </div>

        {/* Session ID for debugging (remove in production) */}
        {params.session_id && process.env.NODE_ENV === 'development' && (
          <div className='mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600'>
            Session ID: {params.session_id}
          </div>
        )}
      </div>
    </div>
  )
}
