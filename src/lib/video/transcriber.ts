// ============================================================================
// EIDETIK MVP - SERVICIO DE TRANSCRIPCIÓN CON WHISPER
// ============================================================================

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

import { OpenAI } from 'openai'
import { getPayload } from 'payload'

import config from '../../payload.config'
import { CONFIG } from '../config'

// Configuración de Whisper
const WHISPER_CONFIG = {
  model: (process.env.WHISPER_MODEL || 'whisper-1') as 'whisper-1',
  language: process.env.WHISPER_LANGUAGE || undefined, // Auto-detect si no se especifica
  responseFormat: 'verbose_json' as const,
  timestampGranularities: ['segment'] as const,
}

// Cliente OpenAI
const openai = new OpenAI({
  apiKey: CONFIG.OPENAI_API_KEY,
})

// Interfaces para tipos de transcripción
export interface TranscriptionSegment {
  text: string
  start_ms: number
  end_ms: number
  confidence?: number
}

export interface TranscriptionResult {
  success: boolean
  transcription: TranscriptionSegment[]
  plainText: string // Texto plano para búsquedas y análisis
  conversationJson: string // JSON con formato de conversación
  srtFormat: string // Formato SRT para subtítulos
  language?: string
  duration_ms?: number
  error?: string
  metadata: {
    model: string
    processingTimeMs: number
    hasAudio: boolean
    segmentCount: number
  }
}

export interface TranscriptionOptions {
  language?: string
  model?: 'whisper-1'
  maxDuration?: number // En segundos
}

/**
 * Servicio de transcripción de videos usando OpenAI Whisper
 */
export class VideoTranscriber {
  /**
   * Transcribir archivo de video con Whisper
   */
  static async transcribeVideo(
    videoPath: string,
    options: TranscriptionOptions = {},
  ): Promise<TranscriptionResult> {
    const startTime = Date.now()

    console.log(`[VIDEO-TRANSCRIBER] Starting transcription for: ${videoPath}`)
    console.log(`[VIDEO-TRANSCRIBER] Options:`, options)

    try {
      // Validar que el archivo existe y es accesible
      const fileStats = await this.validateVideoFile(videoPath)

      if (!fileStats.exists) {
        return {
          success: false,
          transcription: [],
          plainText: '',
          conversationJson: '[]',
          srtFormat: '',
          error: 'Video file not found',
          metadata: {
            model: options.model || WHISPER_CONFIG.model,
            processingTimeMs: Date.now() - startTime,
            hasAudio: false,
            segmentCount: 0,
          },
        }
      }

      // Detectar si el video tiene audio
      const hasAudio = await this.detectAudioTrack(videoPath)

      if (!hasAudio) {
        console.log(`[VIDEO-TRANSCRIBER] No audio track detected in video`)
        return {
          success: true,
          transcription: [],
          plainText: '',
          conversationJson: '[]',
          srtFormat: '',
          language: 'none',
          duration_ms: 0,
          metadata: {
            model: options.model || WHISPER_CONFIG.model,
            processingTimeMs: Date.now() - startTime,
            hasAudio: false,
            segmentCount: 0,
          },
        }
      }

      console.log(`[VIDEO-TRANSCRIBER] Audio track detected, proceeding with Whisper`)

      // Siempre extraer audio para optimizar envío a Whisper
      console.log(`[VIDEO-TRANSCRIBER] Extracting compressed audio for optimal Whisper processing`)
      const audioPath = await this.extractCompressedAudio(videoPath)
      const shouldCleanupAudio = true

      try {
        // Preparar archivo para Whisper
        const fileStream = fs.createReadStream(audioPath)

        // Configurar parámetros de Whisper
        const whisperParams: any = {
          file: fileStream,
          model: options.model || WHISPER_CONFIG.model,
          language: options.language || WHISPER_CONFIG.language,
          response_format: WHISPER_CONFIG.responseFormat,
          timestamp_granularities: WHISPER_CONFIG.timestampGranularities,
        }

        console.log(`[VIDEO-TRANSCRIBER] Calling Whisper API with model: ${whisperParams.model}`)

        // Llamar a Whisper API
        const whisperResponse = await openai.audio.transcriptions.create(whisperParams)

        // Limpiar archivo de audio temporal si se creó
        if (shouldCleanupAudio && audioPath !== videoPath) {
          try {
            await fs.promises.unlink(audioPath)
            console.log(`[VIDEO-TRANSCRIBER] Cleaned up temporary audio file: ${audioPath}`)
          } catch (cleanupError) {
            console.warn(`[VIDEO-TRANSCRIBER] Failed to cleanup audio file: ${cleanupError}`)
          }
        }

        // Procesar respuesta de Whisper
        const result = await this.processWhisperResponse(whisperResponse as any, startTime)

        console.log(`[VIDEO-TRANSCRIBER] Transcription completed successfully:`)
        console.log(`  - Language: ${result.language || 'auto-detected'}`)
        console.log(`  - Segments: ${result.metadata.segmentCount}`)
        console.log(`  - Duration: ${result.duration_ms}ms`)
        console.log(`  - Processing time: ${result.metadata.processingTimeMs}ms`)

        return result
      } catch (error) {
        // Limpiar archivo de audio temporal en caso de error
        if (shouldCleanupAudio && audioPath !== videoPath) {
          try {
            await fs.promises.unlink(audioPath)
          } catch (cleanupError) {
            console.warn(
              `[VIDEO-TRANSCRIBER] Failed to cleanup audio file after error: ${cleanupError}`,
            )
          }
        }
        throw error
      }
    } catch (error) {
      const processingTimeMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      console.error(`[VIDEO-TRANSCRIBER] Transcription failed:`, error)

      // Manejar errores específicos de OpenAI
      if (this.isOpenAIError(error)) {
        console.error(`[VIDEO-TRANSCRIBER] OpenAI API Error:`, {
          type: (error as any).type,
          code: (error as any).code,
          status: (error as any).status,
        })
      }

      return {
        success: false,
        transcription: [],
        plainText: '',
        conversationJson: '[]',
        srtFormat: '',
        error: errorMessage,
        metadata: {
          model: options.model || WHISPER_CONFIG.model,
          processingTimeMs,
          hasAudio: false,
          segmentCount: 0,
        },
      }
    }
  }

  /**
   * Generar transcripción en formato "conversación JSON con tiempos"
   */
  static formatAsConversationJson(segments: TranscriptionSegment[]): string {
    if (segments.length === 0) {
      return JSON.stringify([], null, 2)
    }

    // Convertir segmentos a formato de conversación
    const conversation = segments.map((segment, index) => ({
      id: `segment_${index + 1}`,
      speaker: 'speaker', // En el MVP no detectamos speakers múltiples
      text: segment.text.trim(),
      start_ms: segment.start_ms,
      end_ms: segment.end_ms,
      duration_ms: segment.end_ms - segment.start_ms,
      confidence: segment.confidence || null,
    }))

    return JSON.stringify(conversation, null, 2)
  }

  /**
   * Extraer transcripción de un rango temporal específico
   */
  static extractRangeTranscription(
    segments: TranscriptionSegment[],
    startMs: number,
    endMs: number,
  ): TranscriptionSegment[] {
    return segments
      .filter((segment) => {
        // Incluir segmentos que se solapan con el rango
        return (
          (segment.start_ms >= startMs && segment.start_ms < endMs) ||
          (segment.end_ms > startMs && segment.end_ms <= endMs) ||
          (segment.start_ms < startMs && segment.end_ms > endMs)
        )
      })
      .map((segment) => ({
        ...segment,
        // Ajustar tiempos al rango específico
        start_ms: Math.max(segment.start_ms, startMs),
        end_ms: Math.min(segment.end_ms, endMs),
      }))
  }

  /**
   * Obtener texto plano de los segmentos
   */
  static getPlainText(segments: TranscriptionSegment[]): string {
    return segments.map((segment) => segment.text.trim()).join(' ')
  }

  /**
   * Generar formato SRT para subtítulos
   */
  static formatAsSRT(segments: TranscriptionSegment[]): string {
    if (segments.length === 0) {
      return ''
    }

    return segments
      .map((segment, index) => {
        const startTime = this.millisecondsToSRTTime(segment.start_ms)
        const endTime = this.millisecondsToSRTTime(segment.end_ms)

        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n`
      })
      .join('\n')
  }

  /**
   * Convertir milisegundos a formato de tiempo SRT (HH:MM:SS,mmm)
   */
  private static millisecondsToSRTTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const milliseconds = ms % 1000

    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
  }

  /**
   * Guardar transcripción inmediatamente en el resource
   */
  static async saveTranscriptionToResource(
    resourceId: string,
    transcriptionResult: TranscriptionResult,
  ): Promise<void> {
    try {
      const payload = await getPayload({ config })

      console.log(`[VIDEO-TRANSCRIBER] Saving transcription to resource: ${resourceId}`)

      await payload.update({
        collection: 'resources',
        id: resourceId,
        data: {
          transcription: transcriptionResult.conversationJson,
          transcriptionSrt: transcriptionResult.srtFormat,
          status: 'processing',
          progress: 40, // Transcripción completada, continúa pipeline
        },
      })

      console.log(
        `[VIDEO-TRANSCRIBER] Transcription saved successfully for resource: ${resourceId}`,
      )
    } catch (error) {
      console.error(
        `[VIDEO-TRANSCRIBER] Failed to save transcription for resource ${resourceId}:`,
        error,
      )
      throw error
    }
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Validar que el archivo de video existe y es accesible
   */
  private static async validateVideoFile(
    videoPath: string,
  ): Promise<{ exists: boolean; size?: number }> {
    try {
      const stats = await fs.promises.stat(videoPath)
      return {
        exists: true,
        size: stats.size,
      }
    } catch (error) {
      return { exists: false }
    }
  }

  /**
   * Detectar si el video tiene pista de audio (simplificado para MVP)
   */
  private static async detectAudioTrack(videoPath: string): Promise<boolean> {
    // En el MVP, asumimos que todos los videos tienen audio a menos que sean muy pequeños
    try {
      const stats = await fs.promises.stat(videoPath)

      // Videos muy pequeños (< 1KB) probablemente no tienen audio válido
      if (stats.size < 1024) {
        return false
      }

      // Para el MVP, asumimos que hay audio
      // En producción se podría usar FFprobe para detectar audio tracks
      return true
    } catch (error) {
      console.error(`[VIDEO-TRANSCRIBER] Error detecting audio track:`, error)
      return false
    }
  }

  /**
   * Extraer y comprimir audio del video para cumplir con límites de Whisper
   */
  private static async extractCompressedAudio(videoPath: string): Promise<string> {
    const audioPath = path.join(
      path.dirname(videoPath),
      `${path.basename(videoPath, path.extname(videoPath))}_audio.mp3`,
    )

    console.log(`[VIDEO-TRANSCRIBER] Extracting compressed audio to: ${audioPath}`)

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i',
        videoPath,
        '-vn', // No video
        '-acodec',
        'mp3',
        '-ab',
        '64k', // 64kbps bitrate
        '-ar',
        '16000', // 16kHz sample rate
        '-y', // Overwrite output file
        audioPath,
      ])

      let stderr = ''

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log(`[VIDEO-TRANSCRIBER] Audio extraction completed successfully`)
          resolve(audioPath)
        } else {
          console.error(`[VIDEO-TRANSCRIBER] FFmpeg failed with code ${code}`)
          console.error(`[VIDEO-TRANSCRIBER] FFmpeg stderr: ${stderr}`)
          reject(new Error(`FFmpeg failed with code ${code}`))
        }
      })

      ffmpeg.on('error', (error) => {
        console.error(`[VIDEO-TRANSCRIBER] FFmpeg spawn error:`, error)
        reject(error)
      })
    })
  }

  /**
   * Procesar respuesta de Whisper API
   */
  private static async processWhisperResponse(
    response: OpenAI.Audio.Transcriptions.TranscriptionVerbose,
    startTime: number,
  ): Promise<TranscriptionResult> {
    const processingTimeMs = Date.now() - startTime

    // Extraer información de la respuesta
    const language = response.language || 'unknown'
    const duration = response.duration || 0
    const segments = response.segments || []

    console.log(`[VIDEO-TRANSCRIBER] Processing Whisper response:`)
    console.log(`  - Text: "${response.text?.substring(0, 100)}..."`)
    console.log(`  - Language: ${language}`)
    console.log(`  - Duration: ${duration}s`)
    console.log(`  - Segments: ${segments.length}`)

    // Convertir segmentos a nuestro formato
    const transcriptionSegments: TranscriptionSegment[] = segments.map((segment, index) => ({
      text: segment.text?.trim() || '',
      start_ms: Math.round((segment.start || 0) * 1000), // Convertir a milisegundos
      end_ms: Math.round((segment.end || 0) * 1000),
      confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : undefined,
    }))

    // Filtrar segmentos vacíos
    const validSegments = transcriptionSegments.filter((segment) => segment.text.length > 0)

    // Generar formatos adicionales
    const plainText = this.getPlainText(validSegments)
    const conversationJson = this.formatAsConversationJson(validSegments)
    const srtFormat = this.formatAsSRT(validSegments)

    return {
      success: true,
      transcription: validSegments,
      plainText,
      conversationJson,
      srtFormat,
      language,
      duration_ms: Math.round(duration * 1000),
      metadata: {
        model: WHISPER_CONFIG.model,
        processingTimeMs,
        hasAudio: true,
        segmentCount: validSegments.length,
      },
    }
  }

  /**
   * Verificar si el error es de OpenAI API
   */
  private static isOpenAIError(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'type' in error && 'code' in error)
  }
}
