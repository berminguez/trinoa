// ============================================================================
// EIDETIK MVP - VECTOR MANAGER PARA PINECONE
// ============================================================================

import { Pinecone, type Index } from '@pinecone-database/pinecone'

import type { VectorMetadata } from '@/types'

// Configuración del gestor de vectores
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'resources-chunks'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const BATCH_SIZE = 100 // Número máximo de vectores por upsert
const VECTOR_DIMENSIONS = 1024

// Interfaces para el VectorManager
export interface VectorUpsertRequest {
  id: string
  values: number[]
  metadata: VectorMetadata
}

export interface VectorUpsertResult {
  success: true
  upsertedCount: number
  metadata: {
    indexName: string
    totalVectors: number
    processingTimeMs: number
    vectorIds: string[]
    namespaceBreakdown: Record<string, number>
  }
}

export interface VectorUpsertError {
  success: false
  error: string
  partialSuccess?: boolean
  upsertedCount?: number
  failedVectors?: string[]
}

export type VectorUpsertResponse = VectorUpsertResult | VectorUpsertError

export interface VectorValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Gestor de vectores para Pinecone
 * Maneja upsert, validación, cleanup y configuración del índice
 */
export class VectorManager {
  private static instance: VectorManager | null = null
  private pineconeClient: Pinecone | null = null
  private index: Index | null = null
  private initialized = false

  /**
   * Singleton pattern para reutilizar conexión
   */
  static getInstance(): VectorManager {
    if (!this.instance) {
      this.instance = new VectorManager()
    }
    return this.instance
  }

  /**
   * Inicializa la conexión con Pinecone
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.pineconeClient && this.index) {
      return
    }

    try {
      console.log(`[VECTOR-MANAGER] Initializing Pinecone connection...`)

      const apiKey = process.env.PINECONE_API_KEY
      if (!apiKey) {
        throw new Error('PINECONE_API_KEY environment variable is required')
      }

      this.pineconeClient = new Pinecone({
        apiKey,
      })

      this.index = this.pineconeClient.index(INDEX_NAME)
      this.initialized = true

      console.log(`[VECTOR-MANAGER] ✅ Pinecone initialized successfully with index: ${INDEX_NAME}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[VECTOR-MANAGER] ❌ Failed to initialize Pinecone:`, errorMessage)
      throw new Error(`Pinecone initialization failed: ${errorMessage}`)
    }
  }

  /**
   * Genera ID único para un vector siguiendo el patrón {resourceId}--chunk-{chunkIndex}
   */
  generateVectorId(resourceId: string, chunkIndex: number): string {
    if (!resourceId || resourceId.trim().length === 0) {
      throw new Error('resourceId cannot be empty')
    }

    if (chunkIndex < 0 || !Number.isInteger(chunkIndex)) {
      throw new Error('chunkIndex must be a non-negative integer')
    }

    return `${resourceId.trim()}--chunk-${chunkIndex}`
  }

  /**
   * Valida un vector antes de la inserción
   */
  validateVector(vector: VectorUpsertRequest): VectorValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validar ID
    if (!vector.id || vector.id.trim().length === 0) {
      errors.push('Vector ID cannot be empty')
    } else if (!vector.id.includes('--chunk-')) {
      warnings.push('Vector ID does not follow expected pattern {resourceId}--chunk-{chunkIndex}')
    }

    // Validar valores del vector
    if (!Array.isArray(vector.values)) {
      errors.push('Vector values must be an array')
    } else {
      if (vector.values.length !== VECTOR_DIMENSIONS) {
        errors.push(
          `Vector must have exactly ${VECTOR_DIMENSIONS} dimensions, got ${vector.values.length}`,
        )
      }

      if (vector.values.some((val) => typeof val !== 'number' || !isFinite(val))) {
        errors.push('Vector values must be finite numbers')
      }
    }

    // Validar metadata
    if (!vector.metadata || typeof vector.metadata !== 'object') {
      errors.push('Vector metadata is required and must be an object')
    } else {
      const metadata = vector.metadata

      // Campos requeridos según el PRD
      const requiredFields = ['resourceId', 'chunkIndex', 'start_ms', 'end_ms', 'namespace', 'type']

      for (const field of requiredFields) {
        if (!(field in metadata)) {
          errors.push(`Metadata is missing required field: ${field}`)
        }
      }

      // Validaciones específicas
      if (
        metadata.chunkIndex !== undefined &&
        (typeof metadata.chunkIndex !== 'number' || metadata.chunkIndex < 0)
      ) {
        errors.push('Metadata chunkIndex must be a non-negative number')
      }

      if (
        metadata.start_ms !== undefined &&
        (typeof metadata.start_ms !== 'number' || metadata.start_ms < 0)
      ) {
        errors.push('Metadata start_ms must be a non-negative number')
      }

      if (
        metadata.end_ms !== undefined &&
        (typeof metadata.end_ms !== 'number' || metadata.end_ms < 0)
      ) {
        errors.push('Metadata end_ms must be a non-negative number')
      }

      if (
        metadata.start_ms !== undefined &&
        metadata.end_ms !== undefined &&
        metadata.start_ms >= metadata.end_ms
      ) {
        errors.push('Metadata start_ms must be less than end_ms')
      }

      if (
        metadata.type !== undefined &&
        !['video', 'audio', 'pdf', 'ppt'].includes(metadata.type)
      ) {
        errors.push('Metadata type must be one of: video, audio, pdf, ppt')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Inserta vectores en Pinecone usando upsert con namespace correcto
   */
  async upsertVectors(
    vectors: VectorUpsertRequest[],
    retryCount = 0,
  ): Promise<VectorUpsertResponse> {
    const startTime = Date.now()

    try {
      if (!this.initialized) {
        await this.initialize()
      }

      if (!this.index) {
        throw new Error('Pinecone index not initialized')
      }

      console.log(`[VECTOR-MANAGER] Upserting ${vectors.length} vectors to index: ${INDEX_NAME}`)

      if (vectors.length === 0) {
        return {
          success: true,
          upsertedCount: 0,
          metadata: {
            indexName: INDEX_NAME,
            totalVectors: 0,
            processingTimeMs: Date.now() - startTime,
            vectorIds: [],
            namespaceBreakdown: {},
          },
        }
      }

      // Validar todos los vectores antes de procesar
      const validationErrors: string[] = []
      const validatedVectors: VectorUpsertRequest[] = []

      for (let i = 0; i < vectors.length; i++) {
        const validation = this.validateVector(vectors[i])

        if (!validation.valid) {
          validationErrors.push(`Vector ${i} (${vectors[i].id}): ${validation.errors.join(', ')}`)
        } else {
          validatedVectors.push(vectors[i])

          // Log warnings si existen
          if (validation.warnings.length > 0) {
            console.warn(
              `[VECTOR-MANAGER] Vector ${vectors[i].id}: ${validation.warnings.join(', ')}`,
            )
          }
        }
      }

      if (validationErrors.length > 0) {
        throw new Error(`Vector validation failed:\n${validationErrors.join('\n')}`)
      }

      // ========================================================================
      // AGRUPACIÓN POR NAMESPACE - CRUCIAL PARA PINECONE
      // ========================================================================
      const vectorsByNamespace = new Map<string, VectorUpsertRequest[]>()

      for (const vector of validatedVectors) {
        const namespace = vector.metadata.namespace
        if (!namespace) {
          throw new Error(`Vector ${vector.id} is missing namespace in metadata`)
        }

        if (!vectorsByNamespace.has(namespace)) {
          vectorsByNamespace.set(namespace, [])
        }
        vectorsByNamespace.get(namespace)!.push(vector)
      }

      console.log(`[VECTOR-MANAGER] Vectors grouped by namespace:`)
      for (const [namespace, namespaceVectors] of vectorsByNamespace) {
        console.log(`  - ${namespace}: ${namespaceVectors.length} vectors`)
      }

      // Procesar cada namespace por separado
      let totalUpserted = 0
      const allVectorIds: string[] = []
      const namespaceBreakdown: Record<string, number> = {}

      for (const [namespace, namespaceVectors] of vectorsByNamespace) {
        console.log(
          `[VECTOR-MANAGER] Processing namespace: ${namespace} (${namespaceVectors.length} vectors)`,
        )

        // Procesar en batches dentro del namespace
        const totalBatches = Math.ceil(namespaceVectors.length / BATCH_SIZE)
        let namespaceTotalUpserted = 0

        for (let i = 0; i < namespaceVectors.length; i += BATCH_SIZE) {
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1
          const batch = namespaceVectors.slice(i, i + BATCH_SIZE)

          console.log(
            `[VECTOR-MANAGER] Processing namespace "${namespace}" batch ${batchNumber}/${totalBatches} (${batch.length} vectors)`,
          )

          const upsertData = batch.map((vector) => ({
            id: vector.id,
            values: vector.values,
            metadata: {
              // Mantener resourceId para filtrado
              resourceId: vector.metadata.resourceId,
              chunkIndex: vector.metadata.chunkIndex,
              start_ms: vector.metadata.start_ms,
              end_ms: vector.metadata.end_ms,
              type: vector.metadata.type,

              // Campos adicionales de metadatos
              segmentId: vector.metadata.segmentId,
              transcript: vector.metadata.transcript || '',
              description: vector.metadata.description || '',
              fileName: vector.metadata.fileName || '',

              // Legacy fields para compatibilidad
              startTime: vector.metadata.startTime,
              endTime: vector.metadata.endTime,

              // IMPORTANTE: Incluir namespace en metadata también para consultas
              namespace: vector.metadata.namespace,
            } as Record<string, any>,
          }))

          // ========================================================================
          // USAR NAMESPACE CORRECTO EN PINECONE
          // ========================================================================
          await this.index.namespace(namespace).upsert(upsertData)

          // Log successful upsert
          console.log(
            `[VECTOR-MANAGER] ✅ Namespace "${namespace}" batch ${batchNumber} upserted successfully`,
          )

          namespaceTotalUpserted += batch.length
          allVectorIds.push(...batch.map((v) => v.id))

          // Rate limiting entre batches
          if (batchNumber < totalBatches || vectorsByNamespace.size > 1) {
            await new Promise((resolve) => setTimeout(resolve, 200))
          }
        }

        namespaceBreakdown[namespace] = namespaceTotalUpserted
        totalUpserted += namespaceTotalUpserted

        console.log(
          `[VECTOR-MANAGER] ✅ Namespace "${namespace}" completed: ${namespaceTotalUpserted} vectors`,
        )
      }

      const processingTime = Date.now() - startTime
      console.log(
        `[VECTOR-MANAGER] ✅ Upsert completed: ${totalUpserted} vectors across ${vectorsByNamespace.size} namespaces in ${processingTime}ms`,
      )
      console.log(`[VECTOR-MANAGER] Namespace breakdown:`, namespaceBreakdown)

      return {
        success: true,
        upsertedCount: totalUpserted,
        metadata: {
          indexName: INDEX_NAME,
          totalVectors: totalUpserted,
          processingTimeMs: processingTime,
          vectorIds: allVectorIds,
          namespaceBreakdown,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[VECTOR-MANAGER] ❌ Upsert failed (attempt ${retryCount + 1}):`, errorMessage)

      // Reintentar si no hemos alcanzado el máximo
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount)
        console.log(`[VECTOR-MANAGER] Retrying in ${delay}ms...`)

        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.upsertVectors(vectors, retryCount + 1)
      }

      return {
        success: false,
        error: errorMessage,
        partialSuccess: false,
        upsertedCount: 0,
        failedVectors: vectors.map((v) => v.id),
      }
    }
  }

  /**
   * Limpia vectores parciales en caso de fallo crítico (ahora con namespace)
   */
  async cleanupPartialVectors(
    resourceId: string,
    namespace?: string,
  ): Promise<{
    success: boolean
    deletedCount: number
    error?: string
  }> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      if (!this.index) {
        throw new Error('Pinecone index not initialized')
      }

      console.log(
        `[VECTOR-MANAGER] Starting cleanup for resource: ${resourceId}${namespace ? ` in namespace: ${namespace}` : ''}`,
      )

      let indexToQuery = this.index

      // Si tenemos namespace específico, usar ese namespace
      if (namespace) {
        indexToQuery = this.index.namespace(namespace)
      }

      // Buscar todos los vectores del recurso
      const queryResponse = await indexToQuery.query({
        vector: new Array(VECTOR_DIMENSIONS).fill(0), // Vector dummy
        topK: 10000,
        filter: {
          resourceId: { $eq: resourceId },
        },
        includeMetadata: false,
      })

      const vectorIds = queryResponse.matches?.map((match) => match.id) || []

      if (vectorIds.length === 0) {
        console.log(`[VECTOR-MANAGER] No vectors found for cleanup: ${resourceId}`)
        return {
          success: true,
          deletedCount: 0,
        }
      }

      // Eliminar vectores en el namespace correcto
      if (namespace) {
        await this.index.namespace(namespace).deleteMany(vectorIds)
      } else {
        await this.index.deleteMany(vectorIds)
      }

      console.log(
        `[VECTOR-MANAGER] ✅ Cleanup completed: deleted ${vectorIds.length} vectors for resource ${resourceId}`,
      )

      return {
        success: true,
        deletedCount: vectorIds.length,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[VECTOR-MANAGER] ❌ Cleanup failed for resource ${resourceId}:`, errorMessage)

      return {
        success: false,
        deletedCount: 0,
        error: errorMessage,
      }
    }
  }

  /**
   * Health check del servicio de vectores
   */
  async healthCheck(): Promise<{
    healthy: boolean
    indexName: string
    initialized: boolean
    error?: string
  }> {
    try {
      console.log(`[VECTOR-MANAGER] Running health check...`)

      if (!this.initialized) {
        await this.initialize()
      }

      if (!this.index) {
        throw new Error('Index not available')
      }

      // Test simple: describe index stats
      const stats = await this.index.describeIndexStats()

      return {
        healthy: true,
        indexName: INDEX_NAME,
        initialized: this.initialized,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[VECTOR-MANAGER] Health check failed:`, errorMessage)

      return {
        healthy: false,
        indexName: INDEX_NAME,
        initialized: this.initialized,
        error: errorMessage,
      }
    }
  }

  /**
   * Obtener configuración del gestor
   */
  getConfig(): {
    indexName: string
    maxRetries: number
    retryDelay: number
    batchSize: number
    vectorDimensions: number
    initialized: boolean
  } {
    return {
      indexName: INDEX_NAME,
      maxRetries: MAX_RETRIES,
      retryDelay: RETRY_DELAY_MS,
      batchSize: BATCH_SIZE,
      vectorDimensions: VECTOR_DIMENSIONS,
      initialized: this.initialized,
    }
  }
}

// Export default instance para uso conveniente
export const vectorManager = VectorManager.getInstance()
