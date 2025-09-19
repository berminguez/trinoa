#!/usr/bin/env tsx
/**
 * Script simplificado de migración para crear empresas desde datos legacy
 * Conecta directamente a MongoDB sin cargar toda la configuración de Payload
 */

import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config({ path: 'test.env' })

const MONGODB_URI = process.env.DATABASE_URI || process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ DATABASE_URI no encontrada en .env')
  process.exit(1)
}

async function migrateEmpresasSimple() {
  const client = new MongoClient(MONGODB_URI!)

  console.log('🚀 Iniciando migración simple de empresas...')
  console.log('🔗 Conectando a MongoDB...')

  try {
    await client.connect()
    const db = client.db()

    // 1. Obtener todos los usuarios
    console.log('📋 Obteniendo usuarios...')
    const users = await db.collection('users').find({}).toArray()
    console.log(`📊 Encontrados ${users.length} usuarios`)

    // 2. Extraer empresas únicas
    const empresasUnicas = new Set<string>()
    users.forEach((user) => {
      if (user.empresa && typeof user.empresa === 'string' && user.empresa.trim()) {
        empresasUnicas.add(user.empresa.trim())
      }
    })

    console.log(`🏢 Encontradas ${empresasUnicas.size} empresas únicas:`)
    Array.from(empresasUnicas).forEach((empresa) => console.log(`  - ${empresa}`))

    // 3. Verificar si ya existen empresas
    const existingCompanies = await db.collection('companies').find({}).toArray()
    console.log(`📋 Empresas existentes: ${existingCompanies.length}`)

    const existingNames = new Set(existingCompanies.map((c) => c.name))
    const empresasToCreate = Array.from(empresasUnicas).filter((name) => !existingNames.has(name))

    console.log(`🆕 Empresas nuevas a crear: ${empresasToCreate.length}`)

    // 4. Crear empresas nuevas
    if (empresasToCreate.length > 0) {
      const empresasData = empresasToCreate.map((nombre) => ({
        name: nombre,
        cif: `MIGRATED-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      const result = await db.collection('companies').insertMany(empresasData)
      console.log(`✅ ${result.insertedCount} empresas creadas`)

      empresasData.forEach((empresa) => {
        console.log(`  🏢 "${empresa.name}" creada con CIF: ${empresa.cif}`)
      })
    }

    // 5. Mostrar resumen final
    const finalCompanies = await db.collection('companies').find({}).toArray()
    console.log('📊 Resumen final:')
    console.log(`  - ${finalCompanies.length} empresas totales en la base de datos`)
    console.log(`  - ${empresasUnicas.size} empresas únicas encontradas en usuarios`)
    console.log(`  - ${empresasToCreate.length} empresas nuevas creadas`)

    console.log('')
    console.log('✅ Paso 1 completado: Empresas creadas')
    console.log('👉 Siguiente paso: Cambiar campo empresa a relationship en Users.ts')
  } catch (error) {
    console.error('💥 Error durante la migración:', error)
    process.exit(1)
  } finally {
    await client.close()
    console.log('🔌 Conexión cerrada')
    process.exit(0)
  }
}

migrateEmpresasSimple().catch((error) => {
  console.error('💥 Error fatal:', error)
  process.exit(1)
})


