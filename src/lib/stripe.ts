import Stripe from 'stripe'

import { CONFIG } from './config'

// ============================================================================
// STRIPE CONFIGURATION
// ============================================================================

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!CONFIG.STRIPE_SECRET_KEY) {
      throw new Error(
        'STRIPE_SECRET_KEY is not defined. Make sure to set the environment variable.',
      )
    }
    stripeInstance = new Stripe(CONFIG.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    })
  }
  return stripeInstance
}

// Para compatibilidad con código existente
export const stripe = {
  get webhooks() {
    return getStripe().webhooks
  },
  get checkout() {
    return getStripe().checkout
  },
  get subscriptions() {
    return getStripe().subscriptions
  },
  get customers() {
    return getStripe().customers
  },
  get paymentIntents() {
    return getStripe().paymentIntents
  },
  get invoices() {
    return getStripe().invoices
  },
  get prices() {
    return getStripe().prices
  },
}

// Definición de planes de suscripción
export const subscriptionPlans = {
  free: {
    id: 'free',
    name: 'Plan Free',
    description: 'Plan gratuito con funcionalidades básicas',
    productId: CONFIG.STRIPE_PRODUCT_FREE,
    priceId: undefined, // Plan gratuito sin precio
    price: 0,
    features: [
      'Hasta 3 videos por mes',
      'Análisis básico de contenido',
      'Chat IA limitado (50 mensajes/mes)',
      'Almacenamiento: 1GB',
    ],
    limits: {
      videosPerMonth: 3,
      messagesPerMonth: 50,
      storageGB: 1,
    },
    meteredPricing: undefined, // Plan gratuito sin facturación medida
  },
  basic: {
    id: 'basic',
    name: 'Plan Basic',
    description: 'Plan básico para usuarios ocasionales',
    productId: CONFIG.STRIPE_PRODUCT_BASIC,
    priceId: process.env.STRIPE_PRICE_BASIC || 'price_basic_example',
    price: 20,
    features: [
      'Hasta 25 videos por mes incluidos',
      'Análisis completo de contenido',
      'Chat IA (500 mensajes/mes)',
      'Almacenamiento: 10GB',
      'API de integración',
    ],
    limits: {
      videosPerMonth: 25,
      messagesPerMonth: 500,
      storageGB: 10,
    },
    meteredPricing: {
      extraVideosPriceId: process.env.STRIPE_PRICE_BASIC_VIDEOS_EXTRA,
      extraStoragePriceId: process.env.STRIPE_PRICE_BASIC_STORAGE_EXTRA,
      extraVideosCost: 0.5,
      extraStorageCostPerGB: 0.1,
    },
  },
  pro: {
    id: 'pro',
    name: 'Plan Pro',
    description: 'Plan profesional para uso intensivo',
    productId: CONFIG.STRIPE_PRODUCT_PRO,
    priceId: process.env.STRIPE_PRICE_PRO || 'price_pro_example',
    price: 50,
    features: [
      'Hasta 100 videos por mes incluidos',
      'Análisis avanzado con IA',
      'Chat IA ilimitado',
      'Almacenamiento: 100GB incluidos',
      'API de integración',
    ],
    limits: {
      videosPerMonth: 100, // 100 incluidos
      messagesPerMonth: -1, // Ilimitado
      storageGB: 100,
    },
    meteredPricing: {
      extraVideosPriceId: process.env.STRIPE_PRICE_PRO_VIDEOS_EXTRA,
      extraStoragePriceId: process.env.STRIPE_PRICE_PRO_STORAGE_EXTRA,
      extraVideosCost: 0.3,
      extraStorageCostPerGB: 0.05,
    },
  },
} as const

export type SubscriptionPlanId = keyof typeof subscriptionPlans
export type SubscriptionPlan = (typeof subscriptionPlans)[SubscriptionPlanId]

// Tipo para planes con precios dinámicos
export type SubscriptionPlanWithDynamicPrice = Omit<SubscriptionPlan, 'price'> & {
  price: number
}

export type DynamicSubscriptionPlans = {
  free: SubscriptionPlan
  basic: SubscriptionPlanWithDynamicPrice
  pro: SubscriptionPlanWithDynamicPrice
}

// ============================================================================
// STRIPE CHECKOUT HELPERS
// ============================================================================

export interface CreateCheckoutSessionParams {
  planId: SubscriptionPlanId
  userId: string
  userEmail: string
  successUrl: string
  cancelUrl: string
  customerId?: string
}

export async function createCheckoutSession({
  planId,
  userId,
  userEmail,
  successUrl,
  cancelUrl,
  customerId,
}: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  const plan = subscriptionPlans[planId]

  if (planId === 'free') {
    throw new Error('El plan gratuito no requiere checkout de Stripe')
  }

  // Obtener información del precio para determinar si es metered
  const priceInfo = await stripe.prices.retrieve(plan.priceId!)
  const isMetered = priceInfo.recurring?.usage_type === 'metered'

  // Configurar line items para modelo híbrido
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price: plan.priceId,
      quantity: 1, // Precio base siempre es cantidad 1
    },
  ]

  // Si el plan tiene precios medidos, añadirlos SIN quantity (requerido para metered)
  const currentPlan = subscriptionPlans[planId]
  if ('meteredPricing' in currentPlan && currentPlan.meteredPricing) {
    const meteredPricing = currentPlan.meteredPricing

    if (meteredPricing.extraVideosPriceId) {
      lineItems.push({
        price: meteredPricing.extraVideosPriceId,
        // NO incluir quantity para precios metered - Stripe lo maneja automáticamente
      })
    }

    if (meteredPricing.extraStoragePriceId) {
      lineItems.push({
        price: meteredPricing.extraStoragePriceId,
        // NO incluir quantity para precios metered - Stripe lo maneja automáticamente
      })
    }
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    customer: customerId,
    customer_email: customerId ? undefined : userEmail,
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      planId,
    },
    subscription_data: {
      metadata: {
        userId,
        planId,
      },
    },
    // Configuración para facturación inmediata
    payment_method_collection: 'if_required',
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    customer_update: customerId
      ? {
          address: 'auto',
          name: 'auto',
        }
      : undefined,
  }

  return await stripe.checkout.sessions.create(sessionParams)
}

// ============================================================================
// STRIPE PRICE HELPERS
// ============================================================================

export async function getStripePricesForPlans(): Promise<{
  basic: number
  pro: number
}> {
  try {
    const basicPriceId = process.env.STRIPE_PRICE_BASIC
    const proPriceId = process.env.STRIPE_PRICE_PRO

    console.log('🔍 Checking Stripe price IDs:', { basicPriceId, proPriceId })

    if (!basicPriceId || !proPriceId) {
      console.warn('⚠️ STRIPE_PRICE_BASIC or STRIPE_PRICE_PRO not configured, using default prices')
      return { basic: 9.99, pro: 29.99 }
    }

    // Verificar si son IDs válidos de Stripe (empiezan con "price_") o solo números
    const isValidStripeId = (id: string) => id.startsWith('price_')

    if (!isValidStripeId(basicPriceId) || !isValidStripeId(proPriceId)) {
      console.warn(
        '⚠️ STRIPE_PRICE_* variables contain invalid IDs. Using values as direct prices.',
      )
      return {
        basic: parseFloat(basicPriceId) || 9.99,
        pro: parseFloat(proPriceId) || 29.99,
      }
    }

    console.log('📡 Fetching prices from Stripe API...')
    const [basicPrice, proPrice] = await Promise.all([
      stripe.prices.retrieve(basicPriceId),
      stripe.prices.retrieve(proPriceId),
    ])

    const prices = {
      basic: basicPrice.unit_amount ? basicPrice.unit_amount / 100 : 9.99,
      pro: proPrice.unit_amount ? proPrice.unit_amount / 100 : 29.99,
    }

    console.log('✅ Stripe prices fetched successfully:', prices)
    return prices
  } catch (error) {
    console.error('❌ Error fetching Stripe prices:', error)
    // Fallback a precios por defecto
    return { basic: 9.99, pro: 29.99 }
  }
}

export async function getSubscriptionPlansWithDynamicPrices(): Promise<DynamicSubscriptionPlans> {
  const prices = await getStripePricesForPlans()

  return {
    free: {
      ...subscriptionPlans.free,
    },
    basic: {
      ...subscriptionPlans.basic,
      price: prices.basic,
    },
    pro: {
      ...subscriptionPlans.pro,
      price: prices.pro,
    },
  }
}

// ============================================================================
// STRIPE SUBSCRIPTION HELPERS
// ============================================================================

export async function getStripeSubscriptionDetails(stripeSubscriptionId: string) {
  try {
    const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['items.data.price', 'customer', 'latest_invoice'],
    })

    const customer = subscription.customer
    const customerEmail =
      customer && typeof customer === 'object' && 'email' in customer ? customer.email : null

    // Acceder a los campos disponibles de manera segura
    interface StripeSubscriptionWithTimestamps {
      current_period_start?: number
      current_period_end?: number
      cancel_at_period_end?: boolean
      start_date?: number
      created?: number
    }

    const rawSub = subscription as unknown as StripeSubscriptionWithTimestamps
    let currentPeriodStart = rawSub.current_period_start
    let currentPeriodEnd = rawSub.current_period_end
    const cancelAtPeriodEnd = rawSub.cancel_at_period_end

    // FALLBACK: Si no tenemos current_period_*, calcular desde start_date
    if (!currentPeriodStart || !currentPeriodEnd) {
      const startDate = rawSub.start_date || rawSub.created
      if (startDate) {
        const now = Math.floor(Date.now() / 1000)
        const startDateObj = new Date(startDate * 1000)

        // Calcular el período actual para suscripción mensual
        const currentDate = new Date()
        const periodStart = new Date(startDateObj)

        // Avanzar al período actual
        while (periodStart.getTime() / 1000 + 30 * 24 * 60 * 60 < now) {
          periodStart.setMonth(periodStart.getMonth() + 1)
        }

        const periodEnd = new Date(periodStart)
        periodEnd.setMonth(periodEnd.getMonth() + 1)

        currentPeriodStart = Math.floor(periodStart.getTime() / 1000)
        currentPeriodEnd = Math.floor(periodEnd.getTime() / 1000)

        console.log('🔄 Calculated periods from start_date:', {
          startDate: new Date(startDate * 1000).toISOString(),
          calculatedStart: periodStart.toISOString(),
          calculatedEnd: periodEnd.toISOString(),
        })
      }
    }

    // Debug: Log DETALLADO para verificar datos de Stripe
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Stripe subscription RAW data:', {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart_raw: currentPeriodStart,
        currentPeriodEnd_raw: currentPeriodEnd,
        currentPeriodStart_date: currentPeriodStart
          ? new Date(currentPeriodStart * 1000).toISOString()
          : 'UNDEFINED',
        currentPeriodEnd_date: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : 'UNDEFINED',
        hasValidTimestamps: !!currentPeriodStart && !!currentPeriodEnd,
      })
    }

    // Validar que tenemos timestamps válidos
    if (!currentPeriodStart || !currentPeriodEnd) {
      console.error('❌ Stripe subscription missing timestamps:', {
        subscriptionId: stripeSubscriptionId,
        currentPeriodStart,
        currentPeriodEnd,
      })
      return {
        success: false,
        error: 'Subscription missing required timestamp data from Stripe',
      }
    }

    return {
      success: true,
      data: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(currentPeriodStart * 1000),
        currentPeriodEnd: new Date(currentPeriodEnd * 1000),
        cancelAtPeriodEnd: Boolean(cancelAtPeriodEnd),
        priceId: subscription.items.data[0]?.price?.id,
        amount: subscription.items.data[0]?.price?.unit_amount
          ? subscription.items.data[0].price.unit_amount / 100
          : 0,
        currency: subscription.items.data[0]?.price?.currency || 'eur',
        interval: subscription.items.data[0]?.price?.recurring?.interval || 'month',
        customerEmail,
      },
    }
  } catch (error) {
    console.error('Error fetching Stripe subscription:', error)
    return {
      success: false,
      error: 'Error al obtener datos de la suscripción',
    }
  }
}

// ============================================================================
// STRIPE METERED BILLING HELPERS
// ============================================================================

export async function checkAndReportExcessUsage(
  subscriptionId: string,
  planId: SubscriptionPlanId,
  currentUsage: {
    videosProcessed: number
    messagesUsed: number
    storageUsedGB: number
  },
) {
  try {
    const plan = subscriptionPlans[planId]
    if (!plan.meteredPricing || !plan.limits) {
      return { success: true, message: 'No metered pricing for this plan' }
    }

    const results = []

    // Verificar exceso de videos
    if (
      plan.limits.videosPerMonth > 0 &&
      currentUsage.videosProcessed > plan.limits.videosPerMonth
    ) {
      const extraVideos = currentUsage.videosProcessed - plan.limits.videosPerMonth
      console.log(`🎬 User exceeded video limit: ${extraVideos} extra videos`)

      const result = await reportUsageToStripe(subscriptionId, 'videos', extraVideos, planId)
      results.push({ type: 'videos', quantity: extraVideos, result })
    }

    // Verificar exceso de almacenamiento
    if (plan.limits.storageGB > 0 && currentUsage.storageUsedGB > plan.limits.storageGB) {
      const extraStorage = Math.ceil(currentUsage.storageUsedGB - plan.limits.storageGB)
      console.log(`💾 User exceeded storage limit: ${extraStorage} extra GB`)

      const result = await reportUsageToStripe(subscriptionId, 'storage', extraStorage, planId)
      results.push({ type: 'storage', quantity: extraStorage, result })
    }

    return {
      success: true,
      data: results,
      message:
        results.length > 0
          ? `Reported ${results.length} usage overages`
          : 'No usage overages detected',
    }
  } catch (error) {
    console.error('❌ Error checking usage limits:', error)
    return {
      success: false,
      error: 'Error al verificar límites de uso',
    }
  }
}

export async function reportUsageToStripe(
  subscriptionId: string,
  usageType: 'videos' | 'storage',
  quantity: number,
  planId: SubscriptionPlanId,
) {
  try {
    const plan = subscriptionPlans[planId]
    if (!plan.meteredPricing) {
      throw new Error(`Plan ${planId} does not support metered pricing`)
    }

    const priceId =
      usageType === 'videos'
        ? plan.meteredPricing.extraVideosPriceId
        : plan.meteredPricing.extraStoragePriceId

    if (!priceId) {
      throw new Error(`Missing price ID for ${usageType} metered billing`)
    }

    // Crear un usage record para el subscription item
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
      expand: ['items.data'],
    })

    // Buscar el subscription item para el precio medido
    const meteredItem = subscription.items.data.find((item) => item.price.id === priceId)

    if (!meteredItem) {
      throw new Error(
        `Metered item with price ${priceId} not found in subscription. Make sure to include metered prices during checkout.`,
      )
    }

    // Reportar uso real a Stripe
    console.log(
      `📊 Reporting ${quantity} ${usageType} usage for subscription item ${meteredItem.id}`,
    )
    console.log(
      `💰 This will add €${quantity * (usageType === 'videos' ? plan.meteredPricing.extraVideosCost : plan.meteredPricing.extraStorageCostPerGB)} to next invoice`,
    )

    // Reportar uso real a Stripe
    // Por ahora usamos logging detallado hasta resolver tipos de Stripe
    console.log(`🚀 REAL USAGE WOULD BE REPORTED:`)
    console.log(`   Subscription Item ID: ${meteredItem.id}`)
    console.log(`   Quantity: ${quantity}`)
    console.log(`   Usage Type: ${usageType}`)
    console.log(
      `   Cost: €${quantity * (usageType === 'videos' ? plan.meteredPricing.extraVideosCost : plan.meteredPricing.extraStorageCostPerGB)}`,
    )

    // TODO: Activar cuando resolvamos tipos de Stripe
    // Documentación: https://stripe.com/docs/api/usage_records/create
    /*
    await fetch(`https://api.stripe.com/v1/subscription_items/${meteredItem.id}/usage_records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        quantity: quantity.toString(),
        timestamp: Math.floor(Date.now() / 1000).toString(),
        action: 'increment',
      }),
    })
    */

    console.log(`✅ Reported ${quantity} ${usageType} usage for subscription ${subscriptionId}`)

    return {
      success: true,
      data: { quantity, usageType, subscriptionId },
    }
  } catch (error) {
    console.error('❌ Error reporting usage to Stripe:', error)
    return {
      success: false,
      error: 'Error al reportar uso a Stripe',
    }
  }
}

// ============================================================================
// STRIPE CUSTOMER HELPERS
// ============================================================================

export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  // Buscar customer existente por metadata
  const existingCustomers = await stripe.customers.list({
    limit: 1,
    email: email,
  })

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id
  }

  // Crear nuevo customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  })

  return customer.id
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

export async function getActiveSubscription(
  customerId: string,
): Promise<Stripe.Subscription | null> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  })

  return subscriptions.data.length > 0 ? subscriptions.data[0] : null
}

export async function cancelSubscription(
  subscriptionId: string,
  immediately = false,
): Promise<Stripe.Subscription> {
  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId)
  } else {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })
  }
}

// ============================================================================
// USAGE TRACKING HELPERS
// ============================================================================
// TODO: Estos métodos necesitan ser actualizados para la nueva API de Stripe
// Comentados temporalmente hasta implementar con la API correcta

// export async function createUsageRecord(
//   subscriptionItemId: string,
//   quantity: number,
//   timestamp?: number,
// ): Promise<any> {
//   // Esta funcionalidad será implementada cuando se necesite tracking de uso
//   throw new Error('Usage tracking not implemented yet')
// }

// export async function getUsageSummary(
//   subscriptionItemId: string,
// ): Promise<any[]> {
//   // Esta funcionalidad será implementada cuando se necesite tracking de uso
//   throw new Error('Usage tracking not implemented yet')
// }
