import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  IconCircle,
  IconAlertTriangle,
  IconShieldCheck,
  IconShieldCheckFilled,
} from '@tabler/icons-react'

import { cn } from '@/lib/utils'
import { Badge } from './badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

const confidenceBadgeVariants = cva('inline-flex items-center gap-1.5 font-medium', {
  variants: {
    confidence: {
      empty: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-50',
      needs_revision:
        'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
      trusted:
        'bg-green-100 text-green-800 border-green-200 hover:bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      verified:
        'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    },
    size: {
      sm: 'text-xs px-2 py-1',
      default: 'text-sm px-2.5 py-0.5',
      lg: 'text-base px-3 py-1',
    },
  },
  defaultVariants: {
    confidence: 'empty',
    size: 'default',
  },
})

const confidenceConfig = {
  empty: {
    icon: IconCircle,
    label: 'Vacío o no aplica',
    description: 'El documento está en procesamiento o no tiene campos analizados todavía.',
  },
  needs_revision: {
    icon: IconAlertTriangle,
    label: 'Necesita revisión',
    description: 'El documento tiene campos con confianza menor al umbral establecido.',
  },
  trusted: {
    icon: IconShieldCheck,
    label: 'Confiable',
    description: 'Todos los campos del documento tienen alta confianza automática.',
  },
  verified: {
    icon: IconShieldCheckFilled,
    label: 'Verificado',
    description: 'El documento ha sido revisado y corregido manualmente por un humano.',
  },
} as const

export interface ConfidenceBadgeProps
  extends React.ComponentProps<typeof Badge>,
    VariantProps<typeof confidenceBadgeVariants> {
  confidence: keyof typeof confidenceConfig | null | undefined
  showIcon?: boolean
  showTooltip?: boolean
  threshold?: number
  size?: 'sm' | 'default' | 'lg'
}

function ConfidenceBadge({
  className,
  confidence = 'empty',
  showIcon = true,
  showTooltip = false,
  threshold,
  size = 'default',
  ...props
}: ConfidenceBadgeProps) {
  // Handle null/undefined confidence
  const normalizedConfidence = confidence || 'empty'
  const config = confidenceConfig[normalizedConfidence]
  const Icon = config.icon

  const badgeContent = (
    <Badge
      variant='outline'
      role='generic'
      aria-label={`Estado de confianza: ${config.label.toLowerCase()}`}
      className={cn(confidenceBadgeVariants({ confidence: normalizedConfidence, size }), className)}
      {...props}
    >
      {showIcon && <Icon className='h-3 w-3 flex-shrink-0' />}
      <span>{config.label}</span>
    </Badge>
  )

  if (!showTooltip) {
    return badgeContent
  }

  const tooltipDescription = threshold
    ? config.description.replace('umbral establecido', `umbral del ${threshold}%`)
    : config.description

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent side='top' className='max-w-xs'>
          <div className='space-y-1'>
            <p className='font-medium'>{config.label}</p>
            <p className='text-xs text-muted-foreground'>{tooltipDescription}</p>
            {threshold && (
              <p className='text-xs text-muted-foreground opacity-75'>
                Umbral actual: {threshold}%
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Componente helper para uso directo con el tipo de confidence
export interface ConfidenceBadgeSimpleProps extends Omit<ConfidenceBadgeProps, 'showIcon' | 'showTooltip'> {
  confidence: 'empty' | 'needs_revision' | 'trusted' | 'verified' | null | undefined
}

function ConfidenceBadgeSimple({ confidence, ...props }: ConfidenceBadgeSimpleProps) {
  return <ConfidenceBadge confidence={confidence} showIcon={false} showTooltip={false} {...props} />
}

// Componente wrapper para mostrar distribución de confidence
export interface ConfidenceStatsProps {
  stats: {
    empty?: number
    needs_revision?: number
    trusted?: number
    verified?: number
  } | undefined
  total?: number
  className?: string
  showPercentages?: boolean
}

function ConfidenceStats({ stats, total, className, showPercentages = true }: ConfidenceStatsProps) {
  if (!stats) {
    return <div role='group' className={cn('flex flex-wrap gap-2', className)}></div>
  }

  const totalCount = total || Object.values(stats).reduce((sum, count) => sum + (count || 0), 0)

  if (totalCount === 0) {
    return <div role='group' className={cn('flex flex-wrap gap-2', className)}></div>
  }

  return (
    <div role='group' className={cn('flex flex-wrap gap-2', className)}>
      {(Object.entries(stats) as Array<[keyof typeof stats, number | undefined]>)
        .filter(([_, count]) => count && count > 0)
        .map(([confidence, count]) => {
          const percentage = totalCount > 0 ? (((count || 0) / totalCount) * 100).toFixed(0) : '0'
          return (
            <div key={confidence} className='flex items-center gap-1'>
              <ConfidenceBadge confidence={confidence} showTooltip={false} size='sm' />
              <span className='text-xs text-muted-foreground'>
                {count}
                {showPercentages && ` (${percentage}%)`}
              </span>
            </div>
          )
        })}
    </div>
  )
}

export { ConfidenceBadge, ConfidenceBadgeSimple, ConfidenceStats, confidenceConfig }
export type { ConfidenceValue } from '@/payload-types'
