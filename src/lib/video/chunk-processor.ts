/**
 * Video Chunk Processor
 *
 * Servicio para generar chunks de 15 segundos, extraer transcripciones por rango temporal,
 * filtrar screenshots y generar descripciones usando GPT-4. Incluye síntesis global.
 */

import { getOpenAIClient } from '@/lib/openai'

import type { TranscriptionSegment } from './transcriber'

// Configuración del procesador
const CHUNK_SIZE_MS = parseInt(process.env.CHUNK_SIZE_MS || '15000') // 15 segundos por defecto
const GPT_TEXT_MODEL = process.env.GPT_TEXT_MODEL || 'gpt-4'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

export interface ChunkProcessingRequest {
  videoDuration: number // en milisegundos
  transcriptionSegments: TranscriptionSegment[]
  screenshots: ScreenshotInfo[]
  namespace: string
  resourceId: string
  videoTitle?: string
}

export interface ScreenshotInfo {
  id: string
  timestamp: number // en milisegundos
  sceneNumber: number
  shortDescription: string
  description: string
  mediaUrl: string
}

export interface VideoChunk {
  id: number
  start_ms: number // en milisegundos
  end_ms: number // en milisegundos
  namespace: string
  resourceId: string
  chunkIndex: number
  timeStart: number // en milisegundos (legacy, mantener para compatibilidad)
  timeEnd: number // en milisegundos (legacy, mantener para compatibilidad)
  transcription: TranscriptionSegment[]
  description: string
  screenshots: string[] // Array de screenshot IDs
  metadata: {
    chunkDuration: number
    transcriptionText: string
    screenshotCount: number
    processingTime: number
  }
}

export interface ChunkProcessingResponse {
  success: true
  chunks: VideoChunk[]
  globalSynthesis: string
  metadata: {
    totalChunks: number
    totalDuration: number
    averageChunkSize: number
    processingTime: number
    model: string
  }
}

export interface ChunkProcessingError {
  success: false
  error: string
  partialChunks?: VideoChunk[]
}

export type ChunkProcessingResult = ChunkProcessingResponse | ChunkProcessingError

/**
 * Prompts para generación de descripciones y síntesis
 */
const CHUNK_PROMPTS = {
  CHUNK_DESCRIPTION: `Analiza este segmento de video de {duration} segundos sobre "{namespace}" y genera una descripción coherente.

TRANSCRIPCIÓN:
{transcription}

ELEMENTOS VISUALES:
{screenshots}

Genera una descripción en español que:
- Resuma la acción o información principal del segmento
- Integre el contenido de audio y visual de forma coherente
- Sea útil para búsqueda semántica y comprensión del contenido
- Máximo 150 palabras, lenguaje claro y descriptivo

Responde solo la descripción sin preámbulos.`,

  GLOBAL_SYNTHESIS: `Analiza este video completo sobre "{namespace}" y genera una síntesis global.

TRANSCRIPCIÓN COMPLETA:
{fullTranscription}

DESCRIPCIONES POR SEGMENTOS:
{chunkDescriptions}

Genera una síntesis global en español que:
- Capture los temas y conceptos principales del video
- Identifique la estructura y flujo del contenido
- Resalte información clave y puntos importantes
- Sea útil para entender el video sin verlo
- Entre 200-400 palabras, bien estructurada

Responde solo la síntesis sin preámbulos.`,
}

/**
 * Divide la duración del video en chunks de tiempo
 */
function generateTimeChunks(
  videoDuration: number,
): Array<{ start: number; end: number; id: number }> {
  const chunks: Array<{ start: number; end: number; id: number }> = []

  // Si el video es más corto que el tamaño de chunk, crear un único chunk
  if (videoDuration <= CHUNK_SIZE_MS) {
    chunks.push({
      id: 1,
      start: 0,
      end: videoDuration,
    })
    return chunks
  }

  // Dividir en chunks sin overlap
  let currentStart = 0
  let chunkId = 1

  while (currentStart < videoDuration) {
    const currentEnd = Math.min(currentStart + CHUNK_SIZE_MS, videoDuration)

    chunks.push({
      id: chunkId,
      start: currentStart,
      end: currentEnd,
    })

    currentStart = currentEnd
    chunkId++
  }

  return chunks
}

/**
 * Extrae segmentos de transcripción para un rango temporal específico
 */
function extractTranscriptionRange(
  segments: TranscriptionSegment[],
  startMs: number,
  endMs: number,
): TranscriptionSegment[] {
  return segments
    .filter((segment) => {
      // Los segmentos ya vienen en milisegundos (start_ms, end_ms)
      const segmentStartMs = segment.start_ms
      const segmentEndMs = segment.end_ms

      // Incluir segmento si se solapa con el rango del chunk
      return segmentStartMs < endMs && segmentEndMs > startMs
    })
    .map((segment) => {
      // Ajustar timestamps relativos al chunk (mantener en milisegundos)
      const segmentStartMs = segment.start_ms
      const segmentEndMs = segment.end_ms

      return {
        ...segment,
        start_ms: Math.max(startMs, segmentStartMs) - startMs, // Relativo al inicio del chunk
        end_ms: Math.min(endMs, segmentEndMs) - startMs, // Relativo al inicio del chunk
      }
    })
}

/**
 * Filtra screenshots que caen dentro del rango temporal del chunk
 */
function filterScreenshotsInRange(
  screenshots: ScreenshotInfo[],
  startMs: number,
  endMs: number,
): ScreenshotInfo[] {
  // Ahora screenshot.timestamp ya está en milisegundos
  return screenshots.filter(
    (screenshot) => screenshot.timestamp >= startMs && screenshot.timestamp < endMs,
  )
}

/**
 * Convierte segmentos de transcripción a texto plano
 */
function getTranscriptionText(segments: TranscriptionSegment[]): string {
  return segments.map((segment) => segment.text.trim()).join(' ')
}

/**
 * Formatea información de screenshots para el prompt
 */
function formatScreenshotsForPrompt(screenshots: ScreenshotInfo[]): string {
  if (screenshots.length === 0) {
    return 'No hay elementos visuales destacados en este segmento.'
  }

  return screenshots
    .map(
      (screenshot, index) =>
        `${index + 1}. [${Math.floor(screenshot.timestamp / 1000)}s] ${screenshot.shortDescription}: ${screenshot.description}`,
    )
    .join('\n')
}

/**
 * Genera descripción de un chunk usando GPT-4
 */
async function generateChunkDescription(
  chunk: { start: number; end: number },
  transcription: TranscriptionSegment[],
  screenshots: ScreenshotInfo[],
  namespace: string,
  retryCount = 0,
): Promise<string> {
  try {
    const openai = await getOpenAIClient()

    const duration = Math.round((chunk.end - chunk.start) / 1000)
    const transcriptionText = getTranscriptionText(transcription)
    const screenshotsText = formatScreenshotsForPrompt(screenshots)

    const prompt = CHUNK_PROMPTS.CHUNK_DESCRIPTION.replace('{duration}', duration.toString())
      .replace('{namespace}', namespace)
      .replace('{transcription}', transcriptionText || 'Sin transcripción de audio disponible.')
      .replace('{screenshots}', screenshotsText)

    const response = await openai.chat.completions.create({
      model: GPT_TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content received from GPT-4')
    }

    return content.trim()
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`[CHUNK-PROCESSOR] Retry ${retryCount + 1}/${MAX_RETRIES} for chunk description`)
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retryCount)))
      return generateChunkDescription(chunk, transcription, screenshots, namespace, retryCount + 1)
    }
    throw error
  }
}

/**
 * Genera síntesis global del video usando GPT-4
 */
async function generateGlobalSynthesis(
  fullTranscription: TranscriptionSegment[],
  chunks: VideoChunk[],
  namespace: string,
  retryCount = 0,
): Promise<string> {
  try {
    const openai = await getOpenAIClient()

    const fullTranscriptionText = getTranscriptionText(fullTranscription)
    const chunkDescriptions = chunks
      .map(
        (chunk, index) =>
          `Segmento ${index + 1} (${Math.floor(chunk.timeStart / 1000)}-${Math.floor(chunk.timeEnd / 1000)}s): ${chunk.description}`,
      )
      .join('\n\n')

    const prompt = CHUNK_PROMPTS.GLOBAL_SYNTHESIS.replace('{namespace}', namespace)
      .replace(
        '{fullTranscription}',
        fullTranscriptionText || 'Sin transcripción de audio disponible.',
      )
      .replace('{chunkDescriptions}', chunkDescriptions)

    const response = await openai.chat.completions.create({
      model: GPT_TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 600,
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content received from GPT-4 for global synthesis')
    }

    return content.trim()
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`[CHUNK-PROCESSOR] Retry ${retryCount + 1}/${MAX_RETRIES} for global synthesis`)
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retryCount)))
      return generateGlobalSynthesis(fullTranscription, chunks, namespace, retryCount + 1)
    }
    throw error
  }
}

/**
 * Procesa un video completo en chunks
 */
export async function processVideoChunks(
  request: ChunkProcessingRequest,
): Promise<ChunkProcessingResult> {
  const startTime = Date.now()

  try {
    console.log(`[CHUNK-PROCESSOR] Starting chunk processing for ${request.namespace}`)
    console.log(
      `[CHUNK-PROCESSOR] Video duration: ${request.videoDuration}ms, Screenshots: ${request.screenshots.length}`,
    )

    // Generar chunks de tiempo
    const timeChunks = generateTimeChunks(request.videoDuration)
    console.log(`[CHUNK-PROCESSOR] Generated ${timeChunks.length} time chunks`)

    const processedChunks: VideoChunk[] = []
    let lastValidScreenshots: ScreenshotInfo[] = [] // Para fallback

    // Procesar cada chunk
    for (const timeChunk of timeChunks) {
      const chunkStartTime = Date.now()

      console.log(
        `[CHUNK-PROCESSOR] Processing chunk ${timeChunk.id} (${timeChunk.start}-${timeChunk.end}ms)`,
      )

      // Extraer transcripción para este chunk
      const chunkTranscription = extractTranscriptionRange(
        request.transcriptionSegments,
        timeChunk.start,
        timeChunk.end,
      )

      // Filtrar screenshots para este chunk
      let chunkScreenshots = filterScreenshotsInRange(
        request.screenshots,
        timeChunk.start,
        timeChunk.end,
      )

      // Si no hay screenshots en este chunk, usar el último válido como fallback
      if (chunkScreenshots.length === 0 && lastValidScreenshots.length > 0) {
        console.log(
          `[CHUNK-PROCESSOR] No screenshots in chunk ${timeChunk.id}, using last valid screenshot as fallback`,
        )
        chunkScreenshots = [lastValidScreenshots[lastValidScreenshots.length - 1]] // Usar el último screenshot
      }

      // Actualizar último screenshot válido si encontramos alguno
      if (chunkScreenshots.length > 0) {
        lastValidScreenshots = chunkScreenshots
      }

      // Generar descripción del chunk
      const description = await generateChunkDescription(
        timeChunk,
        chunkTranscription,
        chunkScreenshots,
        request.namespace,
      )

      const chunkProcessingTime = Date.now() - chunkStartTime

      const chunk: VideoChunk = {
        id: timeChunk.id,
        start_ms: timeChunk.start,
        end_ms: timeChunk.end,
        namespace: request.namespace,
        resourceId: request.resourceId,
        chunkIndex: timeChunk.id - 1, // 0-based index
        timeStart: timeChunk.start, // Legacy compatibility
        timeEnd: timeChunk.end, // Legacy compatibility
        transcription: chunkTranscription,
        description,
        screenshots: chunkScreenshots.map((s) => s.id),
        metadata: {
          chunkDuration: timeChunk.end - timeChunk.start,
          transcriptionText: getTranscriptionText(chunkTranscription),
          screenshotCount: chunkScreenshots.length,
          processingTime: chunkProcessingTime,
        },
      }

      processedChunks.push(chunk)

      console.log(
        `[CHUNK-PROCESSOR] Chunk ${timeChunk.id} completed in ${chunkProcessingTime}ms (${chunkScreenshots.length} screenshots)`,
      )

      // Rate limiting entre chunks
      if (timeChunk.id < timeChunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    // Generar síntesis global
    console.log(`[CHUNK-PROCESSOR] Generating global synthesis`)
    const globalSynthesis = await generateGlobalSynthesis(
      request.transcriptionSegments,
      processedChunks,
      request.namespace,
    )

    const totalProcessingTime = Date.now() - startTime
    const averageChunkSize = request.videoDuration / processedChunks.length

    console.log(`[CHUNK-PROCESSOR] Processing completed in ${totalProcessingTime}ms`)

    return {
      success: true,
      chunks: processedChunks,
      globalSynthesis,
      metadata: {
        totalChunks: processedChunks.length,
        totalDuration: request.videoDuration,
        averageChunkSize,
        processingTime: totalProcessingTime,
        model: GPT_TEXT_MODEL,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[CHUNK-PROCESSOR] Error processing chunks:`, errorMessage)

    return {
      success: false,
      error: errorMessage,
      partialChunks: [],
    }
  }
}

/**
 * Obtiene configuración del procesador
 */
export function getChunkProcessorConfig() {
  return {
    chunkSizeMs: CHUNK_SIZE_MS,
    model: GPT_TEXT_MODEL,
    maxRetries: MAX_RETRIES,
    retryDelay: RETRY_DELAY_MS,
  }
}

/**
 * Utilidad para validar la request
 */
export function validateChunkProcessingRequest(request: ChunkProcessingRequest): string | null {
  if (!request.videoDuration || request.videoDuration <= 0) {
    return 'videoDuration must be a positive number'
  }

  if (!request.namespace || request.namespace.trim().length === 0) {
    return 'namespace is required'
  }

  if (!request.resourceId || request.resourceId.trim().length === 0) {
    return 'resourceId is required'
  }

  if (!Array.isArray(request.transcriptionSegments)) {
    return 'transcriptionSegments must be an array'
  }

  if (!Array.isArray(request.screenshots)) {
    return 'screenshots must be an array'
  }

  return null
}

/**
 * Utilidad para obtener estadísticas de chunks
 */
export function getChunkStats(chunks: VideoChunk[]): {
  totalDuration: number
  averageDuration: number
  totalTranscriptionLength: number
  totalScreenshots: number
  chunkSizes: number[]
} {
  const totalDuration = chunks.reduce((sum, chunk) => sum + chunk.metadata.chunkDuration, 0)
  const averageDuration = totalDuration / chunks.length
  const totalTranscriptionLength = chunks.reduce(
    (sum, chunk) => sum + chunk.metadata.transcriptionText.length,
    0,
  )
  const totalScreenshots = chunks.reduce((sum, chunk) => sum + chunk.metadata.screenshotCount, 0)
  const chunkSizes = chunks.map((chunk) => chunk.metadata.chunkDuration)

  return {
    totalDuration,
    averageDuration,
    totalTranscriptionLength,
    totalScreenshots,
    chunkSizes,
  }
}
