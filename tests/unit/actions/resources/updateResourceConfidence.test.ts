import { describe, expect, it, vi, beforeEach } from 'vitest'
import { updateResourceConfidence, updateMultipleResourcesConfidence } from '@/actions/resources/updateResourceConfidence'

// Mocks
vi.mock('@/actions/auth/getUser')
vi.mock('payload')
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('@/lib/utils/calculateResourceConfidence')
vi.mock('next/cache')

const mockGetCurrentUser = vi.mocked(await import('@/actions/auth/getUser')).getCurrentUser
const mockGetPayload = vi.mocked((await import('payload')).getPayload)
const mockCalculateResourceConfidence = vi.mocked(
  (await import('@/lib/utils/calculateResourceConfidence')).calculateResourceConfidence
)
const mockGetConfidenceThreshold = vi.mocked(
  (await import('@/lib/utils/calculateResourceConfidence')).getConfidenceThreshold
)
const mockRevalidatePath = vi.mocked((await import('next/cache')).revalidatePath)

describe('updateResourceConfidence', () => {
  let mockPayload: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockPayload = {
      findByID: vi.fn(),
      update: vi.fn(),
    }
    
    mockGetPayload.mockResolvedValue(mockPayload)
    mockGetConfidenceThreshold.mockResolvedValue(70)
    mockRevalidatePath.mockImplementation(() => {})
  })

  describe('Authentication and Authorization', () => {
    it('should return UNAUTHENTICATED when user is not logged in', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const result = await updateResourceConfidence('resource-id')

      expect(result).toEqual({
        success: false,
        error: 'Usuario no autenticado',
        code: 'UNAUTHENTICATED',
      })
    })

    it('should return NOT_FOUND when resource does not exist', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'user-1', role: 'user' })
      mockPayload.findByID.mockResolvedValue(null)

      const result = await updateResourceConfidence('resource-id')

      expect(result).toEqual({
        success: false,
        error: 'Recurso no encontrado',
        code: 'NOT_FOUND',
      })
    })

    it('should return INVALID_INPUT when resource has no project', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'user-1', role: 'user' })
      mockPayload.findByID.mockResolvedValue({
        id: 'resource-1',
        project: null,
      })

      const result = await updateResourceConfidence('resource-id')

      expect(result).toEqual({
        success: false,
        error: 'Recurso sin proyecto asociado',
        code: 'INVALID_INPUT',
      })
    })

    it('should return FORBIDDEN when user is not owner or admin', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'user-1', role: 'user' })
      mockPayload.findByID.mockResolvedValue({
        id: 'resource-1',
        project: {
          id: 'project-1',
          createdBy: 'user-2', // Different user
        },
      })

      const result = await updateResourceConfidence('resource-id')

      expect(result).toEqual({
        success: false,
        error: 'No tienes permisos para actualizar este recurso',
        code: 'FORBIDDEN',
      })
    })

    it('should allow access when user is project owner', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'user-1', role: 'user' })
      mockPayload.findByID.mockResolvedValue({
        id: 'resource-1',
        confidence: 'empty',
        project: {
          id: 'project-1',
          createdBy: 'user-1', // Same user
        },
        analyzeResult: {
          fields: {
            field1: { confidence: 0.8 },
          },
        },
      })
      mockCalculateResourceConfidence.mockReturnValue('trusted')
      mockPayload.update.mockResolvedValue({
        id: 'resource-1',
        confidence: 'trusted',
      })

      const result = await updateResourceConfidence('resource-id')

      expect(result.success).toBe(true)
    })

    it('should allow access when user is admin', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' })
      mockPayload.findByID.mockResolvedValue({
        id: 'resource-1',
        confidence: 'empty',
        project: {
          id: 'project-1',
          createdBy: 'user-1', // Different user
        },
        analyzeResult: {
          fields: {
            field1: { confidence: 0.8 },
          },
        },
      })
      mockCalculateResourceConfidence.mockReturnValue('trusted')
      mockPayload.update.mockResolvedValue({
        id: 'resource-1',
        confidence: 'trusted',
      })

      const result = await updateResourceConfidence('resource-id')

      expect(result.success).toBe(true)
    })
  })

  describe('Confidence Calculation Logic', () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ id: 'user-1', role: 'admin' })
    })

    it('should calculate confidence correctly and update resource', async () => {
      const mockResource = {
        id: 'resource-1',
        confidence: 'empty',
        project: {
          id: 'project-1',
          createdBy: 'user-1',
        },
        analyzeResult: {
          fields: {
            field1: { confidence: 0.8 },
            field2: { confidence: 0.9 },
          },
        },
      }

      mockPayload.findByID.mockResolvedValue(mockResource)
      mockCalculateResourceConfidence.mockReturnValue('trusted')
      mockPayload.update.mockResolvedValue({
        id: 'resource-1',
        confidence: 'trusted',
      })

      const result = await updateResourceConfidence('resource-1')

      expect(mockCalculateResourceConfidence).toHaveBeenCalledWith(mockResource, 70)
      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'resources',
        id: 'resource-1',
        data: {
          confidence: 'trusted',
          lastUpdatedBy: 'user-1',
        },
        user: { id: 'user-1', role: 'admin' },
      })
      expect(result).toEqual({
        success: true,
        data: {
          id: 'resource-1',
          confidence: 'trusted',
          threshold: 70,
        },
      })
    })

    it('should not update when confidence value has not changed', async () => {
      const mockResource = {
        id: 'resource-1',
        confidence: 'trusted',
        project: {
          id: 'project-1',
          createdBy: 'user-1',
        },
        analyzeResult: {
          fields: {
            field1: { confidence: 0.8 },
          },
        },
      }

      mockPayload.findByID.mockResolvedValue(mockResource)
      mockCalculateResourceConfidence.mockReturnValue('trusted') // Same value

      const result = await updateResourceConfidence('resource-1')

      expect(mockPayload.update).not.toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        data: {
          id: 'resource-1',
          confidence: 'trusted',
          threshold: 70,
        },
      })
    })

    it('should use custom threshold from configuration', async () => {
      mockGetConfidenceThreshold.mockResolvedValue(85)
      
      const mockResource = {
        id: 'resource-1',
        confidence: 'empty',
        project: {
          id: 'project-1',
          createdBy: 'user-1',
        },
        analyzeResult: {
          fields: {
            field1: { confidence: 0.8 },
          },
        },
      }

      mockPayload.findByID.mockResolvedValue(mockResource)
      mockCalculateResourceConfidence.mockReturnValue('needs_revision')
      mockPayload.update.mockResolvedValue({
        id: 'resource-1',
        confidence: 'needs_revision',
      })

      const result = await updateResourceConfidence('resource-1')

      expect(mockCalculateResourceConfidence).toHaveBeenCalledWith(mockResource, 85)
      expect(result.data?.threshold).toBe(85)
    })
  })

  describe('Path Revalidation', () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ id: 'user-1', role: 'admin' })
    })

    it('should revalidate correct paths after update', async () => {
      const mockResource = {
        id: 'resource-1',
        confidence: 'empty',
        project: {
          id: 'project-1',
          createdBy: 'user-1',
        },
        analyzeResult: {
          fields: {
            field1: { confidence: 0.8 },
          },
        },
      }

      mockPayload.findByID.mockResolvedValue(mockResource)
      mockCalculateResourceConfidence.mockReturnValue('trusted')
      mockPayload.update.mockResolvedValue({
        id: 'resource-1',
        confidence: 'trusted',
      })

      await updateResourceConfidence('resource-1')

      expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/project-1')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/project-1/resource/resource-1')
    })

    it('should handle revalidation errors gracefully', async () => {
      const mockResource = {
        id: 'resource-1',
        confidence: 'empty',
        project: { id: 'project-1', createdBy: 'user-1' },
        analyzeResult: { fields: { field1: { confidence: 0.8 } } },
      }

      mockPayload.findByID.mockResolvedValue(mockResource)
      mockCalculateResourceConfidence.mockReturnValue('trusted')
      mockPayload.update.mockResolvedValue({ id: 'resource-1', confidence: 'trusted' })
      mockRevalidatePath.mockImplementation(() => {
        throw new Error('Revalidation failed')
      })

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await updateResourceConfidence('resource-1')

      expect(result.success).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[UPDATE_RESOURCE_CONFIDENCE] Failed to revalidate paths',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ id: 'user-1', role: 'admin' })
    })

    it('should handle payload errors gracefully', async () => {
      mockPayload.findByID.mockRejectedValue(new Error('Database error'))

      const result = await updateResourceConfidence('resource-1')

      expect(result).toEqual({
        success: false,
        error: 'Error interno del servidor al actualizar confidence',
        code: 'PROCESSING_ERROR',
      })
    })

    it('should handle update errors gracefully', async () => {
      const mockResource = {
        id: 'resource-1',
        confidence: 'empty',
        project: { id: 'project-1', createdBy: 'user-1' },
        analyzeResult: { fields: { field1: { confidence: 0.8 } } },
      }

      mockPayload.findByID.mockResolvedValue(mockResource)
      mockCalculateResourceConfidence.mockReturnValue('trusted')
      mockPayload.update.mockRejectedValue(new Error('Update failed'))

      const result = await updateResourceConfidence('resource-1')

      expect(result).toEqual({
        success: false,
        error: 'Error interno del servidor al actualizar confidence',
        code: 'PROCESSING_ERROR',
      })
    })
  })

  describe('Complex Project Structures', () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({ id: 'user-1', role: 'user' })
    })

    it('should handle project createdBy as object', async () => {
      const mockResource = {
        id: 'resource-1',
        confidence: 'empty',
        project: {
          id: 'project-1',
          createdBy: { id: 'user-1', name: 'Test User' },
        },
        analyzeResult: {
          fields: {
            field1: { confidence: 0.8 },
          },
        },
      }

      mockPayload.findByID.mockResolvedValue(mockResource)
      mockCalculateResourceConfidence.mockReturnValue('trusted')
      mockPayload.update.mockResolvedValue({
        id: 'resource-1',
        confidence: 'trusted',
      })

      const result = await updateResourceConfidence('resource-1')

      expect(result.success).toBe(true)
    })

    it('should handle project as string ID', async () => {
      const mockResource = {
        id: 'resource-1',
        confidence: 'empty',
        project: 'project-1',
        analyzeResult: {
          fields: {
            field1: { confidence: 0.8 },
          },
        },
      }

      mockPayload.findByID.mockResolvedValue(mockResource)
      mockCalculateResourceConfidence.mockReturnValue('trusted')
      mockPayload.update.mockResolvedValue({
        id: 'resource-1',
        confidence: 'trusted',
      })

      // Should fail because we can't verify ownership when project is just an ID
      const result = await updateResourceConfidence('resource-1')

      expect(result.success).toBe(false)
      expect(result.code).toBe('FORBIDDEN')
    })
  })
})

describe('updateMultipleResourcesConfidence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should process multiple resources successfully', async () => {
    // Mock individual calls to updateResourceConfidence
    const mockUpdateSingle = vi.mocked(updateResourceConfidence)
    mockUpdateSingle
      .mockResolvedValueOnce({
        success: true,
        data: { id: 'resource-1', confidence: 'trusted', threshold: 70 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { id: 'resource-2', confidence: 'needs_revision', threshold: 70 },
      })

    const result = await updateMultipleResourcesConfidence(['resource-1', 'resource-2'])

    expect(result).toEqual({
      success: true,
      processed: 2,
      errors: [],
      results: [
        { id: 'resource-1', confidence: 'trusted', success: true },
        { id: 'resource-2', confidence: 'needs_revision', success: true },
      ],
    })
  })

  it('should handle mix of success and failures', async () => {
    const mockUpdateSingle = vi.mocked(updateResourceConfidence)
    mockUpdateSingle
      .mockResolvedValueOnce({
        success: true,
        data: { id: 'resource-1', confidence: 'trusted', threshold: 70 },
      })
      .mockResolvedValueOnce({
        success: false,
        error: 'Not found',
        code: 'NOT_FOUND',
      })

    const result = await updateMultipleResourcesConfidence(['resource-1', 'resource-2'])

    expect(result).toEqual({
      success: false,
      processed: 1,
      errors: ['resource-2: Not found'],
      results: [
        { id: 'resource-1', confidence: 'trusted', success: true },
        { id: 'resource-2', confidence: 'error', success: false },
      ],
    })
  })

  it('should handle unexpected errors', async () => {
    const mockUpdateSingle = vi.mocked(updateResourceConfidence)
    mockUpdateSingle
      .mockResolvedValueOnce({
        success: true,
        data: { id: 'resource-1', confidence: 'trusted', threshold: 70 },
      })
      .mockRejectedValueOnce(new Error('Unexpected error'))

    const result = await updateMultipleResourcesConfidence(['resource-1', 'resource-2'])

    expect(result).toEqual({
      success: false,
      processed: 1,
      errors: ['resource-2: Error inesperado'],
      results: [
        { id: 'resource-1', confidence: 'trusted', success: true },
        { id: 'resource-2', confidence: 'error', success: false },
      ],
    })
  })

  it('should handle empty resource list', async () => {
    const result = await updateMultipleResourcesConfidence([])

    expect(result).toEqual({
      success: true,
      processed: 0,
      errors: [],
      results: [],
    })
  })
})
