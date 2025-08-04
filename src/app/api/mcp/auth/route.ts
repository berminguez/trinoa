// ============================================================================
// EIDETIK MVP - MCP AUTH ENDPOINT
// ============================================================================

/**
 * Endpoint de autenticación y configuración inicial para clientes MCP
 *
 * POST /api/mcp/auth
 *
 * Proporciona:
 * - Verificación de autenticación MCP Key
 * - Configuración del sistema y endpoints disponibles
 * - Lista de proyectos accesibles
 * - Información de límites y rate limiting
 */

import { NextRequest } from 'next/server'
import {
  requireMcpAuth,
  createErrorResponse,
  createSuccessResponse,
  createMethodNotAllowedResponse,
  MCP_ERROR_CODES,
  MAX_QUESTION_LENGTH,
} from '../auth-service'
import { RATE_LIMITS } from '../rate-limiter'
import type { McpAuthResult, McpAuthConfigResponse } from '../types'

// ============================================================================
// POST HANDLER - AUTENTICACIÓN Y CONFIGURACIÓN INICIAL
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    console.log('[MCP_AUTH] Processing authentication and configuration request')

    // 1. Autenticar MCP Key con logging de seguridad
    const auth: McpAuthResult = await requireMcpAuth(request, '/api/mcp/auth')

    if (!auth.success) {
      console.warn('[MCP_AUTH] Authentication failed:', {
        error: auth.error,
        timestamp: new Date().toISOString(),
      })

      return createErrorResponse(
        401,
        auth.error || 'Authentication failed',
        MCP_ERROR_CODES.KEY_NOT_FOUND,
      )
    }

    // 2. Verificar que tenemos datos completos de autenticación
    if (!auth.mcpKey || !auth.user || !auth.projects) {
      console.error('[MCP_AUTH] Authentication succeeded but missing required data:', {
        hasMcpKey: !!auth.mcpKey,
        hasUser: !!auth.user,
        hasProjects: !!auth.projects,
        timestamp: new Date().toISOString(),
      })

      return createErrorResponse(
        500,
        'Authentication succeeded but system data is incomplete',
        MCP_ERROR_CODES.UNKNOWN_ERROR,
      )
    }

    // 3. Construir respuesta de configuración completa
    const configResponse: McpAuthConfigResponse = {
      authenticated: true,
      mcpKey: {
        id: auth.mcpKey.id,
        name: auth.mcpKey.name,
        lastFour: auth.mcpKey.keyValueLastFour,
        hasAllProjects: auth.mcpKey.hasAllProjects || false,
        createdAt: auth.mcpKey.createdAt,
      },
      user: {
        id: auth.user.id,
        email: auth.user.email || undefined,
        name: auth.user.name || undefined,
      },
      systemConfig: {
        authorizedHost: process.env.EIDETIK_MCP_HOST || 'localhost:5058',
        apiVersion: '1.0.0',
        availableEndpoints: [
          '/api/mcp/auth',
          '/api/mcp/projects',
          '/api/mcp/query-project',
          '/api/mcp/query-videos',
        ],
        limits: {
          maxQuestionLength: MAX_QUESTION_LENGTH,
          maxVideosPerQuery: 50, // Límite razonable para consultas de videos múltiples
        },
        rateLimits: {
          enabled: false, // Actualmente deshabilitado
          endpoints: {
            '/api/mcp/auth': {
              requestsPerMinute: RATE_LIMITS['/api/mcp/auth']?.requestsPerMinute || 60,
              requestsPerHour: RATE_LIMITS['/api/mcp/auth']?.requestsPerHour || 300,
              requestsPerDay: RATE_LIMITS['/api/mcp/auth']?.requestsPerDay || 2000,
            },
            '/api/mcp/projects': {
              requestsPerMinute: RATE_LIMITS['/api/mcp/projects'].requestsPerMinute,
              requestsPerHour: RATE_LIMITS['/api/mcp/projects'].requestsPerHour,
              requestsPerDay: RATE_LIMITS['/api/mcp/projects'].requestsPerDay,
            },
            '/api/mcp/query-project': {
              requestsPerMinute: RATE_LIMITS['/api/mcp/query-project'].requestsPerMinute,
              requestsPerHour: RATE_LIMITS['/api/mcp/query-project'].requestsPerHour,
              requestsPerDay: RATE_LIMITS['/api/mcp/query-project'].requestsPerDay,
            },
            '/api/mcp/query-videos': {
              requestsPerMinute: RATE_LIMITS['/api/mcp/query-videos'].requestsPerMinute,
              requestsPerHour: RATE_LIMITS['/api/mcp/query-videos'].requestsPerHour,
              requestsPerDay: RATE_LIMITS['/api/mcp/query-videos'].requestsPerDay,
            },
          },
        },
      },
      accessibleProjects: {
        total: auth.projects.length,
        projects: auth.projects.map((project) => ({
          id: project.id,
          title: project.title,
          slug: project.slug,
          description: typeof project.description === 'string' ? project.description : undefined,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          stats: {
            // TODO: En el futuro, podríamos agregar stats reales de cantidad de videos
            resourceCount: undefined,
          },
        })),
      },
      systemInfo: {
        timestamp: new Date().toISOString(),
        eidetikVersion: '1.0.0', // TODO: Obtener de package.json o variable de entorno
        services: {
          embeddings: 'available', // Asumimos que OpenAI está disponible
          vectorDatabase: 'available', // Asumimos que Pinecone está disponible
          authentication: 'available', // Si llegamos aquí, auth funciona
        },
      },
    }

    // 4. Logging de configuración exitosa para auditoría
    console.log('[MCP_AUTH] Configuration provided successfully:', {
      action: 'AUTH_CONFIG',
      userId: auth.user.id,
      userEmail: auth.user.email,
      mcpKeyId: auth.mcpKey.id,
      mcpKeyName: auth.mcpKey.name,
      projectCount: auth.projects.length,
      hasAllProjects: auth.mcpKey.hasAllProjects,
      timestamp: new Date().toISOString(),
    })

    // 5. Tracking de uso para rate limiting futuro
    const { trackMcpKeyUsage } = await import('../rate-limiter')
    trackMcpKeyUsage(auth.mcpKey, '/api/mcp/auth', {
      success: true,
      responseSize: auth.projects.length,
    })

    return createSuccessResponse(configResponse)
  } catch (error) {
    console.error('[MCP_AUTH] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })

    return createErrorResponse(
      500,
      'Internal server error while processing authentication',
      MCP_ERROR_CODES.UNKNOWN_ERROR,
    )
  }
}

// ============================================================================
// HANDLERS PARA OTROS MÉTODOS HTTP
// ============================================================================

export async function GET() {
  return createMethodNotAllowedResponse('POST')
}

export async function PUT() {
  return createMethodNotAllowedResponse('POST')
}

export async function DELETE() {
  return createMethodNotAllowedResponse('POST')
}

export async function PATCH() {
  return createMethodNotAllowedResponse('POST')
}
