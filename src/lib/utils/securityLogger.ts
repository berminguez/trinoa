// ============================================================================
// SECURITY LOGGING UTILITIES
// ============================================================================

/**
 * Tipos de eventos de seguridad
 */
export enum SecurityEventType {
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_DELETED = 'API_KEY_DELETED',
  API_KEY_VIEWED = 'API_KEY_VIEWED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DATA_ACCESS_VIOLATION = 'DATA_ACCESS_VIOLATION',
  INPUT_VALIDATION_FAILED = 'INPUT_VALIDATION_FAILED',
}

/**
 * Niveles de severidad para eventos de seguridad
 */
export enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Interfaz para eventos de seguridad
 */
export interface SecurityEvent {
  type: SecurityEventType
  severity: SecuritySeverity
  userId?: string
  userEmail?: string
  userRole?: string
  resourceId?: string
  resourceType?: string
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  details: Record<string, any>
  message: string
}

/**
 * Logger de seguridad centralizado
 */
export class SecurityLogger {
  private static instance: SecurityLogger

  private constructor() {}

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger()
    }
    return SecurityLogger.instance
  }

  /**
   * Log genérico de evento de seguridad
   */
  public logEvent(event: SecurityEvent): void {
    const logEntry = {
      timestamp: event.timestamp.toISOString(),
      type: event.type,
      severity: event.severity,
      message: event.message,
      user: {
        id: event.userId,
        email: event.userEmail,
        role: event.userRole,
      },
      resource: {
        id: event.resourceId,
        type: event.resourceType,
      },
      metadata: {
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        ...event.details,
      },
    }

    // En desarrollo, log a consola con formato visible
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔒 [SECURITY] ${event.severity} - ${event.type}:`, logEntry)
    } else {
      // En producción, usar structured logging
      console.log(JSON.stringify(logEntry))
    }

    // TODO: En producción, enviar también a servicios de monitoreo
    // como DataDog, Sentry, CloudWatch, etc.
    this.sendToMonitoringService(logEntry)
  }

  /**
   * Log específico para creación de API Key
   */
  public logApiKeyCreated(
    userId: string,
    userEmail: string,
    userRole: string,
    keyId: string,
    keyName: string,
    hasAllProjects: boolean,
    projectsCount: number | string,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    this.logEvent({
      type: SecurityEventType.API_KEY_CREATED,
      severity: SecuritySeverity.MEDIUM,
      userId,
      userEmail,
      userRole,
      resourceId: keyId,
      resourceType: 'api-key',
      ipAddress,
      userAgent,
      timestamp: new Date(),
      message: `User ${userEmail} created API Key "${keyName}"`,
      details: {
        keyName,
        hasAllProjects,
        projectsCount,
        action: 'create',
      },
    })
  }

  /**
   * Log específico para eliminación de API Key
   */
  public logApiKeyDeleted(
    userId: string,
    userEmail: string,
    userRole: string,
    keyId: string,
    keyName: string,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    this.logEvent({
      type: SecurityEventType.API_KEY_DELETED,
      severity: SecuritySeverity.HIGH,
      userId,
      userEmail,
      userRole,
      resourceId: keyId,
      resourceType: 'api-key',
      ipAddress,
      userAgent,
      timestamp: new Date(),
      message: `User ${userEmail} deleted API Key "${keyName}"`,
      details: {
        keyName,
        action: 'delete',
      },
    })
  }

  /**
   * Log para acceso no autorizado
   */
  public logUnauthorizedAccess(
    userId?: string,
    userEmail?: string,
    resource?: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    this.logEvent({
      type: SecurityEventType.AUTHORIZATION_FAILED,
      severity: SecuritySeverity.HIGH,
      userId,
      userEmail,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      message: `Unauthorized access attempt${userEmail ? ` by ${userEmail}` : ''} to ${resource}`,
      details: {
        resource,
        reason,
        action: 'unauthorized_access',
      },
    })
  }

  /**
   * Log para actividad sospechosa
   */
  public logSuspiciousActivity(
    userId: string,
    userEmail: string,
    activity: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    this.logEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.HIGH,
      userId,
      userEmail,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      message: `Suspicious activity detected: ${activity} by ${userEmail}`,
      details: {
        activity,
        ...details,
      },
    })
  }

  /**
   * Log para fallos de validación de entrada
   */
  public logInputValidationFailed(
    input: string,
    reason: string,
    userId?: string,
    userEmail?: string,
    ipAddress?: string,
    userAgent?: string,
  ): void {
    this.logEvent({
      type: SecurityEventType.INPUT_VALIDATION_FAILED,
      severity: SecuritySeverity.MEDIUM,
      userId,
      userEmail,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      message: `Input validation failed${userEmail ? ` for ${userEmail}` : ''}: ${reason}`,
      details: {
        input: input.substring(0, 100), // Limitar longitud para logs
        reason,
        action: 'input_validation_failed',
      },
    })
  }

  /**
   * Envío a servicios de monitoreo (implementar según necesidades)
   */
  private sendToMonitoringService(logEntry: any): void {
    // TODO: Implementar integración con servicios de monitoreo
    // Ejemplos:
    // - DataDog: datadog.increment('security.event', 1, { type: logEntry.type })
    // - Sentry: Sentry.addBreadcrumb({ category: 'security', message: logEntry.message })
    // - CloudWatch: cloudwatch.putMetricData(...)

    // Por ahora, solo almacenar en memoria para desarrollo
    if (process.env.NODE_ENV === 'development') {
      // No hacer nada adicional en desarrollo
      return
    }

    // En producción, podrías querer:
    // 1. Enviar a un sistema de SIEM
    // 2. Activar alertas para eventos críticos
    // 3. Almacenar en base de datos de auditoría
  }
}

/**
 * Instancia singleton del logger de seguridad
 */
export const securityLogger = SecurityLogger.getInstance()
