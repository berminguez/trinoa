'use client'

import {
  IconAlertCircle,
  IconRefresh,
  IconWifi,
  IconServerOff,
  IconLock,
  IconExclamationMark,
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ErrorRecoveryStateProps {
  errorType?: 'network' | 'server' | 'auth' | 'permission' | 'unknown'
  errorMessage?: string
  onRetry?: () => void
  onReload?: () => void
  onGoToProjects?: () => void
  compact?: boolean
  className?: string
}

/**
 * Componente para mostrar estados de error y opciones de recuperación
 */
export default function ErrorRecoveryState({
  errorType = 'unknown',
  errorMessage = 'Ha ocurrido un error inesperado',
  onRetry,
  onReload,
  onGoToProjects,
  compact = false,
  className = '',
}: ErrorRecoveryStateProps) {
  // Configuración por tipo de error
  const errorConfig = {
    network: {
      icon: IconWifi,
      title: 'Error de conexión',
      description: 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
      badge: 'Sin conexión',
      color: 'red',
      canRetry: true,
      canReload: true,
      priority: 'high',
    },
    server: {
      icon: IconServerOff,
      title: 'Error del servidor',
      description: 'El servidor está experimentando problemas temporales.',
      badge: 'Error servidor',
      color: 'orange',
      canRetry: true,
      canReload: false,
      priority: 'medium',
    },
    auth: {
      icon: IconLock,
      title: 'Error de autenticación',
      description: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      badge: 'Sesión expirada',
      color: 'yellow',
      canRetry: false,
      canReload: true,
      priority: 'high',
    },
    permission: {
      icon: IconLock,
      title: 'Sin permisos',
      description: 'No tienes permisos para acceder a esta información.',
      badge: 'Sin acceso',
      color: 'orange',
      canRetry: false,
      canReload: false,
      priority: 'medium',
    },
    unknown: {
      icon: IconExclamationMark,
      title: 'Error inesperado',
      description: 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.',
      badge: 'Error',
      color: 'gray',
      canRetry: true,
      canReload: true,
      priority: 'low',
    },
  }

  const config = errorConfig[errorType]
  const IconComponent = config.icon

  // Versión compacta para espacios reducidos
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md ${className}`}
      >
        <IconComponent className={`h-4 w-4 text-${config.color}-600 flex-shrink-0`} />
        <div className='flex-1 min-w-0'>
          <span className='text-sm text-gray-900 font-medium'>{config.title}</span>
          <Badge
            variant='outline'
            className={`ml-2 text-xs text-${config.color}-700 border-${config.color}-300`}
          >
            {config.badge}
          </Badge>
        </div>
        {config.canRetry && onRetry && (
          <Button variant='outline' size='sm' onClick={onRetry} className='text-xs'>
            <IconRefresh className='h-3 w-3 mr-1' />
            Reintentar
          </Button>
        )}
      </div>
    )
  }

  // Versión completa
  return (
    <Card
      className={`p-6 border-l-4 border-${config.color}-400 bg-${config.color}-50 ${className}`}
    >
      <div className='flex items-start gap-4'>
        {/* Icono del error */}
        <div
          className={`p-3 rounded-full bg-${config.color}-100 border border-${config.color}-200`}
        >
          <IconComponent className={`h-6 w-6 text-${config.color}-600`} />
        </div>

        {/* Contenido principal */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-2'>
            <h3 className='text-lg font-semibold text-gray-900'>{config.title}</h3>
            <Badge
              variant='outline'
              className={`text-${config.color}-700 border-${config.color}-300`}
            >
              {config.badge}
            </Badge>
          </div>

          <p className='text-gray-700 mb-2 leading-relaxed'>{config.description}</p>

          {/* Mensaje de error específico */}
          {errorMessage !== config.description && (
            <div
              className={`p-2 bg-${config.color}-100 border border-${config.color}-200 rounded text-xs text-${config.color}-800 mb-4 font-mono`}
            >
              <strong>Detalles:</strong> {errorMessage}
            </div>
          )}

          {/* Acciones de recuperación */}
          <div className='flex flex-wrap gap-2'>
            {config.canRetry && onRetry && (
              <Button
                variant='default'
                size='sm'
                onClick={onRetry}
                className='flex items-center gap-2'
              >
                <IconRefresh className='h-4 w-4' />
                Reintentar
              </Button>
            )}

            {config.canReload && onReload && (
              <Button
                variant='outline'
                size='sm'
                onClick={onReload}
                className='flex items-center gap-2'
              >
                <IconRefresh className='h-4 w-4' />
                Recargar página
              </Button>
            )}

            {onGoToProjects && (
              <Button
                variant='ghost'
                size='sm'
                onClick={onGoToProjects}
                className='flex items-center gap-2'
              >
                Ir a Proyectos
              </Button>
            )}
          </div>

          {/* Consejos de recuperación */}
          <div className='mt-4 text-xs text-gray-600'>
            <p className='mb-1'>
              <strong>💡 Consejos para resolver este problema:</strong>
            </p>
            <ul className='list-disc list-inside space-y-1 text-gray-500'>
              {errorType === 'network' && (
                <>
                  <li>Verifica tu conexión a internet</li>
                  <li>Intenta recargar la página</li>
                  <li>Espera unos minutos y vuelve a intentarlo</li>
                </>
              )}
              {errorType === 'server' && (
                <>
                  <li>El problema es temporal, intenta en unos minutos</li>
                  <li>Si persiste, contacta al soporte técnico</li>
                </>
              )}
              {errorType === 'auth' && (
                <>
                  <li>Recarga la página para iniciar sesión</li>
                  <li>Verifica que tus credenciales sean correctas</li>
                </>
              )}
              {errorType === 'permission' && (
                <>
                  <li>Contacta al administrador para obtener acceso</li>
                  <li>Verifica que tengas los permisos necesarios</li>
                </>
              )}
              {errorType === 'unknown' && (
                <>
                  <li>Intenta recargar la página</li>
                  <li>Si el problema persiste, contacta al soporte</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Componente específico para errores de red
 */
export function NetworkErrorState({
  onRetry,
  onReload,
  compact = false,
  className = '',
}: {
  onRetry?: () => void
  onReload?: () => void
  compact?: boolean
  className?: string
}) {
  return (
    <ErrorRecoveryState
      errorType='network'
      onRetry={onRetry}
      onReload={onReload}
      compact={compact}
      className={className}
    />
  )
}

/**
 * Componente específico para errores del servidor
 */
export function ServerErrorState({
  errorMessage,
  onRetry,
  compact = false,
  className = '',
}: {
  errorMessage?: string
  onRetry?: () => void
  compact?: boolean
  className?: string
}) {
  return (
    <ErrorRecoveryState
      errorType='server'
      errorMessage={errorMessage}
      onRetry={onRetry}
      compact={compact}
      className={className}
    />
  )
}

/**
 * Componente específico para errores de autenticación
 */
export function AuthErrorState({
  onReload,
  compact = false,
  className = '',
}: {
  onReload?: () => void
  compact?: boolean
  className?: string
}) {
  return (
    <ErrorRecoveryState
      errorType='auth'
      onReload={onReload}
      compact={compact}
      className={className}
    />
  )
}

/**
 * Componente inteligente que decide qué tipo de error mostrar
 */
export function SmartErrorRecovery({
  error,
  isNetworkError = false,
  isAuthError = false,
  isServerError = false,
  onRetry,
  onReload,
  onGoToProjects,
  compact = false,
  className = '',
}: {
  error?: string
  isNetworkError?: boolean
  isAuthError?: boolean
  isServerError?: boolean
  onRetry?: () => void
  onReload?: () => void
  onGoToProjects?: () => void
  compact?: boolean
  className?: string
}) {
  let errorType: 'network' | 'server' | 'auth' | 'permission' | 'unknown' = 'unknown'

  // Detectar tipo de error basado en flags o mensaje
  if (
    isNetworkError ||
    error?.toLowerCase().includes('network') ||
    error?.toLowerCase().includes('fetch')
  ) {
    errorType = 'network'
  } else if (
    isAuthError ||
    error?.toLowerCase().includes('auth') ||
    error?.toLowerCase().includes('unauthorized')
  ) {
    errorType = 'auth'
  } else if (
    isServerError ||
    error?.toLowerCase().includes('server') ||
    error?.toLowerCase().includes('500')
  ) {
    errorType = 'server'
  } else if (
    error?.toLowerCase().includes('permission') ||
    error?.toLowerCase().includes('forbidden')
  ) {
    errorType = 'permission'
  }

  return (
    <ErrorRecoveryState
      errorType={errorType}
      errorMessage={error}
      onRetry={onRetry}
      onReload={onReload}
      onGoToProjects={onGoToProjects}
      compact={compact}
      className={className}
    />
  )
}
