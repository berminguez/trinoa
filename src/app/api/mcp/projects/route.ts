// ============================================================================
// MCP API ENDPOINT: POST /api/mcp/projects
// ============================================================================

/**
 * Endpoint para listar proyectos accesibles por una MCP Key
 *
 * Request:
 * - Method: POST
 * - Headers: Authorization: Bearer <mcp_key>
 * - Body: vacío
 *
 * Response:
 * - 200: Array de proyectos con todos los campos
 * - 401: MCP Key inválida o host no autorizado
 * - 500: Error interno del servidor
 */

import { NextRequest } from 'next/server'
import {
  requireMcpAuth,
  createErrorResponse,
  createSuccessResponse,
  MCP_ERROR_CODES,
  type McpAuthResult,
} from '../auth-service'
import type { Project } from '@/payload-types'

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticar MCP Key
    console.log('[MCP_PROJECTS] Processing request for projects list')

    const auth: McpAuthResult = await requireMcpAuth(request)

    if (!auth.success) {
      console.warn('[MCP_PROJECTS] Authentication failed:', {
        error: auth.error,
        timestamp: new Date().toISOString(),
      })

      return createErrorResponse(
        401,
        auth.error || 'Authentication failed',
        MCP_ERROR_CODES.KEY_NOT_FOUND,
      )
    }

    // 2. Extraer proyectos accesibles (ya están en el resultado de auth)
    const accessibleProjects = auth.projects || []

    console.log('[MCP_PROJECTS] Successfully retrieved projects:', {
      userId: auth.user?.id,
      mcpKeyId: auth.mcpKey?.id,
      mcpKeyName: auth.mcpKey?.name,
      projectCount: accessibleProjects.length,
      hasAllProjects: auth.mcpKey?.hasAllProjects || false,
      timestamp: new Date().toISOString(),
    })

    // 3. Preparar respuesta con todos los campos de Project
    const projectsResponse = accessibleProjects.map((project: Project) => ({
      id: project.id,
      title: project.title,
      slug: project.slug,
      description: project.description,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }))

    // 4. Logging de acceso exitoso para auditoría
    console.log('[MCP_PROJECTS] Access logged:', {
      action: 'LIST_PROJECTS',
      userId: auth.user?.id,
      userEmail: auth.user?.email,
      mcpKeyId: auth.mcpKey?.id,
      mcpKeyName: auth.mcpKey?.name,
      projectsAccessed: accessibleProjects.map((p) => ({ id: p.id, title: p.title })),
      timestamp: new Date().toISOString(),
    })

    return createSuccessResponse(projectsResponse)
  } catch (error) {
    console.error('[MCP_PROJECTS] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })

    return createErrorResponse(
      500,
      'Internal server error while retrieving projects',
      MCP_ERROR_CODES.UNKNOWN_ERROR,
    )
  }
}

// ============================================================================
// METHOD NOT ALLOWED HANDLERS
// ============================================================================

export async function GET() {
  return createErrorResponse(405, 'Method GET not allowed. Use POST instead.', 'METHOD_NOT_ALLOWED')
}

export async function PUT() {
  return createErrorResponse(405, 'Method PUT not allowed. Use POST instead.', 'METHOD_NOT_ALLOWED')
}

export async function DELETE() {
  return createErrorResponse(
    405,
    'Method DELETE not allowed. Use POST instead.',
    'METHOD_NOT_ALLOWED',
  )
}

export async function PATCH() {
  return createErrorResponse(
    405,
    'Method PATCH not allowed. Use POST instead.',
    'METHOD_NOT_ALLOWED',
  )
}
