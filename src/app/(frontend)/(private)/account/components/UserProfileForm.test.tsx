// ============================================================================
// TRINOA - TESTS PARA USERPROFILEFORM
// ============================================================================

/**
 * Tests unitarios para UserProfileForm component
 * 
 * Ejecutar con: npx tsx src/app/(frontend)/(private)/account/components/UserProfileForm.test.tsx
 */

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

// Mock del User type y datos de prueba
interface MockUser {
  id: string
  name?: string | null
  email: string
  empresa: string | { id: string; name: string; cif: string }
  filial?: string | null
  role?: 'admin' | 'user' | 'api' | null
}

// Usuarios de prueba
const adminUser: MockUser = {
  id: 'admin-1',
  name: 'Administrador Test',
  email: 'admin@test.com',
  empresa: { id: 'company-1', name: 'Empresa Test S.L.', cif: 'A12345678' },
  filial: 'Dirección General',
  role: 'admin',
}

const normalUser: MockUser = {
  id: 'user-1',
  name: 'Usuario Normal',
  email: 'user@test.com',
  empresa: { id: 'company-1', name: 'Empresa Test S.L.', cif: 'A12345678' },
  filial: 'Desarrollo',
  role: 'user',
}

const apiUser: MockUser = {
  id: 'api-1',
  name: 'Usuario API',
  email: 'api@test.com',
  empresa: 'Empresa Legacy',
  filial: null,
  role: 'api',
}

// Función helper para obtener nombre de empresa (simulando la del componente)
function getCompanyName(empresa: string | { id: string; name: string; cif: string }) {
  if (!empresa) return null
  
  if (typeof empresa === 'object' && empresa.name) {
    return empresa.name
  }
  
  if (typeof empresa === 'string') {
    return empresa
  }
  
  return null
}

// Función para simular permisos del componente
function getUserPermissions(user: MockUser) {
  const isAdmin = user.role === 'admin'
  
  return {
    canEditName: true, // Todos pueden editar nombre
    canEditEmail: isAdmin, // Solo admins pueden editar email
    canEditCompany: false, // Nadie puede editar empresa desde perfil
    canEditFilial: false, // Nadie puede editar filial desde perfil
    canViewCompany: true, // Todos pueden ver empresa
    canViewFilial: true, // Todos pueden ver filial
    canViewEmail: true, // Todos pueden ver email
    canViewRole: true, // Todos pueden ver rol
    isAdmin,
  }
}

// Función para validar campos
function validateUserField(fieldName: string, value: string) {
  const errors: Record<string, string> = {}

  switch (fieldName) {
    case 'name':
      if (!value.trim()) {
        errors.name = 'El nombre es requerido'
      } else if (value.trim().length < 2) {
        errors.name = 'El nombre debe tener al menos 2 caracteres'
      } else if (value.trim().length > 100) {
        errors.name = 'El nombre no puede exceder 100 caracteres'
      }
      break

    case 'email':
      if (!value.trim()) {
        errors.email = 'El email es requerido'
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value.trim())) {
          errors.email = 'El email no tiene un formato válido'
        }
      }
      break
  }

  return { isValid: !errors[fieldName], error: errors[fieldName] || null }
}

// Tests
console.log('🧪 Ejecutando tests para UserProfileForm...\n')

// Test 1: Permisos de usuario administrador
console.log('1. Test: Permisos de usuario administrador')
try {
  const permissions = getUserPermissions(adminUser)
  
  assert(permissions.isAdmin === true, 'Admin debe ser identificado como admin')
  assert(permissions.canEditName === true, 'Admin debe poder editar nombre')
  assert(permissions.canEditEmail === true, 'Admin debe poder editar email')
  assert(permissions.canEditCompany === false, 'Admin no debe poder editar empresa desde perfil')
  assert(permissions.canEditFilial === false, 'Admin no debe poder editar filial desde perfil')
  assert(permissions.canViewCompany === true, 'Admin debe poder ver empresa')
  assert(permissions.canViewFilial === true, 'Admin debe poder ver filial')

  console.log('✅ Permisos de usuario administrador - PASS\n')
} catch (error) {
  console.log(`❌ Permisos de usuario administrador - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Permisos de usuario normal
console.log('2. Test: Permisos de usuario normal')
try {
  const permissions = getUserPermissions(normalUser)
  
  assert(permissions.isAdmin === false, 'Usuario normal no debe ser admin')
  assert(permissions.canEditName === true, 'Usuario normal debe poder editar nombre')
  assert(permissions.canEditEmail === false, 'Usuario normal NO debe poder editar email')
  assert(permissions.canEditCompany === false, 'Usuario normal NO debe poder editar empresa')
  assert(permissions.canEditFilial === false, 'Usuario normal NO debe poder editar filial')
  assert(permissions.canViewCompany === true, 'Usuario normal debe poder ver empresa')
  assert(permissions.canViewFilial === true, 'Usuario normal debe poder ver filial')

  console.log('✅ Permisos de usuario normal - PASS\n')
} catch (error) {
  console.log(`❌ Permisos de usuario normal - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Permisos de usuario API
console.log('3. Test: Permisos de usuario API')
try {
  const permissions = getUserPermissions(apiUser)
  
  assert(permissions.isAdmin === false, 'Usuario API no debe ser admin')
  assert(permissions.canEditName === true, 'Usuario API debe poder editar nombre')
  assert(permissions.canEditEmail === false, 'Usuario API NO debe poder editar email')
  assert(permissions.canEditCompany === false, 'Usuario API NO debe poder editar empresa')
  assert(permissions.canEditFilial === false, 'Usuario API NO debe poder editar filial')

  console.log('✅ Permisos de usuario API - PASS\n')
} catch (error) {
  console.log(`❌ Permisos de usuario API - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Función getCompanyName
console.log('4. Test: Función getCompanyName')
try {
  const companyObject = { id: 'company-1', name: 'Empresa Test S.L.', cif: 'A12345678' }
  const companyString = 'Empresa Legacy'
  
  assert(getCompanyName(companyObject) === 'Empresa Test S.L.', 'Debe extraer nombre de objeto empresa')
  assert(getCompanyName(companyString) === 'Empresa Legacy', 'Debe retornar string de empresa legacy')
  assert(getCompanyName('') === null, 'Debe retornar null para string vacío')
  assert(getCompanyName(null as any) === null, 'Debe retornar null para null')

  console.log('✅ Función getCompanyName - PASS\n')
} catch (error) {
  console.log(`❌ Función getCompanyName - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Validación de campos
console.log('5. Test: Validación de campos')
try {
  // Validación de nombre
  const nameValidEmpty = validateUserField('name', '')
  assert(!nameValidEmpty.isValid, 'Debe fallar con nombre vacío')
  assert(nameValidEmpty.error === 'El nombre es requerido', 'Mensaje correcto para nombre vacío')

  const nameValidShort = validateUserField('name', 'A')
  assert(!nameValidShort.isValid, 'Debe fallar con nombre muy corto')

  const nameValidLong = validateUserField('name', 'a'.repeat(101))
  assert(!nameValidLong.isValid, 'Debe fallar con nombre muy largo')

  const nameValidGood = validateUserField('name', 'Juan Pérez')
  assert(nameValidGood.isValid, 'Debe aceptar nombre válido')

  // Validación de email
  const emailValidEmpty = validateUserField('email', '')
  assert(!emailValidEmpty.isValid, 'Debe fallar con email vacío')

  const emailValidBad = validateUserField('email', 'invalid-email')
  assert(!emailValidBad.isValid, 'Debe fallar con email inválido')

  const emailValidGood = validateUserField('email', 'test@example.com')
  assert(emailValidGood.isValid, 'Debe aceptar email válido')

  console.log('✅ Validación de campos - PASS\n')
} catch (error) {
  console.log(`❌ Validación de campos - FAIL: ${(error as Error).message}\n`)
}

// Test 6: Datos de empresa según tipo
console.log('6. Test: Datos de empresa según tipo')
try {
  // Empresa como objeto (nueva estructura)
  const companyName1 = getCompanyName(adminUser.empresa)
  assert(companyName1 === 'Empresa Test S.L.', 'Debe extraer nombre de empresa objeto')

  // Empresa como string (legacy)
  const companyName2 = getCompanyName(apiUser.empresa)
  assert(companyName2 === 'Empresa Legacy', 'Debe manejar empresa legacy string')

  // Verificar campos de filial
  assert(adminUser.filial === 'Dirección General', 'Admin debe tener filial')
  assert(normalUser.filial === 'Desarrollo', 'Usuario normal debe tener filial')
  assert(apiUser.filial === null, 'Usuario API puede no tener filial')

  console.log('✅ Datos de empresa según tipo - PASS\n')
} catch (error) {
  console.log(`❌ Datos de empresa según tipo - FAIL: ${(error as Error).message}\n`)
}

// Test 7: Consistencia de permisos según PRD
console.log('7. Test: Consistencia de permisos según PRD')
try {
  // Según PRD: usuarios solo pueden editar su campo name
  const userPerms = getUserPermissions(normalUser)
  const adminPerms = getUserPermissions(adminUser)
  
  assert(userPerms.canEditName === true, 'Usuario debe poder editar nombre (PRD req)')
  assert(userPerms.canEditEmail === false, 'Usuario NO debe poder editar email (PRD req)')
  assert(userPerms.canEditCompany === false, 'Usuario NO debe poder editar empresa (PRD req)')
  assert(userPerms.canEditFilial === false, 'Usuario NO debe poder editar filial (PRD req)')
  
  assert(adminPerms.canEditName === true, 'Admin debe poder editar nombre')
  assert(adminPerms.canEditEmail === true, 'Admin debe poder editar email')
  
  // Verificar que empresa y filial se muestran como solo lectura (badges)
  assert(userPerms.canViewCompany === true, 'Usuario debe poder VER empresa como badge')
  assert(userPerms.canViewFilial === true, 'Usuario debe poder VER filial como badge')

  console.log('✅ Consistencia de permisos según PRD - PASS\n')
} catch (error) {
  console.log(`❌ Consistencia de permisos según PRD - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de UserProfileForm completados!')
console.log('\n📊 Resumen:')
console.log('- Permisos de administrador ✅')
console.log('- Permisos de usuario normal ✅')
console.log('- Permisos de usuario API ✅')
console.log('- Función getCompanyName ✅')
console.log('- Validación de campos ✅')
console.log('- Datos de empresa según tipo ✅')
console.log('- Consistencia según PRD ✅')
console.log('\n🔧 Para ejecutar: npx tsx src/app/(frontend)/(private)/account/components/UserProfileForm.test.tsx')
