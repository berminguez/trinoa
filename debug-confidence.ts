import { getPayload } from 'payload'
import config from './src/payload.config'
import {
  calculateResourceConfidence,
  getConfidenceThreshold,
} from './src/lib/utils/calculateResourceConfidence'

async function debugResourceConfidence() {
  try {
    const payload = await getPayload({ config })

    // Buscar recursos con status 'completed' pero confidence 'empty'
    const resources = await payload.find({
      collection: 'resources',
      where: {
        and: [{ status: { equals: 'completed' } }, { confidence: { equals: 'empty' } }],
      },
      limit: 5,
      overrideAccess: true,
    })

    console.log(
      `\n🔍 Encontrados ${resources.docs.length} recursos con status completed pero confidence empty\n`,
    )

    // Verificar threshold actual
    const threshold = await getConfidenceThreshold(payload)
    console.log(`📊 Threshold actual: ${threshold}%\n`)

    // Analizar cada recurso
    for (const resource of resources.docs) {
      console.log(`\n📄 Recurso ID: ${resource.id}`)
      console.log(`   Título: ${resource.title || 'Sin título'}`)
      console.log(`   Status: ${resource.status}`)
      console.log(`   Confidence actual: ${resource.confidence}`)

      // Verificar si tiene analyzeResult
      const analyzeResult = (resource as any).analyzeResult
      if (!analyzeResult) {
        console.log(`   ❌ No tiene analyzeResult`)
        continue
      }

      if (!analyzeResult.fields) {
        console.log(`   ❌ analyzeResult existe pero no tiene campos`)
        continue
      }

      const fieldNames = Object.keys(analyzeResult.fields)
      console.log(`   📋 Campos encontrados: ${fieldNames.length}`)

      if (fieldNames.length === 0) {
        console.log(`   ❌ No hay campos en analyzeResult.fields`)
        continue
      }

      // Mostrar algunos campos de ejemplo
      console.log(`   📋 Primeros campos:`)
      fieldNames.slice(0, 3).forEach((fieldName) => {
        const field = analyzeResult.fields[fieldName]
        console.log(`      - ${fieldName}: confidence=${field.confidence}, manual=${field.manual}`)
      })

      // Calcular qué debería ser el confidence
      const calculatedConfidence = calculateResourceConfidence(resource, threshold)
      console.log(`   🧮 Confidence calculado: ${calculatedConfidence}`)

      if (calculatedConfidence !== resource.confidence) {
        console.log(
          `   ⚠️  INCONSISTENCIA: Debería ser ${calculatedConfidence} pero es ${resource.confidence}`,
        )

        // Intentar actualizar
        console.log(`   🔄 Intentando actualizar...`)
        try {
          const updated = await payload.update({
            collection: 'resources',
            id: resource.id,
            data: { confidence: calculatedConfidence },
            overrideAccess: true,
          })
          console.log(`   ✅ Actualizado correctamente a: ${updated.confidence}`)
        } catch (updateError) {
          console.log(`   ❌ Error actualizando: ${updateError}`)
        }
      } else {
        console.log(`   ✅ Confidence correcto`)
      }
    }

    console.log(`\n🔍 Verificando configuración global...`)
    const globalConfig = await payload.findGlobal({
      slug: 'configuracion',
      overrideAccess: true,
    })

    console.log(`Configuración de confidence:`, globalConfig.confidenceSettings)

    process.exit(0)
  } catch (error) {
    console.error('❌ Error en debug:', error)
    process.exit(1)
  }
}

debugResourceConfidence()
