// ============================================================================
// MCP API ENDPOINT: POST /api/mcp/query-videos
// ============================================================================

/**
 * Endpoint para consultar videos específicos mediante embeddings
 *
 * Request:
 * - Method: POST
 * - Headers: Authorization: Bearer <mcp_key>
 * - Body: { "videos_id": ["string"], "question": "string" }
 *
 * Response:
 * - 200: { "records": Array<McpQueryRecord> }
 * - 401: MCP Key inválida o host no autorizado
 * - 403: Sin acceso a uno o más videos especificados
 * - 400: Request mal formada, videos_id vacío o pregunta demasiado larga
 * - 500: Error interno del servidor
 */

import { NextRequest } from 'next/server'
import {
  requireMcpAuth,
  extractAccessibleProjects,
  parseRequestBody,
  createErrorResponse,
  createSuccessResponse,
  MCP_ERROR_CODES,
  MAX_QUESTION_LENGTH,
  type McpAuthResult,
  type McpQueryVideosRequest,
  type McpQueryRecord,
  type McpQueryResponse,
} from '../auth-service'
import { EmbeddingGenerator } from '@/lib/embeddings/generator'
import { PineconeManager } from '@/lib/pinecone'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Resource } from '@/payload-types'

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    console.log('[MCP_QUERY_VIDEOS] Processing videos query request')

    // 1. Autenticar MCP Key con logging de seguridad
    const auth: McpAuthResult = await requireMcpAuth(request, '/api/mcp/query-videos')

    if (!auth.success) {
      console.warn('[MCP_QUERY_VIDEOS] Authentication failed:', {
        error: auth.error,
        timestamp: new Date().toISOString(),
      })

      return createErrorResponse(
        401,
        auth.error || 'Authentication failed',
        MCP_ERROR_CODES.KEY_NOT_FOUND,
      )
    }

    // 2. Parsear y validar request body
    const body = await parseRequestBody(request)
    if (!body) {
      return createErrorResponse(
        400,
        'Invalid JSON in request body',
        MCP_ERROR_CODES.INVALID_HOST, // Reutilizamos este código para errores de formato
      )
    }

    const { videos_id, question }: McpQueryVideosRequest = body

    // Validar campos requeridos
    if (!videos_id || !Array.isArray(videos_id)) {
      return createErrorResponse(
        400,
        'Missing or invalid videos_id field (must be array)',
        MCP_ERROR_CODES.VIDEO_NOT_FOUND,
      )
    }

    if (videos_id.length === 0) {
      return createErrorResponse(
        400,
        'videos_id array cannot be empty',
        MCP_ERROR_CODES.VIDEO_NOT_FOUND,
      )
    }

    // Validar que todos los elementos del array son strings
    if (!videos_id.every((id) => typeof id === 'string' && id.trim().length > 0)) {
      return createErrorResponse(
        400,
        'All videos_id must be non-empty strings',
        MCP_ERROR_CODES.VIDEO_NOT_FOUND,
      )
    }

    if (!question || typeof question !== 'string') {
      return createErrorResponse(
        400,
        'Missing or invalid question field',
        MCP_ERROR_CODES.QUESTION_TOO_LONG,
      )
    }

    // Validar longitud de pregunta
    if (question.length > MAX_QUESTION_LENGTH) {
      return createErrorResponse(
        400,
        `Question too long. Maximum ${MAX_QUESTION_LENGTH} characters allowed`,
        MCP_ERROR_CODES.QUESTION_TOO_LONG,
      )
    }

    // 3. Obtener proyectos accesibles por la MCP Key
    if (!auth.mcpKey) {
      return createErrorResponse(
        500,
        'Authentication succeeded but MCP key data is missing',
        MCP_ERROR_CODES.KEY_NOT_FOUND,
      )
    }

    const accessibleProjects = await extractAccessibleProjects(auth.mcpKey)

    if (!accessibleProjects) {
      return createErrorResponse(
        500,
        'Failed to extract accessible projects',
        MCP_ERROR_CODES.KEY_NOT_FOUND,
      )
    }

    // 4. Verificar que todos los videos pertenecen a proyectos accesibles
    const payload = await getPayload({ config })

    console.log('[MCP_QUERY_VIDEOS] Validating video access:', {
      videosCount: videos_id.length,
      accessibleProjectsCount: accessibleProjects.length,
      videosPreview: videos_id.slice(0, 3),
    })

    try {
      // Buscar todos los videos en PayloadCMS
      const videosQuery = await payload.find({
        collection: 'resources',
        where: {
          id: { in: videos_id },
          type: { equals: 'video' }, // Solo videos
        },
        depth: 2, // Para obtener relaciones del proyecto
        limit: videos_id.length, // Buscar todos los solicitados
      })

      const foundVideos = videosQuery.docs as Resource[]

      // Verificar que encontramos todos los videos solicitados
      if (foundVideos.length !== videos_id.length) {
        const foundIds = foundVideos.map((v) => v.id)
        const missingIds = videos_id.filter((id) => !foundIds.includes(id))

        console.warn('[MCP_QUERY_VIDEOS] Some videos not found:', {
          requested: videos_id.length,
          found: foundVideos.length,
          missingIds: missingIds.slice(0, 5), // Log primeros 5 para debugging
        })

        return createErrorResponse(
          404,
          `Some videos not found: ${missingIds.length} missing`,
          MCP_ERROR_CODES.VIDEO_NOT_FOUND,
        )
      }

      // Extraer IDs de proyectos de los videos encontrados
      const accessibleProjectIds = accessibleProjects.map((p) => p.id)
      const videoProjectIds = foundVideos.map((video) => {
        const project = video.project
        return typeof project === 'object' ? project.id : project
      })

      // Verificar que todos los videos pertenecen a proyectos accesibles
      const unauthorizedVideos = foundVideos.filter((video) => {
        const projectId = typeof video.project === 'object' ? video.project.id : video.project
        return !accessibleProjectIds.includes(projectId)
      })

      if (unauthorizedVideos.length > 0) {
        console.warn('[MCP_QUERY_VIDEOS] Access denied to some videos:', {
          userId: auth.user?.id,
          mcpKeyId: auth.mcpKey.id,
          unauthorizedCount: unauthorizedVideos.length,
          unauthorizedIds: unauthorizedVideos.slice(0, 3).map((v) => v.id),
          timestamp: new Date().toISOString(),
        })

        return createErrorResponse(
          403,
          `MCP key does not have access to ${unauthorizedVideos.length} of the requested videos`,
          MCP_ERROR_CODES.NO_PROJECT_ACCESS,
        )
      }

      console.log('[MCP_QUERY_VIDEOS] All videos access validated:', {
        authorizedVideos: foundVideos.length,
        uniqueProjects: new Set(videoProjectIds).size,
      })
    } catch (error) {
      console.error('[MCP_QUERY_VIDEOS] Error validating video access:', {
        error: error instanceof Error ? error.message : String(error),
        videosRequested: videos_id.length,
      })

      return createErrorResponse(
        500,
        'Failed to validate video access',
        MCP_ERROR_CODES.UNKNOWN_ERROR,
      )
    }

    // 5. Generar embedding de la pregunta
    console.log('[MCP_QUERY_VIDEOS] Generating embedding for question:', {
      questionLength: question.length,
      questionPreview: question.substring(0, 100),
    })

    const embeddingGenerator = EmbeddingGenerator.getInstance()
    const embeddingResult = await embeddingGenerator.generateEmbedding(question)

    if (!embeddingResult.success) {
      console.error('[MCP_QUERY_VIDEOS] Embedding generation failed:', {
        error: embeddingResult.error,
        retryCount: embeddingResult.retryCount,
      })

      return createErrorResponse(
        500,
        'Failed to generate question embedding',
        MCP_ERROR_CODES.OPENAI_ERROR,
      )
    }

    // 6. Consultar Pinecone filtrando por resourceIds específicos
    const topK = 50
    console.log('vector: ', embeddingResult.embedding)
    console.log('[MCP_QUERY_VIDEOS] Querying Pinecone with resourceId filter:', {
      resourceIds: videos_id,
      vectorDimensions: embeddingResult.embedding.length,
      topK, // Cuanto mayor sea topK, más resultados se obtendrán
    })

    try {
      // Consultar Pinecone con filtro por resourceIds
      // Nota: Usamos el método queryVectors con filtro en lugar de namespace específico
      console.log('videos_id: ', videos_id)
      console.log('tipo de videos_id: ', typeof videos_id)
      const pineconeResults = await PineconeManager.queryVectors(
        embeddingResult.embedding,
        topK, // topK mayor para videos específicos
        {
          resourceId: { $in: videos_id.map((id) => id.toString()) }, // Filtrar por los IDs de videos solicitados
        },
        undefined, // Sin namespace específico, buscar en todos los namespaces
      )

      console.log('[MCP_QUERY_VIDEOS] Pinecone query completed:', {
        resultCount: pineconeResults.length,
        resourceIdsFilter: videos_id.length,
      })

      // 7. Transformar resultados a formato MCP
      const records: McpQueryRecord[] = pineconeResults.map((result, index) => ({
        id: result.id,
        score: 0.85 - index * 0.01, // Score más granular para videos específicos
        metadata: {
          chunkIndex: result.metadata?.chunkIndex || 0,
          description: result.metadata?.description || '',
          endTime: result.metadata?.endTime || 0,
          end_ms: result.metadata?.end_ms || result.metadata?.endTime || 0,
          fileName: result.metadata?.fileName || '',
          namespace: result.metadata?.namespace || '',
          resourceId: result.metadata?.resourceId || '',
          segmentId: result.metadata?.segmentId || '',
          startTime: result.metadata?.startTime || 0,
          start_ms: result.metadata?.start_ms || result.metadata?.startTime || 0,
          transcript: result.metadata?.transcript || '',
          type: result.metadata?.type || 'video',
        },
      }))

      // 8. Logging de consulta exitosa para auditoría
      console.log('[MCP_QUERY_VIDEOS] Query completed successfully:', {
        action: 'QUERY_VIDEOS',
        userId: auth.user?.id,
        userEmail: auth.user?.email,
        mcpKeyId: auth.mcpKey.id,
        mcpKeyName: auth.mcpKey.name,
        videosRequested: videos_id.length,
        videosIds: videos_id,
        questionLength: question.length,
        resultCount: records.length,
        embeddingModel: embeddingResult.metadata.model,
        processingTimeMs: embeddingResult.metadata.processingTimeMs,
        timestamp: new Date().toISOString(),
      })

      // 9. Tracking de uso para rate limiting futuro
      const { trackMcpKeyUsage } = await import('../rate-limiter')
      trackMcpKeyUsage(auth.mcpKey, '/api/mcp/query-videos', {
        processingTimeMs: embeddingResult.metadata.processingTimeMs,
        success: true,
        requestSize: question.length + videos_id.length,
        responseSize: records.length,
      })

      const response: McpQueryResponse = {
        records,
        vector: embeddingResult.embedding,
      }
      return createSuccessResponse(response)
    } catch (pineconeError) {
      console.error('[MCP_QUERY_VIDEOS] Pinecone query failed:', {
        error: pineconeError instanceof Error ? pineconeError.message : String(pineconeError),
        resourceIds: videos_id,
      })

      return createErrorResponse(
        500,
        'Failed to query video content database',
        MCP_ERROR_CODES.PINECONE_ERROR,
      )
    }
  } catch (error) {
    console.error('[MCP_QUERY_VIDEOS] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })

    return createErrorResponse(
      500,
      'Internal server error while processing query',
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
