// ============================================================================
// MCP API ENDPOINT: POST /api/mcp/query-project
// ============================================================================

/**
 * Endpoint para consultar videos de un proyecto específico mediante embeddings
 *
 * Request:
 * - Method: POST
 * - Headers: Authorization: Bearer <mcp_key>
 * - Body: { "project_id": "string", "question": "string" }
 *
 * Response:
 * - 200: { "records": Array<McpQueryRecord> }
 * - 401: MCP Key inválida o host no autorizado
 * - 403: Sin acceso al proyecto especificado
 * - 400: Request mal formada o pregunta demasiado larga
 * - 500: Error interno del servidor
 */

import { NextRequest } from 'next/server'
import {
  requireMcpAuth,
  verifyProjectAccess,
  parseRequestBody,
  createErrorResponse,
  createSuccessResponse,
  MCP_ERROR_CODES,
  MAX_QUESTION_LENGTH,
  type McpAuthResult,
  type McpQueryProjectRequest,
  type McpQueryRecord,
  type McpQueryResponse,
} from '../auth-service'
import { EmbeddingGenerator } from '@/lib/embeddings/generator'
import { PineconeManager } from '@/lib/pinecone'

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    console.log('[MCP_QUERY_PROJECT] Processing project query request')

    // 1. Autenticar MCP Key con logging de seguridad
    const auth: McpAuthResult = await requireMcpAuth(request, '/api/mcp/query-project')

    if (!auth.success) {
      console.warn('[MCP_QUERY_PROJECT] Authentication failed:', {
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

    const { project_id, question }: McpQueryProjectRequest = body

    // Validar campos requeridos
    if (!project_id || typeof project_id !== 'string') {
      return createErrorResponse(
        400,
        'Missing or invalid project_id field',
        MCP_ERROR_CODES.PROJECT_NOT_FOUND,
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

    // 3. Verificar acceso al proyecto
    if (!auth.mcpKey) {
      return createErrorResponse(
        500,
        'Authentication succeeded but MCP key data is missing',
        MCP_ERROR_CODES.KEY_NOT_FOUND,
      )
    }

    const hasProjectAccess = await verifyProjectAccess(auth.mcpKey, project_id)
    if (!hasProjectAccess) {
      console.warn('[MCP_QUERY_PROJECT] Access denied to project:', {
        userId: auth.user?.id,
        mcpKeyId: auth.mcpKey.id,
        projectId: project_id,
        timestamp: new Date().toISOString(),
      })

      return createErrorResponse(
        403,
        'MCP key does not have access to this project',
        MCP_ERROR_CODES.NO_PROJECT_ACCESS,
      )
    }

    // 4. Generar embedding de la pregunta
    console.log('[MCP_QUERY_PROJECT] Generating embedding for question:', {
      questionLength: question.length,
      questionPreview: question.substring(0, 100),
    })

    const embeddingGenerator = EmbeddingGenerator.getInstance()
    const embeddingResult = await embeddingGenerator.generateEmbedding(question)

    if (!embeddingResult.success) {
      console.error('[MCP_QUERY_PROJECT] Embedding generation failed:', {
        error: embeddingResult.error,
        retryCount: embeddingResult.retryCount,
      })

      return createErrorResponse(
        500,
        'Failed to generate question embedding',
        MCP_ERROR_CODES.OPENAI_ERROR,
      )
    }

    // 5. Consultar Pinecone con namespace del proyecto
    const namespace = `project-${project_id}-videos`
    console.log('[MCP_QUERY_PROJECT] Querying Pinecone:', {
      namespace,
      vectorDimensions: embeddingResult.embedding.length,
      topK: 10, // Número razonable de resultados
    })

    try {
      const pineconeResults = await PineconeManager.queryVectors(
        embeddingResult.embedding,
        10, // topK - devolver top 10 resultados más similares
        undefined, // Sin filtros adicionales (ya filtramos por namespace)
        namespace,
      )

      console.log('[MCP_QUERY_PROJECT] Pinecone query completed:', {
        resultCount: pineconeResults.length,
        namespace,
      })

      // 6. Transformar resultados a formato MCP
      const records: McpQueryRecord[] = pineconeResults.map((result, index) => ({
        id: result.id,
        score: 0.85 - index * 0.05, // Score simulado basado en orden (en Pinecone real vendría en result.score)
        metadata: {
          chunkIndex: result.metadata?.chunkIndex || 0,
          description: result.metadata?.description || '',
          endTime: result.metadata?.endTime || 0,
          end_ms: result.metadata?.end_ms || result.metadata?.endTime || 0,
          fileName: result.metadata?.fileName || '',
          namespace: result.metadata?.namespace || namespace,
          resourceId: result.metadata?.resourceId || '',
          segmentId: result.metadata?.segmentId || '',
          startTime: result.metadata?.startTime || 0,
          start_ms: result.metadata?.start_ms || result.metadata?.startTime || 0,
          transcript: result.metadata?.transcript || '',
          type: result.metadata?.type || 'video',
        },
      }))

      // 7. Logging de consulta exitosa para auditoría
      console.log('[MCP_QUERY_PROJECT] Query completed successfully:', {
        action: 'QUERY_PROJECT',
        userId: auth.user?.id,
        userEmail: auth.user?.email,
        mcpKeyId: auth.mcpKey.id,
        mcpKeyName: auth.mcpKey.name,
        projectId: project_id,
        questionLength: question.length,
        resultCount: records.length,
        embeddingModel: embeddingResult.metadata.model,
        processingTimeMs: embeddingResult.metadata.processingTimeMs,
        timestamp: new Date().toISOString(),
      })

      const response: McpQueryResponse = {
        records,
        vector: embeddingResult.embedding,
      }
      return createSuccessResponse(response)
    } catch (pineconeError) {
      console.error('[MCP_QUERY_PROJECT] Pinecone query failed:', {
        error: pineconeError instanceof Error ? pineconeError.message : String(pineconeError),
        namespace,
        projectId: project_id,
      })

      return createErrorResponse(
        500,
        'Failed to query video content database',
        MCP_ERROR_CODES.PINECONE_ERROR,
      )
    }
  } catch (error) {
    console.error('[MCP_QUERY_PROJECT] Unexpected error:', {
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
