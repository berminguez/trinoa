import { getPayload } from 'payload'
import config from './src/payload.config'
import { calculateResourceConfidence, getConfidenceThreshold } from './src/lib/utils/calculateResourceConfidence'

async function debugSpecificResource() {
  try {
    const payload = await getPayload({ config })
    const resourceId = '68a19927e6dbeb2d1a08e4a5'
    
    console.log(`\n🔍 Analizando recurso específico: ${resourceId}\n`)

    // Obtener el recurso
    const resource = await payload.findByID({
      collection: 'resources',
      id: resourceId,
      depth: 0,
      overrideAccess: true,
    })

    if (!resource) {
      console.log('❌ Recurso no encontrado')
      process.exit(1)
    }

    console.log(`📄 Recurso: ${resource.title}`)
    console.log(`📊 Confidence actual: ${resource.confidence}`)
    console.log(`📈 Status: ${resource.status}`)

    // Verificar threshold
    const threshold = await getConfidenceThreshold(payload)
    console.log(`🎯 Threshold configurado: ${threshold}%`)
    const thresholdDecimal = threshold / 100

    // Analizar analyzeResult
    const analyzeResult = (resource as any).analyzeResult
    if (!analyzeResult || !analyzeResult.fields) {
      console.log('❌ No tiene analyzeResult o fields')
      process.exit(1)
    }

    const fields = analyzeResult.fields
    const fieldNames = Object.keys(fields)
    console.log(`\n📋 Campos encontrados: ${fieldNames.length}`)

    // Analizar cada campo
    const lowConfidenceFields: string[] = []
    const manualFields: string[] = []
    const highConfidenceFields: string[] = []
    const originalLowConfidenceFields: string[] = []

    for (const fieldName of fieldNames) {
      const field = fields[fieldName]
      if (!field || typeof field !== 'object') continue

      const confidence = field.confidence
      const isManual = field.manual === true
      const value = field.valueString || field.content || ''

      console.log(`\n  📝 Campo: ${fieldName}`)
      console.log(`     💯 Confidence: ${confidence} (${confidence >= thresholdDecimal ? '✅' : '❌'})`)
      console.log(`     ✋ Manual: ${isManual ? '✅' : '❌'}`)
      console.log(`     📄 Valor: "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`)

      // Clasificar campos
      if (typeof confidence === 'number' && confidence < thresholdDecimal) {
        originalLowConfidenceFields.push(fieldName)
        if (!isManual) {
          lowConfidenceFields.push(fieldName)
        }
      } else {
        highConfidenceFields.push(fieldName)
      }

      if (isManual) {
        manualFields.push(fieldName)
      }
    }

    console.log(`\n📊 RESUMEN DE CAMPOS:`)
    console.log(`  🔴 Campos con baja confianza originalmente: ${originalLowConfidenceFields.length}`)
    originalLowConfidenceFields.forEach(name => console.log(`     - ${name}`))
    
    console.log(`  🟠 Campos con baja confianza SIN corregir: ${lowConfidenceFields.length}`)
    lowConfidenceFields.forEach(name => console.log(`     - ${name}`))
    
    console.log(`  🟢 Campos con alta confianza: ${highConfidenceFields.length}`)
    console.log(`  ✋ Campos marcados como manuales: ${manualFields.length}`)
    manualFields.forEach(name => console.log(`     - ${name}`))

    // Verificar lógica de "verified"
    console.log(`\n🧮 LÓGICA DE VERIFICACIÓN:`)
    console.log(`  1. ¿Hay campos con baja confianza sin corregir? ${lowConfidenceFields.length > 0 ? 'SÍ ❌' : 'NO ✅'}`)
    
    if (originalLowConfidenceFields.length > 0) {
      const allLowConfidenceFieldsAreManual = originalLowConfidenceFields.every(fieldName => {
        const field = fields[fieldName]
        return field && field.manual === true
      })
      console.log(`  2. ¿Todos los campos de baja confianza están corregidos manualmente? ${allLowConfidenceFieldsAreManual ? 'SÍ ✅' : 'NO ❌'}`)
      
      if (allLowConfidenceFieldsAreManual) {
        console.log(`  📋 Campos de baja confiancia corregidos:`)
        originalLowConfidenceFields.forEach(fieldName => {
          const field = fields[fieldName]
          console.log(`     - ${fieldName}: manual=${field.manual}`)
        })
      }
    } else {
      console.log(`  2. No había campos de baja confianza originalmente`)
    }

    // Calcular qué debería ser el confidence
    const calculatedConfidence = calculateResourceConfidence(resource, threshold)
    console.log(`\n🎯 Confidence calculado: ${calculatedConfidence}`)
    console.log(`🔄 Confidence actual: ${resource.confidence}`)
    console.log(`${calculatedConfidence !== resource.confidence ? '⚠️  INCONSISTENCIA DETECTADA' : '✅ Coincide'}`)

    // Intentar actualizar si hay inconsistencia
    if (calculatedConfidence !== resource.confidence) {
      console.log(`\n🔄 Actualizando confidence...`)
      
      const updated = await payload.update({
        collection: 'resources',
        id: resourceId,
        data: { confidence: calculatedConfidence },
        overrideAccess: true,
      })
      
      console.log(`✅ Actualizado: ${resource.confidence} → ${updated.confidence}`)
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error en debug:', error)
    process.exit(1)
  }
}

debugSpecificResource()
