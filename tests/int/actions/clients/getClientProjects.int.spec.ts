import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getClientProjects } from '@/actions/clients/getClientProjects'
import type { ClientProjectsFilters } from '@/actions/clients/types'

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
  }
  return {
    getPayload: vi.fn().mockResolvedValue(mockPayload),
    __mockPayload: mockPayload, // Export para acceso en tests
  }
})

describe('getClientProjects Integration Tests', () => {
  let mockPayload: any

  beforeEach(async () => {
    vi.clearAllMocks()
    // Obtener la instancia mock de payload
    const { getPayload } = await import('payload')
    mockPayload = await getPayload({} as any)
  })

  describe('Validación de entrada', () => {
    it('debe fallar con ID de cliente inválido', async () => {
      const result = await getClientProjects('')
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('ID de cliente inválido')
    })

    it('debe fallar con ID de cliente null', async () => {
      const result = await getClientProjects(null as any)
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('ID de cliente inválido')
    })
  })

  describe('Validación de cliente existente', () => {
    it('debe fallar si el cliente no existe', async () => {
      mockPayload.find.mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
      })

      const result = await getClientProjects('nonexistent-client-id')
      
      expect(result.success).toBe(false)
      expect(result.message).toBe('Cliente no encontrado')
      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'users',
        where: { id: { equals: 'nonexistent-client-id' } },
        limit: 1,
      })
    })
  })

  describe('Consulta exitosa de proyectos', () => {
    const mockClient = {
      id: 'client-123',
      email: 'client@test.com',
      name: 'Test Client',
    }

    const mockProjects = [
      {
        id: 'project-1',
        title: 'Proyecto 1',
        createdBy: 'client-123',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'project-2',
        title: 'Proyecto 2',
        createdBy: 'client-123',
        createdAt: '2024-01-02T00:00:00Z',
      },
    ]

    beforeEach(() => {
      // Mock para cliente existente
      mockPayload.find.mockResolvedValueOnce({
        docs: [mockClient],
        totalDocs: 1,
      })
    })

    it('debe obtener proyectos sin filtros', async () => {
      mockPayload.find.mockResolvedValueOnce({
        docs: mockProjects,
        totalDocs: 2,
        totalPages: 1,
      })

      const result = await getClientProjects('client-123')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.client).toEqual(mockClient)
      expect(result.data!.projects).toEqual(mockProjects)
      expect(result.data!.totalProjects).toBe(2)
      expect(result.data!.page).toBe(1)
      expect(result.data!.totalPages).toBe(1)

      // Verificar consulta de proyectos
      expect(mockPayload.find).toHaveBeenLastCalledWith({
        collection: 'projects',
        where: { createdBy: { equals: 'client-123' } },
        sort: '-createdAt',
        page: 1,
        limit: 12,
        depth: 2,
      })
    })

    it('debe aplicar filtros de búsqueda por título', async () => {
      mockPayload.find.mockResolvedValueOnce({
        docs: [mockProjects[0]],
        totalDocs: 1,
        totalPages: 1,
      })

      const filters: ClientProjectsFilters = {
        searchTerm: 'Proyecto 1',
      }

      const result = await getClientProjects('client-123', filters)

      expect(result.success).toBe(true)
      expect(mockPayload.find).toHaveBeenLastCalledWith({
        collection: 'projects',
        where: {
          createdBy: { equals: 'client-123' },
          title: { contains: 'Proyecto 1' },
        },
        sort: '-createdAt',
        page: 1,
        limit: 12,
        depth: 2,
      })
    })

    it('debe aplicar ordenamiento personalizado', async () => {
      mockPayload.find.mockResolvedValueOnce({
        docs: mockProjects,
        totalDocs: 2,
        totalPages: 1,
      })

      const filters: ClientProjectsFilters = {
        sortBy: 'title',
        sortOrder: 'asc',
      }

      const result = await getClientProjects('client-123', filters)

      expect(result.success).toBe(true)
      expect(mockPayload.find).toHaveBeenLastCalledWith({
        collection: 'projects',
        where: { createdBy: { equals: 'client-123' } },
        sort: 'title',
        page: 1,
        limit: 12,
        depth: 2,
      })
    })

    it('debe aplicar filtros de fecha', async () => {
      mockPayload.find.mockResolvedValueOnce({
        docs: [mockProjects[1]],
        totalDocs: 1,
        totalPages: 1,
      })

      const filters: ClientProjectsFilters = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      }

      const result = await getClientProjects('client-123', filters)

      expect(result.success).toBe(true)
      expect(mockPayload.find).toHaveBeenLastCalledWith({
        collection: 'projects',
        where: {
          createdBy: { equals: 'client-123' },
          createdAt: {
            greater_than_equal: '2024-01-01T00:00:00.000Z',
            less_than_equal: '2024-01-31T00:00:00.000Z',
          },
        },
        sort: '-createdAt',
        page: 1,
        limit: 12,
        depth: 2,
      })
    })

    it('debe aplicar paginación', async () => {
      mockPayload.find.mockResolvedValueOnce({
        docs: [],
        totalDocs: 25,
        totalPages: 3,
      })

      const filters: ClientProjectsFilters = {
        page: 2,
        limit: 10,
      }

      const result = await getClientProjects('client-123', filters)

      expect(result.success).toBe(true)
      expect(result.data!.page).toBe(2)
      expect(result.data!.limit).toBe(10)
      expect(mockPayload.find).toHaveBeenLastCalledWith({
        collection: 'projects',
        where: { createdBy: { equals: 'client-123' } },
        sort: '-createdAt',
        page: 2,
        limit: 10,
        depth: 2,
      })
    })

    it('debe limitar el límite máximo a 50', async () => {
      mockPayload.find.mockResolvedValueOnce({
        docs: [],
        totalDocs: 0,
        totalPages: 0,
      })

      const filters: ClientProjectsFilters = {
        limit: 100, // Más del máximo permitido
      }

      const result = await getClientProjects('client-123', filters)

      expect(result.success).toBe(true)
      expect(result.data!.limit).toBe(50)
      expect(mockPayload.find).toHaveBeenLastCalledWith(
        expect.objectContaining({
          limit: 50,
        })
      )
    })
  })

  describe('Manejo de errores', () => {
    it('debe manejar errores de PayloadCMS', async () => {
      mockPayload.find.mockRejectedValueOnce(new Error('Database connection failed'))

      const result = await getClientProjects('client-123')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Database connection failed')
    })

    it('debe manejar errores inesperados', async () => {
      mockPayload.find.mockRejectedValueOnce('String error')

      const result = await getClientProjects('client-123')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Error obteniendo proyectos del cliente')
    })
  })
})
