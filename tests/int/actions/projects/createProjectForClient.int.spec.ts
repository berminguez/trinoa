import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createProjectForClient } from '@/actions/projects/createProjectForClient'

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
    find: vi.fn(),
    create: vi.fn(),
  }
  return {
    getPayload: vi.fn().mockResolvedValue(mockPayload),
    __mockPayload: mockPayload,
  }
})

describe('createProjectForClient Integration Tests', () => {
  let mockPayload: any

  beforeEach(async () => {
    vi.clearAllMocks()
    // Obtener la instancia mock de payload
    const { getPayload } = await import('payload')
    mockPayload = await getPayload({} as any)
  })

  describe('Validación de entrada', () => {
    it('debe fallar con ID de cliente inválido', async () => {
      const data = {
        title: 'Proyecto Test',
        clientId: '',
      }

      const result = await createProjectForClient(data)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('ID de cliente inválido')
    })

    it('debe fallar sin título', async () => {
      const data = {
        title: '',
        clientId: 'client-123',
      }

      const result = await createProjectForClient(data)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('El título es requerido')
    })

    it('debe fallar con título muy corto', async () => {
      const data = {
        title: 'AB',
        clientId: 'client-123',
      }

      const result = await createProjectForClient(data)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('El título debe tener al menos 3 caracteres')
    })

    it('debe fallar con título muy largo', async () => {
      const data = {
        title: 'A'.repeat(101),
        clientId: 'client-123',
      }

      const result = await createProjectForClient(data)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('El título no puede exceder 100 caracteres')
    })

    it('debe fallar con descripción muy larga', async () => {
      const data = {
        title: 'Proyecto Test',
        description: 'A'.repeat(501),
        clientId: 'client-123',
      }

      const result = await createProjectForClient(data)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('La descripción no puede exceder 500 caracteres')
    })
  })

  describe('Validación de cliente existente', () => {
    it('debe fallar si el cliente no existe', async () => {
      // Mock cliente no encontrado
      mockPayload.find.mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
      })

      const data = {
        title: 'Proyecto Test',
        clientId: 'nonexistent-client',
      }

      const result = await createProjectForClient(data)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('Cliente no encontrado')
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'users',
        where: { id: { equals: 'nonexistent-client' } },
        limit: 1,
      })
    })
  })

  describe('Creación exitosa de proyecto', () => {
    const mockClient = {
      id: 'client-123',
      email: 'client@test.com',
      name: 'Test Client',
    }

    const mockProject = {
      id: 'project-456',
      title: 'Proyecto Test',
      slug: 'proyecto-test',
      createdBy: 'client-123',
    }

    beforeEach(() => {
      // Mock para cliente existente
      mockPayload.find.mockResolvedValueOnce({
        docs: [mockClient],
        totalDocs: 1,
      })
    })

    it('debe crear proyecto sin descripción', async () => {
      // Mock para proyecto no duplicado
      mockPayload.find.mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
      })

      // Mock para creación exitosa
      mockPayload.create.mockResolvedValueOnce(mockProject)

      const data = {
        title: 'Proyecto Test',
        clientId: 'client-123',
      }

      const result = await createProjectForClient(data)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.project).toEqual(mockProject)
      expect(result.data!.client).toEqual(mockClient)
      expect(result.message).toBe('Proyecto "Proyecto Test" creado exitosamente para Test Client')

      // Verificar llamada de creación
      expect(mockPayload.create).toHaveBeenCalledWith({
        collection: 'projects',
        data: {
          title: 'Proyecto Test',
          description: undefined,
          createdBy: 'client-123',
        },
      })
    })

    it('debe crear proyecto con descripción', async () => {
      // Mock para proyecto no duplicado
      mockPayload.find.mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
      })

      // Mock para creación exitosa
      mockPayload.create.mockResolvedValueOnce(mockProject)

      const data = {
        title: 'Proyecto Test',
        description: 'Esta es una descripción de prueba',
        clientId: 'client-123',
      }

      const result = await createProjectForClient(data)

      expect(result.success).toBe(true)

      // Verificar formato de descripción para PayloadCMS
      expect(mockPayload.create).toHaveBeenCalledWith({
        collection: 'projects',
        data: {
          title: 'Proyecto Test',
          description: [
            {
              type: 'paragraph',
              children: [
                {
                  text: 'Esta es una descripción de prueba',
                },
              ],
            },
          ],
          createdBy: 'client-123',
        },
      })
    })

    it('debe fallar si ya existe proyecto con mismo título', async () => {
      // Mock para proyecto duplicado
      mockPayload.find.mockResolvedValueOnce({
        docs: [{ id: 'existing-project', title: 'Proyecto Test' }],
        totalDocs: 1,
      })

      const data = {
        title: 'Proyecto Test',
        clientId: 'client-123',
      }

      const result = await createProjectForClient(data)

      expect(result.success).toBe(false)
      expect(result.message).toBe('El cliente ya tiene un proyecto con el título "Proyecto Test". Elige un título diferente.')

      // No debe intentar crear el proyecto
      expect(mockPayload.create).not.toHaveBeenCalled()
    })

    it('debe usar email del cliente si no tiene nombre', async () => {
      const clientWithoutName = {
        id: 'client-123',
        email: 'client@test.com',
        name: null,
      }

      // Mock para cliente sin nombre
      mockPayload.find
        .mockResolvedValueOnce({
          docs: [clientWithoutName],
          totalDocs: 1,
        })
        .mockResolvedValueOnce({
          docs: [],
          totalDocs: 0,
        })

      mockPayload.create.mockResolvedValueOnce(mockProject)

      const data = {
        title: 'Proyecto Test',
        clientId: 'client-123',
      }

      const result = await createProjectForClient(data)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Proyecto "Proyecto Test" creado exitosamente para client@test.com')
    })
  })

  describe('Manejo de errores', () => {
    beforeEach(() => {
      // Mock para cliente existente
      mockPayload.find.mockResolvedValueOnce({
        docs: [{ id: 'client-123', email: 'client@test.com' }],
        totalDocs: 1,
      })
      // Mock para proyecto no duplicado
      mockPayload.find.mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
      })
    })

    it('debe manejar errores de duplicado', async () => {
      mockPayload.create.mockRejectedValueOnce(new Error('duplicate key error'))

      const data = {
        title: 'Proyecto Test',
        clientId: 'client-123',
      }

      const result = await createProjectForClient(data)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Ya existe un proyecto con este título para este cliente. Elige un título diferente.')
    })

    it('debe manejar errores de slug', async () => {
      mockPayload.create.mockRejectedValueOnce(new Error('slug validation error'))

      const data = {
        title: 'Proyecto Test',
        clientId: 'client-123',
      }

      const result = await createProjectForClient(data)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Error al generar el identificador del proyecto. Intenta con un título diferente.')
    })

    it('debe manejar errores de permisos', async () => {
      mockPayload.create.mockRejectedValueOnce(new Error('permission denied'))

      const data = {
        title: 'Proyecto Test',
        clientId: 'client-123',
      }

      const result = await createProjectForClient(data)

      expect(result.success).toBe(false)
      expect(result.message).toBe('No tienes permisos para crear proyectos para este cliente.')
    })

    it('debe manejar errores inesperados', async () => {
      mockPayload.create.mockRejectedValueOnce('String error')

      const data = {
        title: 'Proyecto Test',
        clientId: 'client-123',
      }

      const result = await createProjectForClient(data)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Error interno del servidor. Intenta nuevamente.')
    })
  })
})
