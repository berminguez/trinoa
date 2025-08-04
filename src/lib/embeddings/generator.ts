// ============================================================================
// EIDETIK MVP - EMBEDDING GENERATOR
// ============================================================================

import { getOpenAIClient } from '@/lib/openai'

// Configuración del generador de embeddings
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const RATE_LIMIT_DELAY_MS = 1000 // 1 segundo entre batches
const EXPECTED_DIMENSIONS = 1024 // Coincide con el índice de Pinecone actual

export interface EmbeddingResult {
  success: true
  embedding: number[]
  metadata: {
    model: string
    dimensions: number
    processingTimeMs: number
  }
}

export interface EmbeddingError {
  success: false
  error: string
  retryCount?: number
}

export type EmbeddingResponse = EmbeddingResult | EmbeddingError

export interface BatchEmbeddingResult {
  success: true
  embeddings: number[][]
  metadata: {
    model: string
    totalTexts: number
    totalBatches: number
    totalProcessingTimeMs: number
    averageTimePerText: number
  }
}

export interface BatchEmbeddingError {
  success: false
  error: string
  partialResults?: number[][]
  processedCount?: number
}

export type BatchEmbeddingResponse = BatchEmbeddingResult | BatchEmbeddingError

/**
 * Servicio para generar embeddings usando OpenAI API
 * Maneja rate limiting, reintentos y validación de dimensiones
 */
export class EmbeddingGenerator {
  private static instance: EmbeddingGenerator | null = null

  /**
   * Singleton pattern para reutilizar configuración
   */
  static getInstance(): EmbeddingGenerator {
    if (!this.instance) {
      this.instance = new EmbeddingGenerator()
    }
    return this.instance
  }

  /**
   * Genera un embedding individual usando OpenAI
   */
  async generateEmbedding(text: string, retryCount = 0): Promise<EmbeddingResponse> {
    const startTime = Date.now()

    try {
      console.log(
        `[EMBEDDING-GENERATOR] Generating embedding for text: ${text.substring(0, 100)}...`,
      )

      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty')
      }

      const openai = await getOpenAIClient()

      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text.trim(),
        encoding_format: 'float',
        dimensions: EXPECTED_DIMENSIONS, // text-embedding-3-small permite configurar dimensiones
      })

      const embedding = response.data[0]?.embedding
      if (!embedding) {
        throw new Error('No embedding received from OpenAI')
      }

      // Validar dimensiones
      if (embedding.length !== EXPECTED_DIMENSIONS) {
        throw new Error(
          `Invalid embedding dimensions: expected ${EXPECTED_DIMENSIONS}, got ${embedding.length}`,
        )
      }

      const processingTime = Date.now() - startTime
      console.log(
        `[EMBEDDING-GENERATOR] ✅ Embedding generated: ${embedding.length} dimensions in ${processingTime}ms`,
      )

      return {
        success: true,
        embedding,
        metadata: {
          model: EMBEDDING_MODEL,
          dimensions: embedding.length,
          processingTimeMs: processingTime,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(
        `[EMBEDDING-GENERATOR] ❌ Embedding generation failed (attempt ${retryCount + 1}):`,
        errorMessage,
      )

      // Reintentar si no hemos alcanzado el máximo
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount)
        console.log(`[EMBEDDING-GENERATOR] Retrying in ${delay}ms...`)

        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.generateEmbedding(text, retryCount + 1)
      }

      return {
        success: false,
        error: errorMessage,
        retryCount,
      }
    }
  }

  /**
   * Genera embeddings en batch con rate limiting
   */
  async generateEmbeddingsBatch(
    texts: string[],
    maxBatchSize = 10,
  ): Promise<BatchEmbeddingResponse> {
    const startTime = Date.now()

    try {
      console.log(`[EMBEDDING-GENERATOR] Generating ${texts.length} embeddings in batch`)

      if (!texts || texts.length === 0) {
        return {
          success: true,
          embeddings: [],
          metadata: {
            model: EMBEDDING_MODEL,
            totalTexts: 0,
            totalBatches: 0,
            totalProcessingTimeMs: 0,
            averageTimePerText: 0,
          },
        }
      }

      // Filtrar textos vacíos
      const validTexts = texts.filter((text) => text && text.trim().length > 0)
      if (validTexts.length !== texts.length) {
        console.warn(
          `[EMBEDDING-GENERATOR] Filtered out ${texts.length - validTexts.length} empty texts`,
        )
      }

      const allEmbeddings: number[][] = []
      const totalBatches = Math.ceil(validTexts.length / maxBatchSize)

      for (let i = 0; i < validTexts.length; i += maxBatchSize) {
        const batchNumber = Math.floor(i / maxBatchSize) + 1
        const batch = validTexts.slice(i, i + maxBatchSize)

        console.log(
          `[EMBEDDING-GENERATOR] Processing batch ${batchNumber}/${totalBatches} (${batch.length} texts)`,
        )

        const batchResult = await this.processBatch(batch, batchNumber)
        if (!batchResult.success) {
          return {
            success: false,
            error: batchResult.error,
            partialResults: allEmbeddings,
            processedCount: allEmbeddings.length,
          }
        }

        allEmbeddings.push(...batchResult.embeddings)

        // Rate limiting entre batches
        if (batchNumber < totalBatches) {
          console.log(
            `[EMBEDDING-GENERATOR] Rate limiting: waiting ${RATE_LIMIT_DELAY_MS}ms before next batch`,
          )
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS))
        }
      }

      const totalProcessingTime = Date.now() - startTime
      const averageTimePerText = totalProcessingTime / validTexts.length

      console.log(
        `[EMBEDDING-GENERATOR] ✅ Batch processing completed: ${allEmbeddings.length} embeddings in ${totalProcessingTime}ms`,
      )

      return {
        success: true,
        embeddings: allEmbeddings,
        metadata: {
          model: EMBEDDING_MODEL,
          totalTexts: validTexts.length,
          totalBatches,
          totalProcessingTimeMs: totalProcessingTime,
          averageTimePerText,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[EMBEDDING-GENERATOR] ❌ Batch embedding generation failed:`, errorMessage)

      return {
        success: false,
        error: errorMessage,
        partialResults: [],
        processedCount: 0,
      }
    }
  }

  /**
   * Procesa un batch individual de textos
   */
  private async processBatch(
    texts: string[],
    batchNumber: number,
    retryCount = 0,
  ): Promise<
    | {
        success: true
        embeddings: number[][]
      }
    | {
        success: false
        error: string
      }
  > {
    try {
      const openai = await getOpenAIClient()

      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts.map((text) => text.trim()),
        encoding_format: 'float',
        dimensions: EXPECTED_DIMENSIONS, // text-embedding-3-small permite configurar dimensiones
      })

      const embeddings = response.data.map((item) => item.embedding)

      // Validar que recibimos el número correcto de embeddings
      if (embeddings.length !== texts.length) {
        throw new Error(
          `Batch size mismatch: requested ${texts.length}, received ${embeddings.length}`,
        )
      }

      // Validar dimensiones de cada embedding
      for (let i = 0; i < embeddings.length; i++) {
        if (embeddings[i].length !== EXPECTED_DIMENSIONS) {
          throw new Error(
            `Invalid dimensions in embedding ${i}: expected ${EXPECTED_DIMENSIONS}, got ${embeddings[i].length}`,
          )
        }
      }

      console.log(
        `[EMBEDDING-GENERATOR] ✅ Batch ${batchNumber} completed: ${embeddings.length} embeddings`,
      )

      return {
        success: true,
        embeddings,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(
        `[EMBEDDING-GENERATOR] ❌ Batch ${batchNumber} failed (attempt ${retryCount + 1}):`,
        errorMessage,
      )

      // Reintentar si no hemos alcanzado el máximo
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount)
        console.log(`[EMBEDDING-GENERATOR] Retrying batch ${batchNumber} in ${delay}ms...`)

        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.processBatch(texts, batchNumber, retryCount + 1)
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Health check del servicio de embeddings
   */
  async healthCheck(): Promise<{
    healthy: boolean
    model: string
    error?: string
  }> {
    try {
      console.log(`[EMBEDDING-GENERATOR] Running health check...`)

      const testResult = await this.generateEmbedding('test')

      return {
        healthy: testResult.success,
        model: EMBEDDING_MODEL,
        error: testResult.success ? undefined : testResult.error,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[EMBEDDING-GENERATOR] Health check failed:`, errorMessage)

      return {
        healthy: false,
        model: EMBEDDING_MODEL,
        error: errorMessage,
      }
    }
  }

  /**
   * Obtener configuración del generador
   */
  getConfig(): {
    model: string
    maxRetries: number
    retryDelay: number
    rateLimitDelay: number
    expectedDimensions: number
  } {
    return {
      model: EMBEDDING_MODEL,
      maxRetries: MAX_RETRIES,
      retryDelay: RETRY_DELAY_MS,
      rateLimitDelay: RATE_LIMIT_DELAY_MS,
      expectedDimensions: EXPECTED_DIMENSIONS,
    }
  }
}

// Export default instance para uso conveniente
export const embeddingGenerator = EmbeddingGenerator.getInstance()
