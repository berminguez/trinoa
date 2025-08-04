// ============================================================================
// EIDETIK MVP - SERVICIO DE DESCARGA DE VIDEOS DESDE S3
// ============================================================================

import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getPayload } from 'payload'

import config from '@/payload.config'

import { CONFIG } from '../config'

import type { VideoProcessingJob } from '../../types'

// Inicialización lazy del S3 Client
let s3ClientInstance: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set')
    }

    s3ClientInstance = new S3Client({
      region: CONFIG.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  }
  return s3ClientInstance
}

// Configuración de reintentos
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
}

// Configuración de archivos temporales
const TEMP_DIR = '/tmp'
const TEMP_FILE_PREFIX = 'eidetik_video_'

export interface DownloadResult {
  success: boolean
  localPath?: string
  error?: string
  attempts: number
  totalSizeBytes?: number
  downloadDurationMs?: number
}

export interface DownloadAttempt {
  attemptNumber: number
  started: Date
  completed?: Date
  success: boolean
  error?: string
  bytesDownloaded?: number
}

/**
 * Servicio para descarga de videos desde S3 con sistema de reintentos y logging
 */
export class VideoDownloader {
  /**
   * Descargar video desde S3 con reintentos y backoff exponencial
   */
  static async downloadVideo(job: VideoProcessingJob): Promise<DownloadResult> {
    const startTime = Date.now()
    const attempts: DownloadAttempt[] = []

    console.log(`[VIDEO-DOWNLOADER] Starting download for resource: ${job.resourceId}`)
    console.log(`[VIDEO-DOWNLOADER] Video URL: ${job.videoUrl}`)
    console.log(`[VIDEO-DOWNLOADER] File: ${job.fileName} (${job.fileSize} bytes)`)

    // Validar campos requeridos del job
    const validationError = this.validateJobFields(job)
    if (validationError) {
      console.error(`[VIDEO-DOWNLOADER] Validation failed: ${validationError}`)
      return {
        success: false,
        error: `Job validation failed: ${validationError}`,
        attempts: 0,
      }
    }

    // Generar ruta temporal única
    const tempFileName = `${TEMP_FILE_PREFIX}${job.resourceId}_${Date.now()}.mp4`
    const localPath = path.join(TEMP_DIR, tempFileName)

    // Asegurar que el directorio temporal existe
    await this.ensureTempDirectory()

    // Detectar si es una URL de PayloadCMS y usar método apropiado
    const isPayloadUrl = job.videoUrl.startsWith('/api/media/file/')
    if (isPayloadUrl) {
      console.log(`[VIDEO-DOWNLOADER] Detected PayloadCMS URL, using internal API`)
      return this.downloadFromPayloadCMS(job, localPath, startTime, attempts)
    }

    // Para URLs directas de S3, usar método original
    const s3Key = this.extractS3KeyFromUrl(job.videoUrl, job.fileName)
    if (!s3Key) {
      console.error(`[VIDEO-DOWNLOADER] Could not extract S3 key from URL: ${job.videoUrl}`)
      return {
        success: false,
        error: 'Invalid S3 URL format',
        attempts: 0,
      }
    }

    // Intentos de descarga con reintentos
    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      const attemptData: DownloadAttempt = {
        attemptNumber: attempt,
        started: new Date(),
        success: false,
      }

      console.log(
        `[VIDEO-DOWNLOADER] Attempt ${attempt}/${RETRY_CONFIG.maxRetries} for resource: ${job.resourceId}`,
      )

      try {
        // Realizar descarga
        const downloadSuccess = await this.performDownload(s3Key, localPath, attemptData)

        if (downloadSuccess) {
          console.log(`[VIDEO-DOWNLOADER] Download successful on attempt ${attempt}`)

          // Verificar que el archivo fue descargado completamente
          const fileStats = await fs.promises.stat(localPath)
          const expectedSize = job.fileSize || 0

          console.log(
            `[VIDEO-DOWNLOADER] File size verification: ${fileStats.size} bytes (expected: ${expectedSize})`,
          )

          if (expectedSize > 0 && Math.abs(fileStats.size - expectedSize) > 1024) {
            // Tolerar diferencia de hasta 1KB (metadata S3)
            throw new Error(`File size mismatch: got ${fileStats.size}, expected ${expectedSize}`)
          }

          attemptData.success = true
          attemptData.completed = new Date()
          attemptData.bytesDownloaded = fileStats.size
          attempts.push(attemptData)

          const totalDuration = Date.now() - startTime

          console.log(`[VIDEO-DOWNLOADER] Download completed successfully:`)
          console.log(`  - Resource: ${job.resourceId}`)
          console.log(`  - Local path: ${localPath}`)
          console.log(`  - Size: ${fileStats.size} bytes`)
          console.log(`  - Duration: ${totalDuration}ms`)
          console.log(`  - Attempts: ${attempt}`)

          return {
            success: true,
            localPath,
            attempts: attempt,
            totalSizeBytes: fileStats.size,
            downloadDurationMs: totalDuration,
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        attemptData.error = errorMessage
        attempts.push(attemptData)

        console.error(`[VIDEO-DOWNLOADER] Attempt ${attempt} failed: ${errorMessage}`)

        // Limpiar archivo parcial si existe
        if (fs.existsSync(localPath)) {
          try {
            await fs.promises.unlink(localPath)
            console.log(`[VIDEO-DOWNLOADER] Cleaned up partial file: ${localPath}`)
          } catch (cleanupError) {
            console.error(`[VIDEO-DOWNLOADER] Failed to cleanup partial file: ${cleanupError}`)
          }
        }

        // Si no es el último intento, esperar con backoff exponencial
        if (attempt < RETRY_CONFIG.maxRetries) {
          const delayMs = Math.min(
            RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
            RETRY_CONFIG.maxDelayMs,
          )

          console.log(`[VIDEO-DOWNLOADER] Waiting ${delayMs}ms before retry...`)
          await this.sleep(delayMs)
        }
      }
    }

    // Todos los intentos fallaron
    const totalDuration = Date.now() - startTime
    const lastError = attempts[attempts.length - 1]?.error || 'Unknown error'

    console.error(`[VIDEO-DOWNLOADER] Download failed after ${RETRY_CONFIG.maxRetries} attempts`)
    console.error(`[VIDEO-DOWNLOADER] Resource: ${job.resourceId}`)
    console.error(`[VIDEO-DOWNLOADER] Duration: ${totalDuration}ms`)
    console.error(`[VIDEO-DOWNLOADER] Last error: ${lastError}`)

    return {
      success: false,
      error: `Download failed after ${RETRY_CONFIG.maxRetries} attempts. Last error: ${lastError}`,
      attempts: RETRY_CONFIG.maxRetries,
      downloadDurationMs: totalDuration,
    }
  }

  /**
   * Eliminar archivo temporal después del procesamiento
   */
  static async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
        console.log(`[VIDEO-DOWNLOADER] Cleaned up temp file: ${filePath}`)
      }
    } catch (error) {
      console.error(`[VIDEO-DOWNLOADER] Failed to cleanup temp file: ${filePath}`, error)
    }
  }

  /**
   * Limpiar todos los archivos temporales de video (utility)
   */
  static async cleanupAllTempFiles(): Promise<void> {
    try {
      const files = await fs.promises.readdir(TEMP_DIR)
      const videoTempFiles = files.filter((file) => file.startsWith(TEMP_FILE_PREFIX))

      for (const file of videoTempFiles) {
        const filePath = path.join(TEMP_DIR, file)
        try {
          await fs.promises.unlink(filePath)
          console.log(`[VIDEO-DOWNLOADER] Cleaned up temp file: ${filePath}`)
        } catch (error) {
          console.error(`[VIDEO-DOWNLOADER] Failed to cleanup temp file: ${filePath}`, error)
        }
      }

      if (videoTempFiles.length > 0) {
        console.log(`[VIDEO-DOWNLOADER] Cleaned up ${videoTempFiles.length} temp files`)
      }
    } catch (error) {
      console.error(`[VIDEO-DOWNLOADER] Failed to cleanup temp files:`, error)
    }
  }

  /**
   * Descarga archivo desde PayloadCMS usando su API interna
   */
  private static async downloadFromPayloadCMS(
    job: VideoProcessingJob,
    localPath: string,
    startTime: number,
    attempts: DownloadAttempt[],
  ): Promise<DownloadResult> {
    try {
      console.log(`[VIDEO-DOWNLOADER] Using PayloadCMS internal API for: ${job.fileName}`)

      // Obtener PayloadCMS instance
      const payload = await getPayload({ config })

      // Buscar el media object por filename o URL
      const mediaQuery = await payload.find({
        collection: 'media',
        where: {
          filename: {
            equals: job.fileName,
          },
        },
        limit: 1,
      })

      if (!mediaQuery.docs.length) {
        throw new Error(`Media file not found in PayloadCMS: ${job.fileName}`)
      }

      const mediaDoc = mediaQuery.docs[0]
      console.log(`[VIDEO-DOWNLOADER] Found media document: ${mediaDoc.id}`)

      // Usar el método interno de PayloadCMS para obtener el archivo
      // PayloadCMS maneja internamente las signed URLs y autenticación S3
      const fileBuffer = await this.getFileFromPayloadMedia(mediaDoc)

      // Escribir el buffer al archivo temporal
      await fs.promises.writeFile(localPath, fileBuffer)

      // Verificar el archivo
      const fileStats = await fs.promises.stat(localPath)
      const expectedSize = job.fileSize || mediaDoc.filesize || 0

      console.log(
        `[VIDEO-DOWNLOADER] PayloadCMS download verification: ${fileStats.size} bytes (expected: ${expectedSize})`,
      )

      if (expectedSize > 0 && Math.abs(fileStats.size - expectedSize) > 1024) {
        throw new Error(`File size mismatch: got ${fileStats.size}, expected ${expectedSize}`)
      }

      const totalDuration = Date.now() - startTime

      console.log(`[VIDEO-DOWNLOADER] PayloadCMS download completed successfully:`)
      console.log(`  - Resource: ${job.resourceId}`)
      console.log(`  - Local path: ${localPath}`)
      console.log(`  - Size: ${fileStats.size} bytes`)
      console.log(`  - Duration: ${totalDuration}ms`)

      return {
        success: true,
        localPath,
        attempts: 1,
        totalSizeBytes: fileStats.size,
        downloadDurationMs: totalDuration,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const totalDuration = Date.now() - startTime

      console.error(`[VIDEO-DOWNLOADER] PayloadCMS download failed: ${errorMessage}`)

      return {
        success: false,
        error: `PayloadCMS download failed: ${errorMessage}`,
        attempts: 1,
        downloadDurationMs: totalDuration,
      }
    }
  }

  /**
   * Obtiene el buffer del archivo desde un media document de PayloadCMS
   */
  private static async getFileFromPayloadMedia(mediaDoc: any): Promise<Buffer> {
    // Verificar que tenemos la API Key necesaria
    const apiKey = process.env.PAYLOAD_ADMIN_API_KEY
    if (!apiKey) {
      throw new Error('PAYLOAD_ADMIN_API_KEY environment variable is required for file access')
    }

    // Construir URL completa para el archivo
    const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const fileUrl = `${baseUrl}${mediaDoc.url}`

    console.log(`[VIDEO-DOWNLOADER] Fetching file from: ${fileUrl}`)
    console.log(`[VIDEO-DOWNLOADER] Using API Key authentication`)

    // Hacer request con autenticación de API Key
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        Authorization: `users API-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`[VIDEO-DOWNLOADER] HTTP Error: ${response.status} ${response.statusText}`)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    console.log(`[VIDEO-DOWNLOADER] File fetch successful, converting to buffer`)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Validar campos requeridos del job
   */
  private static validateJobFields(job: VideoProcessingJob): string | null {
    if (!job.resourceId || job.resourceId.trim().length === 0) {
      return 'resourceId is required'
    }

    if (!job.videoUrl || job.videoUrl.trim().length === 0) {
      return 'videoUrl is required'
    }

    if (!job.fileName || job.fileName.trim().length === 0) {
      return 'fileName is required'
    }

    if (!job.namespace || job.namespace.trim().length === 0) {
      return 'namespace is required'
    }

    // Validar formato de namespace
    if (!/^[a-zA-Z0-9-_]+$/.test(job.namespace)) {
      return 'namespace must contain only letters, numbers, hyphens and underscores'
    }

    // filters y user_metadata son opcionales pero deben ser objetos si están presentes
    if (job.filters && typeof job.filters !== 'object') {
      return 'filters must be an object'
    }

    if (job.user_metadata && typeof job.user_metadata !== 'object') {
      return 'user_metadata must be an object'
    }

    return null
  }

  /**
   * Extraer S3 key de la URL de video o construir desde filename
   */
  private static extractS3KeyFromUrl(videoUrl: string, fileName?: string): string | null {
    try {
      // Caso especial: URL relativa de PayloadCMS
      if (videoUrl.startsWith('/api/media/file/') && fileName) {
        console.log(`[VIDEO-DOWNLOADER] Detected PayloadCMS URL, using filename: ${fileName}`)
        return fileName
      }

      // URL completa - intentar parsear como URL normal
      const url = new URL(videoUrl)

      // Caso 1: bucket.s3.region.amazonaws.com
      if (url.hostname.includes('.s3.')) {
        return url.pathname.substring(1) // Remover el '/' inicial
      }

      // Caso 2: s3.region.amazonaws.com/bucket
      if (url.hostname.startsWith('s3.') && url.hostname.includes('amazonaws.com')) {
        const pathParts = url.pathname.substring(1).split('/')
        if (pathParts.length >= 2) {
          return pathParts.slice(1).join('/') // Remover bucket name
        }
      }

      // PayloadCMS S3 storage puede tener formato específico
      // Intentar extraer directamente el pathname
      if (url.pathname) {
        return url.pathname.substring(1)
      }

      return null
    } catch (error) {
      // Si falla el parsing de URL pero tenemos filename, usarlo
      if (fileName && videoUrl.includes(fileName)) {
        console.log(`[VIDEO-DOWNLOADER] URL parsing failed, using filename: ${fileName}`)
        return fileName
      }

      console.error(`[VIDEO-DOWNLOADER] Failed to parse URL: ${videoUrl}`, error)
      return null
    }
  }

  /**
   * Asegurar que el directorio temporal existe
   */
  private static async ensureTempDirectory(): Promise<void> {
    try {
      await fs.promises.access(TEMP_DIR)
    } catch (error) {
      // El directorio no existe, crearlo
      try {
        await fs.promises.mkdir(TEMP_DIR, { recursive: true })
        console.log(`[VIDEO-DOWNLOADER] Created temp directory: ${TEMP_DIR}`)
      } catch (createError) {
        throw new Error(`Failed to create temp directory: ${createError}`)
      }
    }
  }

  /**
   * Realizar la descarga real desde S3
   */
  private static async performDownload(
    s3Key: string,
    localPath: string,
    attemptData: DownloadAttempt,
  ): Promise<boolean> {
    const startTime = Date.now()

    console.log(`[VIDEO-DOWNLOADER] Downloading from S3:`)
    console.log(`  - Bucket: ${CONFIG.AWS_S3_BUCKET}`)
    console.log(`  - Key: ${s3Key}`)
    console.log(`  - Local path: ${localPath}`)

    // Preparar comando S3
    const command = new GetObjectCommand({
      Bucket: CONFIG.AWS_S3_BUCKET,
      Key: s3Key,
    })

    // Ejecutar descarga
    const response = await getS3Client().send(command)

    if (!response.Body) {
      throw new Error('S3 response body is empty')
    }

    // Convertir el Body a Readable stream y usar pipeline para streaming eficiente
    const readableStream = response.Body as Readable
    const writeStream = fs.createWriteStream(localPath)

    try {
      // Usar stream pipeline para manejo robusto de streams
      await pipeline(readableStream, writeStream)

      const duration = Date.now() - startTime
      const fileStats = await fs.promises.stat(localPath)

      console.log(`[VIDEO-DOWNLOADER] Stream finished: ${fileStats.size} bytes in ${duration}ms`)
      return true
    } catch (error) {
      throw new Error(
        `Stream pipeline error: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Utilidad para sleep/delay
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
