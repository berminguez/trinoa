'use client'
import * as React from 'react'
import { Switch } from './switch'
import { ConfidenceBadge } from './confidence-badge'
import { Label } from './label'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

export interface DocumentStatusControlProps {
  confidence: 'empty' | 'needs_revision' | 'trusted' | 'verified' | null | undefined
  documentoErroneo: boolean | null | undefined
  onDocumentoErroneoChange?: (checked: boolean) => void
  showConfidenceBadge?: boolean
  showTooltip?: boolean
  className?: string
  disabled?: boolean
}

export function DocumentStatusControl({
  confidence = 'empty',
  documentoErroneo = false,
  onDocumentoErroneoChange,
  showConfidenceBadge = false,
  showTooltip = true,
  className,
  disabled = false,
}: DocumentStatusControlProps) {
  const t = useTranslations('documents.statusControl')
  const isWrongDocument = Boolean(documentoErroneo)

  // Si está marcado como documento erróneo, mostrar ese estado en lugar del confidence
  const displayConfidence = isWrongDocument ? 'wrong_document' : confidence

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Badge de estado */}
      {showConfidenceBadge && (
        <div className='flex items-center gap-2'>
          <ConfidenceBadge
            confidence={displayConfidence as any}
            showIcon={true}
            showTooltip={showTooltip}
            size='default'
          />
          {isWrongDocument && <span className='text-xs text-muted-foreground'>(Manual)</span>}
        </div>
      )}

      {/* Toggle para documento erróneo */}
      <div className='flex items-center space-x-2'>
        <Switch
          id='documento-erroneo'
          checked={isWrongDocument}
          onCheckedChange={onDocumentoErroneoChange}
          disabled={disabled}
        />
        <Label
          htmlFor='documento-erroneo'
          className={cn(
            'text-sm font-medium cursor-pointer',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          {t('toggleWrongDocument')}
        </Label>
      </div>

      {isWrongDocument && <p className='text-xs text-muted-foreground'>{t('wrongDocumentNote')}</p>}
    </div>
  )
}
