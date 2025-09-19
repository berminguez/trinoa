import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  IconCircleCheck,
  IconAlertTriangle,
  IconCircleX,
  IconRefresh,
  IconLoader,
} from '@tabler/icons-react'
import { getAlertsStats, getDashboardMetrics } from '@/actions/dashboard'
import { getServerTranslations } from '@/lib/server-translations'

/**
 * Indicador de salud del sistema en tiempo real
 * Muestra el estado general y alertas críticas
 */
export default async function SystemHealthIndicator() {
  // Obtener traducciones y locale
  const { t, locale } = await getServerTranslations('systemHealth')

  // Obtener métricas y alertas en paralelo
  const [metricsResult, alertsResult] = await Promise.all([getDashboardMetrics(), getAlertsStats()])

  const metrics = metricsResult.success && metricsResult.data ? metricsResult.data : null
  const alerts = alertsResult.success && alertsResult.data ? alertsResult.data : null

  // Determinar estado general del sistema
  const getSystemStatus = () => {
    if (!metrics || !alerts) {
      return {
        status: 'unknown',
        label: 'Desconocido',
        color: 'bg-gray-100 text-gray-800',
        icon: IconRefresh,
        iconColor: 'text-gray-600',
      }
    }

    // Verificar alertas críticas
    if (alerts.high > 0) {
      return {
        status: 'critical',
        label: 'Crítico',
        color: 'bg-red-100 text-red-800',
        icon: IconCircleX,
        iconColor: 'text-red-600',
      }
    }

    // Verificar procesamiento atascado o métricas bajas
    const processingIssues = metrics.system?.processingQueue && metrics.system.processingQueue > 10
    const lowSuccess = metrics.system?.processingSuccess && metrics.system.processingSuccess < 90

    if (processingIssues || lowSuccess || alerts.medium > 5) {
      return {
        status: 'warning',
        label: 'Advertencia',
        color: 'bg-yellow-100 text-yellow-800',
        icon: IconAlertTriangle,
        iconColor: 'text-yellow-600',
      }
    }

    // Sistema funcionando bien
    return {
      status: 'healthy',
      label: 'Saludable',
      color: 'bg-green-100 text-green-800',
      icon: IconCircleCheck,
      iconColor: 'text-green-600',
    }
  }

  const systemStatus = getSystemStatus()
  const IconComponent = systemStatus.icon

  const getHealthMetrics = () => {
    if (!metrics || !alerts) return []

    const healthMetrics = []

    // Procesamiento
    if (metrics.system?.processingSuccess) {
      healthMetrics.push({
        label: 'Procesamiento',
        value: `${metrics.system.processingSuccess}%`,
        status:
          metrics.system.processingSuccess >= 95
            ? 'good'
            : metrics.system.processingSuccess >= 85
              ? 'warning'
              : 'bad',
      })
    }

    // Alertas
    healthMetrics.push({
      label: 'Alertas',
      value: (alerts?.total || 0).toString(),
      status: alerts?.high > 0 ? 'bad' : (alerts?.medium || 0) > 3 ? 'warning' : 'good',
    })

    // Almacenamiento
    if (metrics.system?.storageUsed) {
      healthMetrics.push({
        label: 'Almacenamiento',
        value: `${metrics.system.storageUsed}%`,
        status:
          metrics.system.storageUsed >= 90
            ? 'bad'
            : metrics.system.storageUsed >= 75
              ? 'warning'
              : 'good',
      })
    }

    // Cola de procesamiento
    if (metrics.system?.processingQueue !== undefined) {
      healthMetrics.push({
        label: 'Cola',
        value: metrics.system.processingQueue.toString(),
        status:
          metrics.system.processingQueue > 20
            ? 'bad'
            : metrics.system.processingQueue > 10
              ? 'warning'
              : 'good',
      })
    }

    return healthMetrics
  }

  const healthMetrics = getHealthMetrics()

  return (
    <div className='bg-white border rounded-lg p-4'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2'>
            <IconComponent className={`h-5 w-5 ${systemStatus.iconColor}`} />
            <span className='font-medium text-sm'>Estado del Sistema</span>
          </div>
          <Badge className={systemStatus.color}>{systemStatus.label}</Badge>
        </div>
        <div className='flex items-center gap-2'>
          <IconLoader className='h-4 w-4 text-gray-400 animate-spin' />
          <Button variant='ghost' size='sm' className='h-6 px-2'>
            <IconRefresh className='h-3 w-3' />
          </Button>
        </div>
      </div>

      {healthMetrics.length > 0 && (
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
          {healthMetrics.map((metric, index) => {
            const getMetricColor = (status: string) => {
              switch (status) {
                case 'good':
                  return 'text-green-600'
                case 'warning':
                  return 'text-yellow-600'
                case 'bad':
                  return 'text-red-600'
                default:
                  return 'text-gray-600'
              }
            }

            return (
              <div key={index} className='text-center'>
                <div className={`text-lg font-bold ${getMetricColor(metric.status)}`}>
                  {metric.value}
                </div>
                <div className='text-xs text-gray-500'>{metric.label}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Mensaje de estado detallado */}
      <div className='mt-3 pt-3 border-t'>
        <p className='text-xs text-gray-600'>
          {systemStatus.status === 'healthy' && t('healthyStatus')}
          {systemStatus.status === 'warning' && t('warningStatus')}
          {systemStatus.status === 'critical' && t('criticalStatus')}
          {systemStatus.status === 'unknown' && t('unknownStatus')}

          {metrics?.system && (
            <span className='ml-1'>
              {t('lastUpdate')} {new Date().toLocaleTimeString(locale === 'es' ? 'es-ES' : 'en-US')}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
