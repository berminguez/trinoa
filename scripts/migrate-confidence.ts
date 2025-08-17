#!/usr/bin/env npx tsx

// ============================================================================
// EIDETIK MVP - CONFIDENCE FIELD MIGRATION SCRIPT
// ============================================================================

import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'
import {
  calculateResourceConfidence,
  getConfidenceThreshold,
} from '@/lib/utils/calculateResourceConfidence'

interface MigrationStats {
  total: number
  processed: number
  updated: number
  errors: number
  skipped: number
  results: Array<{
    id: string
    title: string
    status: 'updated' | 'skipped' | 'error'
    oldConfidence?: string
    newConfidence?: string
    error?: string
  }>
}

class ConfidenceMigration {
  private stats: MigrationStats = {
    total: 0,
    processed: 0,
    updated: 0,
    errors: 0,
    skipped: 0,
    results: [],
  }

  constructor(private dryRun: boolean = false) {}

  async run(): Promise<void> {
    console.log('🔄 Starting Confidence Field Migration')
    console.log('=' .repeat(80))
    console.log('📋 Mode:', this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE MIGRATION')
    console.log('⏰ Started at:', new Date().toISOString())
    console.log('=' .repeat(80))

    try {
      const payload = await getPayload({ config })
      console.log('✅ PayloadCMS connection established')

      // Obtener threshold de configuración
      const threshold = await getConfidenceThreshold(payload)
      console.log(`📊 Using confidence threshold: ${threshold}%`)

      // Obtener todos los recursos
      console.log('🔍 Fetching all resources...')
      const allResources = await this.getAllResources(payload)
      
      this.stats.total = allResources.length
      console.log(`📦 Found ${this.stats.total} resources to process`)

      if (this.stats.total === 0) {
        console.log('ℹ️  No resources found. Migration completed.')
        return
      }

      // Procesar cada recurso
      console.log('\n🚀 Starting resource processing...')
      console.log('-' .repeat(60))

      for (let i = 0; i < allResources.length; i++) {
        const resource = allResources[i]
        await this.processResource(payload, resource, threshold, i + 1)
      }

      // Mostrar resumen final
      this.showFinalSummary()

    } catch (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
  }

  private async getAllResources(payload: any): Promise<any[]> {
    const allResources: any[] = []
    let page = 1
    const limit = 100 // Procesar en lotes de 100

    while (true) {
      const result = await payload.find({
        collection: 'resources',
        limit,
        page,
        depth: 0,
        overrideAccess: true,
      })

      allResources.push(...result.docs)

      if (result.hasNextPage) {
        page++
        console.log(`📄 Fetched page ${page - 1} (${result.docs.length} resources)`)
      } else {
        console.log(`📄 Fetched final page ${page} (${result.docs.length} resources)`)
        break
      }
    }

    return allResources
  }

  private async processResource(
    payload: any,
    resource: any,
    threshold: number,
    index: number
  ): Promise<void> {
    this.stats.processed++

    try {
      const resourceId = resource.id
      const currentConfidence = resource.confidence
      const title = resource.title || 'Untitled'

      // Calcular nuevo confidence
      const newConfidence = calculateResourceConfidence(resource, threshold)

      // Determinar si necesita actualización
      if (currentConfidence === newConfidence) {
        this.stats.skipped++
        this.stats.results.push({
          id: resourceId,
          title,
          status: 'skipped',
          oldConfidence: currentConfidence,
          newConfidence,
        })

        if (index % 10 === 0 || this.stats.total < 20) {
          console.log(
            `[${index}/${this.stats.total}] ⏭️  ${resourceId} (${title.substring(0, 30)}) - Skipped (already ${currentConfidence})`
          )
        }
        return
      }

      // Actualizar recurso (solo si no es dry run)
      if (!this.dryRun) {
        await payload.update({
          collection: 'resources',
          id: resourceId,
          data: {
            confidence: newConfidence,
          },
          overrideAccess: true,
        })
      }

      this.stats.updated++
      this.stats.results.push({
        id: resourceId,
        title,
        status: 'updated',
        oldConfidence: currentConfidence,
        newConfidence,
      })

      console.log(
        `[${index}/${this.stats.total}] ✅ ${resourceId} (${title.substring(0, 30)}) - ${currentConfidence} → ${newConfidence}${this.dryRun ? ' (DRY RUN)' : ''}`
      )

    } catch (error) {
      this.stats.errors++
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      this.stats.results.push({
        id: resource.id,
        title: resource.title || 'Untitled',
        status: 'error',
        error: errorMessage,
      })

      console.error(
        `[${index}/${this.stats.total}] ❌ ${resource.id} - Error: ${errorMessage}`
      )
    }
  }

  private showFinalSummary(): void {
    console.log('\n' + '=' .repeat(80))
    console.log('📊 MIGRATION SUMMARY')
    console.log('=' .repeat(80))
    console.log(`📦 Total resources: ${this.stats.total}`)
    console.log(`🔄 Processed: ${this.stats.processed}`)
    console.log(`✅ Updated: ${this.stats.updated}`)
    console.log(`⏭️  Skipped: ${this.stats.skipped}`)
    console.log(`❌ Errors: ${this.stats.errors}`)
    console.log(`🎯 Success rate: ${this.stats.total > 0 ? ((this.stats.updated + this.stats.skipped) / this.stats.total * 100).toFixed(1) : 0}%`)
    console.log(`⏰ Completed at: ${new Date().toISOString()}`)

    if (this.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No actual changes were made')
      console.log('💡 Run with --live flag to apply changes')
    }

    // Mostrar distribución de confidence
    this.showConfidenceDistribution()

    // Mostrar errores si los hay
    if (this.stats.errors > 0) {
      this.showErrors()
    }

    console.log('=' .repeat(80))
  }

  private showConfidenceDistribution(): void {
    const distribution: Record<string, number> = {}
    
    this.stats.results.forEach(result => {
      if (result.status === 'updated' || result.status === 'skipped') {
        const confidence = result.newConfidence || result.oldConfidence || 'unknown'
        distribution[confidence] = (distribution[confidence] || 0) + 1
      }
    })

    console.log('\n📈 CONFIDENCE DISTRIBUTION:')
    Object.entries(distribution)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([confidence, count]) => {
        const percentage = ((count / this.stats.total) * 100).toFixed(1)
        console.log(`   ${confidence}: ${count} resources (${percentage}%)`)
      })
  }

  private showErrors(): void {
    console.log('\n❌ ERRORS ENCOUNTERED:')
    this.stats.results
      .filter(r => r.status === 'error')
      .forEach(result => {
        console.log(`   ${result.id} (${result.title}): ${result.error}`)
      })
  }
}

// Script execution
async function main() {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--live')

  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode')
    console.log('💡 Use --live flag to apply actual changes')
    console.log('')
  }

  const migration = new ConfidenceMigration(dryRun)
  await migration.run()
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Migration interrupted by user')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Migration terminated')
  process.exit(0)
})

// Run the migration
main().catch((error) => {
  console.error('💥 Unexpected error:', error)
  process.exit(1)
})
