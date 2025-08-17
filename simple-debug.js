const { MongoClient } = require('mongodb')

async function debugMongoDB() {
  const uri =
    process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/trinoa'

  console.log('🔍 Conectando a MongoDB...')

  try {
    const client = new MongoClient(uri)
    await client.connect()

    const db = client.db()

    // Buscar recursos con status completed pero confidence empty
    console.log('\n📊 Buscando recursos con status completed pero confidence empty...')

    const resources = await db
      .collection('resources')
      .find({
        status: 'completed',
        confidence: 'empty',
      })
      .limit(5)
      .toArray()

    console.log(`\nEncontrados ${resources.length} recursos con problemas:`)

    for (const resource of resources) {
      console.log(`\n📄 Recurso: ${resource._id}`)
      console.log(`   Título: ${resource.title || 'Sin título'}`)
      console.log(`   Status: ${resource.status}`)
      console.log(`   Confidence: ${resource.confidence}`)

      // Verificar analyzeResult
      if (resource.analyzeResult) {
        if (resource.analyzeResult.fields) {
          const fieldNames = Object.keys(resource.analyzeResult.fields)
          console.log(`   📋 Campos en analyzeResult: ${fieldNames.length}`)

          if (fieldNames.length > 0) {
            // Mostrar ejemplo de campo
            const firstField = resource.analyzeResult.fields[fieldNames[0]]
            console.log(`   📝 Ejemplo campo "${fieldNames[0]}":`)
            console.log(`      - confidence: ${firstField.confidence}`)
            console.log(`      - manual: ${firstField.manual}`)
            console.log(`      - value: ${firstField.valueString || firstField.content}`)
          }
        } else {
          console.log(`   ❌ analyzeResult existe pero sin fields`)
        }
      } else {
        console.log(`   ❌ No tiene analyzeResult`)
      }
    }

    // Verificar configuración global
    console.log('\n⚙️ Verificando configuración global...')
    const config = await db.collection('globals').findOne({ globalType: 'configuracion' })

    if (config && config.confidenceSettings) {
      console.log(`   Threshold configurado: ${config.confidenceSettings.confidenceThreshold}%`)
    } else {
      console.log(`   ❌ No hay configuración de confidence`)
    }

    await client.close()
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

debugMongoDB()
