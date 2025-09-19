import { redirect } from 'next/navigation'
import { getServerTranslations } from '@/lib/server-translations'

import { getCurrentUser } from '@/actions/auth/getUser'
import { getUserSubscription } from '@/actions/subscriptions'
import { getSubscriptionPlansWithDynamicPrices } from '@/lib/stripe'

import CurrentSubscriptionCard from '@/app/(frontend)/pricing/components/CurrentSubscriptionCard'
import PricingPlanCard from '@/app/(frontend)/pricing/components/PricingPlanCard'

export default async function PricingContent() {
  // Verificar autenticación
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const { t, locale } = await getServerTranslations('pricing')
  console.log('[PricingContent] Server Component locale detected:', locale)

  // Obtener suscripción actual del usuario y planes con precios dinámicos
  const [subscriptionResult, subscriptionPlans] = await Promise.all([
    getUserSubscription(),
    getSubscriptionPlansWithDynamicPrices(),
  ])
  const currentSubscription = subscriptionResult.success ? subscriptionResult.data : null

  // Determinar si mostrar suscripción actual arriba (para planes de pago)
  const showSubscriptionFirst = currentSubscription && currentSubscription.planId !== 'free'

  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Header */}
      <div className='text-center mb-12'>
        <h1 className='text-4xl font-bold mb-4'>{t('title')}</h1>
        <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>{t('description')}</p>
      </div>

      {/* Current Subscription - Arriba si tiene plan de pago */}
      {showSubscriptionFirst && (
        <div className='max-w-2xl mx-auto mb-16'>
          <h2 className='text-2xl font-semibold text-center mb-6'>{t('currentSubscription')}</h2>
          <CurrentSubscriptionCard subscription={currentSubscription} />
        </div>
      )}

      {/* Plans Grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16'>
        {Object.entries(subscriptionPlans).map(([planId, plan]) => (
          <PricingPlanCard
            key={planId}
            plan={plan}
            planId={planId as keyof typeof subscriptionPlans}
            currentPlan={currentSubscription?.planId}
            isPopular={planId === 'basic'}
          />
        ))}
      </div>

      {/* Current Subscription - Abajo si es plan gratuito */}
      {currentSubscription && !showSubscriptionFirst && (
        <div className='max-w-2xl mx-auto'>
          <h2 className='text-2xl font-semibold text-center mb-6'>{t('currentSubscription')}</h2>
          <CurrentSubscriptionCard subscription={currentSubscription} />
        </div>
      )}
    </div>
  )
}
