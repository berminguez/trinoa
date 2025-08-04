import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { CONFIG } from '@/lib/config'
import { getStripe } from '@/lib/stripe'
import config from '@/payload.config'

type SubscriptionStatus = 'active' | 'canceled' | 'inactive' | 'past_due' | 'unpaid'
type PlanId = 'basic' | 'free' | 'pro'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Verificar el webhook de Stripe
    const stripe = getStripe()
    const event = stripe.webhooks.constructEvent(body, signature, CONFIG.STRIPE_WEBHOOK_SECRET)

    console.log('Stripe webhook event:', event.type)

    const payloadInstance = await getPayload({ config })

    // Manejar diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          event.data.object as unknown as Record<string, unknown>,
          payloadInstance,
        )
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(
          event.data.object as unknown as Record<string, unknown>,
          payloadInstance,
        )
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as unknown as Record<string, unknown>,
          payloadInstance,
        )
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as unknown as Record<string, unknown>,
          payloadInstance,
        )
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(
          event.data.object as unknown as Record<string, unknown>,
          payloadInstance,
        )
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(
          event.data.object as unknown as Record<string, unknown>,
          payloadInstance,
        )
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 })
  }
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

async function handleCheckoutCompleted(
  session: Record<string, unknown>,
  payloadInstance: Awaited<ReturnType<typeof getPayload>>,
) {
  try {
    console.log('Processing checkout completion for session:', session.id)

    const metadata = session.metadata as Record<string, unknown> | undefined
    const userId = metadata?.userId as string
    const planId = metadata?.planId as string

    if (!userId || !planId) {
      console.error('Missing userId or planId in session metadata')
      return
    }

    // Validar que planId es uno de los valores permitidos
    if (!['basic', 'free', 'pro'].includes(planId)) {
      console.error('Invalid planId:', planId)
      return
    }

    // Buscar si ya existe una suscripción para este usuario
    const existingSubs = await payloadInstance.find({
      collection: 'subscriptions',
      where: {
        user: { equals: userId },
        status: { not_equals: 'canceled' },
      },
      limit: 1,
    })

    if (existingSubs.docs.length > 0) {
      // Actualizar suscripción existente
      await payloadInstance.update({
        collection: 'subscriptions',
        id: existingSubs.docs[0].id,
        data: {
          stripeSubscriptionId: session.subscription as string,
          status: 'active' as const,
          planId: planId as PlanId,
        },
      })
    } else {
      // Crear nueva suscripción
      await payloadInstance.create({
        collection: 'subscriptions',
        data: {
          user: userId,
          planId: planId as PlanId,
          planName: getPlanName(planId),
          stripeSubscriptionId: session.subscription as string,
          stripeCustomerId: session.customer as string,
          status: 'active' as const,
        },
      })
    }

    console.log('Checkout completion processed successfully')
  } catch (error) {
    console.error('Error processing checkout completion:', error)
  }
}

async function handleSubscriptionCreated(
  subscription: Record<string, unknown>,
  payloadInstance: Awaited<ReturnType<typeof getPayload>>,
) {
  try {
    console.log('Processing subscription creation:', subscription.id)

    const customerId = subscription.customer as string
    const metadata = subscription.metadata as Record<string, unknown> | undefined
    const userId = metadata?.userId as string

    if (!userId) {
      console.error('Missing userId in subscription metadata')
      return
    }

    // Buscar suscripción existente por usuario
    const existingSubs = await payloadInstance.find({
      collection: 'subscriptions',
      where: {
        user: { equals: userId },
      },
      limit: 1,
    })

    const items = subscription.items as { data: Array<{ price?: { id: string } }> }
    const rawStatus = subscription.status as string

    // Validar y mapear el status
    const validStatuses: SubscriptionStatus[] = [
      'active',
      'canceled',
      'inactive',
      'past_due',
      'unpaid',
    ]
    const status = validStatuses.includes(rawStatus as SubscriptionStatus)
      ? (rawStatus as SubscriptionStatus)
      : ('inactive' as const)

    const subscriptionData = {
      stripeSubscriptionId: subscription.id as string,
      stripePriceId: items.data[0]?.price?.id,
      stripeCustomerId: customerId,
      status,
      currentPeriodStart: new Date(
        (subscription.current_period_start as number) * 1000,
      ).toISOString(),
      currentPeriodEnd: new Date((subscription.current_period_end as number) * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end as boolean,
    }

    if (existingSubs.docs.length > 0) {
      // Actualizar suscripción existente
      await payloadInstance.update({
        collection: 'subscriptions',
        id: existingSubs.docs[0].id,
        data: subscriptionData,
      })
    } else {
      // Crear nueva suscripción
      const planId = getPlanIdFromPrice(items.data[0]?.price?.id)
      await payloadInstance.create({
        collection: 'subscriptions',
        data: {
          user: userId,
          planId: planId as PlanId,
          planName: getPlanName(planId),
          ...subscriptionData,
        },
      })
    }

    console.log('Subscription created successfully for user:', userId)
  } catch (error) {
    console.error('Error handling subscription creation:', error)
  }
}

async function handleSubscriptionUpdated(
  subscription: Record<string, unknown>,
  payloadInstance: Awaited<ReturnType<typeof getPayload>>,
) {
  try {
    console.log('Processing subscription update:', subscription.id)

    // Buscar suscripción por stripeSubscriptionId
    const existingSubs = await payloadInstance.find({
      collection: 'subscriptions',
      where: {
        stripeSubscriptionId: { equals: subscription.id as string },
      },
      limit: 1,
    })

    if (existingSubs.docs.length === 0) {
      console.error('Subscription not found for update:', subscription.id)
      return
    }

    const rawStatus = subscription.status as string
    const validStatuses: SubscriptionStatus[] = [
      'active',
      'canceled',
      'inactive',
      'past_due',
      'unpaid',
    ]
    const status = validStatuses.includes(rawStatus as SubscriptionStatus)
      ? (rawStatus as SubscriptionStatus)
      : ('inactive' as const)

    await payloadInstance.update({
      collection: 'subscriptions',
      id: existingSubs.docs[0].id,
      data: {
        status,
        currentPeriodStart: new Date(
          (subscription.current_period_start as number) * 1000,
        ).toISOString(),
        currentPeriodEnd: new Date(
          (subscription.current_period_end as number) * 1000,
        ).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end as boolean,
      },
    })

    console.log('Subscription updated successfully:', subscription.id)
  } catch (error) {
    console.error('Error handling subscription update:', error)
  }
}

async function handleSubscriptionDeleted(
  subscription: Record<string, unknown>,
  payloadInstance: Awaited<ReturnType<typeof getPayload>>,
) {
  try {
    console.log('Processing subscription deletion:', subscription.id)

    // Buscar suscripción por stripeSubscriptionId
    const existingSubs = await payloadInstance.find({
      collection: 'subscriptions',
      where: {
        stripeSubscriptionId: { equals: subscription.id as string },
      },
      limit: 1,
    })

    if (existingSubs.docs.length === 0) {
      console.error('Subscription not found for deletion:', subscription.id)
      return
    }

    const userId = existingSubs.docs[0].user

    // Marcar suscripción como cancelada
    await payloadInstance.update({
      collection: 'subscriptions',
      id: existingSubs.docs[0].id,
      data: {
        status: 'canceled' as const,
      },
    })

    // Crear suscripción gratuita para el usuario
    await payloadInstance.create({
      collection: 'subscriptions',
      data: {
        user: typeof userId === 'object' ? (userId as { id: string }).id : userId,
        planId: 'free' as const,
        planName: 'Plan Free',
        status: 'active' as const,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    })

    console.log('Subscription deleted and free plan created for user:', userId)
  } catch (error) {
    console.error('Error handling subscription deletion:', error)
  }
}

async function handlePaymentSucceeded(
  invoice: Record<string, unknown>,
  payloadInstance: Awaited<ReturnType<typeof getPayload>>,
) {
  try {
    console.log('Processing payment success for invoice:', invoice.id)

    if (invoice.subscription) {
      // Buscar suscripción por stripeSubscriptionId
      const existingSubs = await payloadInstance.find({
        collection: 'subscriptions',
        where: {
          stripeSubscriptionId: { equals: invoice.subscription as string },
        },
        limit: 1,
      })

      if (existingSubs.docs.length > 0) {
        // Resetear contadores de uso si es un nuevo período
        const currentDate = new Date()
        const periodStartString = existingSubs.docs[0].currentPeriodStart

        if (periodStartString) {
          const periodStart = new Date(periodStartString)

          if (
            currentDate.getMonth() !== periodStart.getMonth() ||
            currentDate.getFullYear() !== periodStart.getFullYear()
          ) {
            const currentUsage = existingSubs.docs[0].currentUsage as
              | { storageUsedGB?: number }
              | undefined
            await payloadInstance.update({
              collection: 'subscriptions',
              id: existingSubs.docs[0].id,
              data: {
                currentUsage: {
                  videosProcessed: 0,
                  messagesUsed: 0,
                  storageUsedGB: currentUsage?.storageUsedGB || 0,
                  lastResetDate: currentDate.toISOString(),
                },
              },
            })
          }
        }
      }
    }

    console.log('Payment processed successfully for invoice:', invoice.id)
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function handlePaymentFailed(
  invoice: Record<string, unknown>,
  payloadInstance: Awaited<ReturnType<typeof getPayload>>,
) {
  try {
    console.log('Processing payment failure for invoice:', invoice.id)

    if (invoice.subscription) {
      // Buscar suscripción por stripeSubscriptionId
      const existingSubs = await payloadInstance.find({
        collection: 'subscriptions',
        where: {
          stripeSubscriptionId: { equals: invoice.subscription as string },
        },
        limit: 1,
      })

      if (existingSubs.docs.length > 0) {
        await payloadInstance.update({
          collection: 'subscriptions',
          id: existingSubs.docs[0].id,
          data: {
            status: 'past_due' as const,
          },
        })
      }
    }

    console.log('Payment failure processed for invoice:', invoice.id)
  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPlanName(planId: string): string {
  switch (planId) {
    case 'free':
      return 'Plan Free'
    case 'basic':
      return 'Plan Basic'
    case 'pro':
      return 'Plan Pro'
    default:
      return 'Plan Unknown'
  }
}

function getPlanIdFromPrice(priceId: string | undefined): PlanId {
  // Aquí deberías mapear los priceId de Stripe a tus planId
  // Por ahora uso basic como fallback
  if (!priceId) return 'basic'

  // Estos valores deberían coincidir con los priceId reales de Stripe
  if (priceId === process.env.STRIPE_PRICE_BASIC) return 'basic'
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'

  return 'basic' // Fallback
}
