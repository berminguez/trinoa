import * as React from 'react'
import { useTranslations } from 'next-intl'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  IconCircle,
  IconAlertTriangle,
  IconShieldCheck,
  IconShieldCheckFilled,
  IconX,
} from '@tabler/icons-react'

import { cn } from '@/lib/utils'
import { Badge } from './badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

const confidenceBadgeVariants = cva(
  'inline-flex items-center gap-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      confidence: {
        empty:
          'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-50 focus-visible:ring-gray-300',
        needs_revision:
          'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-50 focus-visible:ring-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
        trusted:
          'bg-green-100 text-green-800 border-green-200 hover:bg-green-50 focus-visible:ring-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        verified:
          'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-50 focus-visible:ring-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        wrong_document:
          'bg-red-100 text-red-800 border-red-200 hover:bg-red-50 focus-visible:ring-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      },
      size: {
        sm: 'text-xs px-2 py-1 gap-1',
        default: 'text-sm px-2.5 py-0.5 gap-1.5',
        lg: 'text-base px-3 py-1 gap-2',
      },
    },
    defaultVariants: {
      confidence: 'empty',
      size: 'default',
    },
  },
)

const confidenceConfig = {
  empty: {
    icon: IconCircle,
  },
  needs_revision: {
    icon: IconAlertTriangle,
  },
  trusted: {
    icon: IconShieldCheck,
  },
  verified: {
    icon: IconShieldCheckFilled,
  },
  wrong_document: {
    icon: IconX,
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
  const t = useTranslations('documents.confidenceBadge')
  // Handle null/undefined confidence
  const normalizedConfidence = confidence || 'empty'
  const config = confidenceConfig[normalizedConfidence]
  const Icon = config.icon
  const label = t(`states.${normalizedConfidence}.label`)
  const description = t(`states.${normalizedConfidence}.description`)

  // Generate unique ID for tooltip accessibility
  const tooltipId = React.useId()
  const tooltipDescription = description

  const badgeContent = (
    <Badge
      variant='outline'
      role='status'
      aria-label={t('aria.status', { label: label.toLowerCase() })}
      aria-describedby={showTooltip ? tooltipId : undefined}
      tabIndex={showTooltip ? 0 : undefined}
      className={cn(confidenceBadgeVariants({ confidence: normalizedConfidence, size }), className)}
      {...props}
    >
      {showIcon && (
        <Icon
          className={cn(
            'flex-shrink-0',
            size === 'sm' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3',
          )}
          aria-hidden='true'
        />
      )}
      <span className='truncate'>{label}</span>
    </Badge>
  )

  if (!showTooltip) {
    return badgeContent
  }

  const tooltipStyleByConfidence: Record<keyof typeof confidenceConfig, string> = {
    empty:
      'bg-gray-50 text-gray-900 border border-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800',
    needs_revision:
      'bg-orange-50 text-orange-900 border border-orange-200 dark:bg-orange-950 dark:text-orange-100 dark:border-orange-900',
    trusted:
      'bg-green-50 text-green-900 border border-green-200 dark:bg-green-950 dark:text-green-100 dark:border-green-900',
    verified:
      'bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-900',
    wrong_document:
      'bg-red-50 text-red-900 border border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-900',
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent
          side='top'
          className={cn('max-w-xs sm:max-w-sm', tooltipStyleByConfidence[normalizedConfidence])}
          id={tooltipId}
          role='tooltip'
          aria-live='polite'
        >
          <div className='space-y-1'>
            <p className='font-medium text-sm'>{label}</p>
            <p className='text-xs leading-relaxed opacity-90'>{tooltipDescription}</p>
            {threshold && (
              <p className='text-xs opacity-80 border-t border-current/20 pt-1 mt-2'>
                {t('tooltip.currentThreshold', { threshold })}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Componente helper para uso directo con el tipo de confidence
export interface ConfidenceBadgeSimpleProps
  extends Omit<ConfidenceBadgeProps, 'showIcon' | 'showTooltip'> {
  confidence: 'empty' | 'needs_revision' | 'trusted' | 'verified' | null | undefined
}

function ConfidenceBadgeSimple({ confidence, ...props }: ConfidenceBadgeSimpleProps) {
  return <ConfidenceBadge confidence={confidence} showIcon={false} showTooltip={false} {...props} />
}

// Componente wrapper para mostrar distribución de confidence
export interface ConfidenceStatsProps {
  stats:
    | {
        empty?: number
        needs_revision?: number
        trusted?: number
        verified?: number
      }
    | undefined
  total?: number
  className?: string
  showPercentages?: boolean
}

function ConfidenceStats({
  stats,
  total,
  className,
  showPercentages = true,
}: ConfidenceStatsProps) {
  const t = useTranslations('documents.confidenceBadge')
  if (!stats) {
    return (
      <div
        role='group'
        aria-label={t('aria.groupEmpty')}
        className={cn('flex flex-wrap gap-2', className)}
      ></div>
    )
  }

  const totalCount = total || Object.values(stats).reduce((sum, count) => sum + (count || 0), 0)

  if (totalCount === 0) {
    return (
      <div
        role='group'
        aria-label={t('aria.groupNone')}
        className={cn('flex flex-wrap gap-2', className)}
      ></div>
    )
  }

  const statsEntries = (Object.entries(stats) as Array<[keyof typeof stats, number | undefined]>)
    .filter(([_, count]) => count && count > 0)
    .sort(([a], [b]) => {
      // Ordenar por prioridad de estado
      const order = { empty: 0, needs_revision: 1, trusted: 2, verified: 3 }
      return (order[a] || 0) - (order[b] || 0)
    })

  return (
    <div
      role='group'
      aria-label={t('aria.groupSummary', { total: totalCount })}
      className={cn('flex flex-wrap gap-1.5 sm:gap-2', className)}
    >
      {statsEntries.map(([confidence, count]) => {
        const percentage = totalCount > 0 ? (((count || 0) / totalCount) * 100).toFixed(0) : '0'
        const config = confidenceConfig[confidence]
        const label = t(`states.${confidence}.label`)

        return (
          <div
            key={confidence}
            className='flex items-center gap-1 min-w-fit'
            role='listitem'
            aria-label={`${label}: ${count} ${showPercentages ? `, ${percentage}%` : ''}`}
          >
            <ConfidenceBadge
              confidence={confidence}
              showTooltip={false}
              size='sm'
              aria-hidden='true'
            />
            <span className='text-xs text-muted-foreground whitespace-nowrap'>
              <span className='font-medium'>{count}</span>
              {showPercentages && (
                <span className='opacity-75'>
                  {' '}
                  (
                  <span className='sr-only'>
                    {percentage} {t('aria.percentWord')}
                  </span>
                  <span aria-hidden='true'>{percentage}%</span>)
                </span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export { ConfidenceBadge, ConfidenceBadgeSimple, ConfidenceStats, confidenceConfig }

// Export confidence value type
export type ConfidenceValue = keyof typeof confidenceConfig
