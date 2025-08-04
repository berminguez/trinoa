/**
 * Video Media Uploader
 *
 * Servicio para subir frames extraídos a PayloadCMS como Media objects.
 * Incluye gestión de metadatos, descripciones y organización por namespace.
 */

import { existsSync } from 'fs'
import { readFile, stat } from 'fs/promises'
import path from 'path'

import { getPayload } from 'payload'

import config from '@/payload.config'

import type { Media } from '@/payload-types'

export interface MediaUploadRequest {
  framePath: string
  sceneNumber: number
  timestamp: number
  shortDescription: string
  description: string
  metadata: {
    resourceId: string
    namespace: string
    videoFileName: string
    sceneTimestamp: number
    frameQuality: string
    extractionMethod: string
  }
}

export interface MediaUploadResponse {
  success: true
  mediaId: string
  mediaUrl: string
  metadata: {
    sceneNumber: number
    timestamp: number
    fileSize: number
    uploadDuration: number
  }
}

export interface MediaUploadError {
  success: false
  error: string
  sceneNumber: number
  timestamp: number
}

export type MediaUploadResult = MediaUploadResponse | MediaUploadError

/**
 * Configuración del uploader
 */
const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  uploadTimeout: 30000, // 30 segundos
  retryAttempts: 3,
  retryDelay: 1000,
}

/**
 * Valida el archivo antes de subirlo
 */
async function validateFrameFile(framePath: string): Promise<string | null> {
  try {
    if (!existsSync(framePath)) {
      return `Frame file not found: ${framePath}`
    }

    const stats = await stat(framePath)
    if (stats.size > UPLOAD_CONFIG.maxFileSize) {
      return `Frame file too large: ${stats.size} bytes (max: ${UPLOAD_CONFIG.maxFileSize})`
    }

    if (stats.size === 0) {
      return `Frame file is empty: ${framePath}`
    }

    // Verificar extensión
    const extension = path.extname(framePath).toLowerCase()
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
      return `Unsupported file format: ${extension}`
    }

    return null
  } catch (error) {
    return `Error validating frame file: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

/**
 * Genera nombre de archivo único para el frame
 */
function generateFrameFileName(request: MediaUploadRequest): string {
  const timestamp = Math.floor(request.timestamp)
  const extension = path.extname(request.framePath)
  const sanitizedNamespace = request.metadata.namespace.replace(/[^a-zA-Z0-9-_]/g, '-')

  return `frame-${sanitizedNamespace}-scene${request.sceneNumber}-${timestamp}s${extension}`
}

/**
 * Genera alt text para el frame
 */
function generateAltText(request: MediaUploadRequest): string {
  const timestamp = Math.floor(request.timestamp)
  const minutes = Math.floor(timestamp / 60)
  const seconds = timestamp % 60

  return `Frame de video ${request.metadata.namespace} - Escena ${request.sceneNumber} (${minutes}:${seconds.toString().padStart(2, '0')}): ${request.shortDescription}`
}

/**
 * Sube un frame individual a PayloadCMS
 */
export async function uploadFrame(request: MediaUploadRequest): Promise<MediaUploadResult> {
  const startTime = Date.now()

  try {
    console.log(
      `[VIDEO-MEDIA-UPLOADER] Uploading frame ${request.sceneNumber} at ${request.timestamp}s`,
    )

    // Validar archivo
    const validationError = await validateFrameFile(request.framePath)
    if (validationError) {
      throw new Error(validationError)
    }

    // Obtener información del archivo
    const stats = await stat(request.framePath)
    const fileName = generateFrameFileName(request)
    const altText = generateAltText(request)

    // Leer archivo como buffer
    const fileBuffer = await readFile(request.framePath)

    // Preparar datos del media object
    const mediaData = {
      alt: altText,
      shortDescription: request.shortDescription,
      description: request.description,
      filename: fileName,
      mimeType: getMimeType(request.framePath),
      filesize: stats.size,
      // Metadata específico del frame
      frameMetadata: {
        resourceId: request.metadata.resourceId,
        namespace: request.metadata.namespace,
        videoFileName: request.metadata.videoFileName,
        sceneNumber: request.sceneNumber,
        timestamp: request.timestamp,
        frameQuality: request.metadata.frameQuality,
        extractionMethod: request.metadata.extractionMethod,
        extractedAt: new Date().toISOString(),
      },
    }

    // Obtener payload client
    const payload = await getPayload({ config })

    // Subir a PayloadCMS
    const uploadResult = await payload.create({
      collection: 'media',
      data: mediaData,
      file: {
        data: fileBuffer,
        mimetype: getMimeType(request.framePath),
        name: fileName,
        size: stats.size,
      },
    })

    const uploadDuration = Date.now() - startTime

    console.log(
      `[VIDEO-MEDIA-UPLOADER] Frame ${request.sceneNumber} uploaded successfully in ${uploadDuration}ms`,
    )

    return {
      success: true,
      mediaId: uploadResult.id,
      mediaUrl: uploadResult.url || '',
      metadata: {
        sceneNumber: request.sceneNumber,
        timestamp: request.timestamp,
        fileSize: stats.size,
        uploadDuration,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(
      `[VIDEO-MEDIA-UPLOADER] Error uploading frame ${request.sceneNumber}:`,
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
 * Sube múltiples frames con control de concurrencia
 */
export async function uploadFrames(
  requests: MediaUploadRequest[],
  maxConcurrency: number = 3,
): Promise<MediaUploadResult[]> {
  console.log(`[VIDEO-MEDIA-UPLOADER] Starting batch upload of ${requests.length} frames`)

  const results: MediaUploadResult[] = []

  // Procesar en batches para evitar sobrecargar el servidor
  for (let i = 0; i < requests.length; i += maxConcurrency) {
    const batch = requests.slice(i, i + maxConcurrency)
    const batchPromises = batch.map((request) => uploadFrame(request))

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // Pequeño delay entre batches
    if (i + maxConcurrency < requests.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  const successCount = results.filter((r) => r.success).length
  const errorCount = results.length - successCount

  console.log(
    `[VIDEO-MEDIA-UPLOADER] Batch upload completed: ${successCount} success, ${errorCount} errors`,
  )

  return results
}

/**
 * Obtiene MIME type basado en la extensión del archivo
 */
function getMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase()

  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    default:
      return 'image/jpeg' // Default fallback
  }
}

/**
 * Limpia media objects huérfanos asociados a un resource
 */
export async function cleanupFrameMedia(resourceId: string): Promise<number> {
  try {
    console.log(`[VIDEO-MEDIA-UPLOADER] Cleaning up frame media for resource ${resourceId}`)

    const payload = await getPayload({ config })

    // Buscar media objects asociados al resource
    const mediaResults = await payload.find({
      collection: 'media',
      where: {
        'frameMetadata.resourceId': {
          equals: resourceId,
        },
      },
      limit: 1000, // Adjust based on expected number of frames
    })

    let deletedCount = 0

    // Eliminar cada media object
    for (const media of mediaResults.docs) {
      await payload.delete({
        collection: 'media',
        id: media.id,
      })
      deletedCount++
    }

    console.log(`[VIDEO-MEDIA-UPLOADER] Cleaned up ${deletedCount} frame media objects`)

    return deletedCount
  } catch (error) {
    console.error(`[VIDEO-MEDIA-UPLOADER] Error cleaning up frame media:`, error)
    return 0
  }
}

/**
 * Busca media objects por namespace
 */
export async function findFramesByNamespace(namespace: string): Promise<Media[]> {
  try {
    const payload = await getPayload({ config })

    const results = await payload.find({
      collection: 'media',
      where: {
        'frameMetadata.namespace': {
          equals: namespace,
        },
      },
      sort: 'frameMetadata.timestamp',
      limit: 1000,
    })

    return results.docs
  } catch (error) {
    console.error(`[VIDEO-MEDIA-UPLOADER] Error finding frames by namespace:`, error)
    return []
  }
}

/**
 * Obtiene estadísticas de frames subidos
 */
export async function getFrameUploadStats(resourceId: string): Promise<{
  totalFrames: number
  totalSize: number
  uploadedAt: Date[]
}> {
  try {
    const payload = await getPayload({ config })

    const results = await payload.find({
      collection: 'media',
      where: {
        'frameMetadata.resourceId': {
          equals: resourceId,
        },
      },
      limit: 1000,
    })

    const totalFrames = results.docs.length
    const totalSize = results.docs.reduce((sum, doc) => sum + (doc.filesize || 0), 0)
    const uploadedAt = results.docs
      .map((doc) => new Date(doc.createdAt))
      .sort((a, b) => a.getTime() - b.getTime())

    return {
      totalFrames,
      totalSize,
      uploadedAt,
    }
  } catch (error) {
    console.error(`[VIDEO-MEDIA-UPLOADER] Error getting frame upload stats:`, error)
    return {
      totalFrames: 0,
      totalSize: 0,
      uploadedAt: [],
    }
  }
}

/**
 * Obtiene configuración del uploader
 */
export function getUploaderConfig() {
  return UPLOAD_CONFIG
}
