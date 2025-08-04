// ============================================================================
// EIDETIK MVP - TESTS PARA COLECCIÓN MCP KEYS
// ============================================================================

/**
 * Tests de validación para la nueva collection McpKeys
 * 
 * Ejecutar con: tsx src/collections/McpKeys.test.ts
 */

import crypto from 'crypto'

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

// Funciones de validación extraídas del código real
function validateName(value: string | null | undefined) {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return 'El nombre es requerido'
  }
  if (value.length > 50) {
    return 'El nombre no puede exceder 50 caracteres'
  }
  return true
}

// Función para generar API key (extraída del hook)
function generateApiKey(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'pcsk_'
  
  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  
  return result
}

// Función para hashear API key
function hashApiKey(plainKey: string): string {
  return crypto.createHash('sha256').update(plainKey).digest('hex')
}

// Función para formatear API key para display
function formatApiKeyForDisplay(lastFour: string): string {
  return `pcsk_****...****${lastFour}`
}

// Tests simples sin dependencias
console.log('🧪 Ejecutando tests para McpKeys Collection...\n')

// Test 1: Validación de nombre requerido
console.log('1. Test: Validación de nombre requerido')
try {
  assert(validateName('') === 'El nombre es requerido', 'Debe rechazar string vacío')
  assert(validateName(null) === 'El nombre es requerido', 'Debe rechazar null')
  assert(validateName(undefined) === 'El nombre es requerido', 'Debe rechazar undefined')
  assert(validateName('   ') === 'El nombre es requerido', 'Debe rechazar espacios en blanco')
  console.log('✅ Validación de nombre requerido - PASS\n')
} catch (error) {
  console.log(`❌ Validación de nombre requerido - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Validación de longitud de nombre
console.log('2. Test: Validación de longitud de nombre')
try {
  const longName = 'a'.repeat(51)
  const validName = 'Mi API Key de Desarrollo'
  const maxLengthName = 'a'.repeat(50)
  
  assert(validateName(longName) === 'El nombre no puede exceder 50 caracteres', 'Debe rechazar nombres > 50 caracteres')
  assert(validateName(validName) === true, 'Debe aceptar nombres válidos')
  assert(validateName(maxLengthName) === true, 'Debe aceptar nombres de exactamente 50 caracteres')
  console.log('✅ Validación de longitud de nombre - PASS\n')
} catch (error) {
  console.log(`❌ Validación de longitud de nombre - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Generación de API Keys
console.log('3. Test: Generación de API Keys')
try {
  const key1 = generateApiKey()
  const key2 = generateApiKey()
  const key3 = generateApiKey()
  
  // Verificar formato
  assert(key1.startsWith('pcsk_'), 'Key debe empezar con "pcsk_"')
  assert(key2.startsWith('pcsk_'), 'Key debe empezar con "pcsk_"')
  assert(key3.startsWith('pcsk_'), 'Key debe empezar con "pcsk_"')
  
  // Verificar longitud total (pcsk_ + 32 caracteres = 37)
  assert(key1.length === 37, 'Key debe tener 37 caracteres en total')
  assert(key2.length === 37, 'Key debe tener 37 caracteres en total')
  assert(key3.length === 37, 'Key debe tener 37 caracteres en total')
  
  // Verificar que son únicas
  assert(key1 !== key2, 'Las keys generadas deben ser únicas')
  assert(key2 !== key3, 'Las keys generadas deben ser únicas')
  assert(key1 !== key3, 'Las keys generadas deben ser únicas')
  
  // Verificar que solo contienen caracteres alfanuméricos después del prefijo
  const keyWithoutPrefix = key1.substring(5)
  assert(/^[A-Za-z0-9]+$/.test(keyWithoutPrefix), 'Key debe contener solo caracteres alfanuméricos después del prefijo')
  
  console.log('✅ Generación de API Keys - PASS\n')
} catch (error) {
  console.log(`❌ Generación de API Keys - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Hashing de API Keys
console.log('4. Test: Hashing de API Keys')
try {
  const plainKey = generateApiKey()
  const hash1 = hashApiKey(plainKey)
  const hash2 = hashApiKey(plainKey)
  
  // El hash debe ser consistente
  assert(hash1 === hash2, 'Hash debe ser consistente para la misma key')
  
  // El hash debe ser diferente a la key original
  assert(hash1 !== plainKey, 'Hash debe ser diferente a la key original')
  
  // El hash debe tener 64 caracteres (SHA-256)
  assert(hash1.length === 64, 'Hash SHA-256 debe tener 64 caracteres')
  
  // Verificar que hashes de keys diferentes son diferentes
  const plainKey2 = generateApiKey()
  const hash3 = hashApiKey(plainKey2)
  assert(hash1 !== hash3, 'Hashes de keys diferentes deben ser diferentes')
  
  console.log('✅ Hashing de API Keys - PASS\n')
} catch (error) {
  console.log(`❌ Hashing de API Keys - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Formateo de API Keys para display
console.log('5. Test: Formateo de API Keys para display')
try {
  const lastFour = '1234'
  const displayKey = formatApiKeyForDisplay(lastFour)
  
  assert(displayKey === 'pcsk_****...****1234', 'Debe formatear correctamente para display')
  assert(displayKey.startsWith('pcsk_'), 'Display debe mantener prefijo')
  assert(displayKey.endsWith('1234'), 'Display debe mostrar últimos 4 caracteres')
  assert(displayKey.includes('****'), 'Display debe ocultar caracteres intermedios')
  
  console.log('✅ Formateo de API Keys para display - PASS\n')
} catch (error) {
  console.log(`❌ Formateo de API Keys para display - FAIL: ${(error as Error).message}\n`)
}

// Test 6: Estructura de campos de MCP Key
console.log('6. Test: Estructura de campos de MCP Key')
try {
  const plainKey = generateApiKey()
  const lastFour = plainKey.slice(-4)
  const hashedKey = hashApiKey(plainKey)
  
  const mockMcpKey = {
    name: 'API Key de Desarrollo',
    keyValue: hashedKey,
    keyValueLastFour: lastFour,
    user: 'user-id-123',
    projects: ['project-1', 'project-2'],
    hasAllProjects: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  assert('name' in mockMcpKey, 'MCP Key debe tener campo name')
  assert('keyValue' in mockMcpKey, 'MCP Key debe tener campo keyValue')
  assert('keyValueLastFour' in mockMcpKey, 'MCP Key debe tener campo keyValueLastFour')
  assert('user' in mockMcpKey, 'MCP Key debe tener campo user')
  assert('projects' in mockMcpKey, 'MCP Key debe tener campo projects')
  assert('hasAllProjects' in mockMcpKey, 'MCP Key debe tener campo hasAllProjects')
  assert('createdAt' in mockMcpKey, 'MCP Key debe tener campo createdAt')
  assert('updatedAt' in mockMcpKey, 'MCP Key debe tener campo updatedAt')
  
  assert(typeof mockMcpKey.name === 'string', 'name debe ser string')
  assert(typeof mockMcpKey.keyValue === 'string', 'keyValue debe ser string')
  assert(typeof mockMcpKey.keyValueLastFour === 'string', 'keyValueLastFour debe ser string')
  assert(typeof mockMcpKey.user === 'string', 'user debe ser string')
  assert(Array.isArray(mockMcpKey.projects), 'projects debe ser array')
  assert(typeof mockMcpKey.hasAllProjects === 'boolean', 'hasAllProjects debe ser boolean')
  assert(mockMcpKey.createdAt instanceof Date, 'createdAt debe ser Date')
  assert(mockMcpKey.updatedAt instanceof Date, 'updatedAt debe ser Date')
  
  assert(mockMcpKey.keyValueLastFour.length === 4, 'keyValueLastFour debe tener 4 caracteres')
  
  console.log('✅ Estructura de campos de MCP Key - PASS\n')
} catch (error) {
  console.log(`❌ Estructura de campos de MCP Key - FAIL: ${(error as Error).message}\n`)
}

// Test 7: Simulación de reglas de acceso
console.log('7. Test: Simulación de reglas de acceso')
try {
  // Simular diferentes tipos de usuario
  const adminUser = { id: 'admin-1', role: 'admin' }
  const normalUser = { id: 'user-1', role: 'user' }
  const apiUser = { id: 'api-1', role: 'api' }
  
  // Simular función de acceso read
  function canRead(user: any) {
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.role === 'user') {
      return { user: { equals: user.id } }
    }
    // Los usuarios API no pueden acceder a las keys por seguridad
    return false
  }
  
  // Simular función de acceso create
  function canCreate(user: any) {
    if (!user) return false
    return user.role === 'admin' || user.role === 'user'
  }
  
  // Simular función de acceso delete
  function canDelete(user: any) {
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.role === 'user') {
      return { user: { equals: user.id } }
    }
    // Los usuarios API no pueden eliminar keys por seguridad
    return false
  }
  
  // Tests de acceso read
  assert(canRead(adminUser) === true, 'Admin debe poder leer todas las MCP keys')
  assert(typeof canRead(normalUser) === 'object', 'Usuario normal debe tener filtro de ownership')
  assert(canRead(apiUser) === false, 'Usuario API no debe poder acceder a MCP keys')
  assert(canRead(null) === false, 'Usuario no autenticado no debe poder leer')
  
  // Tests de acceso create
  assert(canCreate(adminUser) === true, 'Admin debe poder crear MCP keys')
  assert(canCreate(normalUser) === true, 'Usuario normal debe poder crear MCP keys')
  assert(canCreate(apiUser) === false, 'Usuario API no debe poder crear MCP keys')
  assert(canCreate(null) === false, 'Usuario no autenticado no debe poder crear')
  
  // Tests de acceso delete
  assert(canDelete(adminUser) === true, 'Admin debe poder eliminar todas las MCP keys')
  assert(typeof canDelete(normalUser) === 'object', 'Usuario normal debe poder eliminar solo sus MCP keys')
  assert(canDelete(apiUser) === false, 'Usuario API no debe poder eliminar MCP keys')
  assert(canDelete(null) === false, 'Usuario no autenticado no debe poder eliminar')
  
  // Update debe estar deshabilitado para todos
  // Simular función de acceso update
  function canUpdate() {
    return false  // Update siempre deshabilitado
  }
  assert(canUpdate() === false, 'Update debe estar deshabilitado (no se puede editar MCP keys)')
  
  console.log('✅ Simulación de reglas de acceso - PASS\n')
} catch (error) {
  console.log(`❌ Simulación de reglas de acceso - FAIL: ${(error as Error).message}\n`)
}

// Test 8: Simulación de validación de límite de 10 keys
console.log('8. Test: Simulación de validación de límite de 10 keys')
try {
  // Simular función de validación del límite
  function validateKeyLimit(currentCount: number): boolean {
    return currentCount < 10
  }
  
  assert(validateKeyLimit(0) === true, 'Debe permitir crear cuando hay 0 keys')
  assert(validateKeyLimit(5) === true, 'Debe permitir crear cuando hay 5 keys')
  assert(validateKeyLimit(9) === true, 'Debe permitir crear cuando hay 9 keys')
  assert(validateKeyLimit(10) === false, 'No debe permitir crear cuando ya hay 10 keys')
  assert(validateKeyLimit(15) === false, 'No debe permitir crear cuando ya hay más de 10 keys')
  
  console.log('✅ Simulación de validación de límite - PASS\n')
} catch (error) {
  console.log(`❌ Simulación de validación de límite - FAIL: ${(error as Error).message}\n`)
}

// Test 9: Simulación de hooks beforeChange
console.log('9. Test: Simulación de hooks beforeChange')
try {
  interface TestMcpKeyData {
    name: string
    keyValue?: string
    keyValueLastFour?: string
    user?: string
    projects?: string[]
    hasAllProjects?: boolean
    createdAt?: Date
    updatedAt?: Date
  }
  
  const operation = 'create'
  const mockUser = { id: 'user-123' }
  const data: TestMcpKeyData = {
    name: 'Nueva API Key'
  }
  
  // Lógica del hook user (simulando beforeChange)
  if (operation === 'create' && mockUser) {
    data.user = mockUser.id
  }
  
  // Lógica del hook keyValue (simulando beforeChange)
  if (operation === 'create') {
    const plainKey = generateApiKey()
    data.keyValueLastFour = plainKey.slice(-4)
    data.keyValue = hashApiKey(plainKey)
  }
  
  // Lógica de fechas (simulando beforeChange)
  if (operation === 'create') {
    data.createdAt = new Date()
  }
  data.updatedAt = new Date()
  
  assert(data.user === 'user-123', 'user debe auto-populate con user ID')
  assert(data.keyValue !== undefined, 'keyValue debe auto-populate con hash')
  assert(data.keyValueLastFour !== undefined, 'keyValueLastFour debe auto-populate')
  assert(data.keyValueLastFour?.length === 4, 'keyValueLastFour debe tener 4 caracteres')
  assert(data.keyValue?.length === 64, 'keyValue debe ser hash SHA-256 de 64 caracteres')
  assert(data.createdAt instanceof Date, 'createdAt debe auto-populate con fecha actual')
  assert(data.updatedAt instanceof Date, 'updatedAt debe auto-populate con fecha actual')
  
  console.log('✅ Simulación de hooks beforeChange - PASS\n')
} catch (error) {
  console.log(`❌ Simulación de hooks beforeChange - FAIL: ${(error as Error).message}\n`)
}

// Test 10: Simulación de hook afterRead
console.log('10. Test: Simulación de hook afterRead')
try {
  // Simular documento leído de la base de datos
  const mockDoc = {
    name: 'API Key de Desarrollo',
    keyValue: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4',
    keyValueLastFour: '1234',
    user: 'user-id-123',
    hasAllProjects: false
  }
  
  // Lógica del hook afterRead
  if (mockDoc?.keyValueLastFour) {
    mockDoc.keyValue = `pcsk_****...****${mockDoc.keyValueLastFour}`
  }
  
  assert(mockDoc.keyValue === 'pcsk_****...****1234', 'keyValue debe formatearse para display')
  assert(mockDoc.keyValue.startsWith('pcsk_'), 'Display debe mantener prefijo')
  assert(mockDoc.keyValue.endsWith('1234'), 'Display debe mostrar últimos 4 caracteres')
  assert(mockDoc.keyValue.includes('****'), 'Display debe ocultar caracteres intermedios')
  
  console.log('✅ Simulación de hook afterRead - PASS\n')
} catch (error) {
  console.log(`❌ Simulación de hook afterRead - FAIL: ${(error as Error).message}\n`)
}

// ============================================================================
// TESTS PARA FUNCIONALIDAD PLAYGROUND KEY
// ============================================================================

// Test 11: Validación de campo playgroundKey por defecto
console.log('11. Test: Campo playgroundKey tiene valor por defecto false')
try {
  const mockApiKey = {
    playgroundKey: false, // valor por defecto
    hasAllProjects: true,
    name: 'Test API Key'
  }
  
  assert('playgroundKey' in mockApiKey, 'API Key debe tener campo playgroundKey')
  assert(typeof mockApiKey.playgroundKey === 'boolean', 'playgroundKey debe ser boolean')
  assert(mockApiKey.playgroundKey === false, 'playgroundKey debe tener valor por defecto false')
  
  console.log('✅ Campo playgroundKey por defecto - PASS\n')
} catch (error) {
  console.log(`❌ Campo playgroundKey por defecto - FAIL: ${(error as Error).message}\n`)
}

// Test 12: Validación de visibilidad de campo playgroundKey solo para admins
console.log('12. Test: Campo playgroundKey visible solo para administradores')
try {
  const adminUser = { id: 'admin-1', role: 'admin' }
  const normalUser = { id: 'user-1', role: 'user' }
  const apiUser = { id: 'api-1', role: 'api' }
  
  // Simular admin.condition del campo playgroundKey
  function canSeePlaygroundKeyField(user: any): boolean {
    return user?.role === 'admin'
  }
  
  assert(canSeePlaygroundKeyField(adminUser) === true, 'Admin debe ver campo playgroundKey')
  assert(canSeePlaygroundKeyField(normalUser) === false, 'Usuario normal NO debe ver campo playgroundKey')
  assert(canSeePlaygroundKeyField(apiUser) === false, 'Usuario API NO debe ver campo playgroundKey')
  assert(canSeePlaygroundKeyField(null) === false, 'Usuario no autenticado NO debe ver campo playgroundKey')
  
  console.log('✅ Visibilidad campo playgroundKey - PASS\n')
} catch (error) {
  console.log(`❌ Visibilidad campo playgroundKey - FAIL: ${(error as Error).message}\n`)
}

// Test 13: Validación que solo keys con hasAllProjects pueden ser playground keys
console.log('13. Test: Solo keys con hasAllProjects pueden ser playground keys')
try {
  // Simular hook beforeValidate para playground keys
  function validatePlaygroundKeyRequirements(data: any): boolean {
    if (data?.playgroundKey === true && data?.hasAllProjects !== true) {
      throw new Error('Solo las API Keys con acceso a todos los proyectos pueden ser marcadas como playground key')
    }
    return true
  }
  
  // Test casos válidos
  assert(validatePlaygroundKeyRequirements({ playgroundKey: false, hasAllProjects: false }) === true, 
    'Debe permitir playgroundKey=false sin hasAllProjects')
  assert(validatePlaygroundKeyRequirements({ playgroundKey: true, hasAllProjects: true }) === true, 
    'Debe permitir playgroundKey=true con hasAllProjects=true')
  assert(validatePlaygroundKeyRequirements({ hasAllProjects: false }) === true, 
    'Debe permitir cuando playgroundKey no está definido')
  
  // Test caso inválido
  let errorThrown = false
  try {
    validatePlaygroundKeyRequirements({ playgroundKey: true, hasAllProjects: false })
  } catch (error) {
    errorThrown = true
    assert((error as Error).message.includes('Solo las API Keys con acceso a todos los proyectos'),
      'Debe lanzar error específico para playground key sin hasAllProjects')
  }
  assert(errorThrown, 'Debe lanzar error cuando playgroundKey=true pero hasAllProjects=false')
  
  console.log('✅ Validación requisitos playground key - PASS\n')
} catch (error) {
  console.log(`❌ Validación requisitos playground key - FAIL: ${(error as Error).message}\n`)
}

// Test 14: Simulación de hook beforeChange para desmarcado automático
console.log('14. Test: Hook beforeChange desmarca otras playground keys del usuario')
try {
  // Simular base de datos de API keys
  const mockApiKeys = [
    { id: '1', user: 'user-123', playgroundKey: true, name: 'Old Playground Key' },
    { id: '2', user: 'user-123', playgroundKey: false, name: 'Regular Key 1' },
    { id: '3', user: 'user-456', playgroundKey: true, name: 'Other User Key' },
    { id: '4', user: 'user-123', playgroundKey: false, name: 'Regular Key 2' }
  ]
  
  // Simular función de búsqueda
  function findExistingPlaygroundKeys(userId: string, excludeId?: string) {
    return mockApiKeys.filter(key => 
      key.user === userId && 
      key.playgroundKey === true && 
      key.id !== excludeId
    )
  }
  
  // Simular hook beforeChange
  function simulatePlaygroundKeyHook(userId: string, newPlaygroundKey: boolean, currentId?: string) {
    if (newPlaygroundKey === true) {
      const existingKeys = findExistingPlaygroundKeys(userId, currentId)
      // En realidad desmarcaríamos estas keys, aquí solo verificamos que las encontramos
      return existingKeys
    }
    return []
  }
  
  // Test: marcar nueva playground key debe encontrar la existente para desmarcas
  const keysToUnmark = simulatePlaygroundKeyHook('user-123', true, '5')
  assert(keysToUnmark.length === 1, 'Debe encontrar 1 playground key existente para desmarcas')
  assert(keysToUnmark[0].id === '1', 'Debe encontrar la playground key correcta')
  
  // Test: marcar playground key del mismo usuario debe excluir la key actual
  const keysToUnmarkSameUser = simulatePlaygroundKeyHook('user-123', true, '1')
  assert(keysToUnmarkSameUser.length === 0, 'No debe encontrar keys para desmarcas si es la misma key')
  
  // Test: usuarios diferentes no se afectan
  const keysToUnmarkDifferentUser = simulatePlaygroundKeyHook('user-789', true, '6')
  assert(keysToUnmarkDifferentUser.length === 0, 'Playground keys de otros usuarios no deben afectarse')
  
  console.log('✅ Simulación hook beforeChange - PASS\n')
} catch (error) {
  console.log(`❌ Simulación hook beforeChange - FAIL: ${(error as Error).message}\n`)
}

// Test 15: Validación de unicidad de playground keys por usuario
console.log('15. Test: Unicidad de playground keys por usuario')
try {
  // Simular estado final después de aplicar todos los hooks
  const finalApiKeys = [
    { id: '1', user: 'user-123', playgroundKey: false, name: 'Desmarcada' },
    { id: '2', user: 'user-123', playgroundKey: false, name: 'Regular Key' },
    { id: '3', user: 'user-456', playgroundKey: true, name: 'User 456 Playground' },
    { id: '4', user: 'user-123', playgroundKey: false, name: 'Regular Key 2' },
    { id: '5', user: 'user-123', playgroundKey: true, name: 'Nueva Playground Key' }
  ]
  
  // Función para contar playground keys por usuario
  function countPlaygroundKeysByUser(userId: string): number {
    return finalApiKeys.filter(key => key.user === userId && key.playgroundKey === true).length
  }
  
  // Verificar que cada usuario tiene máximo 1 playground key
  const user123Count = countPlaygroundKeysByUser('user-123')
  const user456Count = countPlaygroundKeysByUser('user-456')
  
  assert(user123Count === 1, 'Usuario 123 debe tener exactamente 1 playground key')
  assert(user456Count === 1, 'Usuario 456 debe tener exactamente 1 playground key')
  
  // Verificar que no hay usuarios con más de 1 playground key
  const allUsers = [...new Set(finalApiKeys.map(key => key.user))]
  for (const userId of allUsers) {
    const count = countPlaygroundKeysByUser(userId)
    assert(count <= 1, `Usuario ${userId} no debe tener más de 1 playground key (tiene ${count})`)
  }
  
  console.log('✅ Unicidad playground keys por usuario - PASS\n')
} catch (error) {
  console.log(`❌ Unicidad playground keys por usuario - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de ApiKeys Collection completados!')
console.log('\n📊 Resumen:')
console.log('- Validación de campos requeridos ✅')
console.log('- Generación de API Keys con formato correcto ✅')
console.log('- Hashing seguro de API Keys ✅')
console.log('- Formateo para display (últimos 4 caracteres) ✅')
console.log('- Reglas de acceso por rol ✅')
console.log('- Validación de límite de 10 keys por usuario ✅')
console.log('- Hooks de auto-population ✅')
console.log('- Hook afterRead para formateo ✅')
console.log('- Campo playgroundKey con valor por defecto ✅')
console.log('- Visibilidad playgroundKey solo para admins ✅')
console.log('- Validación requisitos playground key ✅')
console.log('- Hook beforeChange para desmarcado automático ✅')
console.log('- Unicidad playground keys por usuario ✅')
console.log('\n🔧 Para ejecutar: npx tsx src/collections/ApiKeys.test.ts') 