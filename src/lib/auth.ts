// ============================================================================
// EIDETIK MVP - AUTENTICACIÓN CON PAYLOAD CMS (JWT + API KEYS)
// ============================================================================

import { NextRequest } from 'next/server'

import type { User, UserAuthOperations } from '@/payload-types'

/**
 * Request de Payload con información del usuario autenticado
 */
export interface PayloadRequest {
  user?: User
  [key: string]: unknown
}

/**
 * Información del usuario autenticado extraída del middleware de Payload
 */
export interface AuthenticatedUser {
  id: string
  email: string
  name?: string
  role?: string
  user: User
  authenticatedAt: string
}

/**
 * Extrae la información del usuario autenticado de req.user (poblado por Payload)
 *
 * NOTA: Este sistema aprovecha el middleware nativo de Payload CMS que:
 * - Maneja automáticamente JWT tokens (de /api/users/login)
 * - Maneja automáticamente API Keys (formato: "users API-Key {key}")
 * - Pobla req.user automáticamente cuando la auth es válida
 */
export function getAuthenticatedUser(req: PayloadRequest): AuthenticatedUser | null {
  // req.user es poblado automáticamente por el middleware de Payload
  if (!req.user) {
    return null
  }

  const user = req.user as User

  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    role: user.role || 'user',
    user,
    authenticatedAt: new Date().toISOString(),
  }
}

/**
 * Función helper para requerir autenticación en endpoints custom de Payload
 *
 * USO: En custom endpoints de Payload, req.user ya está disponible si la auth es válida
 */
export function requireAuth(req: PayloadRequest): AuthenticatedUser {
  const auth = getAuthenticatedUser(req)

  if (!auth) {
    throw new Error('Authentication required. Use JWT token or API Key.')
  }

  return auth
}

/**
 * Función helper para autenticación opcional
 */
export function optionalAuth(req: PayloadRequest): AuthenticatedUser | null {
  try {
    return getAuthenticatedUser(req)
  } catch {
    return null
  }
}

/**
 * Respuesta estándar para errores de autenticación
 */
export function createAuthErrorResponse(error: string, status: number = 401) {
  return {
    success: false,
    error: 'Authentication required',
    message: error,
    hint: 'Use one of these authentication methods:',
    authMethods: {
      jwt: {
        description: 'Get JWT token from login',
        endpoint: '/api/users/login',
        header: 'Authorization: Bearer <token>',
      },
      apiKey: {
        description: 'Use API Key (generate from admin panel)',
        header: 'Authorization: users API-Key <your-api-key>',
      },
    },
  }
}

/**
 * Verificar si un usuario tiene permisos específicos
 */
export function hasPermission(user: User, permission: string): boolean {
  const userRole = (user as User & { role?: string }).role || 'user'

  // Permisos por rol
  const rolePermissions: Record<string, string[]> = {
    admin: ['*'], // Admin tiene todos los permisos
    api: ['read', 'write', 'delete'], // API users tienen permisos básicos
    user: ['read'], // Usuarios normales solo lectura
  }

  const permissions = rolePermissions[userRole] || []

  return permissions.includes('*') || permissions.includes(permission)
}

/**
 * Middleware para verificar permisos específicos
 */
export function requirePermission(req: PayloadRequest, permission: string): AuthenticatedUser {
  const auth = requireAuth(req)

  if (!hasPermission(auth.user, permission)) {
    throw new Error(`Permission '${permission}' required. Current role: ${auth.role}`)
  }

  return auth
}

/**
 * Helper para generar respuestas de endpoints autenticados
 */
export function createAuthenticatedResponse<T>(
  data: T,
  auth: AuthenticatedUser,
  message: string = 'Success',
) {
  return {
    success: true,
    data,
    message,
    auth: {
      userId: auth.id,
      userEmail: auth.email,
      userRole: auth.role,
      authenticatedAt: auth.authenticatedAt,
    },
  }
}

// Utilidades y manejo de errores para autenticación con PayloadCMS

// ============================================================================
// TIPOS DERIVADOS DE PAYLOADCMS PARA AUTENTICACIÓN
// ============================================================================

/**
 * Tipos de entrada para operaciones de autenticación
 * Basados en UserAuthOperations de PayloadCMS
 */
export type LoginCredentials = UserAuthOperations['login']
export type RegisterCredentials = UserAuthOperations['registerFirstUser']
export type ForgotPasswordCredentials = UserAuthOperations['forgotPassword']

/**
 * Respuesta estándar de PayloadCMS para operaciones de autenticación
 */
export interface PayloadAuthResponse<T = any> {
  success: boolean
  message?: string
  user?: T
  token?: string
  exp?: number
  errors?: Array<{
    message: string
    field?: string
    data?: any
  }>
}

/**
 * Respuestas específicas tipadas con User de PayloadCMS
 */
export type LoginResponse = PayloadAuthResponse<User>
export type LogoutResponse = Omit<PayloadAuthResponse, 'user' | 'token' | 'exp'>
export type GetUserResponse = PayloadAuthResponse<User>

/**
 * Tipos para datos de display del usuario (UI components)
 */
export interface UserDisplayData {
  id: string
  name: string
  email: string
}

/**
 * Tipo utilitario para crear nuevos usuarios (omite campos auto-generados)
 */
export type CreateUserInput = Omit<
  User,
  'id' | 'createdAt' | 'updatedAt' | 'loginAttempts' | 'lockUntil' | 'sessions'
>

/**
 * Tipo utilitario para actualizar usuarios (campos opcionales)
 */
export type UpdateUserInput = Partial<Pick<User, 'name' | 'role' | 'enableAPIKey'>>

/**
 * Verificación de roles usando tipos estrictos de PayloadCMS
 */
export type UserRole = NonNullable<User['role']>

// ============================================================================
// SISTEMA DE MANEJO DE ERRORES
// ============================================================================

export type AuthErrorType =
  | 'VALIDATION_ERROR' // Errores de validación de campos
  | 'AUTHENTICATION_ERROR' // Credenciales inválidas o no autenticado
  | 'AUTHORIZATION_ERROR' // Usuario no tiene permisos
  | 'SESSION_EXPIRED' // Sesión expirada
  | 'SERVER_ERROR' // Error interno del servidor
  | 'NETWORK_ERROR' // Error de conexión
  | 'UNKNOWN_ERROR' // Error no identificado

export interface AuthError {
  type: AuthErrorType
  message: string
  field?: string
  code?: string
}

export interface AuthResult<T = any> {
  success: boolean
  data?: T
  error?: AuthError
  message?: string
}

/**
 * Crea un resultado exitoso para operaciones de autenticación
 */
export function createSuccessResult<T>(data?: T, message?: string): AuthResult<T> {
  return {
    success: true,
    data,
    message,
  }
}

/**
 * Crea un resultado de error para operaciones de autenticación
 */
export function createErrorResult(
  type: AuthErrorType,
  message: string,
  field?: string,
  code?: string,
): AuthResult {
  return {
    success: false,
    error: {
      type,
      message,
      field,
      code,
    },
    message,
  }
}

/**
 * Maneja errores de respuesta HTTP de PayloadCMS
 */
export function handlePayloadResponse(response: Response, data?: any): AuthResult | null {
  // Para respuestas exitosas (200-299)
  if (response.ok) {
    // PayloadCMS no devuelve data.success, sino que indica éxito de diferentes formas:
    // - Login exitoso: tiene data.user y data.token
    // - Logout exitoso: message con "Logged out successfully"
    // - Error: tiene data.errors array

    // Si hay errores explícitos de PayloadCMS, es un error
    if (data?.errors && data.errors.length > 0) {
      return createErrorResult(
        'VALIDATION_ERROR',
        data.errors[0]?.message || 'Error de validación',
        data.errors[0]?.field,
        'PAYLOAD_VALIDATION_ERROR',
      )
    }

    // Para login: success si hay user y no hay errors
    if (data?.user || data?.message === 'Logged out successfully' || !data?.errors) {
      return null // Sin error
    }
  }

  // Mapear códigos de estado HTTP a tipos de error
  switch (response.status) {
    case 400:
      return createErrorResult(
        'VALIDATION_ERROR',
        'Datos de entrada inválidos',
        undefined,
        'BAD_REQUEST',
      )
    case 401:
      return createErrorResult(
        'AUTHENTICATION_ERROR',
        'Credenciales inválidas',
        undefined,
        'UNAUTHORIZED',
      )
    case 403:
      return createErrorResult(
        'AUTHORIZATION_ERROR',
        'No tienes permisos para realizar esta acción',
        undefined,
        'FORBIDDEN',
      )
    case 404:
      return createErrorResult('UNKNOWN_ERROR', 'Recurso no encontrado', undefined, 'NOT_FOUND')
    case 422:
      return createErrorResult(
        'VALIDATION_ERROR',
        data?.errors?.[0]?.message || 'Error de validación',
        data?.errors?.[0]?.field,
        'VALIDATION_FAILED',
      )
    case 429:
      return createErrorResult(
        'SERVER_ERROR',
        'Demasiadas solicitudes. Intenta más tarde',
        undefined,
        'RATE_LIMITED',
      )
    case 500:
    case 502:
    case 503:
    case 504:
      return createErrorResult(
        'SERVER_ERROR',
        'Error interno del servidor',
        undefined,
        'INTERNAL_ERROR',
      )
    default:
      return createErrorResult(
        'UNKNOWN_ERROR',
        `Error inesperado: ${response.status}`,
        undefined,
        'UNKNOWN_HTTP_ERROR',
      )
  }
}

/**
 * Maneja errores de red o excepciones
 */
export function handleNetworkError(error: unknown): AuthResult {
  console.error('Network/Exception error:', error)

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createErrorResult(
      'NETWORK_ERROR',
      'Error de conexión. Verifica tu conexión a internet',
      undefined,
      'FETCH_ERROR',
    )
  }

  if (error instanceof Error) {
    return createErrorResult('UNKNOWN_ERROR', 'Error inesperado', undefined, 'EXCEPTION')
  }

  return createErrorResult(
    'UNKNOWN_ERROR',
    'Error interno del servidor',
    undefined,
    'UNKNOWN_EXCEPTION',
  )
}

/**
 * Valida campos de entrada para formularios de autenticación
 */
export function validateAuthFields(email?: string, password?: string): AuthResult | null {
  if (!email || !password) {
    return createErrorResult(
      'VALIDATION_ERROR',
      'Email y contraseña son requeridos',
      !email ? 'email' : 'password',
    )
  }

  // Validación de email básica
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return createErrorResult('VALIDATION_ERROR', 'Formato de email inválido', 'email')
  }

  // Validación de contraseña básica
  if (password.length < 3) {
    return createErrorResult('VALIDATION_ERROR', 'La contraseña es demasiado corta', 'password')
  }

  return null // Sin errores de validación
}

/**
 * Convierte AuthResult a formato legacy para compatibilidad
 */
export function toLegacyFormat<T>(result: AuthResult<T>) {
  if (result.success) {
    return {
      success: true,
      message: result.message || 'Operación exitosa',
      data: result.data,
    }
  }

  return {
    success: false,
    message: result.error?.message || 'Error desconocido',
    error: result.error,
  }
}

/**
 * Mensajes de error genéricos para seguridad
 */
export const SECURITY_MESSAGES = {
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  SESSION_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente',
  ACCESS_DENIED: 'No tienes permisos para acceder a este recurso',
  ADMIN_REQUIRED: 'Se requieren permisos de administrador para acceder a esta sección',
  GENERIC_ERROR: 'Ha ocurrido un error. Por favor, intenta nuevamente',
} as const

/**
 * URLs para redirecciones
 */
export const AUTH_ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  HOME: '/',
} as const

/**
 * Crea URL de redirección para acceso denegado por falta de permisos admin
 */
export function createAdminAccessDeniedUrl(requestedPath?: string): string {
  const dashboardUrl = new URL(
    AUTH_ROUTES.DASHBOARD,
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  )

  dashboardUrl.searchParams.set('error', 'access_denied')
  dashboardUrl.searchParams.set('message', 'admin_required')
  dashboardUrl.searchParams.set(
    'reason',
    'Necesitas permisos de administrador para acceder a esta sección',
  )

  if (requestedPath) {
    dashboardUrl.searchParams.set('requested', requestedPath)
  }

  return dashboardUrl.pathname + dashboardUrl.search
}

/**
 * Crea URL de redirección para login con contexto administrativo
 */
export function createAdminLoginUrl(requestedPath?: string): string {
  const loginUrl = new URL(
    AUTH_ROUTES.LOGIN,
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  )

  loginUrl.searchParams.set('reason', 'admin_auth_required')
  loginUrl.searchParams.set('message', 'Inicia sesión para acceder al panel de administración')

  if (requestedPath) {
    loginUrl.searchParams.set('redirect', requestedPath)
  }

  return loginUrl.pathname + loginUrl.search
}

/**
 * Obtiene mensaje de error amigable basado en parámetros de URL
 */
export function getAdminErrorMessage(searchParams: URLSearchParams): string | null {
  const error = searchParams.get('error')
  const message = searchParams.get('message')
  const reason = searchParams.get('reason')

  if (error === 'access_denied' && message === 'admin_required') {
    return reason || SECURITY_MESSAGES.ADMIN_REQUIRED
  }

  if (searchParams.get('reason') === 'admin_auth_required') {
    return 'Inicia sesión para acceder al panel de administración'
  }

  return null
}

/**
 * Configuración de cookies de PayloadCMS
 */
export const PAYLOAD_COOKIES = [
  'payload-token',
  'payload-auth',
  'payload-session',
  'payload-user',
] as const

// ============================================================================
// CACHE BUSTING Y REVALIDACIÓN
// ============================================================================

/**
 * Rutas que necesitan revalidación después de cambios de autenticación
 */
export const REVALIDATION_PATHS = {
  // Rutas principales
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',

  // Layouts y páginas dinámicas
  FRONTEND_LAYOUT: '/(frontend)',

  // Rutas futuras comunes (preparación)
  PROFILE: '/profile',
  SETTINGS: '/settings',

  // Patrones para rutas dinámicas
  USER_ROUTES: '/user',
  PROTECTED_ROUTES: '/(frontend)/(dashboard)',
} as const

/**
 * Estrategia de revalidación para diferentes operaciones de autenticación
 */
export const REVALIDATION_STRATEGY = {
  // Después de login exitoso
  LOGIN_SUCCESS: [
    REVALIDATION_PATHS.HOME,
    REVALIDATION_PATHS.DASHBOARD,
    REVALIDATION_PATHS.FRONTEND_LAYOUT,
  ],

  // Después de logout exitoso
  LOGOUT_SUCCESS: [
    REVALIDATION_PATHS.HOME,
    REVALIDATION_PATHS.LOGIN,
    REVALIDATION_PATHS.DASHBOARD,
    REVALIDATION_PATHS.FRONTEND_LAYOUT,
  ],

  // Después de actualización de datos de usuario
  USER_UPDATE: [
    REVALIDATION_PATHS.DASHBOARD,
    REVALIDATION_PATHS.PROFILE,
    REVALIDATION_PATHS.FRONTEND_LAYOUT,
  ],

  // Para errores de sesión expirada
  SESSION_EXPIRED: [
    REVALIDATION_PATHS.HOME,
    REVALIDATION_PATHS.LOGIN,
    REVALIDATION_PATHS.DASHBOARD,
  ],
} as const

/**
 * Ejecuta revalidación de múltiples rutas con manejo de errores
 */
export async function revalidateAuthPaths(
  paths: readonly string[],
  context: string = 'auth-operation',
): Promise<void> {
  const { revalidatePath } = await import('next/cache')

  for (const path of paths) {
    try {
      revalidatePath(path)
      console.log(`[${context}] Revalidated: ${path}`)
    } catch (error) {
      console.warn(`[${context}] Failed to revalidate ${path}:`, error)
    }
  }
}

/**
 * Revalidación optimizada para login exitoso
 */
export async function revalidateAfterLogin(): Promise<void> {
  await revalidateAuthPaths(REVALIDATION_STRATEGY.LOGIN_SUCCESS, 'login')
}

/**
 * Revalidación optimizada para logout exitoso
 */
export async function revalidateAfterLogout(): Promise<void> {
  await revalidateAuthPaths(REVALIDATION_STRATEGY.LOGOUT_SUCCESS, 'logout')
}

/**
 * Revalidación para actualización de usuario
 */
export async function revalidateAfterUserUpdate(): Promise<void> {
  await revalidateAuthPaths(REVALIDATION_STRATEGY.USER_UPDATE, 'user-update')
}

/**
 * Revalidación para sesión expirada
 */
export async function revalidateAfterSessionExpired(): Promise<void> {
  await revalidateAuthPaths(REVALIDATION_STRATEGY.SESSION_EXPIRED, 'session-expired')
}

// ============================================================================
// INSTRUCCIONES DE USO
// ============================================================================

/**
 * AUTENTICACIÓN EN PAYLOAD CMS:
 *
 * 1. JWT Authentication (para usuarios web):
 *    POST /api/users/login
 *    Body: { email: "user@example.com", password: "password" }
 *    Response: { token: "jwt_token", user: {...} }
 *    Usage: Authorization: Bearer <jwt_token>
 *
 * 2. API Key Authentication (para apps externas):
 *    - Crear usuario en admin panel
 *    - Generar API Key desde la interfaz de usuario
 *    - Usage: Authorization: users API-Key <your_api_key>
 *
 * 3. En Custom Endpoints:
 *    - req.user está automáticamente disponible si auth es válida
 *    - Usar requireAuth(req) para obtener información estructurada
 *    - Payload maneja automáticamente el control de acceso
 *
 * EJEMPLO de endpoint custom autenticado:
 *
 * export const MyCollection: CollectionConfig = {
 *   slug: 'my-collection',
 *   endpoints: [
 *     {
 *       path: '/protected',
 *       method: 'get',
 *       handler: async (req) => {
 *         try {
 *           const auth = requireAuth(req)
 *           return Response.json(createAuthenticatedResponse(
 *             { message: 'Access granted' },
 *             auth
 *           ))
 *         } catch (error) {
 *           const authError = createAuthErrorResponse(String(error))
 *           return Response.json(authError, { status: 401 })
 *         }
 *       }
 *     }
 *   ]
 * }
 */
