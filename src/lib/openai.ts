// ============================================================================
// EIDETIK MVP - SERVICIOS OPENAI
// ============================================================================

import { OpenAI } from 'openai'

import { CONFIG } from './config'
import {
  VideoTranscriber,
  type TranscriptionSegment,
  type TranscriptionResult,
} from './video/transcriber'

// Cliente OpenAI
const openai = new OpenAI({
  apiKey: CONFIG.OPENAI_API_KEY,
})

// Exportar cliente para uso directo en servicios
export const getOpenAIClient = () => openai

// Configuración de modelos
const MODELS = {
  whisper: process.env.WHISPER_MODEL || 'whisper-1',
  gptVision: process.env.GPT_VISION_MODEL || 'gpt-4o',
  gptText: process.env.GPT_TEXT_MODEL || 'gpt-4',
  embedding: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
} as const

export class OpenAIManager {
  /**
   * Transcribir audio usando Whisper
   * @deprecated Usar VideoTranscriber.transcribeVideo() directamente
   */
  static async transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult> {
    console.warn(
      '[OPENAI-MANAGER] transcribeAudio() is deprecated. Use VideoTranscriber.transcribeVideo() instead.',
    )

    // Para mantener compatibilidad temporal
    return {
      success: false,
      transcription: [],
      plainText: '',
      conversationJson: '[]',
      srtFormat: '',
      error: 'Method deprecated, use VideoTranscriber.transcribeVideo()',
      metadata: {
        model: MODELS.whisper,
        processingTimeMs: 0,
        hasAudio: false,
        segmentCount: 0,
      },
    }
  }

  /**
   * Transcribir video usando Whisper (método recomendado)
   */
  static async transcribeVideo(
    videoPath: string,
    options?: { language?: string; model?: 'whisper-1' },
  ): Promise<TranscriptionResult> {
    console.log(`[OPENAI-MANAGER] Transcribing video with Whisper: ${videoPath}`)
    return VideoTranscriber.transcribeVideo(videoPath, options)
  }

  /**
   * Generar formato de conversación JSON a partir de segmentos
   */
  static formatTranscriptionAsConversation(segments: TranscriptionSegment[]): string {
    return VideoTranscriber.formatAsConversationJson(segments)
  }

  /**
   * Extraer transcripción de un rango temporal específico
   */
  static extractTranscriptionRange(
    segments: TranscriptionSegment[],
    startMs: number,
    endMs: number,
  ): TranscriptionSegment[] {
    return VideoTranscriber.extractRangeTranscription(segments, startMs, endMs)
  }

  /**
   * Obtener texto plano de segmentos de transcripción
   */
  static getTranscriptionText(segments: TranscriptionSegment[]): string {
    return VideoTranscriber.getPlainText(segments)
  }

  /**
   * Generar descripción de imagen con GPT-4o Vision
   */
  static async generateImageDescription(imageBuffer: Buffer): Promise<string> {
    // TODO: Implementar en sub-tarea 4.5-4.7 (Procesamiento Visual)
    console.log(`[OPENAI-MANAGER] Image description with ${MODELS.gptVision} - TODO: implement`)
    return ''
  }

  /**
   * Generar descripción visual de frame de video
   */
  static async describeVideoFrame(
    imageBuffer: Buffer,
    prompt?: string,
  ): Promise<{
    shortDescription: string
    description: string
  }> {
    // TODO: Implementar en sub-tarea 4.5-4.7 (Procesamiento Visual)
    console.log(
      `[OPENAI-MANAGER] Video frame description with ${MODELS.gptVision} - TODO: implement`,
    )
    return {
      shortDescription: '',
      description: '',
    }
  }

  /**
   * Generar embedding de texto
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    // TODO: Implementar en sub-tarea 5.4 (Generación de Embeddings)
    console.log(`[OPENAI-MANAGER] Text embedding with ${MODELS.embedding} - TODO: implement`)
    return []
  }

  /**
   * Generar embeddings en batch
   */
  static async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // TODO: Implementar en sub-tarea 5.4 (Generación de Embeddings)
    console.log(`[OPENAI-MANAGER] Batch embeddings with ${MODELS.embedding} - TODO: implement`)
    return []
  }

  /**
   * Generar síntesis global del video usando GPT-4
   */
  static async generateVideoSummary(
    transcriptionText: string,
    chunkDescriptions: string[],
  ): Promise<string> {
    // TODO: Implementar en sub-tarea 5.7 (Síntesis Global)
    console.log(`[OPENAI-MANAGER] Video summary with ${MODELS.gptText} - TODO: implement`)
    return ''
  }

  /**
   * Generar descripción de chunk usando GPT-4
   */
  static async generateChunkDescription(
    transcriptionText: string,
    screenshotDescriptions: string[],
  ): Promise<string> {
    // TODO: Implementar en sub-tarea 5.5 (Generación de Chunks)
    console.log(`[OPENAI-MANAGER] Chunk description with ${MODELS.gptText} - TODO: implement`)
    return ''
  }

  /**
   * Verificar estado de la API de OpenAI
   */
  static async healthCheck(): Promise<{
    healthy: boolean
    error?: string
    models: typeof MODELS
  }> {
    try {
      // Test simple con un modelo básico
      const response = await openai.models.list()

      return {
        healthy: true,
        models: MODELS,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[OPENAI-MANAGER] Health check failed:', error)

      return {
        healthy: false,
        error: errorMessage,
        models: MODELS,
      }
    }
  }

  /**
   * Obtener información de configuración de modelos
   */
  static getModelConfig(): typeof MODELS {
    return MODELS
  }
}

export { OpenAIManager as default }
