// ============================================================================
// EIDETIK MVP - PINECONE VECTOR STORE
// ============================================================================

import { Pinecone, type Index } from '@pinecone-database/pinecone'

import type { PineconeVector, VectorMetadata } from '../types'

let pineconeClient: Pinecone | null = null
let index: Index | null = null

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'resources-chunks'

export class PineconeManager {
  /**
   * Inicializa el cliente de Pinecone
   */
  static async initialize(): Promise<void> {
    if (pineconeClient && index) return // Ya inicializado

    const apiKey = process.env.PINECONE_API_KEY
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is required')
    }

    try {
      pineconeClient = new Pinecone({
        apiKey,
      })

      index = pineconeClient.index(INDEX_NAME)
      console.log('Pinecone client initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Pinecone:', error)
      throw error
    }
  }

  /**
   * Elimina vectores específicos por sus IDs en un namespace específico
   */
  static async deleteVectors(ids: string[], namespace?: string): Promise<void> {
    if (!index) {
      await this.initialize()
    }

    if (!index) {
      throw new Error('Pinecone index not initialized')
    }

    if (!ids || ids.length === 0) {
      console.log('No vector IDs provided for deletion')
      return
    }

    try {
      let indexToUse = index

      // Si tenemos namespace, usar el namespace específico
      if (namespace) {
        indexToUse = index.namespace(namespace)
        console.log(`Deleting ${ids.length} vectors from namespace: ${namespace}`)
      } else {
        console.log(`Deleting ${ids.length} vectors from default namespace`)
      }

      await indexToUse.deleteMany(ids)
      console.log(`Deleted ${ids.length} vectors from Pinecone:`, ids)
    } catch (error) {
      console.error('Error deleting vectors from Pinecone:', error)
      throw error
    }
  }

  /**
   * Elimina todos los vectores relacionados con un recurso específico
   * Si se proporciona namespace, solo elimina en ese namespace
   */
  static async deleteVectorsByResourceId(resourceId: string, namespace?: string): Promise<void> {
    if (!index) {
      await this.initialize()
    }

    if (!index) {
      throw new Error('Pinecone index not initialized')
    }

    try {
      let indexToUse = index

      if (namespace) {
        indexToUse = index.namespace(namespace)
        console.log(`Deleting all vectors for resource ${resourceId} in namespace: ${namespace}`)
      } else {
        console.log(`Deleting all vectors for resource ${resourceId} in default namespace`)
      }

      // Eliminar usando filtro de metadata
      await indexToUse.deleteMany({
        filter: {
          resourceId: { $eq: resourceId },
        },
      })

      console.log(
        `Deleted all vectors for resource: ${resourceId}${namespace ? ` in namespace: ${namespace}` : ''}`,
      )
    } catch (error) {
      console.error(`Error deleting vectors for resource ${resourceId}:`, error)
      throw error
    }
  }

  /**
   * Obtiene todos los vectores relacionados con un recurso para validación
   * Si se proporciona namespace, solo busca en ese namespace
   */
  static async getVectorsByResourceId(
    resourceId: string,
    namespace?: string,
  ): Promise<PineconeVector[]> {
    if (!index) {
      await this.initialize()
    }

    if (!index) {
      console.warn('Pinecone index not initialized, returning empty array')
      return []
    }

    try {
      let indexToUse = index

      if (namespace) {
        indexToUse = index.namespace(namespace)
        console.log(`Querying vectors for resource ${resourceId} in namespace: ${namespace}`)
      } else {
        console.log(`Querying vectors for resource ${resourceId} in default namespace`)
      }

      // Consulta con filtro para obtener vectores del recurso
      const queryResponse = await indexToUse.query({
        vector: new Array(1536).fill(0), // Vector dummy para la consulta
        topK: 10000, // Número alto para obtener todos los vectores
        filter: {
          resourceId: { $eq: resourceId },
        },
        includeMetadata: true,
      })

      const vectors: PineconeVector[] =
        queryResponse.matches?.map((match: unknown) => {
          const m = match as { id: string; values?: number[]; metadata?: VectorMetadata }
          return {
            id: m.id,
            values: m.values || [],
            metadata: m.metadata as VectorMetadata,
          }
        }) || []

      console.log(
        `Found ${vectors.length} vectors for resource: ${resourceId}${namespace ? ` in namespace: ${namespace}` : ''}`,
      )
      return vectors
    } catch (error) {
      console.error(`Error querying vectors for resource ${resourceId}:`, error)
      return []
    }
  }

  /**
   * Busca vectores por namespace específico
   */
  static async getVectorsByNamespace(
    namespace: string,
    topK: number = 100,
  ): Promise<PineconeVector[]> {
    if (!index) {
      await this.initialize()
    }

    if (!index) {
      console.warn('Pinecone index not initialized, returning empty array')
      return []
    }

    try {
      console.log(`Querying vectors in namespace: ${namespace}`)

      const indexToUse = index.namespace(namespace)

      // Consulta con filtro para obtener vectores del namespace
      const queryResponse = await indexToUse.query({
        vector: new Array(1536).fill(0), // Vector dummy para la consulta
        topK: topK,
        includeMetadata: true,
      })

      const vectors: PineconeVector[] =
        queryResponse.matches?.map((match: unknown) => {
          const m = match as { id: string; values?: number[]; metadata?: VectorMetadata }
          return {
            id: m.id,
            values: m.values || [],
            metadata: m.metadata as VectorMetadata,
          }
        }) || []

      console.log(`Found ${vectors.length} vectors in namespace: ${namespace}`)
      return vectors
    } catch (error) {
      console.error(`Error querying vectors in namespace ${namespace}:`, error)
      return []
    }
  }

  static async upsertVectors(vectors: PineconeVector[]): Promise<void> {
    // TODO: Implementar inserción de vectores en futuras sub-tareas
    if (!index) {
      await this.initialize()
    }
    console.log(`Would upsert ${vectors.length} vectors`)
  }

  static async queryVectors(
    vector: number[],
    topK: number = 10,
    filter?: Record<string, unknown>,
    namespace?: string,
  ): Promise<PineconeVector[]> {
    // TODO: Implementar consulta de vectores en futuras sub-tareas
    if (!index) {
      await this.initialize()
    }

    if (!index) {
      return []
    }

    try {
      let indexToUse = index

      if (namespace) {
        indexToUse = index.namespace(namespace)
      }

      const queryResponse = await indexToUse.query({
        vector: vector,
        topK: topK,
        filter: filter,
        includeMetadata: true,
      })

      const vectors: PineconeVector[] =
        queryResponse.matches?.map((match: unknown) => {
          const m = match as { id: string; values?: number[]; metadata?: VectorMetadata }
          return {
            id: m.id,
            values: m.values || [],
            metadata: m.metadata as VectorMetadata,
          }
        }) || []

      return vectors
    } catch (error) {
      console.error('Error querying vectors:', error)
      return []
    }
  }
}

export { PineconeManager as default }
