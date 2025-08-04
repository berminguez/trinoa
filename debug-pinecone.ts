#!/usr/bin/env tsx

/**
 * DEBUG SCRIPT: Investigar por qué query-videos no devuelve resultados
 *
 * Uso: tsx debug-pinecone.ts
 */

import { config } from 'dotenv'
// Cargar variables de entorno desde .env
config()

import { getPayload } from 'payload'
import payloadConfig from './src/payload.config'
import { PineconeManager } from './src/lib/pinecone'
import type { Resource } from './src/payload-types'

const VIDEO_ID = '688a218eeca026b7ad7e4adc' // El ID que estás probando

async function debugPineconeQuery() {
  console.log('🔍 DEBUGGING PINECONE QUERY')
  console.log('===========================')
  console.log(`Testing video ID: ${VIDEO_ID}`)
  console.log('')

  // Verificar variables de entorno
  console.log('🔧 Environment variables:')
  console.log(`   PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? 'SET' : 'NOT SET'}`)
  console.log(
    `   PINECONE_INDEX_NAME: ${process.env.PINECONE_INDEX_NAME || 'resources-chunks (default)'}`,
  )
  console.log(`   PINECONE_ENVIRONMENT: ${process.env.PINECONE_ENVIRONMENT || 'NOT SET'}`)
  console.log('')

  try {
    // 1. Verificar que el video existe en PayloadCMS
    console.log('📋 Step 1: Checking video exists in PayloadCMS...')
    const payload = await getPayload({ config: payloadConfig })

    const videoQuery = await payload.find({
      collection: 'resources',
      where: {
        id: { equals: VIDEO_ID },
        type: { equals: 'video' },
      },
      depth: 2,
    })

    if (videoQuery.docs.length === 0) {
      console.log('❌ Video NOT found in PayloadCMS!')
      return
    }

    const video = videoQuery.docs[0] as Resource
    console.log('✅ Video found in PayloadCMS:')
    console.log(`   - Title: ${video.title}`)
    console.log(`   - Type: ${video.type}`)
    console.log(`   - Status: ${video.status}`)
    console.log(
      `   - Project: ${typeof video.project === 'object' ? video.project.id : video.project}`,
    )
    console.log(`   - Namespace: ${video.namespace || 'default'}`)
    console.log('')

    // 2. Verificar vectores en Pinecone por resourceId
    console.log('🔍 Step 2: Checking vectors in Pinecone by resourceId...')
    await PineconeManager.initialize()

    // Probar con namespace específico si existe
    const namespace = video.namespace
    const vectorsWithNamespace = namespace
      ? await PineconeManager.getVectorsByResourceId(VIDEO_ID, namespace)
      : await PineconeManager.getVectorsByResourceId(VIDEO_ID)

    console.log(`✅ Found ${vectorsWithNamespace.length} vectors for resourceId: ${VIDEO_ID}`)

    if (vectorsWithNamespace.length > 0) {
      const firstVector = vectorsWithNamespace[0]
      console.log('   Sample vector:')
      console.log(`   - ID: ${firstVector.id}`)
      console.log(`   - Dimensions: ${firstVector.values?.length || 0}`)
      console.log(`   - Metadata resourceId: ${firstVector.metadata?.resourceId}`)
      console.log(`   - Metadata namespace: ${firstVector.metadata?.namespace}`)
      console.log(`   - Metadata type: ${firstVector.metadata?.type}`)
      console.log(`   - Metadata chunkIndex: ${firstVector.metadata?.chunkIndex}`)
      console.log('')
    } else {
      console.log('❌ No vectors found for this resourceId!')

      // 3. Verificar si hay vectores en el namespace en general
      if (namespace) {
        console.log(`🔍 Step 3: Checking all vectors in namespace: ${namespace}...`)
        const namespacedVectors = await PineconeManager.getVectorsByNamespace(namespace, 10)
        console.log(`   Found ${namespacedVectors.length} vectors in namespace`)

        if (namespacedVectors.length > 0) {
          console.log('   Sample vectors in namespace:')
          namespacedVectors.slice(0, 3).forEach((v, i) => {
            console.log(`   ${i + 1}. ID: ${v.id}, resourceId: ${v.metadata?.resourceId}`)
          })
        }
      }
      return
    }

    // 4. Probar query con filtro real
    console.log('🧪 Step 4: Testing actual query with filter...')

    // Crear un embedding dummy para probar (mismas dimensiones que el generador)
    const EXPECTED_DIMENSIONS = 1024 // Del generator.ts
    const dummyEmbedding = new Array(EXPECTED_DIMENSIONS).fill(0.1)

    console.log(`   Using embedding with ${dummyEmbedding.length} dimensions`)

    // Probar query con filtro resourceId
    const queryResults = await PineconeManager.queryVectors(
      dummyEmbedding,
      50,
      {
        resourceId: { $in: [VIDEO_ID] },
      },
      undefined, // Sin namespace específico para replicar el endpoint
    )

    console.log(`✅ Query with resourceId filter returned ${queryResults.length} results`)

    if (queryResults.length > 0) {
      console.log('   Query successful! Sample results:')
      queryResults.slice(0, 3).forEach((result, i) => {
        console.log(`   ${i + 1}. ID: ${result.id}, resourceId: ${result.metadata?.resourceId}`)
      })
    } else {
      console.log('❌ Query returned no results even though vectors exist!')

      // 5. Verificar dimensiones de los vectores existentes
      console.log('🔍 Step 5: Checking vector dimensions...')
      if (vectorsWithNamespace.length > 0) {
        const vectorDimensions = vectorsWithNamespace[0].values?.length || 0
        console.log(`   Stored vectors have ${vectorDimensions} dimensions`)
        console.log(`   Query embedding has ${dummyEmbedding.length} dimensions`)

        if (vectorDimensions !== dummyEmbedding.length) {
          console.log('❌ DIMENSION MISMATCH! This could be the problem.')
        }
      }
    }
  } catch (error) {
    console.error('❌ Error during debugging:', error)
  }
}

// Ejecutar el debug
debugPineconeQuery().catch(console.error)
