'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { getCurrentUser } from '@/actions/auth/getUser'
import {
  createCheckoutSession,
  getOrCreateStripeCustomer,
  getStripeSubscriptionDetails,
  subscriptionPlans,
  type SubscriptionPlanId,
} from '@/lib/stripe'
import config from '@/payload.config'

// ============================================================================
// SUBSCRIPTION MANAGEMENT ACTIONS
// ============================================================================

export async function createSubscriptionCheckout(planId: SubscriptionPlanId) {
  try {
    const payload = await getPayload({ config })
    const user = await getCurrentUser()

    if (!user) {
      redirect('/login')
      return // Esto nunca se ejecuta pero ayuda a TypeScript
    }

    // Verificar que el plan sea válido y no sea gratuito
    if (planId === 'free') {
      return {
        success: false,
        error: 'El plan gratuito no requiere checkout',
      }
    }

    if (!subscriptionPlans[planId]) {
      return {
        success: false,
        error: 'Plan de suscripción no válido',
      }
    }

    // Obtener o crear customer de Stripe
    const customerId = await getOrCreateStripeCustomer(user.id, user.email)

    // Obtener URL base de manera inteligente
    const getBaseUrl = () => {
      // En producción, usar NEXT_PUBLIC_SITE_URL si existe
      if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL
      }

      // En desarrollo o si no está configurado, usar localhost
      return 'http://localhost:3000'
    }

    const baseUrl = getBaseUrl()

    // Crear sesión de checkout
    const session = await createCheckoutSession({
      planId,
      userId: user.id,
      userEmail: user.email,
      successUrl: `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing`,
      customerId,
    })

    return {
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return {
      success: false,
      error: 'Error al crear la sesión de checkout',
    }
  }
}

export async function getUserSubscription() {
  try {
    const payload = await getPayload({ config })
    const user = await getCurrentUser()

    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    // Buscar suscripción en PayloadCMS
    const subscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        user: { equals: user.id },
        status: { not_equals: 'canceled' },
      },
      limit: 1,
    })

    // Si no hay suscripción, devolver plan gratuito
    if (!subscriptions.docs.length) {
      return {
        success: true,
        data: {
          planId: 'free' as const,
          planName: 'Plan Free',
          status: 'active' as const,
          limits: {
            videosPerMonth: 3,
            messagesPerMonth: 50,
            storageGB: 1,
          },
          currentUsage: {
            videosProcessed: 0,
            messagesUsed: 0,
            storageUsedGB: 0,
          },
          isFromStripe: false,
        },
      }
    }

    const subscription = subscriptions.docs[0]

    // Si hay stripeSubscriptionId, obtener datos reales de Stripe
    let stripeData = null
    if (subscription.stripeSubscriptionId) {
      console.log('🔍 Fetching Stripe data for subscription:', subscription.stripeSubscriptionId)
      const stripeResult = await getStripeSubscriptionDetails(subscription.stripeSubscriptionId)

      if (stripeResult.success) {
        stripeData = stripeResult.data
        console.log('✅ Stripe data obtained successfully')
      } else {
        console.error('❌ Failed to get Stripe data:', stripeResult.error)
        // Para suscripciones activas de Stripe, esto es un error crítico
        return {
          success: false,
          error: `Error obteniendo datos de suscripción desde Stripe: ${stripeResult.error}`,
        }
      }

      console.log('📊 Stripe result:', {
        success: stripeResult.success,
        hasData: !!stripeData,
        stripeDataKeys: stripeData ? Object.keys(stripeData) : null,
        dates: stripeData
          ? {
              start: stripeData.currentPeriodStart,
              end: stripeData.currentPeriodEnd,
              startValid:
                stripeData.currentPeriodStart instanceof Date &&
                !isNaN(stripeData.currentPeriodStart.getTime()),
              endValid:
                stripeData.currentPeriodEnd instanceof Date &&
                !isNaN(stripeData.currentPeriodEnd.getTime()),
            }
          : null,
      })
    }

    // Si no hay datos de Stripe, calcular fechas para suscripción mensual
    let calculatedStripeData = null
    if (!stripeData) {
      const createdAt = new Date(subscription.createdAt)
      const currentDate = new Date()

      // Calcular el inicio del período actual (primer día del mes de creación o mes actual)
      const currentPeriodStart = new Date(
        createdAt.getFullYear(),
        createdAt.getMonth(),
        createdAt.getDate(),
      )

      // Si ya pasó más de un mes, ajustar al mes actual
      if (currentDate > currentPeriodStart) {
        const monthsDiff =
          (currentDate.getFullYear() - createdAt.getFullYear()) * 12 +
          (currentDate.getMonth() - createdAt.getMonth())
        currentPeriodStart.setMonth(currentPeriodStart.getMonth() + monthsDiff)
      }

      // Calcular el fin del período (un mes después del inicio)
      const currentPeriodEnd = new Date(currentPeriodStart)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)

      calculatedStripeData = {
        id: `local_${subscription.id}`,
        status: subscription.status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        priceId: subscription.stripePriceId || 'local_price',
        amount: subscription.planId === 'basic' ? 20 : subscription.planId === 'pro' ? 50 : 0,
        currency: 'eur',
        interval: 'month',
        customerEmail: null,
      }
    }

    const finalData = {
      ...subscription,
      stripeData: stripeData || calculatedStripeData, // Usar datos calculados si no hay Stripe
      isFromStripe: !!stripeData,
      realAmount:
        stripeData?.amount ||
        calculatedStripeData?.amount ||
        (subscription.planId === 'basic' ? 20 : subscription.planId === 'pro' ? 50 : 0),
      realStatus: stripeData?.status || subscription.status,
      realCurrentPeriodEnd:
        stripeData?.currentPeriodEnd || calculatedStripeData?.currentPeriodEnd || null,
    }

    console.log('✅ Final subscription data being returned:', {
      planId: finalData.planId,
      isFromStripe: finalData.isFromStripe,
      hasStripeData: !!finalData.stripeData,
      stripeDataType: finalData.stripeData ? (stripeData ? 'real' : 'calculated') : 'none',
      realCurrentPeriodEnd: finalData.realCurrentPeriodEnd,
      stripeDataDates: finalData.stripeData
        ? {
            start: finalData.stripeData.currentPeriodStart,
            end: finalData.stripeData.currentPeriodEnd,
          }
        : null,
    })

    return {
      success: true,
      data: finalData,
    }
  } catch (error) {
    console.error('Error getting user subscription:', error)
    return {
      success: false,
      error: 'Error al obtener la suscripción del usuario',
    }
  }
}
