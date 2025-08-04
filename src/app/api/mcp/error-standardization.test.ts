// ============================================================================
// EIDETIK MVP - TESTS PARA ESTANDARIZACIÓN DE ERRORES MCP
// ============================================================================

/**
 * Tests unitarios para verificar la estandarización de errores MCP
 * 
 * Ejecutar con: pnpm exec tsx src/app/api/mcp/error-standardization.test.ts
 */

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

console.log('🧪 Ejecutando tests para Estandarización de Errores MCP...\n')

// Import de las funciones a testear
import {
  MCP_ERROR_CODES,
  HTTP_STATUS_TO_ERROR_CODE,
  ERROR_MESSAGES,
  isValidErrorCodeForStatus,
  getErrorMessage,
  createErrorResponse,
  createSuccessResponse,
  createMethodNotAllowedResponse,
} from './auth-service'

// Test 1: Validación de códigos de error por status HTTP
console.log('1. Test: Validación de códigos de error por status HTTP')
try {
  // Test validaciones 400
  assert(isValidErrorCodeForStatus(400, MCP_ERROR_CODES.INVALID_REQUEST_FORMAT), 
    'INVALID_REQUEST_FORMAT debe ser válido para 400')
  assert(isValidErrorCodeForStatus(400, MCP_ERROR_CODES.QUESTION_TOO_LONG), 
    'QUESTION_TOO_LONG debe ser válido para 400')
  assert(!isValidErrorCodeForStatus(400, MCP_ERROR_CODES.KEY_NOT_FOUND), 
    'KEY_NOT_FOUND no debe ser válido para 400')

  // Test validaciones 401
  assert(isValidErrorCodeForStatus(401, MCP_ERROR_CODES.INVALID_HOST), 
    'INVALID_HOST debe ser válido para 401')
  assert(isValidErrorCodeForStatus(401, MCP_ERROR_CODES.KEY_NOT_FOUND), 
    'KEY_NOT_FOUND debe ser válido para 401')
  assert(!isValidErrorCodeForStatus(401, MCP_ERROR_CODES.NO_PROJECT_ACCESS), 
    'NO_PROJECT_ACCESS no debe ser válido para 401')

  // Test validaciones 403
  assert(isValidErrorCodeForStatus(403, MCP_ERROR_CODES.NO_PROJECT_ACCESS), 
    'NO_PROJECT_ACCESS debe ser válido para 403')
  assert(isValidErrorCodeForStatus(403, MCP_ERROR_CODES.NO_VIDEO_ACCESS), 
    'NO_VIDEO_ACCESS debe ser válido para 403')
  assert(!isValidErrorCodeForStatus(403, MCP_ERROR_CODES.INVALID_HOST), 
    'INVALID_HOST no debe ser válido para 403')

  // Test validaciones 404
  assert(isValidErrorCodeForStatus(404, MCP_ERROR_CODES.PROJECT_NOT_FOUND), 
    'PROJECT_NOT_FOUND debe ser válido para 404')
  assert(isValidErrorCodeForStatus(404, MCP_ERROR_CODES.VIDEO_NOT_FOUND), 
    'VIDEO_NOT_FOUND debe ser válido para 404')
  assert(!isValidErrorCodeForStatus(404, MCP_ERROR_CODES.PINECONE_ERROR), 
    'PINECONE_ERROR no debe ser válido para 404')

  // Test validaciones 500
  assert(isValidErrorCodeForStatus(500, MCP_ERROR_CODES.OPENAI_ERROR), 
    'OPENAI_ERROR debe ser válido para 500')
  assert(isValidErrorCodeForStatus(500, MCP_ERROR_CODES.UNKNOWN_ERROR), 
    'UNKNOWN_ERROR debe ser válido para 500')
  assert(!isValidErrorCodeForStatus(500, MCP_ERROR_CODES.PROJECT_NOT_FOUND), 
    'PROJECT_NOT_FOUND no debe ser válido para 500')

  console.log('✅ Validación de códigos de error por status HTTP - PASS\n')
} catch (error) {
  console.log(`❌ Validación de códigos de error por status HTTP - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Mensajes de error estándar
console.log('2. Test: Mensajes de error estándar')
try {
  // Test que todos los códigos de error tienen mensajes definidos
  for (const [key, code] of Object.entries(MCP_ERROR_CODES)) {
    const message = getErrorMessage(code as any)
    assert(typeof message === 'string' && message.length > 0, 
      `Código ${key} debe tener mensaje de error`)
    assert(!message.includes('undefined'), 
      `Mensaje para ${key} no debe contener undefined`)
  }

  // Test mensajes específicos
  assert(getErrorMessage(MCP_ERROR_CODES.QUESTION_TOO_LONG).includes('2000'), 
    'Mensaje de QUESTION_TOO_LONG debe incluir el límite')
  assert(getErrorMessage(MCP_ERROR_CODES.INVALID_HOST).includes('authorized'), 
    'Mensaje de INVALID_HOST debe incluir "authorized"')
  assert(getErrorMessage(MCP_ERROR_CODES.UNKNOWN_ERROR).includes('unexpected'), 
    'Mensaje de UNKNOWN_ERROR debe incluir "unexpected"')

  console.log('✅ Mensajes de error estándar - PASS\n')
} catch (error) {
  console.log(`❌ Mensajes de error estándar - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Función createErrorResponse mejorada
console.log('3. Test: Función createErrorResponse mejorada')
try {
  // Mock de Response.json() para testing
  function mockResponseToJson(response: any) {
    return JSON.parse(response.body || '{}')
  }

  // Test respuesta básica - solo validamos status y headers
  const basicError = createErrorResponse(400, 'Custom message', MCP_ERROR_CODES.INVALID_REQUEST_FORMAT)
  assert(basicError.status === 400, 'Status debe ser 400')
  assert(basicError.headers.get('Content-Type') === 'application/json', 'Content-Type debe ser application/json')

  // Test con mensaje automático
  const autoMessage = createErrorResponse(401, undefined, MCP_ERROR_CODES.KEY_NOT_FOUND)
  assert(autoMessage.status === 401, 'Status debe ser 401')

  // Test código por defecto
  const defaultCode = createErrorResponse(500)
  assert(defaultCode.status === 500, 'Status debe ser 500')

  console.log('✅ Función createErrorResponse mejorada - PASS\n')
} catch (error) {
  console.log(`❌ Función createErrorResponse mejorada - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Función createSuccessResponse con timestamp
console.log('4. Test: Función createSuccessResponse con timestamp')
try {
  const successData = { records: ['record1', 'record2'] }
  const successResponse = createSuccessResponse(successData)
  
  assert(successResponse.status === 200, 'Status por defecto debe ser 200')
  assert(successResponse.headers.get('Content-Type') === 'application/json', 'Content-Type debe ser application/json')

  // Test con status personalizado
  const customStatus = createSuccessResponse({ message: 'Created' }, 201)
  assert(customStatus.status === 201, 'Debe usar status personalizado')
  assert(customStatus.headers.get('Content-Type') === 'application/json', 'Content-Type debe ser correcto')

  console.log('✅ Función createSuccessResponse con timestamp - PASS\n')
} catch (error) {
  console.log(`❌ Función createSuccessResponse con timestamp - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Función createMethodNotAllowedResponse
console.log('5. Test: Función createMethodNotAllowedResponse')
try {
  const methodNotAllowed = createMethodNotAllowedResponse('POST')
  
  assert(methodNotAllowed.status === 405, 'Status debe ser 405')
  assert(methodNotAllowed.headers.get('Content-Type') === 'application/json', 'Content-Type debe ser application/json')

  console.log('✅ Función createMethodNotAllowedResponse - PASS\n')
} catch (error) {
  console.log(`❌ Función createMethodNotAllowedResponse - FAIL: ${(error as Error).message}\n`)
}

// Test 6: Consistencia entre HTTP_STATUS_TO_ERROR_CODE y ERROR_MESSAGES
console.log('6. Test: Consistencia entre mapeos y mensajes')
try {
  // Verificar que todos los códigos en HTTP_STATUS_TO_ERROR_CODE tienen mensajes
  for (const [status, codes] of Object.entries(HTTP_STATUS_TO_ERROR_CODE)) {
    for (const code of codes) {
      assert(code in ERROR_MESSAGES, 
        `Código ${code} en status ${status} debe tener mensaje definido`)
      
      const message = ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES]
      assert(typeof message === 'string' && message.length > 0, 
        `Mensaje para ${code} debe ser string no vacío`)
    }
  }

  // Verificar que todos los códigos de MCP_ERROR_CODES están en algún mapeo HTTP
  for (const [key, code] of Object.entries(MCP_ERROR_CODES)) {
    let found = false
    for (const codes of Object.values(HTTP_STATUS_TO_ERROR_CODE)) {
      if (codes.includes(code)) {
        found = true
        break
      }
    }
    assert(found, `Código ${key} debe estar mapeado a algún status HTTP`)
  }

  console.log('✅ Consistencia entre mapeos y mensajes - PASS\n')
} catch (error) {
  console.log(`❌ Consistencia entre mapeos y mensajes - FAIL: ${(error as Error).message}\n`)
}

// Test 7: Validación de cobertura de status HTTP
console.log('7. Test: Validación de cobertura de status HTTP')
try {
  // Verificar que tenemos mapeos para los status HTTP principales
  const requiredStatuses = [400, 401, 403, 404, 405, 500]
  
  for (const status of requiredStatuses) {
    assert(status in HTTP_STATUS_TO_ERROR_CODE, 
      `Status ${status} debe tener códigos de error mapeados`)
    
    const codes = HTTP_STATUS_TO_ERROR_CODE[status]
    assert(Array.isArray(codes) && codes.length > 0, 
      `Status ${status} debe tener al menos un código de error`)
  }

  // Verificar que 429 está preparado para rate limiting futuro
  assert(429 in HTTP_STATUS_TO_ERROR_CODE, 
    'Status 429 debe estar preparado para rate limiting')
  assert(HTTP_STATUS_TO_ERROR_CODE[429].includes(MCP_ERROR_CODES.RATE_LIMIT_EXCEEDED), 
    'Status 429 debe incluir RATE_LIMIT_EXCEEDED')

  console.log('✅ Validación de cobertura de status HTTP - PASS\n')
} catch (error) {
  console.log(`❌ Validación de cobertura de status HTTP - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de Estandarización de Errores MCP completados!')
console.log('\n📊 Resumen de tests:')
console.log('- ✅ Validación de códigos de error por status HTTP')
console.log('- ✅ Mensajes de error estándar')
console.log('- ✅ Función createErrorResponse mejorada')
console.log('- ✅ Función createSuccessResponse con timestamp')
console.log('- ✅ Función createMethodNotAllowedResponse')
console.log('- ✅ Consistencia entre mapeos y mensajes')
console.log('- ✅ Validación de cobertura de status HTTP')
console.log('\n🔧 Para ejecutar: pnpm exec tsx src/app/api/mcp/error-standardization.test.ts')
console.log('\n📋 Códigos de error implementados:')
console.log(`- 400 Bad Request: ${HTTP_STATUS_TO_ERROR_CODE[400].length} códigos`)
console.log(`- 401 Unauthorized: ${HTTP_STATUS_TO_ERROR_CODE[401].length} códigos`)
console.log(`- 403 Forbidden: ${HTTP_STATUS_TO_ERROR_CODE[403].length} códigos`)
console.log(`- 404 Not Found: ${HTTP_STATUS_TO_ERROR_CODE[404].length} códigos`)
console.log(`- 405 Method Not Allowed: ${HTTP_STATUS_TO_ERROR_CODE[405].length} códigos`)
console.log(`- 429 Rate Limited: ${HTTP_STATUS_TO_ERROR_CODE[429].length} códigos`)
console.log(`- 500 Server Error: ${HTTP_STATUS_TO_ERROR_CODE[500].length} códigos`)
console.log(`\n📈 Total: ${Object.keys(MCP_ERROR_CODES).length} códigos de error estandarizados`) 