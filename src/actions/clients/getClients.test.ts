import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getClients } from './getClients'
import type { ClientsFilters } from './types'

// Mock de dependencias
vi.mock('@/actions/auth/getUser', () => ({
  requireAdminAccess: vi.fn(),
}))

vi.mock('payload', () => ({
  getPayload: vi.fn(),
}))

// Mock de payload config
vi.mock('@payload-config', () => ({
  default: {},
}))

describe('getClients', () => {
  const mockRequireAdminAccess = vi.mocked(
    (await import('@/actions/auth/getUser')).requireAdminAccess,
  )
  const mockGetPayload = vi.mocked((await import('payload')).getPayload)

  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@test.com',
    role: 'admin' as const,
    name: 'Admin User',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }

  const mockUsers = [
    {
      id: 'user-1',
      name: 'Juan Pérez',
      email: 'juan@test.com',
      role: 'user',
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: '2024-01-20T00:00:00.000Z',
    },
    {
      id: 'user-2',
      name: 'María García',
      email: 'maria@test.com',
      role: 'user',
      createdAt: '2024-01-10T00:00:00.000Z',
      updatedAt: '2024-01-18T00:00:00.000Z',
    },
  ]

  const mockPayload = {
    find: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAccess.mockResolvedValue(mockAdminUser)
    mockGetPayload.mockResolvedValue(mockPayload as any)
  })

  it('debe requerir acceso de administrador', async () => {
    // Simular fallo de autenticación admin
    mockRequireAdminAccess.mockRejectedValue(new Error('No admin access'))

    const result = await getClients()

    expect(result.success).toBe(false)
    expect(result.message).toContain('Error interno')
    expect(mockRequireAdminAccess).toHaveBeenCalled()
  })

  it('debe obtener lista de clientes con valores por defecto', async () => {
    // Mock respuesta de usuarios
    mockPayload.find.mockImplementation((params) => {
      if (params.collection === 'users') {
        return Promise.resolve({
          docs: mockUsers,
          totalDocs: 2,
          page: 1,
          limit: 12,
          totalPages: 1,
        })
      }
      // Mock respuesta de proyectos (contador)
      return Promise.resolve({
        docs: [],
        totalDocs: 3, // Mock: user-1 tiene 3 proyectos
      })
    })

    const result = await getClients()

    expect(result.success).toBe(true)
    expect(result.data?.clients).toHaveLength(2)
    expect(result.data?.totalClients).toBe(2)
    expect(result.data?.page).toBe(1)
    expect(result.data?.limit).toBe(12)

    // Verificar que se llamó correctamente
    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: 'users',
      where: {},
      sort: '-createdAt',
      page: 1,
      limit: 12,
      depth: 0,
    })
  })

  it('debe aplicar filtros de búsqueda correctamente', async () => {
    const filters: ClientsFilters = {
      searchTerm: 'juan',
      role: 'user',
      sortBy: 'name',
      sortOrder: 'asc',
      page: 2,
      limit: 5,
    }

    mockPayload.find.mockResolvedValue({
      docs: [mockUsers[0]], // Solo Juan
      totalDocs: 1,
      page: 2,
      limit: 5,
      totalPages: 1,
    })

    const result = await getClients(filters)

    expect(result.success).toBe(true)
    expect(mockPayload.find).toHaveBeenCalledWith({
      collection: 'users',
      where: {
        or: [
          { name: { contains: 'juan' } },
          { email: { contains: 'juan' } },
        ],
        role: { equals: 'user' },
      },
      sort: 'name', // Sin '-' porque es asc
      page: 2,
      limit: 5,
      depth: 0,
    })
  })

  it('debe aplicar filtros de fecha correctamente', async () => {
    const filters: ClientsFilters = {
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
    }

    mockPayload.find.mockResolvedValue({
      docs: mockUsers,
      totalDocs: 2,
    })

    await getClients(filters)

    expect(mockPayload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: {
            greater_than_equal: '2024-01-01T00:00:00.000Z',
            less_than_equal: '2024-01-31T00:00:00.000Z',
          },
        },
      }),
    )
  })

  it('debe validar límites de paginación', async () => {
    const filters: ClientsFilters = {
      page: -1, // Inválido
      limit: 100, // Excede máximo
    }

    mockPayload.find.mockResolvedValue({
      docs: [],
      totalDocs: 0,
    })

    await getClients(filters)

    expect(mockPayload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1, // Corregido a mínimo
        limit: 50, // Corregido a máximo
      }),
    )
  })

  it('debe manejar errores en consulta de usuarios', async () => {
    mockPayload.find.mockRejectedValue(new Error('Database error'))

    const result = await getClients()

    expect(result.success).toBe(false)
    expect(result.message).toContain('Error interno')
  })

  it('debe calcular estadísticas de proyectos para cada cliente', async () => {
    // Mock respuesta de usuarios
    mockPayload.find.mockImplementation((params) => {
      if (params.collection === 'users') {
        return Promise.resolve({
          docs: mockUsers,
          totalDocs: 2,
        })
      }
      // Mock respuestas diferentes por cliente
      if (params.where?.createdBy?.equals === 'user-1') {
        return Promise.resolve({ totalDocs: 3 })
      }
      if (params.where?.createdBy?.equals === 'user-2') {
        return Promise.resolve({ totalDocs: 1 })
      }
      return Promise.resolve({ totalDocs: 0 })
    })

    const result = await getClients()

    expect(result.success).toBe(true)
    expect(result.data?.clients[0]).toHaveProperty('projectCount', 3)
    expect(result.data?.clients[1]).toHaveProperty('projectCount', 1)
    expect(result.data?.clients[0]).toHaveProperty('isActive', true)
    expect(result.data?.clients[0]).toHaveProperty('lastActivity')
  })

  it('debe manejar errores en estadísticas de proyectos individual', async () => {
    // Mock respuesta de usuarios exitosa
    mockPayload.find.mockImplementation((params) => {
      if (params.collection === 'users') {
        return Promise.resolve({
          docs: [mockUsers[0]],
          totalDocs: 1,
        })
      }
      // Error en consulta de proyectos
      throw new Error('Project query error')
    })

    const result = await getClients()

    expect(result.success).toBe(true)
    expect(result.data?.clients[0]).toHaveProperty('projectCount', 0)
    expect(result.data?.clients[0]).toHaveProperty('isActive', false)
  })

  it('debe ordenar por projectCount cuando se especifica', async () => {
    const filters: ClientsFilters = {
      sortBy: 'projectCount',
      sortOrder: 'desc',
    }

    // Mock usuarios con diferentes cantidades de proyectos
    mockPayload.find.mockImplementation((params) => {
      if (params.collection === 'users') {
        return Promise.resolve({
          docs: mockUsers,
          totalDocs: 2,
        })
      }
      // user-1: 1 proyecto, user-2: 5 proyectos
      if (params.where?.createdBy?.equals === 'user-1') {
        return Promise.resolve({ totalDocs: 1 })
      }
      if (params.where?.createdBy?.equals === 'user-2') {
        return Promise.resolve({ totalDocs: 5 })
      }
      return Promise.resolve({ totalDocs: 0 })
    })

    const result = await getClients(filters)

    expect(result.success).toBe(true)
    // Debe estar ordenado por projectCount descendente: user-2 (5), user-1 (1)
    expect(result.data?.clients[0].id).toBe('user-2')
    expect(result.data?.clients[0].projectCount).toBe(5)
    expect(result.data?.clients[1].id).toBe('user-1')
    expect(result.data?.clients[1].projectCount).toBe(1)
  })
})
