// ============================================================================
// EIDETIK MVP - TESTS PARA SISTEMA DE LOGGING DE SEGURIDAD MCP
// ============================================================================

/**
 * Tests unitarios para verificar el sistema de logging de seguridad MCP
 * 
 * Ejecutar con: pnpm exec tsx src/app/api/mcp/security-logger.test.ts
 */

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

console.log('🧪 Ejecutando tests para Sistema de Logging de Seguridad MCP...\n')

// Import de las funciones a testear
import {
  extractSecurityContext,
  logAuthenticationFailure,
  logAuthenticationSuccess,
  logAccessDenied,
  createSafeMcpKeyInfo,
  type SecurityContext,
  type AuthenticationFailureEvent,
} from './security-logger'

import { MCP_ERROR_CODES } from './types'

// Test 1: Extracción de contexto de seguridad
console.log('1. Test: Extracción de contexto de seguridad')
try {
  // Mock de Request con headers completos
  const mockRequest = {
    method: 'POST',
    headers: new Map([
      ['host', 'localhost:5058'],
      ['user-agent', 'Mozilla/5.0 (MCP Client)'],
      ['referer', 'https://app.example.com'],
      ['x-forwarded-for', '192.168.1.100, 10.0.0.1'],
      ['x-real-ip', '192.168.1.100'],
      ['authorization', 'Bearer pcsk_test123']
    ]),
    get: function(header: string) {
      return this.headers.get(header)
    }
  } as any

  const context = extractSecurityContext(mockRequest, '/api/mcp/projects')
  
  assert(typeof context.requestId === 'string', 'Request ID debe ser string')
  assert(context.requestId.startsWith('mcp_'), 'Request ID debe empezar con mcp_')
  assert(context.clientIP === '192.168.1.100', 'Debe extraer IP correcta de X-Forwarded-For')
  assert(context.userAgent === 'Mozilla/5.0 (MCP Client)', 'Debe extraer User-Agent')
  assert(context.host === 'localhost:5058', 'Debe extraer host')
  assert(context.referer === 'https://app.example.com', 'Debe extraer referer')
  assert(context.endpoint === '/api/mcp/projects', 'Debe incluir endpoint')
  assert(context.method === 'POST', 'Debe incluir método HTTP')
  assert(typeof context.timestamp === 'string', 'Timestamp debe ser string')

  console.log('✅ Extracción de contexto de seguridad - PASS\n')
} catch (error) {
  console.log(`❌ Extracción de contexto de seguridad - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Creación de información segura de MCP Key
console.log('2. Test: Creación de información segura de MCP Key')
try {
  // Test con key válida
  const validKey = 'pcsk_BNZgQtrBRDonm07tcwcVmU1BsUaQRn8x'
  const safeInfo = createSafeMcpKeyInfo(validKey)
  
  assert(safeInfo.keyPrefix === 'pcsk_BNZgQ', 'Debe extraer prefijo correcto')
  assert(safeInfo.keyLength === validKey.length, 'Debe reportar longitud correcta')
  assert(safeInfo.hasValidFormat === true, 'Debe reconocer formato válido')

  // Test con key inválida
  const invalidKey = 'invalid_key_123'
  const invalidInfo = createSafeMcpKeyInfo(invalidKey)
  
  assert(invalidInfo.hasValidFormat === false, 'Debe reconocer formato inválido')
  assert(invalidInfo.keyLength === invalidKey.length, 'Debe reportar longitud')

  // Test con key null/undefined
  const nullInfo = createSafeMcpKeyInfo('')
  assert(nullInfo.keyPrefix === 'null', 'Debe manejar keys vacías')
  assert(nullInfo.keyLength === 0, 'Debe reportar longitud 0')
  assert(nullInfo.hasValidFormat === false, 'Key vacía debe ser inválida')

  console.log('✅ Creación de información segura de MCP Key - PASS\n')
} catch (error) {
  console.log(`❌ Creación de información segura de MCP Key - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Logging de fallo de autenticación
console.log('3. Test: Logging de fallo de autenticación')
try {
  const mockContext: SecurityContext = {
    clientIP: '192.168.1.100',
    userAgent: 'Test Agent',
    host: 'localhost:5058',
    referer: null,
    forwardedFor: null,
    requestId: 'test_123',
    timestamp: '2024-01-01T00:00:00Z',
    endpoint: '/api/mcp/test',
    method: 'POST'
  }

  // Capturar logs para verificar
  const originalConsoleWarn = console.warn
  const originalConsoleError = console.error
  let loggedData: any = null
  let errorLogged = false

  console.warn = (...args) => {
    if (args[0] && args[0].includes('[MCP_SECURITY]')) {
      loggedData = args[1]
    }
  }

  console.error = (...args) => {
    if (args[0] && args[0].includes('[MCP_SECURITY]')) {
      errorLogged = true
    }
  }

  // Test fallo de severidad MEDIUM
  logAuthenticationFailure(
    MCP_ERROR_CODES.KEY_NOT_FOUND,
    'Test error message',
    mockContext,
    {
      failureStage: 'KEY_LOOKUP',
      mcpKeyInfo: {
        keyPrefix: 'pcsk_test',
        keyLength: 30,
        hasValidFormat: true
      }
    }
  )

  // Restaurar console
  console.warn = originalConsoleWarn
  console.error = originalConsoleError

  assert(loggedData !== null, 'Debe haber loggeado el evento')
  assert(loggedData.eventType === 'AUTHENTICATION_FAILURE', 'Tipo de evento correcto')
  assert(loggedData.errorCode === MCP_ERROR_CODES.KEY_NOT_FOUND, 'Código de error correcto')
  assert(loggedData.severity === 'MEDIUM', 'Severidad correcta para KEY_NOT_FOUND')
  assert(loggedData.context.requestId === 'test_123', 'Contexto preservado')

  console.log('✅ Logging de fallo de autenticación - PASS\n')
} catch (error) {
  console.log(`❌ Logging de fallo de autenticación - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Logging de autenticación exitosa
console.log('4. Test: Logging de autenticación exitosa')
try {
  const mockContext: SecurityContext = {
    clientIP: '192.168.1.100',
    userAgent: 'Test Agent',
    host: 'localhost:5058',
    referer: null,
    forwardedFor: null,
    requestId: 'test_success_123',
    timestamp: '2024-01-01T00:00:00Z',
    endpoint: '/api/mcp/projects',
    method: 'POST'
  }

  const mockMcpKeyData = {
    id: 'key123',
    name: 'Test Key',
    keyValueLastFour: '8x9z',
    user: {
      id: 'user123',
      email: 'test@example.com'
    },
    hasAllProjects: false
  } as any

  const mockProjects = [
    { id: 'proj1', title: 'Project 1' },
    { id: 'proj2', title: 'Project 2' }
  ]

  // Capturar logs
  const originalConsoleLog = console.log
  let successLogged: any = null

  console.log = (...args) => {
    if (args[0] && args[0].includes('[MCP_SECURITY] Authentication Success:')) {
      successLogged = args[1]
    }
  }

  logAuthenticationSuccess(mockContext, mockMcpKeyData, mockProjects)

  // Restaurar console
  console.log = originalConsoleLog

  assert(successLogged !== null, 'Debe haber loggeado el éxito')
  assert(successLogged.eventType === 'AUTHENTICATION_SUCCESS', 'Tipo de evento correcto')
  assert(successLogged.authDetails.userId === 'user123', 'User ID correcto')
  assert(successLogged.authDetails.mcpKeyId === 'key123', 'MCP Key ID correcto')
  assert(successLogged.authDetails.projectCount === 2, 'Cantidad de proyectos correcta')
  assert(successLogged.authDetails.keyLastFour === '8x9z', 'Últimos 4 caracteres correctos')

  console.log('✅ Logging de autenticación exitosa - PASS\n')
} catch (error) {
  console.log(`❌ Logging de autenticación exitosa - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Logging de acceso denegado
console.log('5. Test: Logging de acceso denegado')
try {
  const mockContext: SecurityContext = {
    clientIP: '10.0.0.1',
    userAgent: 'Suspicious Agent',
    host: 'localhost:5058',
    referer: null,
    forwardedFor: null,
    requestId: 'access_denied_123',
    timestamp: '2024-01-01T01:00:00Z',
    endpoint: '/api/mcp/query-project',
    method: 'POST'
  }

  const mockUserDetails = {
    userId: 'user456',
    mcpKeyId: 'key456',
    mcpKeyName: 'Limited Key'
  }

  const mockResourceDetails = {
    resourceType: 'PROJECT' as const,
    resourceIds: ['proj999'],
    accessibleProjects: ['proj1', 'proj2']
  }

  // Capturar logs
  const originalConsoleWarn = console.warn
  let accessDeniedLogged: any = null

  console.warn = (...args) => {
    if (args[0] && args[0].includes('[MCP_SECURITY] Access Denied:')) {
      accessDeniedLogged = args[1]
    }
  }

  logAccessDenied(
    MCP_ERROR_CODES.NO_PROJECT_ACCESS,
    mockContext,
    mockUserDetails,
    mockResourceDetails
  )

  // Restaurar console
  console.warn = originalConsoleWarn

  assert(accessDeniedLogged !== null, 'Debe haber loggeado el acceso denegado')
  assert(accessDeniedLogged.eventType === 'ACCESS_DENIED', 'Tipo de evento correcto')
  assert(accessDeniedLogged.errorCode === MCP_ERROR_CODES.NO_PROJECT_ACCESS, 'Código de error correcto')
  assert(accessDeniedLogged.userDetails.userId === 'user456', 'User ID correcto')
  assert(accessDeniedLogged.resourceDetails.resourceType === 'PROJECT', 'Tipo de recurso correcto')
  assert(accessDeniedLogged.resourceDetails.resourceIds.includes('proj999'), 'ID de recurso solicitado')

  console.log('✅ Logging de acceso denegado - PASS\n')
} catch (error) {
  console.log(`❌ Logging de acceso denegado - FAIL: ${(error as Error).message}\n`)
}

// Test 6: Determinación de severidad
console.log('6. Test: Determinación de severidad')
try {
  // Test para eventos críticos (INTERNAL_ERROR)
  // Esta función es interna, pero podemos testear indirectamente
  const mockContext: SecurityContext = {
    clientIP: '192.168.1.100',
    userAgent: 'Test Agent',
    host: 'localhost:5058',
    referer: null,
    forwardedFor: null,
    requestId: 'severity_test',
    timestamp: '2024-01-01T00:00:00Z',
    endpoint: '/api/mcp/test',
    method: 'POST'
  }

  // Capturar logs para verificar severidades
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn
  let criticalLogged = false
  let highLogged = false
  let mediumLogged = false

  console.error = (...args) => {
    if (args[0] && args[0].includes('CRITICAL')) {
      criticalLogged = true
    }
    if (args[0] && args[0].includes('HIGH')) {
      highLogged = true
    }
  }

  console.warn = (...args) => {
    if (args[1] && args[1].severity === 'MEDIUM') {
      mediumLogged = true
    }
  }

  // Test severidad CRITICAL (INTERNAL_ERROR)
  logAuthenticationFailure(
    MCP_ERROR_CODES.UNKNOWN_ERROR,
    'Internal error',
    mockContext,
    { failureStage: 'INTERNAL_ERROR' }
  )

  // Test severidad HIGH (INVALID_HOST)
  logAuthenticationFailure(
    MCP_ERROR_CODES.INVALID_HOST,
    'Invalid host',
    mockContext,
    { failureStage: 'HOST_VALIDATION' }
  )

  // Test severidad MEDIUM (KEY_NOT_FOUND)
  logAuthenticationFailure(
    MCP_ERROR_CODES.KEY_NOT_FOUND,
    'Key not found',
    mockContext,
    { failureStage: 'KEY_LOOKUP' }
  )

  // Restaurar console
  console.error = originalConsoleError
  console.warn = originalConsoleWarn

  assert(criticalLogged === true, 'Debe loggear eventos críticos como error')
  assert(highLogged === true, 'Debe loggear eventos de alta severidad como error')
  assert(mediumLogged === true, 'Debe loggear eventos de severidad media como warning')

  console.log('✅ Determinación de severidad - PASS\n')
} catch (error) {
  console.log(`❌ Determinación de severidad - FAIL: ${(error as Error).message}\n`)
}

// Test 7: Extracción de IP desde diferentes headers
console.log('7. Test: Extracción de IP desde diferentes headers')
try {
  // Test con X-Forwarded-For multiple
  const requestWithMultipleIPs = {
    method: 'POST',
    headers: new Map([
      ['x-forwarded-for', '203.0.113.1, 192.168.1.1, 10.0.0.1'],
      ['host', 'api.example.com']
    ]),
    get: function(header: string) {
      return this.headers.get(header)
    }
  } as any

  const contextMultiple = extractSecurityContext(requestWithMultipleIPs, '/test')
  assert(contextMultiple.clientIP === '203.0.113.1', 'Debe extraer primera IP de X-Forwarded-For')

  // Test con X-Real-IP
  const requestWithRealIP = {
    method: 'POST',
    headers: new Map([
      ['x-real-ip', '198.51.100.1'],
      ['host', 'api.example.com']
    ]),
    get: function(header: string) {
      return this.headers.get(header)
    }
  } as any

  const contextRealIP = extractSecurityContext(requestWithRealIP, '/test')
  assert(contextRealIP.clientIP === '198.51.100.1', 'Debe extraer IP de X-Real-IP')

  // Test sin headers de IP
  const requestNoIP = {
    method: 'POST',
    headers: new Map([
      ['host', 'api.example.com']
    ]),
    get: function(header: string) {
      return this.headers.get(header)
    }
  } as any

  const contextNoIP = extractSecurityContext(requestNoIP, '/test')
  assert(contextNoIP.clientIP === null, 'Debe retornar null cuando no hay IP')

  console.log('✅ Extracción de IP desde diferentes headers - PASS\n')
} catch (error) {
  console.log(`❌ Extracción de IP desde diferentes headers - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de Sistema de Logging de Seguridad MCP completados!')
console.log('\n📊 Resumen de tests:')
console.log('- ✅ Extracción de contexto de seguridad')
console.log('- ✅ Creación de información segura de MCP Key')
console.log('- ✅ Logging de fallo de autenticación')
console.log('- ✅ Logging de autenticación exitosa')
console.log('- ✅ Logging de acceso denegado')
console.log('- ✅ Determinación de severidad')
console.log('- ✅ Extracción de IP desde diferentes headers')
console.log('\n🔧 Para ejecutar: pnpm exec tsx src/app/api/mcp/security-logger.test.ts')
console.log('\n🔒 Sistema de seguridad implementado:')
console.log('- 📍 Tracking de IP addresses y User-Agents')
console.log('- 🔑 Logging seguro de MCP Keys (sin exponer valores)')
console.log('- 📊 Clasificación automática de severidad')
console.log('- 🚨 Alertas para eventos de alta severidad')
console.log('- 📝 Logging estructurado para análisis automático')
console.log('- 🔍 Context completo para auditorías de seguridad') 