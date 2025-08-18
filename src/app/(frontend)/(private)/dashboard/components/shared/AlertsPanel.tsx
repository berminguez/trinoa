import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  IconAlertTriangle,
  IconClock,
  IconExclamationCircle,
  IconExternalLink,
  IconRefresh,
} from '@tabler/icons-react'
import { getResourcesNeedingAttention } from '@/actions/dashboard'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Panel de alertas que muestra recursos que necesitan atención
 * Usado tanto en dashboard de admin como de usuario
 */
export default async function AlertsPanel() {
  // Obtener alertas del servidor
  const result = await getResourcesNeedingAttention()

  const alerts = result.success && result.data ? result.data : []

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: IconExclamationCircle,
          iconColor: 'text-red-600',
        }
      case 'medium':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: IconAlertTriangle,
          iconColor: 'text-yellow-600',
        }
      case 'low':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: IconClock,
          iconColor: 'text-blue-600',
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: IconClock,
          iconColor: 'text-gray-600',
        }
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'needs-review':
        return 'Necesita Revisión'
      case 'processing-failed':
        return 'Error de Procesamiento'
      case 'processing-stuck':
        return 'Procesamiento Atascado'
      case 'low-confidence':
        return 'Baja Confianza'
      default:
        return 'Alerta'
    }
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <IconAlertTriangle className='h-5 w-5' />
            Alertas y Notificaciones
          </CardTitle>
          <CardDescription>Recursos que requieren tu atención</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8'>
            <div className='h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <IconAlertTriangle className='h-6 w-6 text-green-600' />
            </div>
            <p className='text-gray-500 mb-2'>¡Todo bien!</p>
            <p className='text-sm text-gray-400'>
              No hay recursos que requieran atención en este momento
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <IconAlertTriangle className='h-5 w-5' />
              Alertas y Notificaciones
              {alerts.length > 0 && (
                <Badge variant='destructive' className='ml-2'>
                  {alerts.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Recursos que requieren tu atención</CardDescription>
          </div>
          <Button variant='ghost' size='sm'>
            <IconRefresh className='h-4 w-4' />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {alerts.slice(0, 5).map((alert) => {
            const priorityConfig = getPriorityConfig(alert.priority)
            const IconComponent = priorityConfig.icon

            return (
              <div key={alert.id} className={`p-3 rounded-lg border ${priorityConfig.color}`}>
                <div className='flex items-start gap-3'>
                  <IconComponent className={`h-4 w-4 mt-0.5 ${priorityConfig.iconColor}`} />
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-1'>
                      <p className='font-medium text-sm truncate'>{alert.title}</p>
                      <Badge variant='outline' className='text-xs'>
                        {getTypeLabel(alert.type)}
                      </Badge>
                    </div>
                    <p className='text-xs opacity-90 mb-2'>{alert.message}</p>
                    <div className='flex items-center justify-between'>
                      <div className='text-xs opacity-75'>
                        <span className='font-medium'>{alert.project.title}</span>
                        {' • '}
                        {formatDistanceToNow(new Date(alert.updatedAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </div>
                      <Button variant='ghost' size='sm' className='h-6 px-2 text-xs' asChild>
                        <a href={`/projects/${alert.project.id}/resource/${alert.id}`}>
                          <IconExternalLink className='h-3 w-3' />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {alerts.length > 5 && (
          <div className='mt-4 pt-4 border-t'>
            <Button variant='outline' className='w-full' size='sm'>
              Ver todas las alertas ({alerts.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
