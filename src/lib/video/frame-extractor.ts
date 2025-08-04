// ============================================================================
// EIDETIK MVP - SERVICIO DE EXTRACCIÓN DE FRAMES CON FFMPEG
// ============================================================================

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

import type { SceneRange } from './scene-detector'

// Configuración de extracción de frames
const FRAME_EXTRACTION_CONFIG = {
  quality: parseInt(process.env.FRAME_QUALITY || '720'), // Resolución vertical
  format: process.env.FRAME_FORMAT || 'jpg',
  jpegQuality: parseInt(process.env.JPEG_QUALITY || '85'),
  ffmpegCommand: process.env.FFMPEG_COMMAND || 'ffmpeg',
  timeoutMs: parseInt(process.env.FRAME_EXTRACTION_TIMEOUT || '180000'), // 3 minutos
  tempDir: process.env.TEMP_DIR || '/tmp',
}

// Interfaces para extracción de frames
export interface FrameInfo {
  id: string
  timestamp_ms: number
  filePath: string
  fileName: string
  sceneIndex: number
  fileSize?: number
  resolution?: {
    width: number
    height: number
  }
}

export interface FrameExtractionResult {
  success: boolean
  frames: FrameInfo[]
  totalFrames: number
  error?: string
  metadata: {
    videoPath: string
    outputDirectory: string
    quality: number
    format: string
    processingTimeMs: number
    totalScenes: number
  }
}

export interface FrameExtractionOptions {
  quality?: number
  format?: 'jpg' | 'png' | 'webp'
  jpegQuality?: number
  outputDirectory?: string
  framePrefix?: string
}

/**
 * Servicio de extracción de frames usando FFmpeg
 */
export class VideoFrameExtractor {
  /**
   * Extraer key-frames de las escenas detectadas
   */
  static async extractFramesFromScenes(
    videoPath: string,
    scenes: SceneRange[],
    options: FrameExtractionOptions = {},
  ): Promise<FrameExtractionResult> {
    const startTime = Date.now()

    console.log(`[FRAME-EXTRACTOR] Starting frame extraction for: ${videoPath}`)
    console.log(`[FRAME-EXTRACTOR] Scenes to process: ${scenes.length}`)
    console.log(`[FRAME-EXTRACTOR] Options:`, options)

    try {
      // Validar entrada
      if (scenes.length === 0) {
        return {
          success: true,
          frames: [],
          totalFrames: 0,
          metadata: {
            videoPath,
            outputDirectory: options.outputDirectory || FRAME_EXTRACTION_CONFIG.tempDir,
            quality: options.quality || FRAME_EXTRACTION_CONFIG.quality,
            format: options.format || FRAME_EXTRACTION_CONFIG.format,
            processingTimeMs: Date.now() - startTime,
            totalScenes: 0,
          },
        }
      }

      // Verificar disponibilidad de FFmpeg
      const ffmpegAvailable = await this.checkFFmpegAvailability()
      if (!ffmpegAvailable) {
        return {
          success: false,
          frames: [],
          totalFrames: 0,
          error: 'FFmpeg not installed or not accessible',
          metadata: {
            videoPath,
            outputDirectory: options.outputDirectory || FRAME_EXTRACTION_CONFIG.tempDir,
            quality: options.quality || FRAME_EXTRACTION_CONFIG.quality,
            format: options.format || FRAME_EXTRACTION_CONFIG.format,
            processingTimeMs: Date.now() - startTime,
            totalScenes: scenes.length,
          },
        }
      }

      // Crear directorio de salida
      const outputDir = options.outputDirectory || FRAME_EXTRACTION_CONFIG.tempDir
      await this.ensureDirectory(outputDir)

      // Extraer frames de cada escena
      const extractedFrames: FrameInfo[] = []

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i]
        console.log(
          `[FRAME-EXTRACTOR] Processing scene ${i + 1}/${scenes.length}: ${scene.start_ms}-${scene.end_ms}ms`,
        )

        try {
          // Calcular timestamp del medio de la escena para el key-frame
          const keyFrameTimestamp = scene.start_ms + scene.duration_ms / 2

          const frameInfo = await this.extractSingleFrame(
            videoPath,
            keyFrameTimestamp,
            i,
            outputDir,
            options,
          )

          if (frameInfo) {
            extractedFrames.push(frameInfo)
            console.log(`[FRAME-EXTRACTOR] Extracted frame: ${frameInfo.fileName}`)
          }
        } catch (sceneError) {
          console.error(`[FRAME-EXTRACTOR] Failed to extract frame for scene ${i}:`, sceneError)
          // Continuar con las siguientes escenas en caso de error
        }
      }

      const processingTimeMs = Date.now() - startTime

      console.log(`[FRAME-EXTRACTOR] Frame extraction completed:`)
      console.log(`  - Total scenes: ${scenes.length}`)
      console.log(`  - Frames extracted: ${extractedFrames.length}`)
      console.log(`  - Processing time: ${processingTimeMs}ms`)
      console.log(`  - Output directory: ${outputDir}`)

      return {
        success: true,
        frames: extractedFrames,
        totalFrames: extractedFrames.length,
        metadata: {
          videoPath,
          outputDirectory: outputDir,
          quality: options.quality || FRAME_EXTRACTION_CONFIG.quality,
          format: options.format || FRAME_EXTRACTION_CONFIG.format,
          processingTimeMs,
          totalScenes: scenes.length,
        },
      }
    } catch (error) {
      const processingTimeMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      console.error(`[FRAME-EXTRACTOR] Frame extraction failed:`, error)

      return {
        success: false,
        frames: [],
        totalFrames: 0,
        error: errorMessage,
        metadata: {
          videoPath,
          outputDirectory: options.outputDirectory || FRAME_EXTRACTION_CONFIG.tempDir,
          quality: options.quality || FRAME_EXTRACTION_CONFIG.quality,
          format: options.format || FRAME_EXTRACTION_CONFIG.format,
          processingTimeMs,
          totalScenes: scenes.length,
        },
      }
    }
  }

  /**
   * Extraer frame en un timestamp específico
   */
  static async extractFrameAtTimestamp(
    videoPath: string,
    timestampMs: number,
    outputPath?: string,
    options: FrameExtractionOptions = {},
  ): Promise<FrameInfo | null> {
    console.log(`[FRAME-EXTRACTOR] Extracting frame at ${timestampMs}ms from: ${videoPath}`)

    try {
      const outputDir = path.dirname(
        outputPath || path.join(FRAME_EXTRACTION_CONFIG.tempDir, 'frame.jpg'),
      )
      await this.ensureDirectory(outputDir)

      const frameInfo = await this.extractSingleFrame(
        videoPath,
        timestampMs,
        0,
        outputDir,
        options,
        outputPath,
      )

      return frameInfo
    } catch (error) {
      console.error(`[FRAME-EXTRACTOR] Failed to extract frame at ${timestampMs}ms:`, error)
      return null
    }
  }

  /**
   * Limpiar frames temporales
   */
  static async cleanupFrames(frames: FrameInfo[]): Promise<void> {
    console.log(`[FRAME-EXTRACTOR] Cleaning up ${frames.length} temporary frames`)

    for (const frame of frames) {
      try {
        if (fs.existsSync(frame.filePath)) {
          await fs.promises.unlink(frame.filePath)
          console.log(`[FRAME-EXTRACTOR] Deleted: ${frame.fileName}`)
        }
      } catch (error) {
        console.error(`[FRAME-EXTRACTOR] Failed to delete frame: ${frame.filePath}`, error)
      }
    }
  }

  /**
   * Limpiar todos los frames temporales del directorio
   */
  static async cleanupTempFrames(
    directory: string = FRAME_EXTRACTION_CONFIG.tempDir,
  ): Promise<void> {
    try {
      const files = await fs.promises.readdir(directory)
      const frameFiles = files.filter(
        (file) =>
          file.startsWith('frame_') &&
          (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.webp')),
      )

      for (const file of frameFiles) {
        const filePath = path.join(directory, file)
        try {
          await fs.promises.unlink(filePath)
          console.log(`[FRAME-EXTRACTOR] Cleaned up temp frame: ${file}`)
        } catch (error) {
          console.error(`[FRAME-EXTRACTOR] Failed to cleanup: ${filePath}`, error)
        }
      }

      if (frameFiles.length > 0) {
        console.log(`[FRAME-EXTRACTOR] Cleaned up ${frameFiles.length} temporary frames`)
      }
    } catch (error) {
      console.error(`[FRAME-EXTRACTOR] Failed to cleanup temp frames:`, error)
    }
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Verificar disponibilidad de FFmpeg
   */
  private static async checkFFmpegAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpegProcess = spawn(FRAME_EXTRACTION_CONFIG.ffmpegCommand, ['-version'])

      ffmpegProcess.on('close', (code) => {
        const available = code === 0
        if (available) {
          console.log(`[FRAME-EXTRACTOR] FFmpeg is available`)
        } else {
          console.log(`[FRAME-EXTRACTOR] FFmpeg not available (exit code: ${code})`)
        }
        resolve(available)
      })

      ffmpegProcess.on('error', (error) => {
        console.log(`[FRAME-EXTRACTOR] Error checking FFmpeg: ${error.message}`)
        resolve(false)
      })

      // Timeout para verificación
      setTimeout(() => {
        ffmpegProcess.kill()
        resolve(false)
      }, 5000)
    })
  }

  /**
   * Asegurar que un directorio existe
   */
  private static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath)
    } catch (error) {
      await fs.promises.mkdir(dirPath, { recursive: true })
      console.log(`[FRAME-EXTRACTOR] Created directory: ${dirPath}`)
    }
  }

  /**
   * Extraer un frame individual
   */
  private static async extractSingleFrame(
    videoPath: string,
    timestampMs: number,
    sceneIndex: number,
    outputDir: string,
    options: FrameExtractionOptions,
    customOutputPath?: string,
  ): Promise<FrameInfo> {
    return new Promise((resolve, reject) => {
      const quality = options.quality || FRAME_EXTRACTION_CONFIG.quality
      const format = options.format || FRAME_EXTRACTION_CONFIG.format
      const jpegQuality = options.jpegQuality || FRAME_EXTRACTION_CONFIG.jpegQuality
      const prefix = options.framePrefix || 'frame'

      // Generar nombre de archivo
      const fileName = customOutputPath
        ? path.basename(customOutputPath)
        : `${prefix}_${timestampMs}.${format}`
      const outputPath = customOutputPath || path.join(outputDir, fileName)

      // Convertir timestamp a formato de tiempo FFmpeg (segundos)
      const timestampSeconds = timestampMs / 1000

      // Configurar argumentos de FFmpeg
      const ffmpegArgs = [
        '-ss',
        timestampSeconds.toString(), // Seek to timestamp
        '-i',
        videoPath, // Input video
        '-vframes',
        '1', // Extract only 1 frame
        '-q:v',
        jpegQuality.toString(), // Quality setting
        '-y', // Overwrite output file
      ]

      // Configurar filtros de video para resolución
      if (quality > 0) {
        ffmpegArgs.push('-vf', `scale=-1:${quality}`)
      }

      ffmpegArgs.push(outputPath)

      console.log(
        `[FRAME-EXTRACTOR] FFmpeg command: ${FRAME_EXTRACTION_CONFIG.ffmpegCommand} ${ffmpegArgs.join(' ')}`,
      )

      const ffmpegProcess = spawn(FRAME_EXTRACTION_CONFIG.ffmpegCommand, ffmpegArgs, {
        timeout: FRAME_EXTRACTION_CONFIG.timeoutMs,
      })

      let errorOutput = ''

      ffmpegProcess.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ffmpegProcess.on('close', async (code) => {
        if (code === 0) {
          try {
            // Verificar que el archivo fue creado y obtener información
            const fileStats = await fs.promises.stat(outputPath)

            // Generar ID único para el frame
            const frameId = `frame_${timestampMs}_${sceneIndex}`

            const frameInfo: FrameInfo = {
              id: frameId,
              timestamp_ms: timestampMs,
              filePath: outputPath,
              fileName: fileName,
              sceneIndex: sceneIndex,
              fileSize: fileStats.size,
            }

            resolve(frameInfo)
          } catch (statError) {
            reject(new Error(`Frame extracted but could not get file stats: ${statError}`))
          }
        } else {
          console.error(`[FRAME-EXTRACTOR] FFmpeg failed:`)
          console.error(`  - Exit code: ${code}`)
          console.error(`  - Error output: ${errorOutput}`)

          reject(new Error(`FFmpeg failed with exit code ${code}: ${errorOutput}`))
        }
      })

      ffmpegProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn FFmpeg process: ${error.message}`))
      })
    })
  }

  /**
   * Obtener información de resolución de un frame
   */
  private static async getFrameResolution(
    framePath: string,
  ): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const ffprobeArgs = [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_streams',
        '-select_streams',
        'v:0',
        framePath,
      ]

      const ffprobeProcess = spawn('ffprobe', ffprobeArgs)

      let output = ''

      ffprobeProcess.stdout.on('data', (data) => {
        output += data.toString()
      })

      ffprobeProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output)
            const stream = info.streams[0]
            if (stream && stream.width && stream.height) {
              resolve({
                width: stream.width,
                height: stream.height,
              })
            } else {
              resolve(null)
            }
          } catch (parseError) {
            resolve(null)
          }
        } else {
          resolve(null)
        }
      })

      ffprobeProcess.on('error', () => {
        resolve(null)
      })
    })
  }
}
