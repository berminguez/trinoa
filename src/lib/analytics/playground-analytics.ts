/**
 * Servicio de analytics y logging para el playground context
 * Registra eventos de uso de selectores, errores y métricas de performance
 */

import type { PlaygroundProject, PlaygroundVideo, ChatContext } from '@/types/playground'

// Tipos para eventos de analytics
export interface PlaygroundAnalyticsEvent {
  type: 'selector_interaction' | 'context_change' | 'error' | 'performance' | 'user_flow'
  action: string
  details?: Record<string, any>
  timestamp: number
  sessionId: string
  userId?: string
}

export interface ContextSelectionMetrics {
  projectSelections: number
  videoSelections: number
  contextSwitches: number
  errorsEncountered: number
  averageSelectionTime: number
  mostUsedProjects: Array<{ id: string; count: number }>
  mostUsedVideos: Array<{ id: string; count: number }>
}

// Clase principal para analytics del playground
class PlaygroundAnalytics {
  private sessionId: string
  private userId?: string
  private events: PlaygroundAnalyticsEvent[] = []
  private metrics: ContextSelectionMetrics = {
    projectSelections: 0,
    videoSelections: 0,
    contextSwitches: 0,
    errorsEncountered: 0,
    averageSelectionTime: 0,
    mostUsedProjects: [],
    mostUsedVideos: [],
  }

  // Track de timing para medir duraciones
  private timingTracker = new Map<string, number>()

  constructor() {
    // Generar sessionId único o recuperar de sessionStorage
    this.sessionId = this.getOrCreateSessionId()

    // Inicializar userId si está disponible
    this.initializeUserId()

    // Log de inicio de sesión
    this.logEvent({
      type: 'user_flow',
      action: 'session_start',
      details: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        timestamp: Date.now(),
      },
    })
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server-session'

    let sessionId = sessionStorage.getItem('playground-session-id')
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2)}`
      sessionStorage.setItem('playground-session-id', sessionId)
    }
    return sessionId
  }

  private initializeUserId() {
    // En una implementación real, esto vendría del contexto de autenticación
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('current-user-id')
      if (storedUserId) {
        this.userId = storedUserId
      }
    }
  }

  private logEvent(event: Omit<PlaygroundAnalyticsEvent, 'timestamp' | 'sessionId' | 'userId'>) {
    const fullEvent: PlaygroundAnalyticsEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    }

    this.events.push(fullEvent)

    // Log en consola para desarrollo (solo si está habilitado)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Playground Analytics:', fullEvent)
    }

    // En producción, enviar a servicio de analytics real
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalyticsService(fullEvent).catch((error) => {
        console.warn('Analytics service error:', error)
      })
    }
  }

  private async sendToAnalyticsService(event: PlaygroundAnalyticsEvent) {
    try {
      // Implementar envío a servicio real (Google Analytics, Mixpanel, etc.)
      // Por ahora, solo guardamos en localStorage para testing
      if (typeof window !== 'undefined') {
        const existingEvents = JSON.parse(localStorage.getItem('playground-analytics') || '[]')
        existingEvents.push(event)

        // Mantener solo los últimos 1000 eventos
        if (existingEvents.length > 1000) {
          existingEvents.splice(0, existingEvents.length - 1000)
        }

        localStorage.setItem('playground-analytics', JSON.stringify(existingEvents))
      }
    } catch (error) {
      console.warn('Failed to store analytics event:', error)
    }
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS PARA TRACKING
  // ============================================================================

  /**
   * Trackear selección de proyecto
   */
  trackProjectSelection(
    project: PlaygroundProject | null,
    previousProject: PlaygroundProject | null,
  ) {
    this.logEvent({
      type: 'selector_interaction',
      action: 'project_selected',
      details: {
        projectId: project?.id || 'all_projects',
        projectTitle: project?.title || 'Todos los proyectos',
        previousProjectId: previousProject?.id || 'all_projects',
        isFirstSelection: !previousProject,
      },
    })

    this.metrics.projectSelections++
    this.updateProjectUsage(project?.id)
  }

  /**
   * Trackear selección de videos
   */
  trackVideoSelection(
    videos: PlaygroundVideo[],
    allSelected: boolean,
    action: 'toggle' | 'select_all' | 'deselect_all',
  ) {
    this.logEvent({
      type: 'selector_interaction',
      action: 'videos_selected',
      details: {
        videoIds: videos.map((v) => v.id),
        videoCount: videos.length,
        allSelected,
        selectionType: action,
        videosByProject: this.groupVideosByProject(videos),
      },
    })

    this.metrics.videoSelections++
    videos.forEach((video) => this.updateVideoUsage(video.id))
  }

  /**
   * Trackear cambio de contexto
   */
  trackContextChange(newContext: ChatContext, previousContext: ChatContext | null) {
    this.logEvent({
      type: 'context_change',
      action: 'context_updated',
      details: {
        newScope: newContext.scope,
        newProjectCount: newContext.projectCount,
        newVideoCount: newContext.videoCount,
        previousScope: previousContext?.scope || 'none',
        previousProjectCount: previousContext?.projectCount || 0,
        previousVideoCount: previousContext?.videoCount || 0,
        contextComplexity: this.calculateContextComplexity(newContext),
      },
    })

    this.metrics.contextSwitches++
  }

  /**
   * Trackear errores
   */
  trackError(errorType: string, errorMessage: string, context?: Record<string, any>) {
    this.logEvent({
      type: 'error',
      action: 'error_occurred',
      details: {
        errorType,
        errorMessage,
        context,
        stackTrace: new Error().stack?.split('\n').slice(0, 5),
      },
    })

    this.metrics.errorsEncountered++
  }

  /**
   * Trackear métricas de performance
   */
  trackPerformance(operation: string, duration: number, details?: Record<string, any>) {
    this.logEvent({
      type: 'performance',
      action: 'performance_measured',
      details: {
        operation,
        duration,
        ...details,
      },
    })

    // Actualizar métricas de tiempo promedio
    if (operation === 'selection_time') {
      this.updateAverageSelectionTime(duration)
    }
  }

  /**
   * Iniciar tracking de tiempo para una operación
   */
  startTiming(operationId: string) {
    this.timingTracker.set(operationId, Date.now())
  }

  /**
   * Finalizar tracking de tiempo y registrar métrica
   */
  endTiming(operationId: string, operation: string, details?: Record<string, any>) {
    const startTime = this.timingTracker.get(operationId)
    if (startTime) {
      const duration = Date.now() - startTime
      this.trackPerformance(operation, duration, details)
      this.timingTracker.delete(operationId)
      return duration
    }
    return 0
  }

  /**
   * Trackear flujo de usuario
   */
  trackUserFlow(action: string, details?: Record<string, any>) {
    this.logEvent({
      type: 'user_flow',
      action,
      details,
    })
  }

  /**
   * Obtener métricas actuales
   */
  getMetrics(): ContextSelectionMetrics {
    return { ...this.metrics }
  }

  /**
   * Obtener eventos de la sesión actual
   */
  getSessionEvents(): PlaygroundAnalyticsEvent[] {
    return [...this.events]
  }

  /**
   * Limpiar datos de la sesión
   */
  clearSession() {
    this.events = []
    this.metrics = {
      projectSelections: 0,
      videoSelections: 0,
      contextSwitches: 0,
      errorsEncountered: 0,
      averageSelectionTime: 0,
      mostUsedProjects: [],
      mostUsedVideos: [],
    }
    this.timingTracker.clear()
  }

  // ============================================================================
  // MÉTODOS PRIVADOS DE UTILIDAD
  // ============================================================================

  private groupVideosByProject(videos: PlaygroundVideo[]): Record<string, number> {
    return videos.reduce(
      (acc, video) => {
        acc[video.projectId] = (acc[video.projectId] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
  }

  private calculateContextComplexity(context: ChatContext): 'simple' | 'medium' | 'complex' {
    const total = context.projectCount + context.videoCount
    if (total <= 5) return 'simple'
    if (total <= 20) return 'medium'
    return 'complex'
  }

  private updateProjectUsage(projectId?: string) {
    if (!projectId) return

    const existing = this.metrics.mostUsedProjects.find((p) => p.id === projectId)
    if (existing) {
      existing.count++
    } else {
      this.metrics.mostUsedProjects.push({ id: projectId, count: 1 })
    }

    // Mantener solo los top 10
    this.metrics.mostUsedProjects.sort((a, b) => b.count - a.count)
    this.metrics.mostUsedProjects = this.metrics.mostUsedProjects.slice(0, 10)
  }

  private updateVideoUsage(videoId: string) {
    const existing = this.metrics.mostUsedVideos.find((v) => v.id === videoId)
    if (existing) {
      existing.count++
    } else {
      this.metrics.mostUsedVideos.push({ id: videoId, count: 1 })
    }

    // Mantener solo los top 10
    this.metrics.mostUsedVideos.sort((a, b) => b.count - a.count)
    this.metrics.mostUsedVideos = this.metrics.mostUsedVideos.slice(0, 10)
  }

  private updateAverageSelectionTime(newTime: number) {
    const currentAvg = this.metrics.averageSelectionTime
    const totalSelections = this.metrics.projectSelections + this.metrics.videoSelections

    if (totalSelections === 1) {
      this.metrics.averageSelectionTime = newTime
    } else {
      this.metrics.averageSelectionTime =
        (currentAvg * (totalSelections - 1) + newTime) / totalSelections
    }
  }
}

// Instancia singleton
let playgroundAnalyticsInstance: PlaygroundAnalytics | null = null

/**
 * Obtener instancia singleton de analytics
 */
export function getPlaygroundAnalytics(): PlaygroundAnalytics {
  if (!playgroundAnalyticsInstance) {
    playgroundAnalyticsInstance = new PlaygroundAnalytics()
  }
  return playgroundAnalyticsInstance
}

/**
 * Hook para usar analytics en componentes React
 */
export function usePlaygroundAnalytics() {
  return getPlaygroundAnalytics()
}

// ============================================================================
// HELPERS DE CONVENIENCIA
// ============================================================================

/**
 * Trackear selección de proyecto (helper)
 */
export function trackProjectSelection(
  project: PlaygroundProject | null,
  previousProject: PlaygroundProject | null,
) {
  getPlaygroundAnalytics().trackProjectSelection(project, previousProject)
}

/**
 * Trackear selección de videos (helper)
 */
export function trackVideoSelection(
  videos: PlaygroundVideo[],
  allSelected: boolean,
  action: 'toggle' | 'select_all' | 'deselect_all',
) {
  getPlaygroundAnalytics().trackVideoSelection(videos, allSelected, action)
}

/**
 * Trackear cambio de contexto (helper)
 */
export function trackContextChange(newContext: ChatContext, previousContext: ChatContext | null) {
  getPlaygroundAnalytics().trackContextChange(newContext, previousContext)
}

/**
 * Trackear error (helper)
 */
export function trackError(errorType: string, errorMessage: string, context?: Record<string, any>) {
  getPlaygroundAnalytics().trackError(errorType, errorMessage, context)
}

/**
 * Trackear performance (helper)
 */
export function trackPerformance(
  operation: string,
  duration: number,
  details?: Record<string, any>,
) {
  getPlaygroundAnalytics().trackPerformance(operation, duration, details)
}

/**
 * Trackear flujo de usuario (helper)
 */
export function trackUserFlow(action: string, details?: Record<string, any>) {
  getPlaygroundAnalytics().trackUserFlow(action, details)
}
