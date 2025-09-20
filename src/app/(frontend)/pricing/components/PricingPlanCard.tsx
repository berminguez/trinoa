'use client'

import { IconCheck, IconLoader2 } from '@tabler/icons-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { createSubscriptionCheckout } from '@/actions/subscriptions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

import type {
  SubscriptionPlan,
  SubscriptionPlanId,
  SubscriptionPlanWithDynamicPrice,
} from '@/lib/stripe'

// Tipo removido - ya no es necesario porque usamos meteredPricing directamente

interface PricingPlanCardProps {
  plan: SubscriptionPlan | SubscriptionPlanWithDynamicPrice
  planId: SubscriptionPlanId
  currentPlan?: string
  isPopular?: boolean
}

export default function PricingPlanCard({
  plan,
  planId,
  currentPlan,
  isPopular = false,
}: PricingPlanCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isCurrentPlan = currentPlan === planId
  const isFree = planId === 'free'

  const handleSubscribe = async () => {
    if (isFree || isCurrentPlan) return

    setIsLoading(true)
    try {
      const result = await createSubscriptionCheckout(planId)

      if (result && result.success && result.data?.checkoutUrl) {
        // Redirigir a Stripe Checkout
        window.location.href = result.data.checkoutUrl
      } else {
        toast.error(result?.error || 'Error al crear la sesión de checkout')
      }
    } catch (error) {
      console.error('Error subscribing:', error)
      toast.error('Error al procesar la suscripción')
    } finally {
      setIsLoading(false)
    }
  }

  const getButtonText = () => {
    if (isLoading) return 'Procesando...'
    if (isCurrentPlan) return 'Plan actual'
    if (isFree) return 'Gratis'
    return 'Suscribirse'
  }

  const getButtonVariant = () => {
    if (isCurrentPlan) return 'secondary'
    if (isFree) return 'outline'
    return 'default'
  }

  return (
    <Card className={`relative ${isPopular ? 'border-primary ring-2 ring-primary/20' : ''}`}>
      {isPopular && (
        <Badge className='absolute -top-3 left-1/2 transform -translate-x-1/2'>Más popular</Badge>
      )}

      <CardHeader className='text-center'>
        <h3 className='text-2xl font-bold'>{plan.name}</h3>
        <div className='mb-4'>
          <div className='flex items-baseline justify-center'>
            <span className='text-4xl font-bold'>€{plan.price}</span>
            {!isFree && <span className='text-muted-foreground ml-1'>/mes</span>}
          </div>
        </div>
        <p className='text-muted-foreground'>{plan.description}</p>
      </CardHeader>

      <CardContent>
        {/* Features List */}
        <div className='space-y-3 mb-8'>
          {plan.features.map((feature, index) => (
            <div key={index} className='flex items-center gap-2'>
              <IconCheck className='h-4 w-4 text-primary flex-shrink-0' />
              <span className='text-sm'>{feature}</span>
            </div>
          ))}
        </div>

        {/* Subscribe Button */}
        <Button
          onClick={handleSubscribe}
          disabled={isLoading || isCurrentPlan || isFree}
          variant={getButtonVariant()}
          className='w-full'
        >
          {isLoading && <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />}
          {getButtonText()}
        </Button>

        {/* Limits Display */}
        <div className='mt-4 text-xs text-muted-foreground space-y-1'>
          <div className='flex justify-between'>
            <span>Videos por mes:</span>
            <span>
              {(plan.limits.videosPerMonth as number) === -1
                ? 'Ilimitados'
                : plan.limits.videosPerMonth}
            </span>
          </div>
          <div className='flex justify-between'>
            <span>Mensajes de chat:</span>
            <span>
              {(plan.limits.messagesPerMonth as number) === -1
                ? 'Ilimitados'
                : plan.limits.messagesPerMonth}
            </span>
          </div>
          <div className='flex justify-between'>
            <span>Almacenamiento:</span>
            <span>{plan.limits.storageGB}GB</span>
          </div>
        </div>

        {/* Variable pricing info for Basic and Pro */}
        {(planId === 'basic' || planId === 'pro') &&
          'meteredPricing' in plan &&
          plan.meteredPricing && (
            <div className='mt-4 p-3 bg-muted rounded-lg'>
              <p className='text-xs font-medium mb-2'>Pricing adicional:</p>
              <div className='text-xs text-muted-foreground space-y-1'>
                <div className='flex justify-between'>
                  <span>Video extra:</span>
                  <span>€{plan.meteredPricing.extraVideosCost}</span>
                </div>
                <div className='flex justify-between'>
                  <span>GB adicional:</span>
                  <span>€{plan.meteredPricing.extraStorageCostPerGB}</span>
                </div>
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  )
}
