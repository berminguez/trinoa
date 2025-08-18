import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IconUsers, IconFolder, IconExternalLink } from '@tabler/icons-react'
import { getDashboardMetrics } from '@/actions/dashboard'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Componente que muestra overview de usuarios del sistema para administradores
 */
export default async function UsersOverview() {
  // Obtener métricas reales del servidor
  const result = await getDashboardMetrics()

  // Obtener datos de usuarios si están disponibles
  const users =
    result.success && result.data?.users?.recentActivity
      ? result.data.users.recentActivity.map((user) => ({
          id: user.id,
          name: user.name || user.email || 'Usuario',
          email: user.email,
          role: 'user',
          projectsCount: user.projectsCount || 0,
          lastActivity: formatDistanceToNow(new Date(user.lastActivity), {
            addSuffix: true,
            locale: es,
          }),
          status: 'active',
        }))
      : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <IconUsers className='h-5 w-5' />
          Clientes
        </CardTitle>
        <CardDescription>Acceso a los proyectos de cada cliente</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {users.length === 0 ? (
            <div className='text-center py-8'>
              <IconUsers className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-500 mb-2'>No hay usuarios registrados</p>
              <p className='text-sm text-gray-400'>
                Los usuarios aparecerán aquí cuando se registren
              </p>
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
              >
                <div className='flex items-center gap-3'>
                  <div className='h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium'>
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className='font-medium text-sm'>{user.name}</p>
                    <p className='text-xs text-gray-500'>{user.email}</p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <div className='text-right'>
                    <div className='flex items-center gap-1 text-xs text-gray-600'>
                      <IconFolder className='h-3 w-3' />
                      {user.projectsCount || 0} proyectos
                    </div>
                    <p className='text-xs text-gray-500'>Activo hace {user.lastActivity}</p>
                  </div>
                  <Button variant='ghost' size='sm' asChild>
                    <a href={`/clients/${user.id}`}>
                      <IconExternalLink className='h-3 w-3' />
                    </a>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className='mt-4 pt-4 border-t'>
          <Button variant='outline' className='w-full' asChild>
            <a href='/clients'>Ver todos los clientes</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
