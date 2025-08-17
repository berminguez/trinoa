import { describe, expect, it, vi, beforeEach } from 'vitest'
import { calculateResourceConfidence, getConfidenceThreshold } from '@/lib/utils/calculateResourceConfidence'

describe('calculateResourceConfidence', () => {
  const mockResource = (analyzeResult: any) => ({
    id: 'test-resource',
    analyzeResult,
  })

  describe('Estado empty', () => {
    it('debe retornar empty cuando no hay analyzeResult', () => {
      const resource = mockResource(null)
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('empty')
    })

    it('debe retornar empty cuando analyzeResult no tiene fields', () => {
      const resource = mockResource({ otherData: 'test' })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('empty')
    })

    it('debe retornar empty cuando fields no es un objeto', () => {
      const resource = mockResource({ fields: 'not-an-object' })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('empty')
    })

    it('debe retornar empty cuando fields está vacío', () => {
      const resource = mockResource({ fields: {} })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('empty')
    })
  })

  describe('Estado needs_revision', () => {
    it('debe retornar needs_revision cuando hay campos con confianza menor al umbral', () => {
      const resource = mockResource({
        fields: {
          field1: { confidence: 0.5, type: 'string' }, // 50% < 70%
          field2: { confidence: 0.8, type: 'string' }, // 80% > 70%
        },
      })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('needs_revision')
    })

    it('debe retornar needs_revision cuando hay campos sin confidence definida', () => {
      const resource = mockResource({
        fields: {
          field1: { type: 'string' }, // Sin confidence
          field2: { confidence: 0.8, type: 'string' },
        },
      })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('needs_revision')
    })

    it('debe retornar needs_revision cuando hay campos con confidence no numérica', () => {
      const resource = mockResource({
        fields: {
          field1: { confidence: 'invalid', type: 'string' },
          field2: { confidence: 0.8, type: 'string' },
        },
      })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('needs_revision')
    })

    it('debe ignorar campos manuales al evaluar needs_revision', () => {
      const resource = mockResource({
        fields: {
          field1: { confidence: 0.5, manual: true, type: 'string' }, // Manual, debe ignorarse
          field2: { confidence: 0.8, type: 'string' }, // OK
        },
      })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('trusted')
    })
  })

  describe('Estado trusted', () => {
    it('debe retornar trusted cuando todos los campos tienen confianza >= umbral', () => {
      const resource = mockResource({
        fields: {
          field1: { confidence: 0.8, type: 'string' }, // 80% > 70%
          field2: { confidence: 0.9, type: 'string' }, // 90% > 70%
          field3: { confidence: 0.7, type: 'string' }, // 70% = 70%
        },
      })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('trusted')
    })

    it('debe retornar trusted con umbral diferente', () => {
      const resource = mockResource({
        fields: {
          field1: { confidence: 0.6, type: 'string' }, // 60% > 50%
          field2: { confidence: 0.7, type: 'string' }, // 70% > 50%
        },
      })
      const result = calculateResourceConfidence(resource, 50)
      expect(result).toBe('trusted')
    })
  })

  describe('Estado verified', () => {
    it('debe retornar verified cuando todos los campos de baja confianza son manuales', () => {
      const resource = mockResource({
        fields: {
          field1: { confidence: 0.5, manual: true, type: 'string' }, // Bajo confidence pero manual
          field2: { confidence: 0.6, manual: true, type: 'string' }, // Bajo confidence pero manual
          field3: { confidence: 0.8, type: 'string' }, // Alta confidence, automático
        },
      })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('verified')
    })

    it('debe retornar verified cuando solo hay un campo de baja confianza manual', () => {
      const resource = mockResource({
        fields: {
          field1: { confidence: 0.5, manual: true, type: 'string' }, // Único campo bajo, manual
          field2: { confidence: 0.8, type: 'string' }, // Alta confidence
        },
      })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('verified')
    })

    it('debe retornar needs_revision si hay campos de baja confianza sin manual:true', () => {
      const resource = mockResource({
        fields: {
          field1: { confidence: 0.5, manual: true, type: 'string' }, // Manual
          field2: { confidence: 0.6, type: 'string' }, // Bajo confidence, no manual
          field3: { confidence: 0.8, type: 'string' }, // Alta confidence
        },
      })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('needs_revision')
    })
  })

  describe('Casos edge', () => {
    it('debe manejar campos con estructura inválida', () => {
      const resource = mockResource({
        fields: {
          field1: null, // Campo null
          field2: 'invalid', // Campo no objeto
          field3: { confidence: 0.8, type: 'string' }, // Campo válido
        },
      })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('trusted')
    })

    it('debe manejar threshold en los extremos', () => {
      const resource = mockResource({
        fields: {
          field1: { confidence: 0.01, type: 'string' },
        },
      })
      
      // Threshold 0 - todo debería ser trusted
      expect(calculateResourceConfidence(resource, 0)).toBe('trusted')
      
      // Threshold 100 - todo debería ser needs_revision  
      expect(calculateResourceConfidence(resource, 100)).toBe('needs_revision')
    })

    it('debe convertir correctamente threshold de porcentaje a decimal', () => {
      const resource = mockResource({
        fields: {
          field1: { confidence: 0.7, type: 'string' }, // Exactamente 70%
        },
      })
      
      // Con threshold 70, confidence 0.7 debería ser trusted
      expect(calculateResourceConfidence(resource, 70)).toBe('trusted')
      
      // Con threshold 71, confidence 0.7 debería ser needs_revision
      expect(calculateResourceConfidence(resource, 71)).toBe('needs_revision')
    })
  })

  describe('Casos de transición', () => {
    it('debe manejar transición de needs_revision a verified', () => {
      const resource = mockResource({
        fields: {
          field1: { confidence: 0.5, manual: true, type: 'string' }, // Era problemático, ahora manual
          field2: { confidence: 0.6, manual: true, type: 'string' }, // Era problemático, ahora manual
          field3: { confidence: 0.8, type: 'string' }, // Siempre fue bueno
        },
      })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('verified')
    })

    it('debe manejar mix de campos buenos y corregidos', () => {
      const resource = mockResource({
        fields: {
          lowField1: { confidence: 0.5, manual: true, type: 'string' },
          lowField2: { confidence: 0.6, manual: true, type: 'string' },
          goodField1: { confidence: 0.8, type: 'string' },
          goodField2: { confidence: 0.9, type: 'string' },
          manualGoodField: { confidence: 0.8, manual: true, type: 'string' }, // Manual pero era bueno
        },
      })
      const result = calculateResourceConfidence(resource, 70)
      expect(result).toBe('verified')
    })
  })
})

describe('getConfidenceThreshold', () => {
  let mockPayload: any

  beforeEach(() => {
    mockPayload = {
      findGlobal: vi.fn(),
    }
  })

  it('debe retornar el threshold de la configuración cuando existe', async () => {
    mockPayload.findGlobal.mockResolvedValue({
      confidenceSettings: {
        confidenceThreshold: 85,
      },
    })

    const result = await getConfidenceThreshold(mockPayload)
    expect(result).toBe(85)
    expect(mockPayload.findGlobal).toHaveBeenCalledWith({
      slug: 'configuracion',
    })
  })

  it('debe retornar valor por defecto cuando no existe configuración', async () => {
    mockPayload.findGlobal.mockResolvedValue(null)

    const result = await getConfidenceThreshold(mockPayload)
    expect(result).toBe(70)
  })

  it('debe retornar valor por defecto cuando no existe confidenceSettings', async () => {
    mockPayload.findGlobal.mockResolvedValue({
      otherSettings: { someValue: 'test' },
    })

    const result = await getConfidenceThreshold(mockPayload)
    expect(result).toBe(70)
  })

  it('debe retornar valor por defecto cuando no existe confidenceThreshold', async () => {
    mockPayload.findGlobal.mockResolvedValue({
      confidenceSettings: {
        otherSetting: 'test',
      },
    })

    const result = await getConfidenceThreshold(mockPayload)
    expect(result).toBe(70)
  })

  it('debe manejar errores y retornar valor por defecto', async () => {
    mockPayload.findGlobal.mockRejectedValue(new Error('Database error'))
    
    // Mock console.warn para evitar output en tests
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await getConfidenceThreshold(mockPayload)
    expect(result).toBe(70)
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error obteniendo threshold de configuración:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })
})
