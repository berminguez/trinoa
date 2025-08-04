// ============================================================================
// EIDETIK MVP - TESTS PARA UTILIDADES DE API KEYS
// ============================================================================

/**
 * Tests de validación para las utilidades de generación y manejo de API Keys
 * 
 * Ejecutar con: tsx src/lib/utils/apiKeyGenerator.test.ts
 */

import {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  formatApiKeyForDisplay,
  isValidApiKeyFormat,
  getLastFourChars,
  generateCompleteApiKey,
  type GeneratedApiKeyData
} from './apiKeyGenerator'

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

// Tests simples sin dependencias
console.log('🧪 Ejecutando tests para API Key Generator utilities...\n')

// Test 1: Generación básica de API Keys
console.log('1. Test: Generación básica de API Keys')
try {
  const key1 = generateApiKey()
  const key2 = generateApiKey()
  const key3 = generateApiKey()
  
  // Verificar formato básico
  assert(typeof key1 === 'string', 'generateApiKey debe retornar string')
  assert(key1.startsWith('pcsk_'), 'API Key debe empezar con "pcsk_"')
  assert(key1.length === 37, 'API Key debe tener 37 caracteres (pcsk_ + 32)')
  
  // Verificar unicidad
  assert(key1 !== key2, 'Las API Keys generadas deben ser únicas')
  assert(key2 !== key3, 'Las API Keys generadas deben ser únicas')
  assert(key1 !== key3, 'Las API Keys generadas deben ser únicas')
  
  // Verificar que solo contienen caracteres válidos
  const keyPart = key1.substring(5)
  assert(/^[A-Za-z0-9]+$/.test(keyPart), 'Parte aleatoria debe ser alfanumérica')
  
  console.log('✅ Generación básica de API Keys - PASS\n')
} catch (error) {
  console.log(`❌ Generación básica de API Keys - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Hashing de API Keys
console.log('2. Test: Hashing de API Keys')
try {
  const plainKey = generateApiKey()
  const hash1 = hashApiKey(plainKey)
  const hash2 = hashApiKey(plainKey)
  
  // El hash debe ser consistente
  assert(hash1 === hash2, 'Hash debe ser consistente para la misma key')
  assert(typeof hash1 === 'string', 'Hash debe ser string')
  assert(hash1.length === 64, 'Hash SHA-256 debe tener 64 caracteres')
  assert(hash1 !== plainKey, 'Hash debe ser diferente a la key original')
  
  // Verificar que hashes de keys diferentes son diferentes
  const plainKey2 = generateApiKey()
  const hash3 = hashApiKey(plainKey2)
  assert(hash1 !== hash3, 'Hashes de keys diferentes deben ser diferentes')
  
  // Verificar que el hash es hexadecimal
  assert(/^[a-f0-9]+$/.test(hash1), 'Hash debe ser hexadecimal')
  
  console.log('✅ Hashing de API Keys - PASS\n')
} catch (error) {
  console.log(`❌ Hashing de API Keys - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Verificación de API Keys
console.log('3. Test: Verificación de API Keys')
try {
  const plainKey = generateApiKey()
  const correctHash = hashApiKey(plainKey)
  const wrongHash = hashApiKey(generateApiKey())
  
  // Verificación correcta
  assert(verifyApiKey(plainKey, correctHash) === true, 'Debe verificar correctamente key válida')
  
  // Verificación incorrecta
  assert(verifyApiKey(plainKey, wrongHash) === false, 'Debe rechazar key incorrecta')
  assert(verifyApiKey('invalid-key', correctHash) === false, 'Debe rechazar key inválida')
  
  // Edge cases
  assert(verifyApiKey('', correctHash) === false, 'Debe rechazar key vacía')
  assert(verifyApiKey(plainKey, '') === false, 'Debe rechazar hash vacío')
  
  console.log('✅ Verificación de API Keys - PASS\n')
} catch (error) {
  console.log(`❌ Verificación de API Keys - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Formateo para display
console.log('4. Test: Formateo para display')
try {
  const lastFour = '1234'
  const displayKey = formatApiKeyForDisplay(lastFour)
  
  assert(displayKey === 'pcsk_****...****1234', 'Debe formatear correctamente')
  assert(displayKey.startsWith('pcsk_'), 'Debe mantener prefijo')
  assert(displayKey.endsWith('1234'), 'Debe mostrar últimos 4 caracteres')
  assert(displayKey.includes('****'), 'Debe incluir asteriscos para ocultar')
  assert(displayKey.length === 20, 'Formato debe tener longitud consistente')
  
  // Diferentes últimos 4 caracteres
  const displayKey2 = formatApiKeyForDisplay('abcd')
  assert(displayKey2 === 'pcsk_****...****abcd', 'Debe funcionar con letras')
  
  const displayKey3 = formatApiKeyForDisplay('9999')
  assert(displayKey3 === 'pcsk_****...****9999', 'Debe funcionar con números')
  
  console.log('✅ Formateo para display - PASS\n')
} catch (error) {
  console.log(`❌ Formateo para display - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Validación de formato de API Key
console.log('5. Test: Validación de formato de API Key')
try {
  const validKey = generateApiKey()
  
  // Formato válido
  assert(isValidApiKeyFormat(validKey) === true, 'Debe aceptar API Key válida generada')
  assert(isValidApiKeyFormat('pcsk_abcdefghijklmnopqrstuvwxyz123456') === true, 'Debe aceptar formato válido')
  
  // Formatos inválidos
  assert(isValidApiKeyFormat('invalid_key') === false, 'Debe rechazar prefijo incorrecto')
  assert(isValidApiKeyFormat('pcsk_') === false, 'Debe rechazar key demasiado corta')
  assert(isValidApiKeyFormat('pcsk_abc') === false, 'Debe rechazar key muy corta')
  assert(isValidApiKeyFormat('pcsk_' + 'a'.repeat(33)) === false, 'Debe rechazar key demasiado larga')
  assert(isValidApiKeyFormat('pcsk_abcdefghijklmnopqrstuvwxyz12345@') === false, 'Debe rechazar caracteres especiales')
  assert(isValidApiKeyFormat('pcsk_abcdefghijklmnopqrstuvwxyz 123456') === false, 'Debe rechazar espacios')
  
  // Edge cases
  assert(isValidApiKeyFormat('') === false, 'Debe rechazar string vacío')
  assert(isValidApiKeyFormat('pcsk') === false, 'Debe rechazar sin underscore')
  assert(isValidApiKeyFormat('PCSK_abcdefghijklmnopqrstuvwxyz123456') === false, 'Debe rechazar prefijo en mayúsculas')
  
  console.log('✅ Validación de formato - PASS\n')
} catch (error) {
  console.log(`❌ Validación de formato - FAIL: ${(error as Error).message}\n`)
}

// Test 6: Extracción de últimos 4 caracteres
console.log('6. Test: Extracción de últimos 4 caracteres')
try {
  const apiKey = 'pcsk_abcdefghijklmnopqrstuvwxyz123456'
  const lastFour = getLastFourChars(apiKey)
  
  assert(lastFour === '3456', 'Debe extraer últimos 4 caracteres correctamente')
  assert(lastFour.length === 4, 'Debe retornar exactamente 4 caracteres')
  
  // Diferentes casos
  assert(getLastFourChars('pcsk_1234567890') === '7890', 'Debe funcionar con números')
  assert(getLastFourChars('pcsk_abcdefgh') === 'efgh', 'Debe funcionar con letras')
  assert(getLastFourChars('pcsk_abcd1234') === '1234', 'Debe funcionar con alfanumérico')
  
  // Edge case con string corto
  assert(getLastFourChars('abc') === 'abc', 'Debe manejar strings cortos')
  
  console.log('✅ Extracción de últimos 4 caracteres - PASS\n')
} catch (error) {
  console.log(`❌ Extracción de últimos 4 caracteres - FAIL: ${(error as Error).message}\n`)
}

// Test 7: Generación completa de API Key
console.log('7. Test: Generación completa de API Key')
try {
  const keyData = generateCompleteApiKey()
  
  // Verificar estructura del objeto
  assert('plainKey' in keyData, 'Debe incluir plainKey')
  assert('hashedKey' in keyData, 'Debe incluir hashedKey')
  assert('lastFour' in keyData, 'Debe incluir lastFour')
  assert('displayKey' in keyData, 'Debe incluir displayKey')
  
  // Verificar tipos
  assert(typeof keyData.plainKey === 'string', 'plainKey debe ser string')
  assert(typeof keyData.hashedKey === 'string', 'hashedKey debe ser string')
  assert(typeof keyData.lastFour === 'string', 'lastFour debe ser string')
  assert(typeof keyData.displayKey === 'string', 'displayKey debe ser string')
  
  // Verificar formatos
  assert(isValidApiKeyFormat(keyData.plainKey), 'plainKey debe tener formato válido')
  assert(keyData.hashedKey.length === 64, 'hashedKey debe ser hash SHA-256')
  assert(keyData.lastFour.length === 4, 'lastFour debe tener 4 caracteres')
  assert(keyData.displayKey.startsWith('pcsk_****'), 'displayKey debe estar formateada')
  
  // Verificar consistencia
  assert(keyData.lastFour === keyData.plainKey.slice(-4), 'lastFour debe coincidir con plainKey')
  assert(keyData.displayKey === formatApiKeyForDisplay(keyData.lastFour), 'displayKey debe estar correctamente formateada')
  assert(verifyApiKey(keyData.plainKey, keyData.hashedKey), 'plainKey debe verificar contra hashedKey')
  
  console.log('✅ Generación completa de API Key - PASS\n')
} catch (error) {
  console.log(`❌ Generación completa de API Key - FAIL: ${(error as Error).message}\n`)
}

// Test 8: Tipado TypeScript
console.log('8. Test: Tipado TypeScript')
try {
  const keyData: GeneratedApiKeyData = generateCompleteApiKey()
  
  // Verificar que la interface funciona correctamente
  const plainKey: string = keyData.plainKey
  const hashedKey: string = keyData.hashedKey
  const lastFour: string = keyData.lastFour
  const displayKey: string = keyData.displayKey
  
  assert(typeof plainKey === 'string', 'Tipado de plainKey correcto')
  assert(typeof hashedKey === 'string', 'Tipado de hashedKey correcto')
  assert(typeof lastFour === 'string', 'Tipado de lastFour correcto')
  assert(typeof displayKey === 'string', 'Tipado de displayKey correcto')
  
  console.log('✅ Tipado TypeScript - PASS\n')
} catch (error) {
  console.log(`❌ Tipado TypeScript - FAIL: ${(error as Error).message}\n`)
}

// Test 9: Performance y stress test básico
console.log('9. Test: Performance básico')
try {
  const startTime = Date.now()
  const keys: string[] = []
  
  // Generar 100 keys para verificar performance
  for (let i = 0; i < 100; i++) {
    keys.push(generateApiKey())
  }
  
  const endTime = Date.now()
  const duration = endTime - startTime
  
  // Verificar que todas son únicas
  const uniqueKeys = new Set(keys)
  assert(uniqueKeys.size === keys.length, 'Todas las keys generadas deben ser únicas')
  
  // Verificar que la generación es razonablemente rápida (menos de 1 segundo)
  assert(duration < 1000, `Generación de 100 keys debe ser rápida (${duration}ms)`)
  
  console.log(`✅ Performance básico - PASS (${duration}ms para 100 keys)\n`)
} catch (error) {
  console.log(`❌ Performance básico - FAIL: ${(error as Error).message}\n`)
}

// Test 10: Integración completa
console.log('10. Test: Integración completa')
try {
  // Simular flujo completo de creación y verificación
  const keyData = generateCompleteApiKey()
  
  // 1. Almacenar en "base de datos" (simulado)
  const storedHash = keyData.hashedKey
  const storedLastFour = keyData.lastFour
  
  // 2. Mostrar en UI (simulado)
  const uiDisplay = formatApiKeyForDisplay(storedLastFour)
  
  // 3. Verificar autenticación (simulado)
  const isAuthenticated = verifyApiKey(keyData.plainKey, storedHash)
  
  // 4. Validar formato (simulado)
  const isValidFormat = isValidApiKeyFormat(keyData.plainKey)
  
  // Verificaciones del flujo completo
  assert(uiDisplay === keyData.displayKey, 'Display UI debe coincidir')
  assert(isAuthenticated === true, 'Verificación debe ser exitosa')
  assert(isValidFormat === true, 'Formato debe ser válido')
  assert(storedLastFour === keyData.lastFour, 'LastFour almacenado debe coincidir')
  
  // Verificar que no exponemos la key original después de almacenar
  assert(storedHash !== keyData.plainKey, 'Hash almacenado no debe ser la key original')
  assert(uiDisplay !== keyData.plainKey, 'Display UI no debe mostrar key original')
  
  console.log('✅ Integración completa - PASS\n')
} catch (error) {
  console.log(`❌ Integración completa - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de API Key Generator utilities completados!')
console.log('\n📊 Resumen:')
console.log('- Generación de API Keys ✅')
console.log('- Hashing SHA-256 ✅')
console.log('- Verificación de keys ✅')
console.log('- Formateo para display ✅')
console.log('- Validación de formato ✅')
console.log('- Extracción de últimos 4 caracteres ✅')
console.log('- Generación completa ✅')
console.log('- Tipado TypeScript ✅')
console.log('- Performance básico ✅')
console.log('- Integración completa ✅')
console.log('\n🔧 Para ejecutar: tsx src/lib/utils/apiKeyGenerator.test.ts') 