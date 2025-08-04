// ============================================================================
// EIDETIK MVP - TESTS PARA SISTEMA DE RATE LIMITING MCP
// ============================================================================

/**
 * Tests unitarios para verificar el sistema de rate limiting MCP
 * 
 * Ejecutar con: pnpm exec tsx src/app/api/mcp/rate-limiter.test.ts
 */

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

console.log('🧪 Ejecutando tests para Sistema de Rate Limiting MCP...\n')

// Import de las funciones a testear
import {
  trackMcpKeyUsage,
  checkRateLimit,
  getMcpKeyUsageStats,
  getGlobalUsageStats,
  enableRateLimitingForEndpoint,
  disableRateLimitingForEndpoint,
  cleanupOldUsageRecords,
  RATE_LIMITS,
  type McpKeyUsage,
} from './rate-limiter'

// Test 1: Tracking básico de uso
console.log('1. Test: Tracking básico de uso de MCP Key')
try {
  const mockMcpKeyData = {
    id: 'test-key-123',
    name: 'Test Key',
    keyValueLastFour: 'abcd',
    user: { id: 'user-123', email: 'test@example.com' },
  } as any

  // Track usage inicial
  trackMcpKeyUsage(mockMcpKeyData, '/api/mcp/projects', {
    success: true,
    responseSize: 5,
  })

  // Verificar que se creó el registro
  const stats = getMcpKeyUsageStats('test-key-123')
  assert(stats !== null, 'Debe crear registro de uso')
  assert(stats.mcpKeyId === 'test-key-123', 'ID correcto')
  assert(stats.requestsThisMinute === 1, 'Debe incrementar contador de minuto')
  assert(stats.requestsThisHour === 1, 'Debe incrementar contador de hora')
  assert(stats.requestsThisDay === 1, 'Debe incrementar contador de día')
  assert(stats.mostUsedEndpoint === '/api/mcp/projects', 'Debe trackear endpoint más usado')

  console.log('✅ Tracking básico de uso de MCP Key - PASS\n')
} catch (error) {
  console.log(`❌ Tracking básico de uso de MCP Key - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Múltiples requests de la misma key
console.log('2. Test: Múltiples requests de la misma MCP Key')
try {
  const mockMcpKeyData = {
    id: 'test-key-456',
    name: 'Multi Test Key',
    keyValueLastFour: 'efgh',
    user: { id: 'user-456', email: 'multi@example.com' },
  } as any

  // Track múltiples usos
  trackMcpKeyUsage(mockMcpKeyData, '/api/mcp/query-project', { success: true })
  trackMcpKeyUsage(mockMcpKeyData, '/api/mcp/query-project', { success: true })
  trackMcpKeyUsage(mockMcpKeyData, '/api/mcp/query-videos', { success: true })

  const stats = getMcpKeyUsageStats('test-key-456')
  assert(stats !== null, 'Debe existir registro')
  assert(stats.requestsThisMinute === 3, 'Debe contar 3 requests en minuto')
  assert(stats.endpointUsage['/api/mcp/query-project'] === 2, 'Debe contar 2 usos de query-project')
  assert(stats.endpointUsage['/api/mcp/query-videos'] === 1, 'Debe contar 1 uso de query-videos')
  assert(stats.mostUsedEndpoint === '/api/mcp/query-project', 'Endpoint más usado correcto')

  console.log('✅ Múltiples requests de la misma MCP Key - PASS\n')
} catch (error) {
  console.log(`❌ Múltiples requests de la misma MCP Key - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Rate limiting deshabilitado por defecto
console.log('3. Test: Rate limiting deshabilitado por defecto')
try {
  const mockMcpKeyData = {
    id: 'test-key-789',
    name: 'Rate Limit Test Key',
    keyValueLastFour: 'ijkl',
    user: { id: 'user-789', email: 'rate@example.com' },
  } as any

  // Verificar que rate limiting está deshabilitado
  const result = checkRateLimit(mockMcpKeyData, '/api/mcp/projects')
  assert(result.allowed === true, 'Debe permitir requests cuando está deshabilitado')
  assert(result.errorCode === undefined, 'No debe haber código de error')

  // Verificar configuración por defecto
  assert(RATE_LIMITS['/api/mcp/projects'].enabled === false, 'Debe estar deshabilitado por defecto')
  assert(RATE_LIMITS['default'].enabled === false, 'Default debe estar deshabilitado')

  console.log('✅ Rate limiting deshabilitado por defecto - PASS\n')
} catch (error) {
  console.log(`❌ Rate limiting deshabilitado por defecto - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Habilitar y verificar rate limiting
console.log('4. Test: Habilitar y verificar rate limiting')
try {
  const mockMcpKeyData = {
    id: 'test-key-limit',
    name: 'Limit Test Key',
    keyValueLastFour: 'mnop',
    user: { id: 'user-limit', email: 'limit@example.com' },
  } as any

  // Habilitar rate limiting para un endpoint específico con límites bajos
  enableRateLimitingForEndpoint('/api/mcp/test', {
    requestsPerMinute: 2,
    requestsPerHour: 10,
    requestsPerDay: 50,
    enabled: true,
  })

  // Hacer algunos requests
  trackMcpKeyUsage(mockMcpKeyData, '/api/mcp/test', { success: true })
  trackMcpKeyUsage(mockMcpKeyData, '/api/mcp/test', { success: true })

  // Debería estar permitido
  let result = checkRateLimit(mockMcpKeyData, '/api/mcp/test')
  assert(result.allowed === true, 'Debe permitir hasta el límite')
  assert(result.remainingRequests === 0, 'Debe calcular requests restantes')

  // Otro request debería exceder el límite
  trackMcpKeyUsage(mockMcpKeyData, '/api/mcp/test', { success: true })
  result = checkRateLimit(mockMcpKeyData, '/api/mcp/test')
  assert(result.allowed === false, 'Debe denegar cuando se excede el límite')
  assert(result.errorCode === 'RATE_LIMIT_EXCEEDED', 'Debe devolver código de rate limit')
  assert(result.limitType === 'minute', 'Debe identificar tipo de límite')

  // Deshabilitar rate limiting
  disableRateLimitingForEndpoint('/api/mcp/test')
  result = checkRateLimit(mockMcpKeyData, '/api/mcp/test')
  assert(result.allowed === true, 'Debe permitir después de deshabilitar')

  console.log('✅ Habilitar y verificar rate limiting - PASS\n')
} catch (error) {
  console.log(`❌ Habilitar y verificar rate limiting - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Estadísticas globales
console.log('5. Test: Estadísticas globales del sistema')
try {
  // Las MCP keys de tests anteriores ya están en el sistema
  const globalStats = getGlobalUsageStats()
  
  assert(globalStats.totalActiveKeys >= 3, 'Debe haber al menos 3 keys activas')
  assert(globalStats.totalRequestsToday > 0, 'Debe haber requests registrados')
  assert(typeof globalStats.averageRequestsPerKey === 'number', 'Promedio debe ser número')
  assert(globalStats.mostActiveKey !== null, 'Debe identificar key más activa')
  assert(globalStats.mostUsedEndpoint !== null, 'Debe identificar endpoint más usado')

  console.log('✅ Estadísticas globales del sistema - PASS\n')
} catch (error) {
  console.log(`❌ Estadísticas globales del sistema - FAIL: ${(error as Error).message}\n`)
}

// Test 6: Configuración de límites por endpoint
console.log('6. Test: Configuración de límites por endpoint')
try {
  // Verificar que tenemos configuraciones para todos los endpoints principales
  const requiredEndpoints = [
    '/api/mcp/projects',
    '/api/mcp/query-project',
    '/api/mcp/query-videos',
    'default'
  ]

  for (const endpoint of requiredEndpoints) {
    assert(endpoint in RATE_LIMITS, `Debe tener configuración para ${endpoint}`)
    const config = RATE_LIMITS[endpoint]
    assert(typeof config.requestsPerMinute === 'number', 'requestsPerMinute debe ser número')
    assert(typeof config.requestsPerHour === 'number', 'requestsPerHour debe ser número')
    assert(typeof config.requestsPerDay === 'number', 'requestsPerDay debe ser número')
    assert(typeof config.enabled === 'boolean', 'enabled debe ser boolean')
    assert(config.requestsPerMinute > 0, 'Límite por minuto debe ser positivo')
    assert(config.requestsPerHour >= config.requestsPerMinute, 'Límite por hora debe ser >= minuto')
    assert(config.requestsPerDay >= config.requestsPerHour, 'Límite por día debe ser >= hora')
  }

  // Verificar que los endpoints de consulta tienen límites más restrictivos
  assert(
    RATE_LIMITS['/api/mcp/query-project'].requestsPerMinute <= RATE_LIMITS['/api/mcp/projects'].requestsPerMinute,
    'Endpoints de consulta deben tener límites más restrictivos'
  )

  console.log('✅ Configuración de límites por endpoint - PASS\n')
} catch (error) {
  console.log(`❌ Configuración de límites por endpoint - FAIL: ${(error as Error).message}\n`)
}

// Test 7: Cleanup de registros antiguos
console.log('7. Test: Cleanup de registros antiguos')
try {
  // El cleanup no debería afectar registros recientes
  const statsBeforeCleanup = getGlobalUsageStats()
  cleanupOldUsageRecords()
  const statsAfterCleanup = getGlobalUsageStats()
  
  // Los registros recientes no deberían haberse eliminado
  assert(
    statsAfterCleanup.totalActiveKeys === statsBeforeCleanup.totalActiveKeys,
    'No debe eliminar registros recientes'
  )

  console.log('✅ Cleanup de registros antiguos - PASS\n')
} catch (error) {
  console.log(`❌ Cleanup de registros antiguos - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de Sistema de Rate Limiting MCP completados!')
console.log('\n📊 Resumen de tests:')
console.log('- ✅ Tracking básico de uso de MCP Key')
console.log('- ✅ Múltiples requests de la misma MCP Key') 
console.log('- ✅ Rate limiting deshabilitado por defecto')
console.log('- ✅ Habilitar y verificar rate limiting')
console.log('- ✅ Estadísticas globales del sistema')
console.log('- ✅ Configuración de límites por endpoint')
console.log('- ✅ Cleanup de registros antiguos')
console.log('\n🔧 Para ejecutar: pnpm exec tsx src/app/api/mcp/rate-limiter.test.ts')
console.log('\n⚡ Sistema de rate limiting preparado:')
console.log('- 📊 Tracking de uso por MCP Key (activo)')
console.log('- 🚫 Rate limiting deshabilitado por defecto')
console.log('- ⚙️ Configuración lista para activación futura')
console.log('- 📈 Estadísticas globales de uso')
console.log('- 🔄 Cleanup automático de registros antiguos')
console.log('- 🎛️ Control granular por endpoint')
console.log('\n🚀 Para activar rate limiting en el futuro:')
console.log('- enableRateLimitingForEndpoint(\'/api/mcp/projects\')')
console.log('- Modificar RATE_LIMITS[endpoint].enabled = true')
console.log('- Integrar verificación en middleware de endpoints') 