import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { IconFiles, IconShieldCheck, IconFileCheck, IconClock } from '@tabler/icons-react'
import { getDashboardMetrics } from '@/actions/dashboard'
import { getServerTranslations } from '@/lib/server-translations'

/**
 * Componente que muestra métricas globales del sistema para administradores
 */
export default async function GlobalMetrics() {
  // Obtener métricas reales del servidor
  const result = await getDashboardMetrics()

  // Usar nuestro helper para detectar locale correctamente en Server Components
  const { t, locale } = await getServerTranslations('dashboardAdmin')

  // Debug: mostrar el locale detectado en server component
  console.log('[GlobalMetrics] Server Component locale detected:', locale)

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
      title: t('totalResources'),
      value: metrics.totalResources,
      description: t('inEntireSystem'),
      icon: IconFiles,
      color: 'text-blue-600',
    },
    {
      title: t('trustedResources'),
      value: metrics.trustedResources,
      description: t('trustedResourcesDesc'),
      icon: IconShieldCheck,
      color: 'text-green-600',
    },
    {
      title: t('verifiedResources'),
      value: metrics.verifiedResources,
      description: t('verifiedResourcesDesc'),
      icon: IconFileCheck,
      color: 'text-blue-600',
    },
    {
      title: t('pendingReview'),
      value: metrics.needsReview,
      description: t('needsReviewDesc'),
      icon: IconClock,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
      {cards.map((card, index) => {
        const IconComponent = card.icon
        return (
          <Card key={index}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>{card.title}</CardTitle>
              <IconComponent className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{card.value.toLocaleString()}</div>
              <p className='text-xs text-muted-foreground'>{card.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
