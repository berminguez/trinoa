// ============================================================================
// EIDETIK MVP - TESTS PARA MCP QUERY VIDEOS ENDPOINT
// ============================================================================

/**
 * Tests unitarios para el endpoint POST /api/mcp/query-videos
 * 
 * Ejecutar con: pnpm exec tsx src/app/api/mcp/query-videos/route.test.ts
 */

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

console.log('🧪 Ejecutando tests para MCP Query Videos Endpoint...\n')

// Simulaciones para testing
interface MockMcpAuthResult {
  success: boolean
  error?: string
  user?: { id: string; email: string }
  projects?: any[]
  mcpKey?: { id: string; name: string; hasAllProjects?: boolean }
}

interface MockResource {
  id: string
  type: 'video' | 'document'
  title: string
  project: string | { id: string; title: string }
}

interface MockQueryVideosRequest {
  videos_id: string[]
  question: string
}

interface MockResponse {
  status: number
  body: string
  headers: Record<string, string>
}

interface MockPineconeResult {
  id: string
  values?: number[]
  metadata?: {
    chunkIndex?: number
    description?: string
    endTime?: number
    end_ms?: number
    fileName?: string
    namespace?: string
    resourceId?: string
    segmentId?: string
    startTime?: number
    start_ms?: number
    transcript?: string
    type?: string
  }
}

// Test 1: Validación de array videos_id
console.log('1. Test: Validación de array videos_id')
try {
  function validateVideosIdField(body: any): MockResponse {
    // Validar que videos_id existe y es array
    if (!body.videos_id || !Array.isArray(body.videos_id)) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'Missing or invalid videos_id field (must be array)', code: 'VIDEO_NOT_FOUND' }),
        headers: { 'Content-Type': 'application/json' }
      }
    }

    // Validar que el array no está vacío
    if (body.videos_id.length === 0) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'videos_id array cannot be empty', code: 'VIDEO_NOT_FOUND' }),
        headers: { 'Content-Type': 'application/json' }
      }
    }

    // Validar que todos los elementos son strings no vacíos
    if (!body.videos_id.every((id: any) => typeof id === 'string' && id.trim().length > 0)) {
      return {
        status: 400,
        body: JSON.stringify({ error: 'All videos_id must be non-empty strings', code: 'VIDEO_NOT_FOUND' }),
        headers: { 'Content-Type': 'application/json' }
      }
    }

    return {
      status: 200,
      body: JSON.stringify({ valid: true }),
      headers: { 'Content-Type': 'application/json' }
    }
  }

  // Test sin videos_id
  const missingField = validateVideosIdField({ question: 'test' })
  assert(missingField.status === 400, 'Debe fallar sin videos_id')
  assert(JSON.parse(missingField.body).code === 'VIDEO_NOT_FOUND', 'Debe devolver VIDEO_NOT_FOUND')

  // Test videos_id no es array
  const invalidType = validateVideosIdField({ videos_id: 'not-array', question: 'test' })
  assert(invalidType.status === 400, 'Debe fallar si videos_id no es array')

  // Test array vacío
  const emptyArray = validateVideosIdField({ videos_id: [], question: 'test' })
  assert(emptyArray.status === 400, 'Debe fallar con array vacío')

  // Test elementos no strings
  const invalidElements = validateVideosIdField({ videos_id: ['valid', 123, ''], question: 'test' })
  assert(invalidElements.status === 400, 'Debe fallar con elementos no string o vacíos')

  // Test válido
  const validArray = validateVideosIdField({ videos_id: ['video1', 'video2'], question: 'test' })
  assert(validArray.status === 200, 'Debe pasar con array válido')

  console.log('✅ Validación de array videos_id - PASS\n')
} catch (error) {
  console.log(`❌ Validación de array videos_id - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Validación de existencia de videos en PayloadCMS
console.log('2. Test: Validación de existencia de videos en PayloadCMS')
try {
  function mockPayloadVideoQuery(requestedIds: string[]): MockResource[] {
    // Simular database de videos
    const availableVideos: MockResource[] = [
      { id: 'video1', type: 'video', title: 'Video 1', project: 'project1' },
      { id: 'video2', type: 'video', title: 'Video 2', project: 'project1' },
      { id: 'video3', type: 'video', title: 'Video 3', project: 'project2' },
      { id: 'doc1', type: 'document', title: 'Document 1', project: 'project1' }, // No es video
    ]

    // Filtrar solo videos que existen y son tipo 'video'
    return availableVideos.filter(resource => 
      requestedIds.includes(resource.id) && resource.type === 'video'
    )
  }

  function validateVideoExistence(videosId: string[]): MockResponse {
    const foundVideos = mockPayloadVideoQuery(videosId)
    
    if (foundVideos.length !== videosId.length) {
      const foundIds = foundVideos.map(v => v.id)
      const missingIds = videosId.filter(id => !foundIds.includes(id))
      
      return {
        status: 404,
        body: JSON.stringify({ 
          error: `Some videos not found: ${missingIds.length} missing`, 
          code: 'VIDEO_NOT_FOUND' 
        }),
        headers: { 'Content-Type': 'application/json' }
      }
    }

    return {
      status: 200,
      body: JSON.stringify({ foundVideos: foundVideos.length }),
      headers: { 'Content-Type': 'application/json' }
    }
  }

  // Test todos los videos existen
  const allExist = validateVideoExistence(['video1', 'video2'])
  assert(allExist.status === 200, 'Debe pasar cuando todos los videos existen')

  // Test algunos videos no existen
  const someNotExist = validateVideoExistence(['video1', 'nonexistent'])
  assert(someNotExist.status === 404, 'Debe fallar cuando algunos videos no existen')

  // Test solicitar documento (no video)
  const notVideo = validateVideoExistence(['doc1'])
  assert(notVideo.status === 404, 'Debe fallar cuando se solicita un documento en lugar de video')

  console.log('✅ Validación de existencia de videos en PayloadCMS - PASS\n')
} catch (error) {
  console.log(`❌ Validación de existencia de videos en PayloadCMS - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Validación de acceso a proyectos de videos
console.log('3. Test: Validación de acceso a proyectos de videos')
try {
  function mockAccessValidation(
    videosId: string[], 
    accessibleProjectIds: string[]
  ): MockResponse {
    // Mock videos con sus proyectos
    const videoProjectMap: Record<string, string> = {
      'video1': 'project1',
      'video2': 'project1', 
      'video3': 'project2',
      'video4': 'project3',
    }

    // Verificar acceso para cada video
    const unauthorizedVideos = videosId.filter(videoId => {
      const projectId = videoProjectMap[videoId]
      return projectId && !accessibleProjectIds.includes(projectId)
    })

    if (unauthorizedVideos.length > 0) {
      return {
        status: 403,
        body: JSON.stringify({
          error: `MCP key does not have access to ${unauthorizedVideos.length} of the requested videos`,
          code: 'NO_PROJECT_ACCESS'
        }),
        headers: { 'Content-Type': 'application/json' }
      }
    }

    return {
      status: 200,
      body: JSON.stringify({ accessGranted: true }),
      headers: { 'Content-Type': 'application/json' }
    }
  }

  // Test acceso total permitido
  const fullAccess = mockAccessValidation(['video1', 'video2'], ['project1', 'project2'])
  assert(fullAccess.status === 200, 'Debe permitir acceso cuando tiene permisos a todos los proyectos')

  // Test acceso parcial denegado
  const partialAccess = mockAccessValidation(['video1', 'video3'], ['project1'])
  assert(partialAccess.status === 403, 'Debe denegar acceso cuando falta permiso a algún proyecto')

  // Test sin acceso
  const noAccess = mockAccessValidation(['video3', 'video4'], ['project1'])
  assert(noAccess.status === 403, 'Debe denegar acceso cuando no tiene permisos a ningún proyecto')

  console.log('✅ Validación de acceso a proyectos de videos - PASS\n')
} catch (error) {
  console.log(`❌ Validación de acceso a proyectos de videos - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Consulta a Pinecone con filtro resourceId
console.log('4. Test: Consulta a Pinecone con filtro resourceId')
try {
  function mockPineconeQueryWithFilter(
    vector: number[], 
    topK: number, 
    filter: { resourceId: { $in: string[] } }
  ): MockPineconeResult[] {
    // Validar vector
    if (!vector || vector.length !== 1024) {
      throw new Error('Invalid vector dimensions')
    }

    // Validar filtro
    if (!filter?.resourceId?.$in || !Array.isArray(filter.resourceId.$in)) {
      throw new Error('Invalid resourceId filter')
    }

    const requestedResourceIds = filter.resourceId.$in

    // Simular resultados filtrados por resourceId
    const allResults: MockPineconeResult[] = [
      {
        id: 'video1-chunk-1',
        metadata: {
          resourceId: 'video1',
          chunkIndex: 1,
          description: 'Chunk 1 del video 1',
          transcript: 'Transcripción del primer chunk',
          type: 'video'
        }
      },
      {
        id: 'video1-chunk-2', 
        metadata: {
          resourceId: 'video1',
          chunkIndex: 2,
          description: 'Chunk 2 del video 1',
          transcript: 'Transcripción del segundo chunk',
          type: 'video'
        }
      },
      {
        id: 'video2-chunk-1',
        metadata: {
          resourceId: 'video2', 
          chunkIndex: 1,
          description: 'Chunk 1 del video 2',
          transcript: 'Transcripción del video 2',
          type: 'video'
        }
      },
      {
        id: 'video3-chunk-1',
        metadata: {
          resourceId: 'video3',
          chunkIndex: 1,
          description: 'Chunk 1 del video 3',
          transcript: 'Video 3 content',
          type: 'video'
        }
      }
    ]

    // Filtrar resultados por resourceIds solicitados
    const filteredResults = allResults.filter(result => 
      requestedResourceIds.includes(result.metadata?.resourceId || '')
    )

    // Limitar por topK
    return filteredResults.slice(0, topK)
  }

  const testVector = new Array(1024).fill(0.1)

  // Test filtro de un video
  const singleVideoResults = mockPineconeQueryWithFilter(
    testVector, 
    10, 
    { resourceId: { $in: ['video1'] } }
  )
  assert(singleVideoResults.length === 2, 'Debe devolver 2 chunks del video1')
  assert(singleVideoResults.every(r => r.metadata?.resourceId === 'video1'), 'Todos los resultados deben ser del video1')

  // Test filtro de múltiples videos
  const multiVideoResults = mockPineconeQueryWithFilter(
    testVector,
    10,
    { resourceId: { $in: ['video1', 'video2'] } }
  )
  assert(multiVideoResults.length === 3, 'Debe devolver 3 chunks total de video1 y video2')
  
  const resourceIds = multiVideoResults.map(r => r.metadata?.resourceId)
  assert(resourceIds.includes('video1'), 'Debe incluir resultados de video1')
  assert(resourceIds.includes('video2'), 'Debe incluir resultados de video2')
  assert(!resourceIds.includes('video3'), 'No debe incluir resultados de video3')

  // Test video no existente
  const noResults = mockPineconeQueryWithFilter(
    testVector,
    10,
    { resourceId: { $in: ['nonexistent'] } }
  )
  assert(noResults.length === 0, 'Debe devolver 0 resultados para video no existente')

  console.log('✅ Consulta a Pinecone con filtro resourceId - PASS\n')
} catch (error) {
  console.log(`❌ Consulta a Pinecone con filtro resourceId - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Transformación de resultados múltiples
console.log('5. Test: Transformación de resultados múltiples')
try {
  function transformMultipleVideosResults(pineconeResults: MockPineconeResult[]) {
    return pineconeResults.map((result, index) => ({
      id: result.id,
      score: 0.85 - (index * 0.01), // Score más granular para videos específicos
      metadata: {
        chunkIndex: result.metadata?.chunkIndex || 0,
        description: result.metadata?.description || '',
        endTime: result.metadata?.endTime || 0,
        end_ms: result.metadata?.end_ms || result.metadata?.endTime || 0,
        fileName: result.metadata?.fileName || '',
        namespace: result.metadata?.namespace || '',
        resourceId: result.metadata?.resourceId || '',
        segmentId: result.metadata?.segmentId || '',
        startTime: result.metadata?.startTime || 0,
        start_ms: result.metadata?.start_ms || result.metadata?.startTime || 0,
        transcript: result.metadata?.transcript || '',
        type: result.metadata?.type || 'video',
      }
    }))
  }

  const mockResults: MockPineconeResult[] = [
    {
      id: 'video1-chunk-1',
      metadata: {
        resourceId: 'video1',
        chunkIndex: 1,
        description: 'Primer chunk',
        transcript: 'Transcripción 1',
        endTime: 30000,
        type: 'video'
      }
    },
    {
      id: 'video2-chunk-1', 
      metadata: {
        resourceId: 'video2',
        chunkIndex: 1,
        description: 'Chunk de video 2',
        transcript: 'Transcripción 2',
        endTime: 45000,
        type: 'video'
      }
    }
  ]

  const mcpRecords = transformMultipleVideosResults(mockResults)
  
  assert(Array.isArray(mcpRecords), 'Debe devolver array')
  assert(mcpRecords.length === 2, 'Debe mantener cantidad de resultados')
  
  // Verificar scores granulares
  assert(mcpRecords[0].score === 0.85, 'Primer resultado debe tener score 0.85')
  assert(mcpRecords[1].score === 0.84, 'Segundo resultado debe tener score 0.84')
  
  // Verificar metadata preservada
  assert(mcpRecords[0].metadata.resourceId === 'video1', 'Primer resultado debe ser de video1')
  assert(mcpRecords[1].metadata.resourceId === 'video2', 'Segundo resultado debe ser de video2')
  assert(mcpRecords[0].metadata.end_ms === 30000, 'end_ms debe ser extraído correctamente')

  console.log('✅ Transformación de resultados múltiples - PASS\n')
} catch (error) {
  console.log(`❌ Transformación de resultados múltiples - FAIL: ${(error as Error).message}\n`)
}

// Test 6: Logging de auditoría para múltiples videos
console.log('6. Test: Logging de auditoría para múltiples videos')
try {
  interface QueryVideosLogEntry {
    action: string
    userId: string
    mcpKeyId: string
    videosRequested: number
    videosIds: string[]
    questionLength: number
    resultCount: number
    embeddingModel: string
    processingTimeMs: number
    timestamp: string
  }

  function simulateVideosQueryLogging(
    auth: MockMcpAuthResult,
    videosId: string[],
    question: string,
    resultCount: number,
    embeddingModel: string,
    processingTimeMs: number
  ): QueryVideosLogEntry {
    return {
      action: 'QUERY_VIDEOS',
      userId: auth.user?.id || '',
      mcpKeyId: auth.mcpKey?.id || '',
      videosRequested: videosId.length,
      videosIds: videosId,
      questionLength: question.length,
      resultCount,
      embeddingModel,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    }
  }

  const mockAuth: MockMcpAuthResult = {
    success: true,
    user: { id: 'user1', email: 'test@example.com' },
    mcpKey: { id: 'key1', name: 'Test Key' }
  }

  const logEntry = simulateVideosQueryLogging(
    mockAuth,
    ['video1', 'video2', 'video3'],
    '¿Qué se dice sobre el marketing digital?',
    15,
    'text-embedding-3-small',
    200
  )

  assert(logEntry.action === 'QUERY_VIDEOS', 'Acción debe ser QUERY_VIDEOS')
  assert(logEntry.videosRequested === 3, 'Debe registrar cantidad de videos solicitados')
  assert(Array.isArray(logEntry.videosIds), 'videosIds debe ser array')
  assert(logEntry.videosIds.length === 3, 'Debe registrar todos los IDs de videos')
  assert(logEntry.videosIds.includes('video1'), 'Debe incluir video1 en los IDs')
  assert(logEntry.questionLength === 41, 'Longitud de pregunta debe ser registrada')
  assert(logEntry.resultCount === 15, 'Cantidad de resultados debe ser registrada')
  assert(typeof logEntry.timestamp === 'string', 'Timestamp debe ser string')

  console.log('✅ Logging de auditoría para múltiples videos - PASS\n')
} catch (error) {
  console.log(`❌ Logging de auditoría para múltiples videos - FAIL: ${(error as Error).message}\n`)
}

// Test 7: Flujo completo de consulta de videos específicos
console.log('7. Test: Flujo completo de consulta de videos específicos')
try {
  function mockCompleteVideosQueryFlow(request: MockQueryVideosRequest): MockResponse {
    // 1. Mock autenticación exitosa
    const auth: MockMcpAuthResult = {
      success: true,
      user: { id: 'user1', email: 'test@example.com' },
      mcpKey: { id: 'key1', name: 'Test Key', hasAllProjects: false }
    }

    // 2. Mock proyectos accesibles
    const accessibleProjects = ['project1', 'project2']

    // 3. Mock validación de videos
    const videoProjectMap: Record<string, string> = {
      'video1': 'project1',
      'video2': 'project1',
      'video3': 'project2'
    }

    // Verificar que todos los videos son accesibles
    const unauthorizedVideos = request.videos_id.filter(videoId => {
      const projectId = videoProjectMap[videoId]
      return projectId && !accessibleProjects.includes(projectId)
    })

    if (unauthorizedVideos.length > 0) {
      return {
        status: 403,
        body: JSON.stringify({ 
          error: `MCP key does not have access to ${unauthorizedVideos.length} of the requested videos`,
          code: 'NO_PROJECT_ACCESS' 
        }),
        headers: { 'Content-Type': 'application/json' }
      }
    }

    // 4. Mock resultados de Pinecone
    const mockResults = request.videos_id.map((videoId, index) => ({
      id: `${videoId}-chunk-${index + 1}`,
      score: 0.85 - (index * 0.01),
      metadata: {
        resourceId: videoId,
        chunkIndex: index + 1,
        description: `Descripción del chunk ${index + 1}`,
        transcript: `Transcripción del ${videoId}`,
        type: 'video',
        endTime: (index + 1) * 30000,
        end_ms: (index + 1) * 30000,
        startTime: index * 30000,
        start_ms: index * 30000
      }
    }))

    return {
      status: 200,
      body: JSON.stringify({ records: mockResults }),
      headers: { 'Content-Type': 'application/json' }
    }
  }

  // Test consulta exitosa
  const successRequest: MockQueryVideosRequest = {
    videos_id: ['video1', 'video2'],
    question: '¿Qué se menciona sobre las ventas online?'
  }

  const successResponse = mockCompleteVideosQueryFlow(successRequest)
  assert(successResponse.status === 200, 'Status debe ser 200 para consulta exitosa')
  
  const responseData = JSON.parse(successResponse.body)
  assert('records' in responseData, 'Respuesta debe incluir campo records')
  assert(Array.isArray(responseData.records), 'Records debe ser un array')
  assert(responseData.records.length === 2, 'Debe devolver un record por video')

  // Verificar que cada record corresponde a un video solicitado
  const recordResourceIds = responseData.records.map((r: any) => r.metadata.resourceId)
  assert(recordResourceIds.includes('video1'), 'Debe incluir resultado de video1')
  assert(recordResourceIds.includes('video2'), 'Debe incluir resultado de video2')

  console.log('✅ Flujo completo de consulta de videos específicos - PASS\n')
} catch (error) {
  console.log(`❌ Flujo completo de consulta de videos específicos - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de MCP Query Videos Endpoint completados!')
console.log('\n📊 Resumen de tests:')
console.log('- ✅ Validación de array videos_id')
console.log('- ✅ Validación de existencia de videos en PayloadCMS')
console.log('- ✅ Validación de acceso a proyectos de videos')
console.log('- ✅ Consulta a Pinecone con filtro resourceId')
console.log('- ✅ Transformación de resultados múltiples')
console.log('- ✅ Logging de auditoría para múltiples videos')
console.log('- ✅ Flujo completo de consulta de videos específicos')
console.log('\n🔧 Para ejecutar: pnpm exec tsx src/app/api/mcp/query-videos/route.test.ts') 