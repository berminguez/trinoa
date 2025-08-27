/**
 * Sistema de CRON Jobs para Railway
 *
 * Maneja tareas programadas que se ejecutan periódicamente
 * para mantener sincronizado el estado de resources con N8n
 */

import * as cron from 'node-cron'
import { checkN8nExecutions } from '@/actions/resources/checkN8nExecutions'

interface CronConfig {
  enabled: boolean
  n8nCheckerInterval: string // Expresión cron
  timezone: string
}

class CronManager {
  private static instance: CronManager
  private tasks: Map<string, cron.ScheduledTask> = new Map()
  private config: CronConfig
  private isInitialized = false

  constructor() {
    this.config = {
      enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true',
      n8nCheckerInterval: '* * * * *', // Cada minuto
      timezone: 'Europe/Madrid',
    }
  }

  public static getInstance(): CronManager {
    if (!CronManager.instance) {
      CronManager.instance = new CronManager()
    }
    return CronManager.instance
  }

  /**
   * Inicializa todos los CRON jobs
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[CRON] Manager already initialized')
      return
    }

    if (!this.config.enabled) {
      console.log('[CRON] CRON jobs disabled (NODE_ENV not production and ENABLE_CRON not true)')
      return
    }

    console.log('[CRON] Initializing CRON jobs...')

    try {
      // Job principal: verificar estados de N8n
      this.scheduleN8nChecker()

      this.isInitialized = true
      console.log('🕒 [CRON] All CRON jobs initialized successfully')

      // Log de configuración
      console.log('[CRON] Configuration:', {
        enabled: this.config.enabled,
        n8nCheckerInterval: this.config.n8nCheckerInterval,
        timezone: this.config.timezone,
        totalTasks: this.tasks.size,
      })
    } catch (error) {
      console.error('❌ [CRON] Failed to initialize CRON jobs:', error)
      throw error
    }
  }

  /**
   * Programa el job de verificación de estados de N8n
   */
  private scheduleN8nChecker(): void {
    const taskName = 'n8n-execution-checker'

    try {
      const task = cron.schedule(this.config.n8nCheckerInterval, async () => {
        const startTime = Date.now()
        console.log(`[CRON:${taskName}] Starting N8n execution check...`)

        try {
          const result = await checkN8nExecutions()
          const duration = Date.now() - startTime

          if (result.success) {
            console.log(
              `[CRON:${taskName}] ✅ Completed in ${duration}ms - ` +
                `Checked: ${result.totalChecked}, Updated: ${result.updated}, Errors: ${result.errors}`,
            )

            // Log detallado si hubo actualizaciones
            if (result.updated > 0) {
              const actions = result.results
                .filter((r) => r.action && r.action !== 'no_action')
                .map((r) => `${r.resourceId}: ${r.action}`)

              console.log(`[CRON:${taskName}] Actions taken:`, actions)
            }
          } else {
            console.error(`[CRON:${taskName}] ❌ Failed in ${duration}ms - Error: ${result.error}`)
          }
        } catch (error) {
          const duration = Date.now() - startTime
          console.error(`[CRON:${taskName}] ❌ Exception in ${duration}ms:`, error)
        }
      })

      this.tasks.set(taskName, task)

      // Iniciar la tarea
      task.start()

      console.log(
        `[CRON] ✅ Scheduled ${taskName} with interval: ${this.config.n8nCheckerInterval}`,
      )
    } catch (error) {
      console.error(`[CRON] ❌ Failed to schedule ${taskName}:`, error)
      throw error
    }
  }

  /**
   * Detiene todos los CRON jobs
   */
  public stop(): void {
    console.log('[CRON] Stopping all CRON jobs...')

    this.tasks.forEach((task, name) => {
      try {
        task.stop()
        console.log(`[CRON] ✅ Stopped ${name}`)
      } catch (error) {
        console.error(`[CRON] ❌ Failed to stop ${name}:`, error)
      }
    })

    this.tasks.clear()
    this.isInitialized = false
    console.log('[CRON] All CRON jobs stopped')
  }

  /**
   * Obtiene información sobre las tareas programadas
   */
  public getStatus(): {
    initialized: boolean
    enabled: boolean
    tasksCount: number
    tasks: Array<{
      name: string
      running: boolean
    }>
  } {
    const tasks = Array.from(this.tasks.entries()).map(([name, task]) => ({
      name,
      running: (task as any).running || false,
    }))

    return {
      initialized: this.isInitialized,
      enabled: this.config.enabled,
      tasksCount: this.tasks.size,
      tasks,
    }
  }

  /**
   * Ejecuta manualmente el checker de N8n (para testing)
   */
  public async runN8nCheckerNow(): Promise<any> {
    console.log('[CRON] Manual execution of N8n checker requested')

    try {
      const result = await checkN8nExecutions()
      console.log('[CRON] Manual N8n check completed:', {
        success: result.success,
        totalChecked: result.totalChecked,
        updated: result.updated,
        errors: result.errors,
      })
      return result
    } catch (error) {
      console.error('[CRON] Manual N8n check failed:', error)
      throw error
    }
  }
}

// Export de la instancia singleton
export const cronManager = CronManager.getInstance()

// Funciones de utilidad
export const initializeCron = () => cronManager.initialize()
export const stopCron = () => cronManager.stop()
export const getCronStatus = () => cronManager.getStatus()
export const runN8nCheckerManually = () => cronManager.runN8nCheckerNow()
