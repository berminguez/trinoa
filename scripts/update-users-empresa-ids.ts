#!/usr/bin/env tsx
/**
 * Script PARTE 2: Actualizar usuarios para usar IDs de empresas
 * 
 * ⚠️ IMPORTANTE: Ejecutar SOLO después de:
 * 1. Ejecutar migrate-empresa-to-companies.ts
 * 2. Cambiar el campo 'empresa' de 'text' a 'relationship' en Users.ts
 * 3. Regenerar tipos con: pnpm payload generate:types
 * 
 * Este script actualiza todos los usuarios para usar IDs de empresas
 * en lugar de nombres de texto.
 * 
 * Uso: pnpm tsx scripts/update-users-empresa-ids.ts
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

async function updateUsersEmpresaIds() {
  const payload = await getPayload({ config })
  
  console.log('🚀 Iniciando actualización de usuarios con IDs de empresas...')
  
  try {
    // 1. Obtener todas las empresas para mapeo
    console.log('📋 Obteniendo todas las empresas...')
    const allCompanies = await payload.find({
      collection: 'companies',
      limit: 0
    })
    
    const empresaMap: { [nombre: string]: string } = {}
    allCompanies.docs.forEach(company => {
      empresaMap[company.name] = company.id
    })
    
    console.log(`🏢 Encontradas ${allCompanies.docs.length} empresas`)
    
    // 2. Obtener usuarios con empresa como texto
    console.log('👥 Obteniendo usuarios...')
    const allUsers = await payload.find({
      collection: 'users',
      limit: 0,
      depth: 0
    })
    
    // 3. Filtrar usuarios que necesitan migración
    const usersToUpdate = allUsers.docs.filter(user => 
      user.empresa && 
      typeof user.empresa === 'string' && 
      empresaMap[user.empresa.trim()]
    )
    
    console.log(`📊 ${usersToUpdate.length} usuarios necesitan actualización`)
    
    // 4. Actualizar usuarios uno por uno
    let successCount = 0
    let errorCount = 0
    
    for (const user of usersToUpdate) {
      try {
        const empresaNombre = (user.empresa as string).trim()
        const empresaId = empresaMap[empresaNombre]
        
        if (!empresaId) {
          console.error(`  ❌ No se encontró ID para empresa: "${empresaNombre}"`)
          errorCount++
          continue
        }
        
        await payload.update({
          collection: 'users',
          id: user.id,
          data: {
            empresa: empresaId
          }
        })
        
        console.log(`  ✅ Usuario ${user.email} -> empresa "${empresaNombre}" (${empresaId})`)
        successCount++
        
      } catch (error) {
        console.error(`  ❌ Error actualizando usuario ${user.email}:`, error)
        errorCount++
      }
    }
    
    console.log('✅ Migración de usuarios completada')
    console.log('📋 Resumen:')
    console.log(`  - ${successCount} usuarios actualizados exitosamente`)
    console.log(`  - ${errorCount} errores`)
    console.log(`  - ${allUsers.docs.length - usersToUpdate.length} usuarios sin cambios`)
    
    if (errorCount === 0) {
      console.log('🎉 ¡Migración completada sin errores!')
    }
    
  } catch (error) {
    console.error('💥 Error durante la migración:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

// Ejecutar migración
updateUsersEmpresaIds().catch(error => {
  console.error('💥 Error fatal:', error)
  process.exit(1)
})
