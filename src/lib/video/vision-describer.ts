/**
 * Video Vision Describer
 *
 * Servicio para generar descripciones visuales de frames usando GPT-4o Vision API.
 * Implementa rate limiting, manejo de errores y prompts específicos para
 * descripciones cortas y extensas.
 */

import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'

import { getOpenAIClient } from '@/lib/openai'

// Configuración del servicio
const VISION_MODEL = process.env.GPT_VISION_MODEL || 'gpt-4o'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const RATE_LIMIT_DELAY_MS = 500 // Delay entre llamadas para evitar rate limiting

export interface VisionDescriptionRequest {
  framePath: string
  sceneNumber: number
  timestamp: number
  context?: {
    previousDescription?: string
    videoTitle?: string
    namespace?: string
  }
}

export interface VisionDescriptionResponse {
  shortDescription: string
  description: string
  confidence: number
  metadata: {
    sceneNumber: number
    timestamp: number
    model: string
    processingTime: number
  }
}

export interface VisionDescriptionError {
  success: false
  error: string
  sceneNumber: number
  timestamp: number
}

export type VisionDescriptionResult = VisionDescriptionResponse | VisionDescriptionError

/**
 * Prompts específicos para las descripciones
 */
const VISION_PROMPTS = {
  SHORT_DESCRIPTION: `Describe brevemente esta imagen en una frase de máximo 10 palabras. 
Enfócate en el elemento o acción principal. Responde solo la descripción sin preámbulos.`,

  DETAILED_DESCRIPTION: `Describe detalladamente esta imagen como si fuera un frame de un video.
Incluye:
- Elementos visuales principales (objetos, personas, escenarios)
- Acciones o movimientos aparentes
- Contexto o ambiente
- Detalles relevantes para entender la escena

Responde en español de forma clara y descriptiva, máximo 3 párrafos.`,

  CONTEXTUAL_DESCRIPTION: `Describe esta imagen como parte de un video sobre "{context}".
Considera el contexto del video y describe:
- Elementos visuales principales
- Cómo se relaciona con el tema del video
- Información relevante para la comprensión del contenido

Responde en español de forma clara y descriptiva, máximo 3 párrafos.`,
}

/**
 * Convierte imagen a base64 para la API
 */
async function encodeImageToBase64(imagePath: string): Promise<string> {
  try {
    const imageBuffer = await readFile(imagePath)
    const base64 = imageBuffer.toString('base64')
    const extension = path.extname(imagePath).toLowerCase()

    let mimeType = 'image/jpeg'
    if (extension === '.png') mimeType = 'image/png'
    if (extension === '.webp') mimeType = 'image/webp'

    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    throw new Error(
      `Error encoding image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Genera descripciones con GPT-4o Vision
 */
async function generateVisionDescription(
  base64Image: string,
  prompt: string,
  retryCount = 0,
): Promise<string> {
  try {
    const openai = await getOpenAIClient()

    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Image,
                detail: 'auto',
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content received from GPT-4o Vision')
    }

    return content.trim()
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(
        `[VIDEO-VISION-DESCRIBER] Retry ${retryCount + 1}/${MAX_RETRIES} for vision description`,
      )
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retryCount)))
      return generateVisionDescription(base64Image, prompt, retryCount + 1)
    }
    throw error
  }
}

/**
 * Procesa un frame individual y genera descripciones
 */
export async function describeFrame(
  request: VisionDescriptionRequest,
): Promise<VisionDescriptionResult> {
  const startTime = Date.now()

  try {
    console.log(
      `[VIDEO-VISION-DESCRIBER] Processing frame ${request.sceneNumber} at ${request.timestamp}s`,
    )

    // Validar que el archivo existe
    if (!existsSync(request.framePath)) {
      throw new Error(`Frame file not found: ${request.framePath}`)
    }

    // Convertir imagen a base64
    const base64Image = await encodeImageToBase64(request.framePath)

    // Generar descripción corta
    const shortDescription = await generateVisionDescription(
      base64Image,
      VISION_PROMPTS.SHORT_DESCRIPTION,
    )

    // Delay para rate limiting
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS))

    // Generar descripción detallada
    let detailedPrompt = VISION_PROMPTS.DETAILED_DESCRIPTION
    if (request.context?.namespace) {
      detailedPrompt = VISION_PROMPTS.CONTEXTUAL_DESCRIPTION.replace(
        '{context}',
        request.context.namespace,
      )
    }

    const description = await generateVisionDescription(base64Image, detailedPrompt)

    const processingTime = Date.now() - startTime

    console.log(
      `[VIDEO-VISION-DESCRIBER] Frame ${request.sceneNumber} processed in ${processingTime}ms`,
    )

    return {
      shortDescription,
      description,
      confidence: 0.95, // GPT-4o Vision es bastante confiable
      metadata: {
        sceneNumber: request.sceneNumber,
        timestamp: request.timestamp,
        model: VISION_MODEL,
        processingTime,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(
      `[VIDEO-VISION-DESCRIBER] Error processing frame ${request.sceneNumber}:`,
      errorMessage,
    )

    return {
      success: false,
      error: errorMessage,
      sceneNumber: request.sceneNumber,
      timestamp: request.timestamp,
    }
  }
}

/**
 * Procesa múltiples frames con rate limiting
 */
export async function describeFrames(
  requests: VisionDescriptionRequest[],
): Promise<VisionDescriptionResult[]> {
  console.log(`[VIDEO-VISION-DESCRIBER] Starting batch processing of ${requests.length} frames`)

  const results: VisionDescriptionResult[] = []

  for (const request of requests) {
    const result = await describeFrame(request)
    results.push(result)

    // Rate limiting entre frames
    if (requests.indexOf(request) < requests.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS))
    }
  }

  const successCount = results.filter((r) => 'shortDescription' in r).length
  const errorCount = results.length - successCount

  console.log(
    `[VIDEO-VISION-DESCRIBER] Batch processing completed: ${successCount} success, ${errorCount} errors`,
  )

  return results
}

/**
 * Utilidad para verificar disponibilidad del servicio
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const openai = await getOpenAIClient()

    // Test simple con imagen de prueba (pixel blanco)
    const testImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this image in one word.',
            },
            {
              type: 'image_url',
              image_url: {
                url: testImage,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_tokens: 10,
      temperature: 0,
    })

    return !!response.choices[0]?.message?.content
  } catch (error) {
    console.error('[VIDEO-VISION-DESCRIBER] Health check failed:', error)
    return false
  }
}

/**
 * Obtiene información del modelo configurado
 */
export function getModelInfo() {
  return {
    model: VISION_MODEL,
    maxRetries: MAX_RETRIES,
    retryDelay: RETRY_DELAY_MS,
    rateLimitDelay: RATE_LIMIT_DELAY_MS,
  }
}
