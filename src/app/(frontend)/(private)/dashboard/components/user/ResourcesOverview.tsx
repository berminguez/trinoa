import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { IconFiles, IconShieldCheck, IconFileCheck, IconClock } from '@tabler/icons-react'
import { getDashboardMetrics } from '@/actions/dashboard'

interface ResourcesOverviewProps {
  userId: string
}

/**
 * Componente que muestra overview de recursos personales del usuario
 */
export default async function ResourcesOverview({ userId }: ResourcesOverviewProps) {
  // Obtener métricas reales del servidor
  const result = await getDashboardMetrics()

  // Fallback a datos demo si hay error
  const metrics =
    result.success && result.data
      ? {
          totalResources: result.data.resources.total,
          trustedResources: result.data.resources.trusted,
          verifiedResources: result.data.resources.verified,
          needsReview: result.data.resources.needsReview,
        }
      : {
          totalResources: 0,
          trustedResources: 0,
          verifiedResources: 0,
          needsReview: 0,
        }

  const cards = [
    {
      title: 'Mis Recursos',
      value: metrics.totalResources,
      description: 'Total de documentos',
      icon: IconFiles,
      color: 'text-blue-600',
    },
    {
      title: 'Trusted',
      value: metrics.trustedResources,
      description: 'Recursos confiables',
      icon: IconShieldCheck,
      color: 'text-green-600',
    },
    {
      title: 'Verified',
      value: metrics.verifiedResources,
      description: 'Recursos verificados',
      icon: IconFileCheck,
      color: 'text-blue-600',
    },
    {
      title: 'Pendientes',
      value: metrics.needsReview,
      description: 'Necesitan revisión',
      icon: IconClock,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {cards.map((card, index) => {
        const IconComponent = card.icon
        return (
          <Card key={index}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>{card.title}</CardTitle>
              <IconComponent className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{card.value}</div>
              <p className='text-xs text-muted-foreground'>{card.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
