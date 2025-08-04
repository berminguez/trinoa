import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface SubscriptionData {
  planId: string
  planName: string
  status: string
  limits?: {
    videosPerMonth?: number | null
    messagesPerMonth?: number | null
    storageGB?: number | null
  }
  currentUsage?: {
    videosProcessed?: number | null
    messagesUsed?: number | null
    storageUsedGB?: number | null
  }
  // Nuevos campos con datos reales de Stripe
  isFromStripe?: boolean
  realAmount?: number
  realStatus?: string
  realCurrentPeriodEnd?: Date | null
  stripeData?: {
    id: string
    status: string
    currentPeriodStart: Date
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
    amount: number
    currency: string
    interval: string
  } | null
}

interface CurrentSubscriptionCardProps {
  subscription: SubscriptionData
}

export default function CurrentSubscriptionCard({ subscription }: CurrentSubscriptionCardProps) {
  const getUsagePercentage = (
    used: number | null | undefined,
    limit: number | null | undefined,
  ) => {
    if (!limit || limit === -1 || limit === 0) return 0 // Ilimitado o límite inválido
    const safeUsed = used || 0
    return Math.min((safeUsed / limit) * 100, 100)
  }

  // Usar datos reales de Stripe si están disponibles
  const displayStatus = subscription.realStatus || subscription.status
  const displayAmount = subscription.realAmount || 0
  const hasStripeData = subscription.isFromStripe && subscription.stripeData

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500'
      case 'inactive':
        return 'bg-gray-500'
      case 'canceled':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activa'
      case 'inactive':
        return 'Inactiva'
      case 'canceled':
        return 'Cancelada'
      default:
        return status
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex justify-between items-center'>
          <div>
            <h3 className='text-xl font-semibold'>{subscription.planName}</h3>
            <p className='text-sm text-muted-foreground'>Plan actual</p>
          </div>
          <div className='flex flex-col items-end gap-1'>
            <Badge className={getStatusColor(displayStatus)}>{getStatusText(displayStatus)}</Badge>
            {hasStripeData && (
              <span className='text-xs text-muted-foreground'>
                €{displayAmount}/{subscription.stripeData?.interval || 'mes'}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {/* Videos Usage */}
          {subscription.limits && subscription.currentUsage && (
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span>Videos procesados</span>
                <span>
                  {subscription.currentUsage.videosProcessed || 0} /{' '}
                  {subscription.limits.videosPerMonth === -1
                    ? '∞'
                    : subscription.limits.videosPerMonth || 0}
                </span>
              </div>
              {subscription.limits.videosPerMonth !== -1 && (
                <Progress
                  value={getUsagePercentage(
                    subscription.currentUsage.videosProcessed || 0,
                    subscription.limits.videosPerMonth || 0,
                  )}
                  className='h-2'
                />
              )}
            </div>
          )}

          {/* Messages Usage */}
          {subscription.limits && subscription.currentUsage && (
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span>Mensajes de chat</span>
                <span>
                  {subscription.currentUsage.messagesUsed || 0} /{' '}
                  {subscription.limits.messagesPerMonth === -1
                    ? '∞'
                    : subscription.limits.messagesPerMonth || 0}
                </span>
              </div>
              {subscription.limits.messagesPerMonth !== -1 && (
                <Progress
                  value={getUsagePercentage(
                    subscription.currentUsage.messagesUsed || 0,
                    subscription.limits.messagesPerMonth || 0,
                  )}
                  className='h-2'
                />
              )}
            </div>
          )}

          {/* Storage Usage */}
          {subscription.limits && subscription.currentUsage && (
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span>Almacenamiento</span>
                <span>
                  {(subscription.currentUsage.storageUsedGB || 0).toFixed(1)}GB /{' '}
                  {subscription.limits.storageGB || 0}GB
                </span>
              </div>
              <Progress
                value={getUsagePercentage(
                  subscription.currentUsage.storageUsedGB || 0,
                  subscription.limits.storageGB || 0,
                )}
                className='h-2'
              />
            </div>
          )}
        </div>

        {/* Usage warnings */}
        {subscription.limits && subscription.currentUsage && (
          <div className='mt-4 space-y-2'>
            {/* Video usage warning */}
            {(() => {
              const videoLimit = subscription.limits.videosPerMonth || 0
              const videoUsed = subscription.currentUsage.videosProcessed || 0
              const shouldShowVideoWarning =
                videoLimit > 0 && videoLimit !== -1 && videoUsed >= videoLimit * 0.8

              if (shouldShowVideoWarning) {
                const percentage = Math.round(getUsagePercentage(videoUsed, videoLimit))
                return (
                  <div className='text-sm text-amber-600 bg-amber-50 p-2 rounded'>
                    ⚠️ Has usado el {percentage}% de tu límite de videos
                  </div>
                )
              }
              return null
            })()}

            {/* Messages usage warning */}
            {(() => {
              const messageLimit = subscription.limits.messagesPerMonth || 0
              const messageUsed = subscription.currentUsage.messagesUsed || 0
              const shouldShowMessageWarning =
                messageLimit > 0 && messageLimit !== -1 && messageUsed >= messageLimit * 0.8

              if (shouldShowMessageWarning) {
                const percentage = Math.round(getUsagePercentage(messageUsed, messageLimit))
                return (
                  <div className='text-sm text-amber-600 bg-amber-50 p-2 rounded'>
                    ⚠️ Has usado el {percentage}% de tu límite de mensajes
                  </div>
                )
              }
              return null
            })()}

            {/* Storage usage warning */}
            {(() => {
              const storageLimit = subscription.limits.storageGB || 0
              const storageUsed = subscription.currentUsage.storageUsedGB || 0
              const shouldShowStorageWarning = storageLimit > 0 && storageUsed >= storageLimit * 0.8

              if (shouldShowStorageWarning) {
                const percentage = Math.round(getUsagePercentage(storageUsed, storageLimit))
                return (
                  <div className='text-sm text-amber-600 bg-amber-50 p-2 rounded'>
                    ⚠️ Has usado el {percentage}% de tu almacenamiento
                  </div>
                )
              }
              return null
            })()}
          </div>
        )}

        {/* Información de Stripe */}
        {hasStripeData && subscription.stripeData && (
          <div className='mt-6 pt-4 border-t'>
            <h4 className='text-sm font-medium mb-3 flex items-center gap-2'>
              <span className='w-2 h-2 bg-green-500 rounded-full'></span>
              Información de Facturación
            </h4>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <span className='text-muted-foreground'>Periodo actual:</span>
                <p className='font-medium'>
                  {formatDate(subscription.stripeData.currentPeriodStart)} -{' '}
                  {formatDate(subscription.stripeData.currentPeriodEnd)}
                </p>
              </div>
              <div>
                <span className='text-muted-foreground'>Próximo pago:</span>
                <p className='font-medium'>
                  €{subscription.stripeData.amount} el{' '}
                  {formatDate(subscription.stripeData.currentPeriodEnd)}
                </p>
              </div>
              {subscription.stripeData.cancelAtPeriodEnd && (
                <div className='col-span-2'>
                  <div className='text-sm text-orange-600 bg-orange-50 p-2 rounded'>
                    ⚠️ Tu suscripción se cancelará al final del período actual
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
