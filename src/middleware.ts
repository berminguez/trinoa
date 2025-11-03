import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_ROUTES,
  SECURITY_MESSAGES,
  createAdminAccessDeniedUrl,
  createAdminLoginUrl,
} from '@/lib/auth'

// Importación de configuración de i18n (solo para validaciones si es necesario)
import { locales, defaultLocale } from '@/i18n'

/**
 * Rutas que requieren autenticación
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/playground',
  '/projects',
  '/analytics',
  '/account',
  '/api-keys',
  // Futuras rutas protegidas
  '/profile',
  '/settings',
  '/user',
] as const

/**
 * Rutas que requieren rol de administrador
 */
const ADMIN_ROUTES = ['/clients'] as const

/**
 * Rutas que deben ser accesibles solo sin autenticación
 */
const AUTH_ONLY_ROUTES = ['/login'] as const

/**
 * Rutas que siempre son públicas (nunca requieren autenticación)
 */
const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/test-usage',
  '/media',
  '/api',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
] as const

/**
 * Verifica si una ruta está protegida
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

/**
 * Verifica si una ruta requiere permisos de administrador
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

/**
 * Verifica si una ruta es solo para usuarios no autenticados
 */
function isAuthOnlyRoute(pathname: string): boolean {
  return AUTH_ONLY_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

/**
 * Verifica si una ruta es pública
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route === '/') {
      // Solo la ruta raíz exacta, no sub-rutas
      return pathname === '/'
    }
    return pathname === route || pathname.startsWith(route)
  })
}

/**
 * Verifica si el usuario está autenticado basándose en las cookies de PayloadCMS
 */
async function isUserAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    const payloadToken = request.cookies.get('payload-token')

    if (!payloadToken) {
      return false
    }

    // En lugar de hacer una llamada HTTP, validamos que la cookie existe y parece válida
    // Esto evita problemas de bootstrap y loops infinitos en Railway
    const tokenValue = payloadToken.value

    // Verificación básica: el token debe existir y tener un formato mínimo válido
    if (!tokenValue || tokenValue.length < 10) {
      return false
    }

    // En desarrollo podemos ser más estrictos, en producción más tolerantes para evitar fallos de arranque
    if (process.env.NODE_ENV === 'development') {
      // En desarrollo, hacer la verificación completa
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
      const response = await fetch(`${serverUrl}/api/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `payload-token=${tokenValue}`,
        },
        credentials: 'include',
        cache: 'no-store',
      })
      return response.ok
    }

    // En producción, hacer validación básica pero no llamadas HTTP
    // Solo aceptar cookies que parezcan tokens JWT válidos
    const isJwtLike = tokenValue.split('.').length === 3
    return isJwtLike
  } catch (error) {
    console.error('Middleware authentication error:', error)
    // En caso de error, solo permitir en desarrollo para debugging
    return process.env.NODE_ENV === 'development'
  }
}

/**
 * Verifica si el usuario tiene rol de administrador
 */
async function isUserAdmin(request: NextRequest): Promise<boolean> {
  try {
    const payloadToken = request.cookies.get('payload-token')

    if (!payloadToken) {
      return false
    }

    // Solo hacer la verificación completa en desarrollo
    // En producción, las rutas admin se validarán en server components
    if (process.env.NODE_ENV === 'development') {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
      const response = await fetch(`${serverUrl}/api/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `payload-token=${payloadToken.value}`,
        },
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      return data.user?.role === 'admin'
    }

    // En producción, permitir paso y validar en server components
    // para evitar problemas de bootstrap
    return true
  } catch (error) {
    console.error('Middleware admin check error:', error)
    return false
  }
}

/**
 * Valida URLs de redirección para prevenir ataques de open redirect
 */
function isValidRedirectUrl(url: string): boolean {
  try {
    // Solo permitir URLs relativas que empiecen con /
    if (!url.startsWith('/')) {
      return false
    }

    // No permitir // que podría ser interpretado como protocolo
    if (url.startsWith('//')) {
      return false
    }

    // No permitir caracteres peligrosos
    if (url.includes('\n') || url.includes('\r') || url.includes('\t')) {
      return false
    }

    // No permitir URLs que apunten a rutas de autenticación (evitar loops)
    if (url.startsWith('/login')) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Crea URL de login con parámetro de redirección
 */
function createLoginRedirect(originalUrl: string, reason?: string): string {
  const loginUrl = new URL(
    AUTH_ROUTES.LOGIN,
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  )

  // Agregar URL original como parámetro de redirección si es válida
  if (isValidRedirectUrl(originalUrl)) {
    loginUrl.searchParams.set('redirect', originalUrl)
  }

  // Agregar razón de redirección si se proporciona
  if (reason) {
    loginUrl.searchParams.set('reason', reason)
  }

  return loginUrl.pathname + loginUrl.search
}

/**
 * Middleware principal de autenticación
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rutas públicas sin verificación
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Verificar autenticación del usuario
  const isAuthenticated = await isUserAuthenticated(request)

  // Manejar rutas que requieren rol de administrador
  if (isAdminRoute(pathname)) {
    if (!isAuthenticated) {
      const adminLoginUrl = createAdminLoginUrl(pathname)
      return NextResponse.redirect(new URL(adminLoginUrl, request.url))
    }

    // Verificar si el usuario tiene rol de administrador
    const isAdmin = await isUserAdmin(request)
    if (!isAdmin) {
      // Redirigir a dashboard con mensaje de acceso denegado
      const accessDeniedUrl = createAdminAccessDeniedUrl(pathname)
      return NextResponse.redirect(new URL(accessDeniedUrl, request.url))
    }

    // Usuario admin autenticado, permitir acceso
    return NextResponse.next()
  }

  // Manejar rutas protegidas (no admin)
  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated) {
      const loginRedirect = createLoginRedirect(pathname, 'auth_required')
      return NextResponse.redirect(new URL(loginRedirect, request.url))
    }

    // Usuario autenticado, permitir acceso
    return NextResponse.next()
  }

  // Manejar rutas solo para usuarios no autenticados (como /login)
  if (isAuthOnlyRoute(pathname)) {
    if (isAuthenticated) {
      // Solo redirigir a dashboard si viene de una redirección automática (tiene parámetro 'reason')
      // Si accede directamente a /login, permitir que se muestre (para logout manual, etc.)
      const hasReason = request.nextUrl.searchParams.has('reason')
      const hasRedirect = request.nextUrl.searchParams.has('redirect')

      // Si NO tiene parámetros de redirección automática, permitir acceso a login
      if (!hasReason && !hasRedirect) {
        console.log('[Middleware] Allowing explicit access to login for authenticated user')
        return NextResponse.next()
      }

      // Si tiene parámetros automáticos, redirigir al dashboard
      return NextResponse.redirect(new URL(AUTH_ROUTES.DASHBOARD, request.url))
    }

    // Usuario no autenticado, permitir acceso a login
    return NextResponse.next()
  }

  // Para todas las demás rutas, permitir acceso
  return NextResponse.next()
}

/**
 * Configuración del matcher para el middleware
 * Excluye archivos estáticos y rutas de API internas
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - excepto /api/auth que podríamos proteger en el futuro)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _vercel (Vercel internals)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - robots.txt (SEO)
     * - sitemap.xml (SEO)
     * - Files with extensions (e.g., .png, .jpg, .css, .js)
     */
    '/((?!api|_next/static|_next/image|_vercel|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
}
