import * as React from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  id?: string
  checked?: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ id, checked = false, disabled = false, onCheckedChange, className, ...props }, ref) => {
    return (
      <button
        id={id}
        ref={ref}
        type='button'
        role='switch'
        aria-checked={checked}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          onCheckedChange?.(!checked)
        }}
        className={cn(
          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
          disabled
            ? 'bg-muted-foreground/30 cursor-not-allowed'
            : checked
              ? 'bg-primary'
              : 'bg-muted',
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-1',
          )}
        />
      </button>
    )
  },
)

Switch.displayName = 'Switch'
