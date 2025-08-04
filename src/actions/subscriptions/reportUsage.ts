'use server'

import { getCurrentUser } from '@/actions/auth/getUser'
import { checkAndReportExcessUsage } from '@/lib/stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'

// ============================================================================
// USAGE REPORTING ACTIONS
// ============================================================================

export async function reportUserUsage(
  videosProcessed?: number,
  messagesUsed?: number,
  storageUsedGB?: number
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado'
      }
    }

    const payload = await getPayload({ config })

    // Obtener suscripción del usuario
    const subscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        user: { equals: user.id },
        status: { not_equals: 'canceled' },
      },
      limit: 1,
    })

    if (!subscriptions.docs.length) {
      return {
        success: false,
        error: 'No se encontró suscripción activa'
      }
    }

    const subscription = subscriptions.docs[0]
    
    // Si no tiene stripeSubscriptionId, no hay facturación medida
    if (!subscription.stripeSubscriptionId) {
      return {
        success: true,
        message: 'Subscription not connected to Stripe - no metered billing'
      }
    }

    // Usar valores actuales si no se proporcionan nuevos
    const currentUsage = {
      videosProcessed: videosProcessed ?? subscription.currentUsage?.videosProcessed ?? 0,
      messagesUsed: messagesUsed ?? subscription.currentUsage?.messagesUsed ?? 0,
      storageUsedGB: storageUsedGB ?? subscription.currentUsage?.storageUsedGB ?? 0,
    }

    // Actualizar uso en PayloadCMS
    await payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      data: {
        currentUsage: {
          ...subscription.currentUsage,
          videosProcessed: currentUsage.videosProcessed,
          messagesUsed: currentUsage.messagesUsed,
          storageUsedGB: currentUsage.storageUsedGB,
        }
      }
    })

    // Verificar y reportar excesos a Stripe
    const usageResult = await checkAndReportExcessUsage(
      subscription.stripeSubscriptionId,
      subscription.planId as 'basic' | 'pro',
      currentUsage
    )

    return {
      success: true,
      data: {
        usage: currentUsage,
        stripeReport: usageResult
      },
      message: 'Uso actualizado correctamente'
    }
  } catch (error) {
    console.error('Error reporting user usage:', error)
    return {
      success: false,
      error: 'Error al reportar uso del usuario'
    }
  }
}

export async function incrementVideoUsage() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    const payload = await getPayload({ config })
    const subscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        user: { equals: user.id },
        status: { not_equals: 'canceled' },
      },
      limit: 1,
    })

    if (!subscriptions.docs.length) {
      return { success: false, error: 'No se encontró suscripción activa' }
    }

    const subscription = subscriptions.docs[0]
    const currentVideos = subscription.currentUsage?.videosProcessed ?? 0
    const newCount = currentVideos + 1

    console.log(`📹 User ${user.email} processed video #${newCount}`)

    return await reportUserUsage(newCount, undefined, undefined)
  } catch (error) {
    console.error('Error incrementing video usage:', error)
    return {
      success: false,
      error: 'Error al incrementar uso de videos'
    }
  }
}

export async function incrementStorageUsage(additionalGB: number) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    const payload = await getPayload({ config })
    const subscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        user: { equals: user.id },
        status: { not_equals: 'canceled' },
      },
      limit: 1,
    })

    if (!subscriptions.docs.length) {
      return { success: false, error: 'No se encontró suscripción activa' }
    }

    const subscription = subscriptions.docs[0]
    const currentStorage = subscription.currentUsage?.storageUsedGB ?? 0
    const newStorage = currentStorage + additionalGB

    console.log(`💾 User ${user.email} storage increased to ${newStorage}GB (+${additionalGB}GB)`)

    return await reportUserUsage(undefined, undefined, newStorage)
  } catch (error) {
    console.error('Error incrementing storage usage:', error)
    return {
      success: false,
      error: 'Error al incrementar uso de almacenamiento'
    }
  }
}