import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IconCircleCheck, IconArrowLeft } from '@tabler/icons-react'
import Link from 'next/link'

/**
 * Componente que se muestra cuando no hay tareas pendientes
 */
export function PendingTasksEmpty() {
  return (
    <Card className='py-16'>
      <CardContent className='text-center space-y-6'>
        <div className='mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center'>
          <IconCircleCheck className='h-8 w-8 text-green-600' />
        </div>

        <div className='space-y-2'>
          <h2 className='text-2xl font-semibold text-green-900'>¡Excelente trabajo!</h2>
          <p className='text-muted-foreground max-w-md mx-auto'>
            No hay tareas pendientes en este momento. Todos los recursos con estado "completed" o
            "failed" tienen confianza "trusted" o "verified".
          </p>
        </div>

        <div className='flex flex-col sm:flex-row gap-3 justify-center'>
          <Button asChild>
            <Link href='/admin'>
              <IconArrowLeft className='h-4 w-4 mr-2' />
              Volver al Dashboard
            </Link>
          </Button>

          <Button variant='outline' asChild>
            <Link href='/clients'>Ver Clientes</Link>
          </Button>
        </div>

        <div className='text-xs text-muted-foreground'>
          Las tareas aparecerán aquí automáticamente cuando haya recursos que requieran revisión
        </div>
      </CardContent>
    </Card>
  )
}
