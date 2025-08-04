// ============================================================================
// EIDETIK MVP - SERVICIO DE DETECCIÓN DE ESCENAS CON FFMPEG
// ============================================================================

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

// Configuración de detección de escenas con FFmpeg
const SCENE_DETECTION_CONFIG = {
  threshold: parseFloat(process.env.SCENE_DETECTION_THRESHOLD || '0.2'), // Umbral más bajo para más sensibilidad
  minSceneDuration: parseFloat(process.env.MIN_SCENE_DURATION || '0.5'), // Duración mínima más corta
  ffmpegCommand: process.env.FFMPEG_COMMAND || 'ffmpeg',
  timeoutMs: parseInt(process.env.SCENE_DETECTION_TIMEOUT || '300000'), // 5 minutos
}

// Interfaces para detección de escenas
export interface SceneRange {
  start_ms: number
  end_ms: number
  duration_ms: number
  confidence?: number
}

export interface SceneDetectionResult {
  success: boolean
  scenes: SceneRange[]
  totalScenes: number
  totalDurationMs: number
  error?: string
  metadata: {
    threshold: number
    processingTimeMs: number
    videoPath: string
    detectionMethod: string
  }
}

export interface SceneDetectionOptions {
  threshold?: number
  minSceneDuration?: number
  outputFormat?: 'csv' | 'json'
  detectionMethod?: 'content' | 'histogram' | 'adaptive'
}

/**
 * Servicio de detección de escenas usando FFmpeg nativo
 */
export class VideoSceneDetector {
  /**
   * Detectar escenas en un video usando FFmpeg scene detection
   */
  static async detectScenes(
    videoPath: string,
    options: SceneDetectionOptions = {},
  ): Promise<SceneDetectionResult> {
    const startTime = Date.now()

    console.log(`[SCENE-DETECTOR] Starting FFmpeg scene detection for: ${videoPath}`)
    console.log(`[SCENE-DETECTOR] Options:`, options)

    try {
      // Validar que el archivo de video existe
      const fileExists = await this.validateVideoFile(videoPath)
      if (!fileExists) {
        return {
          success: false,
          scenes: [],
          totalScenes: 0,
          totalDurationMs: 0,
          error: 'Video file not found',
          metadata: {
            threshold: options.threshold || SCENE_DETECTION_CONFIG.threshold,
            processingTimeMs: Date.now() - startTime,
            videoPath,
            detectionMethod: options.detectionMethod || 'content',
          },
        }
      }

      // Verificar disponibilidad de FFmpeg
      const ffmpegAvailable = await this.checkFFmpegAvailability()
      if (!ffmpegAvailable) {
        console.error(`[SCENE-DETECTOR] FFmpeg not available`)
        return {
          success: false,
          scenes: [],
          totalScenes: 0,
          totalDurationMs: 0,
          error: 'FFmpeg not installed or not accessible',
          metadata: {
            threshold: options.threshold || SCENE_DETECTION_CONFIG.threshold,
            processingTimeMs: Date.now() - startTime,
            videoPath,
            detectionMethod: options.detectionMethod || 'content',
          },
        }
      }

      // Ejecutar detección de escenas con FFmpeg
      const scenes = await this.runFFmpegSceneDetection(videoPath, options)

      // Procesar y filtrar resultados
      let filteredScenes = this.filterSignificantScenes(scenes, options)

      // Si detectamos muy pocas escenas, complementar con escenas fijas
      const videoDurationMs = await this.getVideoDurationWithFFprobe(videoPath)
      const minScenesDesired = Math.max(3, Math.floor(videoDurationMs / 30000)) // Al menos 1 escena cada 30s

      if (filteredScenes.length < minScenesDesired) {
        console.log(
          `[SCENE-DETECTOR] Only ${filteredScenes.length} scenes detected, adding fixed scenes to reach ${minScenesDesired}`,
        )

        // Generar escenas adicionales fijas para cubrir todo el video
        const fixedScenes = await this.generateFixedScenes(videoDurationMs, 20000) // Escenas de 20s

        // Combinar escenas detectadas con fijas, evitando duplicados
        const combinedScenes = [...filteredScenes]

        for (const fixedScene of fixedScenes) {
          // Solo agregar si no se superpone significativamente con escenas existentes
          const overlaps = combinedScenes.some(
            (existingScene) => Math.abs(fixedScene.start_ms - existingScene.start_ms) < 5000, // Evitar solapamiento de menos de 5s
          )

          if (!overlaps && combinedScenes.length < minScenesDesired) {
            combinedScenes.push(fixedScene)
          }
        }

        // Ordenar por tiempo de inicio
        filteredScenes = combinedScenes.sort((a, b) => a.start_ms - b.start_ms)

        console.log(
          `[SCENE-DETECTOR] Enhanced with fixed scenes: ${filteredScenes.length} total scenes`,
        )
      }

      const processingTimeMs = Date.now() - startTime

      console.log(`[SCENE-DETECTOR] FFmpeg scene detection completed:`)
      console.log(`  - Total scenes detected: ${scenes.length}`)
      console.log(`  - Significant scenes (filtered): ${filteredScenes.length}`)
      console.log(`  - Processing time: ${processingTimeMs}ms`)
      console.log(`  - Threshold used: ${options.threshold || SCENE_DETECTION_CONFIG.threshold}`)

      // Calcular duración total
      const totalDuration = filteredScenes.reduce((sum, scene) => sum + scene.duration_ms, 0)

      return {
        success: true,
        scenes: filteredScenes,
        totalScenes: filteredScenes.length,
        totalDurationMs: totalDuration,
        metadata: {
          threshold: options.threshold || SCENE_DETECTION_CONFIG.threshold,
          processingTimeMs,
          videoPath,
          detectionMethod: 'ffmpeg-scene',
        },
      }
    } catch (error) {
      const processingTimeMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      console.error(`[SCENE-DETECTOR] FFmpeg scene detection failed:`, error)

      return {
        success: false,
        scenes: [],
        totalScenes: 0,
        totalDurationMs: 0,
        error: errorMessage,
        metadata: {
          threshold: options.threshold || SCENE_DETECTION_CONFIG.threshold,
          processingTimeMs,
          videoPath,
          detectionMethod: 'ffmpeg-scene',
        },
      }
    }
  }

  /**
   * Obtener duración total del video
   */
  static async getVideoDuration(videoPath: string): Promise<number> {
    try {
      console.log(`[SCENE-DETECTOR] Getting video duration: ${videoPath}`)

      // Usar ffprobe para obtener duración
      const duration = await this.getVideoDurationWithFFprobe(videoPath)

      console.log(`[SCENE-DETECTOR] Video duration: ${duration}ms`)
      return duration
    } catch (error) {
      console.error(`[SCENE-DETECTOR] Failed to get video duration:`, error)
      throw error
    }
  }

  /**
   * Generar escenas de tamaño fijo (fallback si FFmpeg falla o complementar escenas detectadas)
   */
  static async generateFixedScenes(
    videoDurationMs: number,
    sceneDurationMs: number = 15000,
  ): Promise<SceneRange[]> {
    console.log(`[SCENE-DETECTOR] Generating fixed scenes:`)
    console.log(`  - Video duration: ${videoDurationMs}ms`)
    console.log(`  - Scene duration: ${sceneDurationMs}ms`)

    const scenes: SceneRange[] = []
    let currentStart = 0

    while (currentStart < videoDurationMs) {
      const end = Math.min(currentStart + sceneDurationMs, videoDurationMs)

      scenes.push({
        start_ms: currentStart,
        end_ms: end,
        duration_ms: end - currentStart,
        confidence: 0.5, // Confidence artificial para escenas fijas
      })

      currentStart = end
    }

    console.log(`[SCENE-DETECTOR] Generated ${scenes.length} fixed scenes`)
    return scenes
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Validar que el archivo de video existe
   */
  private static async validateVideoFile(videoPath: string): Promise<boolean> {
    try {
      await fs.promises.access(videoPath, fs.constants.F_OK)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Verificar disponibilidad de FFmpeg
   */
  private static async checkFFmpegAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpegProcess = spawn(SCENE_DETECTION_CONFIG.ffmpegCommand, ['-version'])

      let output = ''

      ffmpegProcess.stdout.on('data', (data) => {
        output += data.toString()
      })

      ffmpegProcess.on('close', (code) => {
        const available = code === 0 && output.includes('ffmpeg version')
        if (available) {
          console.log(`[SCENE-DETECTOR] FFmpeg is available`)
        } else {
          console.log(`[SCENE-DETECTOR] FFmpeg not available (exit code: ${code})`)
        }
        resolve(available)
      })

      ffmpegProcess.on('error', (error) => {
        console.log(`[SCENE-DETECTOR] Error checking FFmpeg: ${error.message}`)
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
   * Ejecutar FFmpeg para detectar escenas usando el filtro scene
   */
  private static async runFFmpegSceneDetection(
    videoPath: string,
    options: SceneDetectionOptions,
  ): Promise<SceneRange[]> {
    return new Promise((resolve, reject) => {
      const threshold = options.threshold || SCENE_DETECTION_CONFIG.threshold

      console.log(`[SCENE-DETECTOR] Running FFmpeg scene detection with threshold: ${threshold}`)

      // Comando FFmpeg para detectar escenas y mostrar timestamps
      const args = [
        '-i',
        videoPath,
        '-vf',
        `select='gt(scene,${threshold})',showinfo`,
        '-vsync',
        'vfr',
        '-f',
        'null',
        '-',
      ]

      const ffmpegProcess = spawn(SCENE_DETECTION_CONFIG.ffmpegCommand, args, {
        timeout: SCENE_DETECTION_CONFIG.timeoutMs,
      })

      let output = ''
      let errorOutput = ''
      const sceneTimestamps: number[] = []

      ffmpegProcess.stdout.on('data', (data) => {
        output += data.toString()
      })

      ffmpegProcess.stderr.on('data', (data) => {
        const chunk = data.toString()
        errorOutput += chunk

        // Buscar timestamps en el output de showinfo
        const timestampMatches = chunk.match(/pts_time:\s*([\d.]+)/g)
        if (timestampMatches) {
          timestampMatches.forEach((match: string) => {
            const time = parseFloat(match.split(':')[1].trim())
            if (!isNaN(time)) {
              sceneTimestamps.push(time * 1000) // Convertir a ms
            }
          })
        }
      })

      ffmpegProcess.on('close', async (code) => {
        if (code === 0 || code === null) {
          try {
            // Obtener duración total del video
            const totalDurationMs = await this.getVideoDurationWithFFprobe(videoPath)

            // Convertir timestamps a escenas
            const scenes = this.timestampsToScenes(sceneTimestamps, totalDurationMs)

            console.log(`[SCENE-DETECTOR] FFmpeg detected ${sceneTimestamps.length} scene cuts`)
            console.log(`[SCENE-DETECTOR] Generated ${scenes.length} scenes`)

            resolve(scenes)
          } catch (durationError) {
            reject(new Error(`Failed to get video duration: ${durationError}`))
          }
        } else {
          console.error(`[SCENE-DETECTOR] FFmpeg failed:`)
          console.error(`  - Exit code: ${code}`)
          console.error(`  - Error output: ${errorOutput}`)

          reject(new Error(`FFmpeg scene detection failed with exit code ${code}`))
        }
      })

      ffmpegProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn FFmpeg process: ${error.message}`))
      })
    })
  }

  /**
   * Convertir timestamps de cambios de escena en rangos de escenas
   */
  private static timestampsToScenes(timestamps: number[], totalDurationMs: number): SceneRange[] {
    const scenes: SceneRange[] = []

    // Asegurar que empiece en 0 y termine en la duración total
    const allTimestamps = [0, ...timestamps.sort((a, b) => a - b), totalDurationMs]

    // Eliminar duplicados
    const uniqueTimestamps = [...new Set(allTimestamps)]

    // Crear escenas entre cada par de timestamps
    for (let i = 0; i < uniqueTimestamps.length - 1; i++) {
      const start_ms = Math.round(uniqueTimestamps[i])
      const end_ms = Math.round(uniqueTimestamps[i + 1])

      if (end_ms > start_ms) {
        scenes.push({
          start_ms,
          end_ms,
          duration_ms: end_ms - start_ms,
          confidence: 0.8, // Confidence basada en FFmpeg scene detection
        })
      }
    }

    return scenes
  }

  /**
   * Filtrar escenas significativas basado en duración mínima
   */
  private static filterSignificantScenes(
    scenes: SceneRange[],
    options: SceneDetectionOptions,
  ): SceneRange[] {
    const minDuration = (options.minSceneDuration || SCENE_DETECTION_CONFIG.minSceneDuration) * 1000

    const filtered = scenes.filter((scene) => scene.duration_ms >= minDuration)

    console.log(`[SCENE-DETECTOR] Filtered scenes:`)
    console.log(`  - Original: ${scenes.length}`)
    console.log(`  - After min duration filter (${minDuration}ms): ${filtered.length}`)

    return filtered
  }

  /**
   * Obtener duración del video usando FFprobe
   */
  private static async getVideoDurationWithFFprobe(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const ffprobeArgs = ['-v', 'quiet', '-print_format', 'json', '-show_format', videoPath]

      const ffprobeProcess = spawn('ffprobe', ffprobeArgs)

      let output = ''
      let errorOutput = ''

      ffprobeProcess.stdout.on('data', (data) => {
        output += data.toString()
      })

      ffprobeProcess.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ffprobeProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output)
            const durationSeconds = parseFloat(info.format.duration)
            const durationMs = Math.round(durationSeconds * 1000)
            resolve(durationMs)
          } catch (parseError) {
            reject(new Error(`Failed to parse ffprobe output: ${parseError}`))
          }
        } else {
          reject(new Error(`FFprobe failed with exit code ${code}: ${errorOutput}`))
        }
      })

      ffprobeProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn ffprobe: ${error.message}`))
      })
    })
  }
}
