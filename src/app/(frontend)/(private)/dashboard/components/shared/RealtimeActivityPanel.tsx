import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  IconFileText,
  IconCircleCheck,
  IconAlertTriangle,
  IconCircleX,
  IconInfoCircle,
  IconRefresh,
  IconExternalLink,
} from '@tabler/icons-react'
import { getRealtimeActivity } from '@/actions/dashboard'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { getServerTranslations } from '@/lib/server-translations'

/**
 * Panel de actividad en tiempo real
 * Muestra las últimas acciones del usuario o sistema
 * @param userId - Opcional. Si se proporciona, filtra actividad por ese usuario. Si no se proporciona, muestra vista de administrador (todo)
 */
export default async function RealtimeActivityPanel({ userId }: { userId?: string }) {
  // Obtener actividad reciente del servidor
  // Si userId es undefined = vista admin (ver todo)
  // Si userId está definido = vista de usuario específico (filtrar por ese usuario)
  const result = await getRealtimeActivity(8, userId)

  const activities = result.success && result.data ? result.data : []

  const { t, locale } = await getServerTranslations('realtimeActivityPanel')

  // Debug: mostrar información de traducción
  console.log('[RealtimeActivityPanel] Server translation locale:', locale)
  console.log('[RealtimeActivityPanel] Activities count:', activities.length)

  // Debug: probar interpolación directa
  const testResult = t('activities.resourceCreated.description', {
    resourceTitle: 'TEST_RESOURCE',
    projectTitle: 'TEST_PROJECT',
  })
  console.log('[RealtimeActivityPanel] Test interpolation result:', testResult)

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return {
          color: 'h-2 w-2 bg-green-500 rounded-full',
          bgColor: 'bg-green-50',
          icon: IconCircleCheck,
          iconColor: 'text-green-600',
        }
      case 'warning':
        return {
          color: 'h-2 w-2 bg-yellow-500 rounded-full',
          bgColor: 'bg-yellow-50',
          icon: IconAlertTriangle,
          iconColor: 'text-yellow-600',
        }
      case 'error':
        return {
          color: 'h-2 w-2 bg-red-500 rounded-full',
          bgColor: 'bg-red-50',
          icon: IconCircleX,
          iconColor: 'text-red-600',
        }
      case 'info':
      default:
        return {
          color: 'h-2 w-2 bg-blue-500 rounded-full',
          bgColor: 'bg-blue-50',
          icon: IconInfoCircle,
          iconColor: 'text-blue-600',
        }
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'resource_created':
        return t('activityTypes.resourceCreated')
      case 'resource_processed':
        return t('activityTypes.resourceProcessed')
      case 'resource_updated':
        return t('activityTypes.resourceUpdated')
      case 'project_created':
        return t('activityTypes.projectCreated')
      case 'user_joined':
        return t('activityTypes.userJoined')
      default:
        return t('activityTypes.default')
    }
  }

  const getActivityTitle = (activity: any) => {
    switch (activity.type) {
      case 'resource_created':
        return t('activities.resourceCreated.title')
      case 'resource_processed':
        return t('activities.resourceProcessed.title')
      case 'resource_updated':
        return t('activities.resourceUpdated.title')
      case 'project_created':
        return t('activities.projectCreated.title')
      default:
        return t('activities.default.title')
    }
  }

  const getActivityDescription = (activity: any) => {
    // Debug: mostrar datos de la actividad
    console.log('[RealtimeActivityPanel] Activity data:', {
      type: activity.type,
      resource: activity.resource,
      project: activity.project,
    })

    switch (activity.type) {
      case 'resource_created':
        const variables = {
          resourceTitle: activity.resource?.title || '',
          projectTitle: activity.project?.title || '',
        }
        console.log('[RealtimeActivityPanel] Variables for interpolation:', variables)
        const result = t('activities.resourceCreated.description', variables)
        console.log('[RealtimeActivityPanel] Translation result:', result)
        return result
      case 'resource_processed':
        const isSuccess = activity.resource?.confidence === 'trusted'
        return t('activities.resourceProcessed.description', {
          resourceTitle: activity.resource?.title || '',
          status: isSuccess ? t('processingStatus.success') : t('processingStatus.warning'),
        })
      case 'resource_updated':
        return t('activities.resourceUpdated.description', {
          resourceTitle: activity.resource?.title || '',
        })
      case 'project_created':
        return t('activities.projectCreated.description', {
          projectTitle: activity.project?.title || '',
        })
      default:
        return t('activities.default.description')
    }
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <IconFileText className='h-5 w-5' />
            {t('recentActivity')}
          </CardTitle>
          <CardDescription>{t('lastActions')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8'>
            <IconFileText className='h-12 w-12 text-gray-400 mx-auto mb-4' />
            <p className='text-gray-500 mb-2'>{t('noRecentActivity')}</p>
            <p className='text-sm text-gray-400'>{t('recentActivityDescription')}</p>
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
              <IconFileText className='h-5 w-5' />
              {t('recentActivity')}
              <Badge variant='outline' className='ml-2'>
                {activities.length}
              </Badge>
            </CardTitle>
            <CardDescription>{t('lastActions')}</CardDescription>
          </div>
          <Button variant='ghost' size='sm'>
            <IconRefresh className='h-4 w-4' />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {activities.map((activity) => {
            const statusConfig = getStatusConfig(activity.status)

            return (
              <div
                key={activity.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${statusConfig.bgColor}`}
              >
                <div className={statusConfig.color}></div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 mb-1'>
                    <p className='font-medium text-sm'>{getActivityTitle(activity)}</p>
                    <Badge variant='outline' className='text-xs'>
                      {getTypeLabel(activity.type)}
                    </Badge>
                    {activity.priority === 'high' && (
                      <Badge variant='destructive' className='text-xs'>
                        {t('priority.urgent')}
                      </Badge>
                    )}
                  </div>
                  <p className='text-sm text-gray-600 mb-2'>{getActivityDescription(activity)}</p>
                  <div className='flex items-center justify-between'>
                    <div className='text-xs text-gray-500'>
                      {activity.project && (
                        <span className='font-medium'>{activity.project.title}</span>
                      )}
                      {activity.project && ' • '}
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                        locale: es,
                      })}
                      {activity.user && <span className='ml-1'>por {activity.user.name}</span>}
                    </div>
                    {(activity.resource || activity.project) && (
                      <Button variant='ghost' size='sm' className='h-6 px-2 text-xs' asChild>
                        <a
                          href={
                            activity.resource
                              ? `/projects/${activity.project?.id}/resource/${activity.resource.id}`
                              : `/projects/${activity.project?.id}`
                          }
                        >
                          <IconExternalLink className='h-3 w-3' />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {activities.length >= 8 && (
          <div className='mt-4 pt-4 border-t'>
            <Button variant='outline' className='w-full' size='sm'>
              {t('viewAllActivity')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
