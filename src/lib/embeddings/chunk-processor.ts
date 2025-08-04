// ============================================================================
// EIDETIK MVP - CHUNK PROCESSOR PARA EMBEDDINGS
// ============================================================================

import type { VideoChunk } from '@/lib/video/chunk-processor'
import type { TranscriptionSegment } from '@/lib/video/transcriber'

// Interfaces para el ChunkProcessor
export interface ChunkForEmbeddingRequest {
  chunk: VideoChunk
  additionalContext?: {
    videoTitle?: string
    totalDuration?: number
    chunkCount?: number
  }
}

export interface ChunkForEmbeddingResult {
  success: true
  formattedText: string
  metadata: {
    chunkIndex: number
    start_ms: number
    end_ms: number
    namespace: string
    resourceId: string
    hasTranscription: boolean
    hasVisualElements: boolean
    textLength: number
    processingTimeMs: number
  }
}

export interface ChunkForEmbeddingError {
  success: false
  error: string
  chunkIndex?: number
}

export type ChunkForEmbeddingResponse = ChunkForEmbeddingResult | ChunkForEmbeddingError

export interface ChunkValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Procesador de chunks para generar texto optimizado para embeddings
 * Combina transcripción + descripción visual en formato estructurado
 */
export class ChunkProcessor {
  private static instance: ChunkProcessor | null = null

  /**
   * Singleton pattern para reutilizar configuración
   */
  static getInstance(): ChunkProcessor {
    if (!this.instance) {
      this.instance = new ChunkProcessor()
    }
    return this.instance
  }

  /**
   * Valida la estructura de un chunk antes de procesar
   */
  validateChunk(chunk: VideoChunk): ChunkValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validar campos requeridos
    if (typeof chunk.id !== 'number') {
      errors.push('Chunk ID must be a number')
    }

    if (typeof chunk.start_ms !== 'number' || chunk.start_ms < 0) {
      errors.push('start_ms must be a non-negative number')
    }

    if (typeof chunk.end_ms !== 'number' || chunk.end_ms < 0) {
      errors.push('end_ms must be a non-negative number')
    }

    if (chunk.start_ms >= chunk.end_ms) {
      errors.push('start_ms must be less than end_ms')
    }

    if (
      !chunk.namespace ||
      typeof chunk.namespace !== 'string' ||
      chunk.namespace.trim().length === 0
    ) {
      errors.push('namespace is required and must be a non-empty string')
    }

    if (
      !chunk.resourceId ||
      typeof chunk.resourceId !== 'string' ||
      chunk.resourceId.trim().length === 0
    ) {
      errors.push('resourceId is required and must be a non-empty string')
    }

    if (typeof chunk.chunkIndex !== 'number' || chunk.chunkIndex < 0) {
      errors.push('chunkIndex must be a non-negative number')
    }

    // Validar transcripción
    if (!Array.isArray(chunk.transcription)) {
      errors.push('transcription must be an array')
    }

    // Validar descripción
    if (!chunk.description || typeof chunk.description !== 'string') {
      errors.push('description is required and must be a string')
    }

    // Validar screenshots
    if (!Array.isArray(chunk.screenshots)) {
      errors.push('screenshots must be an array')
    }

    // Warnings para casos edge
    if (chunk.transcription.length === 0 && chunk.screenshots.length === 0) {
      warnings.push('Chunk has no transcription and no screenshots - will generate minimal text')
    }

    if (chunk.transcription.length === 0) {
      warnings.push('Chunk has no transcription - will rely on visual description only')
    }

    if (chunk.screenshots.length === 0) {
      warnings.push('Chunk has no screenshots - will rely on transcription only')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Extrae texto plano de segmentos de transcripción JSON
   */
  extractTranscriptionText(transcriptionSegments: TranscriptionSegment[]): string {
    if (!transcriptionSegments || transcriptionSegments.length === 0) {
      return ''
    }

    try {
      return transcriptionSegments
        .map((segment) => segment.text.trim())
        .filter((text) => text.length > 0)
        .join(' ')
        .trim()
    } catch (error) {
      console.error('[CHUNK-PROCESSOR] Error extracting transcription text:', error)
      return ''
    }
  }

  /**
   * Procesa texto de transcripción desde JSON string
   */
  processTranscriptionFromJson(transcriptionJson: string): string {
    if (!transcriptionJson || transcriptionJson.trim().length === 0) {
      return ''
    }

    try {
      // Si es string directo, retornarlo
      if (!transcriptionJson.startsWith('[') && !transcriptionJson.startsWith('{')) {
        return transcriptionJson.trim()
      }

      // Intentar parsear como JSON
      const parsed = JSON.parse(transcriptionJson)

      if (Array.isArray(parsed)) {
        return this.extractTranscriptionText(parsed)
      } else if (parsed && typeof parsed === 'object') {
        // Si es objeto único, convertir a array
        return this.extractTranscriptionText([parsed])
      } else {
        return String(parsed).trim()
      }
    } catch (error) {
      console.warn(
        '[CHUNK-PROCESSOR] Failed to parse transcription JSON, using as plain text:',
        error,
      )
      return transcriptionJson.trim()
    }
  }

  /**
   * Formatea un chunk para embedding con formato optimizado
   */
  async formatChunkForEmbedding(
    request: ChunkForEmbeddingRequest,
  ): Promise<ChunkForEmbeddingResponse> {
    const startTime = Date.now()

    try {
      console.log(`[CHUNK-PROCESSOR] Formatting chunk ${request.chunk.chunkIndex} for embedding`)

      // Validar chunk
      const validation = this.validateChunk(request.chunk)
      if (!validation.valid) {
        return {
          success: false,
          error: `Chunk validation failed: ${validation.errors.join(', ')}`,
          chunkIndex: request.chunk.chunkIndex,
        }
      }

      // Log warnings si existen
      if (validation.warnings.length > 0) {
        console.warn(
          `[CHUNK-PROCESSOR] Chunk ${request.chunk.chunkIndex}: ${validation.warnings.join(', ')}`,
        )
      }

      const chunk = request.chunk

      // Extraer transcripción
      let transcriptionText = ''
      if (chunk.transcription && chunk.transcription.length > 0) {
        transcriptionText = this.extractTranscriptionText(chunk.transcription)
      }

      // Procesar descripción visual
      const visualDescription = chunk.description ? chunk.description.trim() : ''

      // Calcular duración en segundos
      const durationSeconds = Math.round((chunk.end_ms - chunk.start_ms) / 1000)
      const startSeconds = Math.round(chunk.start_ms / 1000)
      const endSeconds = Math.round(chunk.end_ms / 1000)

      // Crear formato optimizado para embeddings
      const sections: string[] = []

      // Sección de metadatos básicos
      sections.push(`Namespace: ${chunk.namespace}`)
      sections.push(`Duration: ${startSeconds}s-${endSeconds}s (${durationSeconds}s)`)

      // Agregar contexto adicional si está disponible
      if (request.additionalContext?.videoTitle) {
        sections.push(`Video: ${request.additionalContext.videoTitle}`)
      }

      // Sección de transcripción
      if (transcriptionText.length > 0) {
        sections.push(`Transcript: ${transcriptionText}`)
      } else {
        sections.push(`Transcript: [No audio content]`)
      }

      // Sección visual
      if (visualDescription.length > 0) {
        sections.push(`Visual: ${visualDescription}`)
      } else {
        sections.push(`Visual: [No visual elements]`)
      }

      // Agregar información de screenshots si existen
      if (chunk.screenshots && chunk.screenshots.length > 0) {
        sections.push(`Screenshots: ${chunk.screenshots.length} visual elements`)
      }

      // Combinar todas las secciones
      const formattedText = sections.join('\n')

      const processingTime = Date.now() - startTime
      console.log(
        `[CHUNK-PROCESSOR] ✅ Chunk ${chunk.chunkIndex} formatted: ${formattedText.length} characters in ${processingTime}ms`,
      )

      return {
        success: true,
        formattedText,
        metadata: {
          chunkIndex: chunk.chunkIndex,
          start_ms: chunk.start_ms,
          end_ms: chunk.end_ms,
          namespace: chunk.namespace,
          resourceId: chunk.resourceId,
          hasTranscription: transcriptionText.length > 0,
          hasVisualElements: visualDescription.length > 0,
          textLength: formattedText.length,
          processingTimeMs: processingTime,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(
        `[CHUNK-PROCESSOR] ❌ Error formatting chunk ${request.chunk?.chunkIndex}:`,
        errorMessage,
      )

      return {
        success: false,
        error: errorMessage,
        chunkIndex: request.chunk?.chunkIndex,
      }
    }
  }

  /**
   * Procesa múltiples chunks en batch
   */
  async formatChunksBatch(
    chunks: VideoChunk[],
    additionalContext?: {
      videoTitle?: string
      totalDuration?: number
    },
  ): Promise<{
    success: boolean
    results: ChunkForEmbeddingResponse[]
    metadata: {
      totalChunks: number
      successfulChunks: number
      failedChunks: number
      totalProcessingTimeMs: number
      averageTextLength: number
    }
  }> {
    const startTime = Date.now()

    try {
      console.log(`[CHUNK-PROCESSOR] Processing ${chunks.length} chunks in batch`)

      const results: ChunkForEmbeddingResponse[] = []
      let successfulChunks = 0
      let failedChunks = 0
      let totalTextLength = 0

      for (const chunk of chunks) {
        const result = await this.formatChunkForEmbedding({
          chunk,
          additionalContext: {
            ...additionalContext,
            chunkCount: chunks.length,
          },
        })

        results.push(result)

        if (result.success) {
          successfulChunks++
          totalTextLength += result.metadata.textLength
        } else {
          failedChunks++
        }
      }

      const totalProcessingTime = Date.now() - startTime
      const averageTextLength =
        successfulChunks > 0 ? Math.round(totalTextLength / successfulChunks) : 0

      console.log(
        `[CHUNK-PROCESSOR] ✅ Batch processing completed: ${successfulChunks}/${chunks.length} chunks in ${totalProcessingTime}ms`,
      )

      return {
        success: failedChunks === 0,
        results,
        metadata: {
          totalChunks: chunks.length,
          successfulChunks,
          failedChunks,
          totalProcessingTimeMs: totalProcessingTime,
          averageTextLength,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[CHUNK-PROCESSOR] ❌ Batch processing failed:`, errorMessage)

      return {
        success: false,
        results: [],
        metadata: {
          totalChunks: chunks.length,
          successfulChunks: 0,
          failedChunks: chunks.length,
          totalProcessingTimeMs: Date.now() - startTime,
          averageTextLength: 0,
        },
      }
    }
  }

  /**
   * Obtener estadísticas de procesamiento
   */
  getProcessingStats(results: ChunkForEmbeddingResponse[]): {
    totalChunks: number
    successfulChunks: number
    failedChunks: number
    chunksWithTranscription: number
    chunksWithVisuals: number
    chunksWithBoth: number
    chunksWithNeither: number
    averageTextLength: number
    textLengthRange: { min: number; max: number }
  } {
    const successful = results.filter((r): r is ChunkForEmbeddingResult => r.success)
    const failed = results.filter((r) => !r.success)

    const chunksWithTranscription = successful.filter((r) => r.metadata.hasTranscription).length
    const chunksWithVisuals = successful.filter((r) => r.metadata.hasVisualElements).length
    const chunksWithBoth = successful.filter(
      (r) => r.metadata.hasTranscription && r.metadata.hasVisualElements,
    ).length
    const chunksWithNeither = successful.filter(
      (r) => !r.metadata.hasTranscription && !r.metadata.hasVisualElements,
    ).length

    const textLengths = successful.map((r) => r.metadata.textLength)
    const averageTextLength =
      textLengths.length > 0
        ? Math.round(textLengths.reduce((a, b) => a + b, 0) / textLengths.length)
        : 0
    const minTextLength = textLengths.length > 0 ? Math.min(...textLengths) : 0
    const maxTextLength = textLengths.length > 0 ? Math.max(...textLengths) : 0

    return {
      totalChunks: results.length,
      successfulChunks: successful.length,
      failedChunks: failed.length,
      chunksWithTranscription,
      chunksWithVisuals,
      chunksWithBoth,
      chunksWithNeither,
      averageTextLength,
      textLengthRange: { min: minTextLength, max: maxTextLength },
    }
  }

  /**
   * Health check del procesador
   */
  async healthCheck(): Promise<{
    healthy: boolean
    error?: string
  }> {
    try {
      // Test básico con chunk mock
      const mockChunk: VideoChunk = {
        id: 1,
        start_ms: 0,
        end_ms: 15000,
        namespace: 'test',
        resourceId: 'test-resource',
        chunkIndex: 0,
        timeStart: 0,
        timeEnd: 15000,
        transcription: [{ text: 'test', start_ms: 0, end_ms: 5000 }],
        description: 'test description',
        screenshots: ['test-screenshot'],
        metadata: {
          chunkDuration: 15000,
          transcriptionText: 'test',
          screenshotCount: 1,
          processingTime: 100,
        },
      }

      const result = await this.formatChunkForEmbedding({ chunk: mockChunk })

      return {
        healthy: result.success,
        error: result.success ? undefined : result.error,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[CHUNK-PROCESSOR] Health check failed:', errorMessage)

      return {
        healthy: false,
        error: errorMessage,
      }
    }
  }
}

// Export default instance para uso conveniente
export const chunkProcessor = ChunkProcessor.getInstance()
