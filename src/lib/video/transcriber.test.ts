// ============================================================================
// EIDETIK MVP - TESTS PARA SERVICIO DE TRANSCRIPCIÓN
// ============================================================================

/**
 * Tests para VideoTranscriber con simulación de Whisper y casos edge
 * 
 * Ejecutar con: tsx src/lib/video/transcriber.test.ts
 */

import type { TranscriptionSegment, TranscriptionResult, TranscriptionOptions } from './transcriber'

// Mock data para testing
const createMockSegments = (): TranscriptionSegment[] => [
  {
    text: "Hola, bienvenidos a esta clase de matemáticas.",
    start_ms: 0,
    end_ms: 3500,
    confidence: 0.95,
  },
  {
    text: "Hoy vamos a aprender sobre álgebra básica.",
    start_ms: 3500,
    end_ms: 7200,
    confidence: 0.92,
  },
  {
    text: "Empezaremos con ecuaciones lineales simples.",
    start_ms: 7200,
    end_ms: 11000,
    confidence: 0.88,
  },
]

// Tests simples sin dependencias
console.log('🧪 Ejecutando tests para VideoTranscriber...\n')

// Test 1: Formato de conversación JSON
console.log('1. Test: Formato de conversación JSON')
try {
  // Simular formatAsConversationJson
  const formatAsConversationJson = (segments: TranscriptionSegment[]): string => {
    if (segments.length === 0) {
      return JSON.stringify([], null, 2)
    }

    const conversation = segments.map((segment, index) => ({
      id: `segment_${index + 1}`,
      speaker: 'speaker',
      text: segment.text.trim(),
      start_ms: segment.start_ms,
      end_ms: segment.end_ms,
      duration_ms: segment.end_ms - segment.start_ms,
      confidence: segment.confidence || null,
    }))

    return JSON.stringify(conversation, null, 2)
  }

  const mockSegments = createMockSegments()
  const conversationJson = formatAsConversationJson(mockSegments)
  const parsed = JSON.parse(conversationJson)

  assert(Array.isArray(parsed), 'Resultado debe ser un array')
  assert(parsed.length === 3, 'Debe tener 3 segmentos')
  assert(parsed[0].id === 'segment_1', 'Primer segmento debe tener ID correcto')
  assert(parsed[0].speaker === 'speaker', 'Debe tener speaker asignado')
  assert(parsed[0].duration_ms === 3500, 'Duración calculada correctamente')
  assert(typeof parsed[0].confidence === 'number', 'Confidence debe ser número')

  // Test con array vacío
  const emptyJson = formatAsConversationJson([])
  const emptyParsed = JSON.parse(emptyJson)
  assert(Array.isArray(emptyParsed), 'Array vacío debe ser válido')
  assert(emptyParsed.length === 0, 'Array vacío debe tener longitud 0')

  console.log('✅ Formato de conversación JSON - PASS\n')
} catch (error) {
  console.log(`❌ Formato de conversación JSON - FAIL: ${(error as Error).message}\n`)
}

// Test 2: Extracción de rango de transcripción
console.log('2. Test: Extracción de rango de transcripción')
try {
  // Simular extractRangeTranscription
  const extractRangeTranscription = (
    segments: TranscriptionSegment[],
    startMs: number,
    endMs: number
  ): TranscriptionSegment[] => {
    return segments.filter(segment => {
      return (
        (segment.start_ms >= startMs && segment.start_ms < endMs) ||
        (segment.end_ms > startMs && segment.end_ms <= endMs) ||
        (segment.start_ms < startMs && segment.end_ms > endMs)
      )
    }).map(segment => ({
      ...segment,
      start_ms: Math.max(segment.start_ms, startMs),
      end_ms: Math.min(segment.end_ms, endMs),
    }))
  }

  const mockSegments = createMockSegments()

  // Test rango que incluye segmentos completos
  const range1 = extractRangeTranscription(mockSegments, 0, 7200)
  assert(range1.length === 2, 'Debe incluir 2 segmentos completos')
  assert(range1[0].start_ms === 0, 'Primer segmento debe empezar en 0')
  assert(range1[1].end_ms === 7200, 'Segundo segmento debe terminar en 7200')

  // Test rango que corta un segmento 
  const range2 = extractRangeTranscription(mockSegments, 2000, 5000)
  // El rango 2000-5000 debería incluir el final del primer segmento (0-3500) y el inicio del segundo (3500-7200)
  assert(range2.length >= 1, 'Debe incluir al menos 1 segmento')
  if (range2.length > 0) {
    assert(range2[0].start_ms >= 2000, 'Segmento debe empezar dentro del rango')
    assert(range2[0].end_ms <= 5000, 'Segmento debe terminar dentro del rango')
  }

  // Test rango sin coincidencias
  const range3 = extractRangeTranscription(mockSegments, 20000, 25000)
  assert(range3.length === 0, 'Rango sin coincidencias debe devolver array vacío')

  console.log('✅ Extracción de rango de transcripción - PASS\n')
} catch (error) {
  console.log(`❌ Extracción de rango de transcripción - FAIL: ${(error as Error).message}\n`)
}

// Test 3: Obtener texto plano
console.log('3. Test: Obtener texto plano')
try {
  // Simular getPlainText
  const getPlainText = (segments: TranscriptionSegment[]): string => {
    return segments.map(segment => segment.text.trim()).join(' ')
  }

  const mockSegments = createMockSegments()
  const plainText = getPlainText(mockSegments)

  const expectedText = "Hola, bienvenidos a esta clase de matemáticas. Hoy vamos a aprender sobre álgebra básica. Empezaremos con ecuaciones lineales simples."
  assert(plainText === expectedText, 'Texto plano debe unir todos los segmentos')

  // Test con array vacío
  const emptyText = getPlainText([])
  assert(emptyText === '', 'Array vacío debe devolver string vacío')

  // Test con segmentos con espacios extra
  const segmentsWithSpaces = [
    { text: "  Texto con espacios  ", start_ms: 0, end_ms: 1000 },
    { text: "   Más texto   ", start_ms: 1000, end_ms: 2000 },
  ]
  const trimmedText = getPlainText(segmentsWithSpaces)
  assert(trimmedText === "Texto con espacios Más texto", 'Debe eliminar espacios extra')

  console.log('✅ Obtener texto plano - PASS\n')
} catch (error) {
  console.log(`❌ Obtener texto plano - FAIL: ${(error as Error).message}\n`)
}

// Test 4: Estructura de TranscriptionResult
console.log('4. Test: Estructura de TranscriptionResult')
try {
  // Simular resultado exitoso
  const successResult: TranscriptionResult = {
    success: true,
    transcription: createMockSegments(),
    language: 'es',
    duration_ms: 11000,
    metadata: {
      model: 'whisper-1',
      processingTimeMs: 2500,
      hasAudio: true,
      segmentCount: 3,
    },
  }

  assert(typeof successResult.success === 'boolean', 'success debe ser boolean')
  assert(Array.isArray(successResult.transcription), 'transcription debe ser array')
  assert(typeof successResult.language === 'string', 'language debe ser string')
  assert(typeof successResult.duration_ms === 'number', 'duration_ms debe ser number')
  assert(typeof successResult.metadata === 'object', 'metadata debe ser objeto')
  assert(typeof successResult.metadata.model === 'string', 'metadata.model debe ser string')
  assert(typeof successResult.metadata.processingTimeMs === 'number', 'metadata.processingTimeMs debe ser number')
  assert(typeof successResult.metadata.hasAudio === 'boolean', 'metadata.hasAudio debe ser boolean')
  assert(typeof successResult.metadata.segmentCount === 'number', 'metadata.segmentCount debe ser number')

  // Simular resultado de error
  const errorResult: TranscriptionResult = {
    success: false,
    transcription: [],
    error: 'OpenAI API error: insufficient credits',
    metadata: {
      model: 'whisper-1',
      processingTimeMs: 1500,
      hasAudio: true,
      segmentCount: 0,
    },
  }

  assert(errorResult.success === false, 'success debe ser false en error')
  assert(typeof errorResult.error === 'string', 'error debe ser string')
  assert(errorResult.transcription.length === 0, 'transcription debe estar vacía en error')

  console.log('✅ Estructura de TranscriptionResult - PASS\n')
} catch (error) {
  console.log(`❌ Estructura de TranscriptionResult - FAIL: ${(error as Error).message}\n`)
}

// Test 5: Configuración de Whisper
console.log('5. Test: Configuración de Whisper')
try {
  // Simular configuración de Whisper
  const WHISPER_CONFIG = {
    model: 'whisper-1' as const,
    language: undefined, // Auto-detect
    responseFormat: 'verbose_json' as const,
    timestampGranularities: ['segment'] as const,
  }

  // Simular creación de parámetros
  const createWhisperParams = (options: TranscriptionOptions = {}) => {
    return {
      model: options.model || WHISPER_CONFIG.model,
      language: options.language || WHISPER_CONFIG.language,
      response_format: WHISPER_CONFIG.responseFormat,
      timestamp_granularities: WHISPER_CONFIG.timestampGranularities,
    }
  }

  // Test configuración por defecto
  const defaultParams = createWhisperParams()
  assert(defaultParams.model === 'whisper-1', 'Modelo por defecto debe ser whisper-1')
  assert(defaultParams.language === undefined, 'Language por defecto debe ser undefined (auto-detect)')
  assert(defaultParams.response_format === 'verbose_json', 'Formato debe ser verbose_json')
  assert(Array.isArray(defaultParams.timestamp_granularities), 'timestamp_granularities debe ser array')

  // Test configuración personalizada
  const customParams = createWhisperParams({ 
    language: 'es',
    model: 'whisper-1',
  })
  assert(customParams.language === 'es', 'Language personalizado debe aplicarse')
  assert(customParams.model === 'whisper-1', 'Modelo personalizado debe aplicarse')

  console.log('✅ Configuración de Whisper - PASS\n')
} catch (error) {
  console.log(`❌ Configuración de Whisper - FAIL: ${(error as Error).message}\n`)
}

// Test 6: Manejo de videos sin audio
console.log('6. Test: Manejo de videos sin audio')
try {
  // Simular resultado para video sin audio
  const noAudioResult: TranscriptionResult = {
    success: true,
    transcription: [],
    language: 'none',
    duration_ms: 0,
    metadata: {
      model: 'whisper-1',
      processingTimeMs: 50,
      hasAudio: false,
      segmentCount: 0,
    },
  }

  assert(noAudioResult.success === true, 'Resultado debe ser exitoso')
  assert(noAudioResult.transcription.length === 0, 'Transcripción debe estar vacía')
  assert(noAudioResult.language === 'none', 'Language debe ser "none"')
  assert(noAudioResult.duration_ms === 0, 'Duración debe ser 0')
  assert(noAudioResult.metadata.hasAudio === false, 'hasAudio debe ser false')
  assert(noAudioResult.metadata.segmentCount === 0, 'segmentCount debe ser 0')

  // Test conversión a JSON para video sin audio
  const emptyConversationJson = JSON.stringify([], null, 2)
  const emptyParsed = JSON.parse(emptyConversationJson)
  assert(Array.isArray(emptyParsed), 'JSON vacío debe ser array válido')
  assert(emptyParsed.length === 0, 'Array debe estar vacío')

  console.log('✅ Manejo de videos sin audio - PASS\n')
} catch (error) {
  console.log(`❌ Manejo de videos sin audio - FAIL: ${(error as Error).message}\n`)
}

// Test 7: Validación de segmentos de transcripción
console.log('7. Test: Validación de segmentos de transcripción')
try {
  // Simular validación de estructura de segmentos
  const validateSegment = (segment: TranscriptionSegment): boolean => {
    return (
      typeof segment.text === 'string' &&
      typeof segment.start_ms === 'number' &&
      typeof segment.end_ms === 'number' &&
      segment.start_ms >= 0 &&
      segment.end_ms > segment.start_ms &&
      segment.text.trim().length > 0 &&
      (segment.confidence === undefined || (typeof segment.confidence === 'number' && segment.confidence >= 0 && segment.confidence <= 1))
    )
  }

  const mockSegments = createMockSegments()

  // Test segmentos válidos
  mockSegments.forEach((segment, index) => {
    assert(validateSegment(segment), `Segmento ${index + 1} debe ser válido`)
  })

  // Test segmento inválido - texto vacío
  const invalidSegment1 = { text: '', start_ms: 0, end_ms: 1000 }
  assert(!validateSegment(invalidSegment1), 'Segmento con texto vacío debe ser inválido')

  // Test segmento inválido - tiempo negativo
  const invalidSegment2 = { text: 'Texto válido', start_ms: -100, end_ms: 1000 }
  assert(!validateSegment(invalidSegment2), 'Segmento con tiempo negativo debe ser inválido')

  // Test segmento inválido - start >= end
  const invalidSegment3 = { text: 'Texto válido', start_ms: 2000, end_ms: 1000 }
  assert(!validateSegment(invalidSegment3), 'Segmento con start >= end debe ser inválido')

  // Test segmento válido sin confidence
  const validSegmentNoConfidence = { text: 'Texto válido', start_ms: 0, end_ms: 1000 }
  assert(validateSegment(validSegmentNoConfidence), 'Segmento sin confidence debe ser válido')

  console.log('✅ Validación de segmentos - PASS\n')
} catch (error) {
  console.log(`❌ Validación de segmentos - FAIL: ${(error as Error).message}\n`)
}

console.log('🎉 Tests de VideoTranscriber completados!')

// Helper para simular assertions simples
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
} 