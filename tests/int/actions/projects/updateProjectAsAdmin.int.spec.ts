import { describe, it, expect, beforeEach, vi } from 'vitest'
import { updateProjectAsAdmin } from '@/actions/projects/updateProjectAsAdmin'

// Mock de requireAdminAccess
vi.mock('@/actions/auth/getUser', () => ({
  requireAdminAccess: vi.fn().mockResolvedValue({
    id: 'admin-id',
    email: 'admin@test.com',
    role: 'admin',
  }),
}))

// Mock de payload
vi.mock('payload', () => {
  const mockPayload = {
    findByID: vi.fn(),
    find: vi.fn(),
    update: vi.fn(),
  }
  return {
    getPayload: vi.fn().mockResolvedValue(mockPayload),
    __mockPayload: mockPayload,
  }
})

// Mock de revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('updateProjectAsAdmin Integration Tests', () => {
  let mockPayload: any

  beforeEach(async () => {
    vi.clearAllMocks()
    // Obtener la instancia mock de payload
    const { getPayload } = await import('payload')
    mockPayload = await getPayload({} as any)
  })

  const mockProject = {
    id: 'project-123',
    title: 'Proyecto Original',
    slug: 'proyecto-original',
    createdBy: 'client-456',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }

  const mockClient = {
    id: 'client-456',
    email: 'client@test.com',
    name: 'Test Client',
    role: 'user',
  }

  describe('Validación de entrada', () => {
    it('debe fallar con ID de proyecto inválido', async () => {
      const result = await updateProjectAsAdmin('', {
        title: 'Nuevo Título',
      })
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('ID de proyecto inválido')
    })

    it('debe fallar con título muy corto', async () => {
      // Mock proyecto existente
      mockPayload.findByID
        .mockResolvedValueOnce(mockProject) // Proyecto
        .mockResolvedValueOnce(mockClient) // Cliente

      const result = await updateProjectAsAdmin('project-123', {
        title: 'AB',
      })
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('El título debe tener al menos 3 caracteres')
    })

    it('debe fallar con título muy largo', async () => {
      // Mock proyecto existente
      mockPayload.findByID
        .mockResolvedValueOnce(mockProject) // Proyecto
        .mockResolvedValueOnce(mockClient) // Cliente

      const result = await updateProjectAsAdmin('project-123', {
        title: 'A'.repeat(101),
      })
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('El título no puede exceder 100 caracteres')
    })

    it('debe fallar con descripción muy larga', async () => {
      // Mock proyecto existente
      mockPayload.findByID
        .mockResolvedValueOnce(mockProject) // Proyecto
        .mockResolvedValueOnce(mockClient) // Cliente

      const result = await updateProjectAsAdmin('project-123', {
        description: 'A'.repeat(501),
      })
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('La descripción no puede exceder 500 caracteres')
    })
  })

  describe('Validación de proyecto y cliente', () => {
    it('debe fallar si el proyecto no existe', async () => {
      mockPayload.findByID.mockRejectedValueOnce(new Error('Not found'))

      const result = await updateProjectAsAdmin('nonexistent-project', {
        title: 'Nuevo Título',
      })
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('Proyecto no encontrado')
    })

    it('debe fallar si el cliente no coincide', async () => {
      // Mock proyecto existente
      mockPayload.findByID
        .mockResolvedValueOnce(mockProject) // Proyecto
        .mockResolvedValueOnce(mockClient) // Cliente

      const result = await updateProjectAsAdmin('project-123', {
        title: 'Nuevo Título',
        clientId: 'different-client-id',
      })
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('El proyecto no pertenece al cliente especificado')
    })
  })

  describe('Actualización exitosa', () => {
    beforeEach(() => {
      // Mock proyecto existente
      mockPayload.findByID
        .mockResolvedValueOnce(mockProject) // Proyecto
        .mockResolvedValueOnce(mockClient) // Cliente

      // Mock no duplicados
      mockPayload.find.mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
      })
    })

    it('debe actualizar título sin duplicados', async () => {
      const updatedProject = {
        ...mockProject,
        title: 'Título Actualizado',
      }

      mockPayload.update.mockResolvedValueOnce(updatedProject)

      const result = await updateProjectAsAdmin('project-123', {
        title: 'Título Actualizado',
      })

      expect(result.success).toBe(true)
      expect(result.data?.project.title).toBe('Título Actualizado')
      expect(result.data?.client).toEqual(mockClient)
      expect(result.message).toBe('Proyecto "Título Actualizado" actualizado exitosamente para Test Client')

      // Verificar llamada de actualización
      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'projects',
        id: 'project-123',
        data: {
          title: 'Título Actualizado',
        },
      })
    })

    it('debe actualizar descripción', async () => {
      const updatedProject = {
        ...mockProject,
        description: [
          {
            type: 'paragraph',
            children: [{ text: 'Nueva descripción' }],
          },
        ],
      }

      mockPayload.update.mockResolvedValueOnce(updatedProject)

      const result = await updateProjectAsAdmin('project-123', {
        description: 'Nueva descripción',
      })

      expect(result.success).toBe(true)

      // Verificar formato de descripción para PayloadCMS
      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'projects',
        id: 'project-123',
        data: {
          description: [
            {
              type: 'paragraph',
              children: [{ text: 'Nueva descripción' }],
            },
          ],
        },
      })
    })

    it('debe limpiar descripción cuando está vacía', async () => {
      const updatedProject = {
        ...mockProject,
        description: null,
      }

      mockPayload.update.mockResolvedValueOnce(updatedProject)

      const result = await updateProjectAsAdmin('project-123', {
        description: '   ',
      })

      expect(result.success).toBe(true)

      // Verificar que descripción se establece como null
      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'projects',
        id: 'project-123',
        data: {
          description: null,
        },
      })
    })

    it('debe retornar sin cambios si no hay modificaciones', async () => {
      const result = await updateProjectAsAdmin('project-123', {
        title: 'Proyecto Original', // Mismo título
      })

      expect(result.success).toBe(true)
      expect(result.message).toBe('No hay cambios para aplicar')
      expect(mockPayload.update).not.toHaveBeenCalled()
    })

    it('debe fallar si ya existe proyecto con mismo título', async () => {
      // Mock proyecto duplicado
      mockPayload.find.mockResolvedValueOnce({
        docs: [{ id: 'other-project', title: 'Título Duplicado' }],
        totalDocs: 1,
      })

      const result = await updateProjectAsAdmin('project-123', {
        title: 'Título Duplicado',
      })

      expect(result.success).toBe(false)
      expect(result.message).toBe('El cliente ya tiene un proyecto con el título "Título Duplicado". Elige un título diferente.')

      // No debe intentar actualizar
      expect(mockPayload.update).not.toHaveBeenCalled()
    })
  })

  describe('Manejo de errores', () => {
    beforeEach(() => {
      // Mock proyecto existente
      mockPayload.findByID
        .mockResolvedValueOnce(mockProject) // Proyecto
        .mockResolvedValueOnce(mockClient) // Cliente

      // Mock no duplicados
      mockPayload.find.mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
      })
    })

    it('debe manejar errores de duplicado', async () => {
      mockPayload.update.mockRejectedValueOnce(new Error('duplicate key error'))

      const result = await updateProjectAsAdmin('project-123', {
        title: 'Nuevo Título',
      })

      expect(result.success).toBe(false)
      expect(result.message).toBe('Ya existe un proyecto con este título para este cliente. Elige un título diferente.')
    })

    it('debe manejar errores de slug', async () => {
      mockPayload.update.mockRejectedValueOnce(new Error('slug validation error'))

      const result = await updateProjectAsAdmin('project-123', {
        title: 'Nuevo Título',
      })

      expect(result.success).toBe(false)
      expect(result.message).toBe('Error al generar el identificador del proyecto. Intenta con un título diferente.')
    })

    it('debe manejar errores de permisos', async () => {
      mockPayload.update.mockRejectedValueOnce(new Error('permission denied'))

      const result = await updateProjectAsAdmin('project-123', {
        title: 'Nuevo Título',
      })

      expect(result.success).toBe(false)
      expect(result.message).toBe('No tienes permisos para actualizar este proyecto.')
    })

    it('debe manejar errores inesperados', async () => {
      mockPayload.update.mockRejectedValueOnce('String error')

      const result = await updateProjectAsAdmin('project-123', {
        title: 'Nuevo Título',
      })

      expect(result.success).toBe(false)
      expect(result.message).toBe('Error interno del servidor. Intenta nuevamente.')
    })
  })
})
