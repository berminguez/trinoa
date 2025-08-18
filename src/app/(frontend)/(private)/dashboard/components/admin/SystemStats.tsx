import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { IconServer, IconDatabase, IconCpu, IconTrendingUp } from '@tabler/icons-react'
import { getDashboardMetrics } from '@/actions/dashboard'

/**
 * Componente que muestra estadísticas operativas del sistema para administradores
 */
export default async function SystemStats() {
  // Obtener métricas reales del servidor
  const result = await getDashboardMetrics()

  // Obtener estadísticas del sistema si están disponibles
  const stats =
    result.success && result.data?.system
      ? {
          storageUsed: result.data.system.storageUsed,
          storageTotal: result.data.system.storageTotal,
          processingSuccess: result.data.system.processingSuccess,
          processingFailed: result.data.system.processingFailed,
          activeUsers: result.data.system.activeUsers,
          totalProjects: result.data.system.totalProjects,
          processingQueue: result.data.system.processingQueue,
        }
      : {
          storageUsed: 0,
          storageTotal: '0 TB',
          processingSuccess: 0,
          processingFailed: 0,
          activeUsers: 0,
          totalProjects: 0,
          processingQueue: 0,
        }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <IconServer className='h-5 w-5' />
          Estadísticas del Sistema
        </CardTitle>
        <CardDescription>Métricas operativas y rendimiento</CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Uso de almacenamiento */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <IconDatabase className='h-4 w-4 text-blue-500' />
              <span className='text-sm font-medium'>Almacenamiento</span>
            </div>
            <span className='text-sm text-gray-600'>{stats.storageUsed}%</span>
          </div>
          <Progress value={stats.storageUsed} className='h-2' />
          <p className='text-xs text-gray-500'>{stats.storageTotal} total disponible</p>
        </div>

        {/* Éxito de procesamiento */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <IconCpu className='h-4 w-4 text-green-500' />
              <span className='text-sm font-medium'>Éxito de Procesamiento</span>
            </div>
            <span className='text-sm text-gray-600'>{stats.processingSuccess}%</span>
          </div>
          <Progress value={stats.processingSuccess} className='h-2' />
          <p className='text-xs text-gray-500'>{stats.processingFailed} procesos fallidos en 24h</p>
        </div>

        {/* Métricas rápidas */}
        <div className='grid grid-cols-2 gap-4 pt-4 border-t'>
          <div className='text-center'>
            <div className='text-2xl font-bold text-blue-600'>{stats.activeUsers}</div>
            <p className='text-xs text-gray-500'>Usuarios activos</p>
          </div>
          <div className='text-center'>
            <div className='text-2xl font-bold text-green-600'>{stats.totalProjects}</div>
            <p className='text-xs text-gray-500'>Proyectos totales</p>
          </div>
        </div>

        {/* Cola de procesamiento */}
        {stats.processingQueue > 0 && (
          <div className='flex items-center gap-2 p-3 bg-yellow-50 rounded-lg'>
            <IconTrendingUp className='h-4 w-4 text-yellow-600' />
            <div>
              <p className='text-sm font-medium text-yellow-800'>
                {stats.processingQueue} documentos en cola
              </p>
              <p className='text-xs text-yellow-600'>Procesamiento en curso</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
