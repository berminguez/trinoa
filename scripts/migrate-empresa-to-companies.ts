#!/usr/bin/env tsx
/**
 * Script de migración para convertir campo 'empresa' de texto a relación con Companies
 * 
 * Este script:
 * 1. Lee todos los usuarios existentes
 * 2. Extrae valores únicos del campo 'empresa'
 * 3. Crea empresas correspondientes en la colección 'companies'
 * 4. Actualiza los usuarios para usar IDs de empresas en lugar de texto
 * 
 * Uso: pnpm tsx scripts/migrate-empresa-to-companies.ts
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

async function migrateEmpresaToCompanies() {
  const payload = await getPayload({ config })
  
  console.log('🚀 Iniciando migración de empresas...')
  
  try {
    // 1. Obtener todos los usuarios
    console.log('📋 Obteniendo todos los usuarios...')
    const allUsers = await payload.find({
      collection: 'users',
      limit: 0, // Sin límite para obtener todos
      depth: 0
    })
    
    console.log(`📊 Encontrados ${allUsers.docs.length} usuarios`)
    
    // 2. Extraer valores únicos de empresa
    const empresasUnicas = new Set<string>()
    const userEmpresaMap: { userId: string; empresa: string }[] = []
    
    allUsers.docs.forEach(user => {
      if (user.empresa && typeof user.empresa === 'string' && user.empresa.trim()) {
        const empresaNombre = user.empresa.trim()
        empresasUnicas.add(empresaNombre)
        userEmpresaMap.push({ userId: user.id, empresa: empresaNombre })
      }
    })
    
    console.log(`🏢 Encontradas ${empresasUnicas.size} empresas únicas:`)
    Array.from(empresasUnicas).forEach(empresa => console.log(`  - ${empresa}`))
    
    // 3. Crear empresas en la colección companies
    console.log('🏗️ Creando empresas en la colección Companies...')
    const empresaIdMap: { [nombre: string]: string } = {}
    
    for (const empresaNombre of empresasUnicas) {
      try {
        // Verificar si ya existe
        const existingCompany = await payload.find({
          collection: 'companies',
          where: {
            name: { equals: empresaNombre }
          },
          limit: 1
        })
        
        if (existingCompany.docs.length > 0) {
          empresaIdMap[empresaNombre] = existingCompany.docs[0].id
          console.log(`  ✅ Empresa "${empresaNombre}" ya existe (ID: ${existingCompany.docs[0].id})`)
        } else {
          // Crear nueva empresa
          const newCompany = await payload.create({
            collection: 'companies',
            data: {
              name: empresaNombre,
              cif: `MIGRATED-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
            }
          })
          empresaIdMap[empresaNombre] = newCompany.id
          console.log(`  🆕 Empresa "${empresaNombre}" creada (ID: ${newCompany.id})`)
        }
      } catch (error) {
        console.error(`  ❌ Error creando empresa "${empresaNombre}":`, error)
      }
    }
    
    // 4. Actualizar usuarios (manteniendo empresas como texto por ahora)
    console.log('👥 Preparando datos para migración de usuarios...')
    console.log(`📝 Se actualizarán ${userEmpresaMap.length} usuarios`)
    
    // Mostrar mapeo para verificación
    console.log('🗺️ Mapeo empresa -> ID:')
    Object.entries(empresaIdMap).forEach(([nombre, id]) => {
      const usuariosConEstaEmpresa = userEmpresaMap.filter(u => u.empresa === nombre).length
      console.log(`  "${nombre}" -> ${id} (${usuariosConEstaEmpresa} usuarios)`)
    })
    
    console.log('✅ Migración de empresas completada')
    console.log('📋 Resumen:')
    console.log(`  - ${empresasUnicas.size} empresas únicas procesadas`)
    console.log(`  - ${Object.keys(empresaIdMap).length} empresas creadas/encontradas`)
    console.log(`  - ${userEmpresaMap.length} usuarios listos para migración`)
    console.log('')
    console.log('⚠️  IMPORTANTE:')
    console.log('   1. Los usuarios mantienen empresa como texto por ahora')
    console.log('   2. Para completar la migración, necesitas:')
    console.log('      a. Cambiar el campo "empresa" de tipo "text" a "relationship"')
    console.log('      b. Ejecutar el script de actualización de usuarios')
    console.log('      c. Regenerar tipos con: pnpm payload generate:types')
    
  } catch (error) {
    console.error('💥 Error durante la migración:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

// Ejecutar migración
migrateEmpresaToCompanies().catch(error => {
  console.error('💥 Error fatal:', error)
  process.exit(1)
})
