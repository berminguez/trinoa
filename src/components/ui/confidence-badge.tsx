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

const confidenceBadgeVariants = cva(
  'inline-flex items-center gap-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      confidence: {
        empty: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-50 focus-visible:ring-gray-300',
        needs_revision:
          'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-50 focus-visible:ring-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
        trusted:
          'bg-green-100 text-green-800 border-green-200 hover:bg-green-50 focus-visible:ring-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        verified:
          'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-50 focus-visible:ring-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
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
  }
)

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

  // Generate unique ID for tooltip accessibility
  const tooltipId = React.useId()
  const tooltipDescription = threshold
    ? config.description.replace('umbral establecido', `umbral del ${threshold}%`)
    : config.description

  const badgeContent = (
    <Badge
      variant='outline'
      role='status'
      aria-label={`Estado de confianza: ${config.label.toLowerCase()}`}
      aria-describedby={showTooltip ? tooltipId : undefined}
      tabIndex={showTooltip ? 0 : undefined}
      className={cn(confidenceBadgeVariants({ confidence: normalizedConfidence, size }), className)}
      {...props}
    >
      {showIcon && (
        <Icon 
          className={cn(
            'flex-shrink-0',
            size === 'sm' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'
          )}
          aria-hidden="true"
        />
      )}
      <span className='truncate'>{config.label}</span>
    </Badge>
  )

  if (!showTooltip) {
    return badgeContent
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent 
          side='top' 
          className='max-w-xs sm:max-w-sm'
          id={tooltipId}
          role='tooltip'
          aria-live='polite'
        >
          <div className='space-y-1'>
            <p className='font-medium text-sm'>{config.label}</p>
            <p className='text-xs text-muted-foreground leading-relaxed'>{tooltipDescription}</p>
            {threshold && (
              <p className='text-xs text-muted-foreground opacity-75 border-t pt-1 mt-2'>
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
    return <div role='group' aria-label='Estadísticas de confianza vacías' className={cn('flex flex-wrap gap-2', className)}></div>
  }

  const totalCount = total || Object.values(stats).reduce((sum, count) => sum + (count || 0), 0)

  if (totalCount === 0) {
    return <div role='group' aria-label='Sin estadísticas de confianza' className={cn('flex flex-wrap gap-2', className)}></div>
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
      aria-label={`Estadísticas de confianza: ${totalCount} recursos en total`}
      className={cn('flex flex-wrap gap-1.5 sm:gap-2', className)}
    >
      {statsEntries.map(([confidence, count]) => {
        const percentage = totalCount > 0 ? (((count || 0) / totalCount) * 100).toFixed(0) : '0'
        const config = confidenceConfig[confidence]
        
        return (
          <div 
            key={confidence} 
            className='flex items-center gap-1 min-w-fit'
            role='listitem'
            aria-label={`${config.label}: ${count} recursos${showPercentages ? `, ${percentage}%` : ''}`}
          >
            <ConfidenceBadge 
              confidence={confidence} 
              showTooltip={false} 
              size='sm'
              aria-hidden="true"
            />
            <span className='text-xs text-muted-foreground whitespace-nowrap'>
              <span className='font-medium'>{count}</span>
              {showPercentages && (
                <span className='opacity-75'>
                  {' '}(<span className='sr-only'>{percentage} por ciento</span>
                  <span aria-hidden="true">{percentage}%</span>)
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
export type { ConfidenceValue } from '@/payload-types'
