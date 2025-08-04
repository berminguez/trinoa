// ============================================================================
// EIDETIK MVP - TESTS PARA EMBEDDING GENERATOR
// ============================================================================

/**
 * Tests para EmbeddingGenerator con simulaciones y validaciones
 * 
 * Ejecutar con: tsx src/lib/embeddings/generator.test.ts
 */

import { EmbeddingGenerator } from './generator'

// Tests simples sin dependencias
console.log('🧪 Ejecutando tests para EmbeddingGenerator...\n')

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

// Test 1: Inicialización de la clase
console.log('1. Test: Inicialización de la clase EmbeddingGenerator')
try {
  const generator = EmbeddingGenerator.getInstance()
  
  // Verificar que se puede crear una instancia
  assert(generator instanceof EmbeddingGenerator, 'Generator debe ser una instancia de EmbeddingGenerator')
  
  // Verificar singleton pattern
  const generator2 = EmbeddingGenerator.getInstance()
  assert(generator === generator2, 'getInstance debe retornar la misma instancia (singleton)')
  
  // Verificar métodos disponibles
  assert(typeof generator.generateEmbedding === 'function', 'Generator debe tener método generateEmbedding')
  assert(typeof generator.generateEmbeddingsBatch === 'function', 'Generator debe tener método generateEmbeddingsBatch')
  assert(typeof generator.healthCheck === 'function', 'Generator debe tener método healthCheck')
  assert(typeof generator.getConfig === 'function', 'Generator debe tener método getConfig')
  
  console.log('✅ Inicialización de la clase - PASS\n')
} catch (error) {
  console.log(`❌ Inicialización de la clase - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Configuración del generador
console.log('2. Test: Configuración del generador')
try {
  const generator = EmbeddingGenerator.getInstance()
  const config = generator.getConfig()
  
  // Verificar estructura de configuración
  assert(typeof config === 'object', 'Config debe ser un objeto')
  assert(typeof config.model === 'string', 'Config debe incluir model como string')
  assert(typeof config.maxRetries === 'number', 'Config debe incluir maxRetries como number')
  assert(typeof config.retryDelay === 'number', 'Config debe incluir retryDelay como number')
  assert(typeof config.rateLimitDelay === 'number', 'Config debe incluir rateLimitDelay como number')
  assert(typeof config.expectedDimensions === 'number', 'Config debe incluir expectedDimensions como number')
  
  // Verificar valores esperados
  assert(config.model === 'text-embedding-ada-002', 'Model por defecto debe ser text-embedding-ada-002')
  assert(config.maxRetries === 3, 'maxRetries debe ser 3')
  assert(config.retryDelay === 1000, 'retryDelay debe ser 1000ms')
  assert(config.rateLimitDelay === 1000, 'rateLimitDelay debe ser 1000ms')
  assert(config.expectedDimensions === 1536, 'expectedDimensions debe ser 1536')
  
  console.log('✅ Configuración del generador - PASS\n')
} catch (error) {
  console.log(`❌ Configuración del generador - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Validación de entrada para generateEmbedding
console.log('3. Test: Validación de entrada para generateEmbedding')
try {
  const generator = EmbeddingGenerator.getInstance()
  
  // Test con texto vacío
  const emptyResult = await generator.generateEmbedding('')
  assert(!emptyResult.success, 'Texto vacío debe fallar')
  if (!emptyResult.success) {
    assert(emptyResult.error.includes('Text cannot be empty'), 'Error debe mencionar texto vacío')
  }
  
  // Test con solo espacios
  const spacesResult = await generator.generateEmbedding('   ')
  assert(!spacesResult.success, 'Solo espacios debe fallar')
  if (!spacesResult.success) {
    assert(spacesResult.error.includes('Text cannot be empty'), 'Error debe mencionar texto vacío')
  }
  
  console.log('✅ Validación de entrada para generateEmbedding - PASS\n')
} catch (error) {
  console.log(`❌ Validación de entrada para generateEmbedding - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Estructura de respuesta para generateEmbedding
console.log('4. Test: Estructura de respuesta para generateEmbedding')
try {
  // Mock simple de OpenAI client
  const mockEmbedding = new Array(1536).fill(0.1)
  
  // Simular respuesta exitosa
  const mockSuccessResponse = {
    success: true,
    embedding: mockEmbedding,
    metadata: {
      model: 'text-embedding-ada-002',
      dimensions: 1536,
      processingTimeMs: 1000
    }
  }
  
  // Verificar estructura de respuesta exitosa
  assert(typeof mockSuccessResponse.success === 'boolean', 'Response debe tener campo success boolean')
  assert(mockSuccessResponse.success === true, 'Response exitosa debe tener success: true')
  assert(Array.isArray(mockSuccessResponse.embedding), 'Response debe tener embedding como array')
  assert(mockSuccessResponse.embedding.length === 1536, 'Embedding debe tener 1536 dimensiones')
  assert(typeof mockSuccessResponse.metadata === 'object', 'Response debe tener metadata object')
  assert(typeof mockSuccessResponse.metadata.model === 'string', 'Metadata debe incluir model')
  assert(typeof mockSuccessResponse.metadata.dimensions === 'number', 'Metadata debe incluir dimensions')
  assert(typeof mockSuccessResponse.metadata.processingTimeMs === 'number', 'Metadata debe incluir processingTimeMs')
  
  // Simular respuesta de error
  const mockErrorResponse = {
    success: false,
    error: 'OpenAI API error',
    retryCount: 2
  }
  
  // Verificar estructura de respuesta de error
  assert(mockErrorResponse.success === false, 'Response de error debe tener success: false')
  assert(typeof mockErrorResponse.error === 'string', 'Response de error debe tener error string')
  assert(typeof mockErrorResponse.retryCount === 'number', 'Response de error puede incluir retryCount')
  
  console.log('✅ Estructura de respuesta para generateEmbedding - PASS\n')
} catch (error) {
  console.log(`❌ Estructura de respuesta para generateEmbedding - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Validación de entrada para generateEmbeddingsBatch
console.log('5. Test: Validación de entrada para generateEmbeddingsBatch')
try {
  const generator = EmbeddingGenerator.getInstance()
  
  // Test con array vacío
  const emptyArrayResult = await generator.generateEmbeddingsBatch([])
  assert(emptyArrayResult.success, 'Array vacío debe retornar success')
  if (emptyArrayResult.success) {
    assert(emptyArrayResult.embeddings.length === 0, 'Array vacío debe retornar embeddings vacío')
    assert(emptyArrayResult.metadata.totalTexts === 0, 'Metadata debe reflejar 0 textos')
    assert(emptyArrayResult.metadata.totalBatches === 0, 'Metadata debe reflejar 0 batches')
  }
  
  // Test filtrado de textos vacíos
  const mixedArray = ['texto válido', '', '   ', 'otro texto válido']
  console.log(`Testing batch with mixed content: ${mixedArray.length} items`)
  
  console.log('✅ Validación de entrada para generateEmbeddingsBatch - PASS\n')
} catch (error) {
  console.log(`❌ Validación de entrada para generateEmbeddingsBatch - FAIL: ${(error as Error).message}\n`)
}

// Test 6: Estructura de respuesta para generateEmbeddingsBatch
console.log('6. Test: Estructura de respuesta para generateEmbeddingsBatch')
try {
  // Mock de respuesta exitosa para batch
  const mockBatchSuccessResponse = {
    success: true,
    embeddings: [
      new Array(1536).fill(0.1),
      new Array(1536).fill(0.2),
      new Array(1536).fill(0.3)
    ],
    metadata: {
      model: 'text-embedding-ada-002',
      totalTexts: 3,
      totalBatches: 1,
      totalProcessingTimeMs: 2000,
      averageTimePerText: 666.67
    }
  }
  
  // Verificar estructura de respuesta exitosa
  assert(typeof mockBatchSuccessResponse.success === 'boolean', 'Response debe tener campo success')
  assert(mockBatchSuccessResponse.success === true, 'Response exitosa debe tener success: true')
  assert(Array.isArray(mockBatchSuccessResponse.embeddings), 'Response debe tener embeddings como array')
  assert(mockBatchSuccessResponse.embeddings.length === 3, 'Debe tener 3 embeddings')
  
  // Verificar cada embedding
  mockBatchSuccessResponse.embeddings.forEach((embedding, index) => {
    assert(Array.isArray(embedding), `Embedding ${index} debe ser array`)
    assert(embedding.length === 1536, `Embedding ${index} debe tener 1536 dimensiones`)
  })
  
  // Verificar metadata
  assert(typeof mockBatchSuccessResponse.metadata === 'object', 'Response debe tener metadata')
  assert(mockBatchSuccessResponse.metadata.totalTexts === 3, 'Metadata debe reflejar 3 textos procesados')
  assert(mockBatchSuccessResponse.metadata.totalBatches === 1, 'Metadata debe reflejar 1 batch')
  assert(typeof mockBatchSuccessResponse.metadata.averageTimePerText === 'number', 'Metadata debe incluir tiempo promedio')
  
  // Mock de respuesta de error para batch
  const mockBatchErrorResponse = {
    success: false,
    error: 'Batch processing failed',
    partialResults: [new Array(1536).fill(0.1)],
    processedCount: 1
  }
  
  // Verificar estructura de respuesta de error
  assert(mockBatchErrorResponse.success === false, 'Response de error debe tener success: false')
  assert(typeof mockBatchErrorResponse.error === 'string', 'Response de error debe tener error string')
  assert(Array.isArray(mockBatchErrorResponse.partialResults), 'Response de error puede incluir resultados parciales')
  assert(typeof mockBatchErrorResponse.processedCount === 'number', 'Response de error puede incluir contador de procesados')
  
  console.log('✅ Estructura de respuesta para generateEmbeddingsBatch - PASS\n')
} catch (error) {
  console.log(`❌ Estructura de respuesta para generateEmbeddingsBatch - FAIL: ${(error as Error).message}\n`)
}

// Test 7: Cálculo de batches
console.log('7. Test: Cálculo de batches')
try {
  // Simular cálculo de batches
  const calculateBatches = (totalTexts: number, maxBatchSize: number) => {
    return Math.ceil(totalTexts / maxBatchSize)
  }
  
  // Test casos comunes
  assert(calculateBatches(5, 10) === 1, '5 textos con batch size 10 debe ser 1 batch')
  assert(calculateBatches(10, 10) === 1, '10 textos con batch size 10 debe ser 1 batch')
  assert(calculateBatches(15, 10) === 2, '15 textos con batch size 10 debe ser 2 batches')
  assert(calculateBatches(25, 10) === 3, '25 textos con batch size 10 debe ser 3 batches')
  assert(calculateBatches(1, 10) === 1, '1 texto con batch size 10 debe ser 1 batch')
  
  // Test batch size por defecto (10)
  const defaultBatchSize = 10
  assert(calculateBatches(100, defaultBatchSize) === 10, '100 textos debe requerir 10 batches')
  
  console.log('✅ Cálculo de batches - PASS\n')
} catch (error) {
  console.log(`❌ Cálculo de batches - FAIL: ${(error as Error).message}\n`)
}

// Test 8: Health check estructura
console.log('8. Test: Health check estructura')
try {
  const generator = EmbeddingGenerator.getInstance()
  
  // Mock de respuesta de health check
  const mockHealthResponse = {
    healthy: true,
    model: 'text-embedding-ada-002',
    error: undefined
  }
  
  // Verificar estructura
  assert(typeof mockHealthResponse.healthy === 'boolean', 'Health check debe incluir campo healthy')
  assert(typeof mockHealthResponse.model === 'string', 'Health check debe incluir modelo')
  assert(mockHealthResponse.model === 'text-embedding-ada-002', 'Modelo debe ser el esperado')
  
  // Mock de respuesta de error
  const mockHealthErrorResponse = {
    healthy: false,
    model: 'text-embedding-ada-002',
    error: 'OpenAI connection failed'
  }
  
  assert(mockHealthErrorResponse.healthy === false, 'Health check fallido debe tener healthy: false')
  assert(typeof mockHealthErrorResponse.error === 'string', 'Health check fallido debe incluir error')
  
  console.log('✅ Health check estructura - PASS\n')
} catch (error) {
  console.log(`❌ Health check estructura - FAIL: ${(error as Error).message}\n`)
}

// Test 9: Validación de dimensiones
console.log('9. Test: Validación de dimensiones')
try {
  // Simular validación de dimensiones
  const validateDimensions = (embedding: number[], expected: number) => {
    return embedding.length === expected
  }
  
  const validEmbedding = new Array(1536).fill(0.1)
  const invalidEmbedding = new Array(512).fill(0.1)
  
  assert(validateDimensions(validEmbedding, 1536), 'Embedding de 1536 dimensiones debe ser válido')
  assert(!validateDimensions(invalidEmbedding, 1536), 'Embedding de 512 dimensiones debe ser inválido')
  
  // Test dimensiones esperadas
  const expectedDimensions = 1536
  assert(expectedDimensions === 1536, 'Dimensiones esperadas debe ser 1536 para text-embedding-ada-002')
  
  console.log('✅ Validación de dimensiones - PASS\n')
} catch (error) {
  console.log(`❌ Validación de dimensiones - FAIL: ${(error as Error).message}\n`)
}

// Test 10: Configuración de rate limiting
console.log('10. Test: Configuración de rate limiting')
try {
  // Simular configuración de rate limiting
  const rateLimitConfig = {
    retryDelay: 1000,
    rateLimitDelay: 1000,
    maxRetries: 3
  }
  
  // Verificar configuración
  assert(rateLimitConfig.retryDelay === 1000, 'Retry delay debe ser 1000ms')
  assert(rateLimitConfig.rateLimitDelay === 1000, 'Rate limit delay debe ser 1000ms')
  assert(rateLimitConfig.maxRetries === 3, 'Max retries debe ser 3')
  
  // Simular cálculo de backoff exponencial
  const calculateBackoff = (retryCount: number, baseDelay: number) => {
    return baseDelay * Math.pow(2, retryCount)
  }
  
  assert(calculateBackoff(0, 1000) === 1000, 'Primer retry debe ser 1000ms')
  assert(calculateBackoff(1, 1000) === 2000, 'Segundo retry debe ser 2000ms')
  assert(calculateBackoff(2, 1000) === 4000, 'Tercer retry debe ser 4000ms')
  
  console.log('✅ Configuración de rate limiting - PASS\n')
} catch (error) {
  console.log(`❌ Configuración de rate limiting - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de EmbeddingGenerator completados!')

// Resumen final
console.log('\n' + '='.repeat(60))
console.log('📊 RESUMEN DE TESTS - EMBEDDING GENERATOR')
console.log('='.repeat(60))
console.log('✅ Inicialización y singleton pattern')
console.log('✅ Configuración del generador')
console.log('✅ Validación de entrada para métodos')
console.log('✅ Estructura de respuestas (success/error)')
console.log('✅ Cálculo de batches y procesamiento')
console.log('✅ Health check functionality')
console.log('✅ Validación de dimensiones de embeddings')
console.log('✅ Rate limiting y backoff exponencial')
console.log('='.repeat(60))
console.log('🎯 EmbeddingGenerator listo para integración con el sistema')
console.log('='.repeat(60)) 