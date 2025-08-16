'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { requireAdminAccess } from '@/actions/auth/getUser'
import type { ClientsListResult, ClientsFilters, ClientWithStats } from './types'
import type { User } from '@/payload-types'

/**
 * Server action para obtener lista paginada de todos los clientes
 *
 * Solo usuarios admin pueden ejecutar esta función
 * Incluye funcionalidades de búsqueda, filtros, ordenamiento y paginación
 *
 * @param filters - Filtros de búsqueda, ordenamiento y paginación
 * @returns Promise<ClientsListResult> - Lista de clientes con metadatos
 */
export async function getClients(filters: ClientsFilters = {}): Promise<ClientsListResult> {
  try {
    // Validar que el usuario es admin
    const adminUser = await requireAdminAccess()
    console.log(
      `getClients: Admin ${adminUser.email} solicitando lista de clientes con filtros:`,
      filters,
    )

    // Valores por defecto para filtros
    const {
      searchTerm = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 12,
      dateFrom,
      dateTo,
      role,
    } = filters

    // Validar paginación
    const validPage = Math.max(1, page)
    const validLimit = Math.min(Math.max(1, limit), 50) // Máximo 50 por página

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Construir condiciones de búsqueda
    const whereConditions: any = {}

    // Búsqueda por texto (nombre o email)
    if (searchTerm) {
      whereConditions.or = [
        {
          name: {
            contains: searchTerm,
          },
        },
        {
          email: {
            contains: searchTerm,
          },
        },
      ]
    }

    // Filtro por rol
    if (role) {
      whereConditions.role = {
        equals: role,
      }
    }

    // Filtro por fecha de registro
    if (dateFrom || dateTo) {
      whereConditions.createdAt = {}
      if (dateFrom) {
        whereConditions.createdAt.greater_than_equal = new Date(dateFrom).toISOString()
      }
      if (dateTo) {
        whereConditions.createdAt.less_than_equal = new Date(dateTo).toISOString()
      }
    }

    // Determinar campo de ordenamiento
    let sortField: string
    switch (sortBy) {
      case 'name':
        sortField = 'name'
        break
      case 'email':
        sortField = 'email'
        break
      case 'createdAt':
        sortField = 'createdAt'
        break
      default:
        sortField = 'createdAt'
    }

    // Construir ordenamiento
    const sortDirection = sortOrder === 'asc' ? '' : '-'
    const sort = `${sortDirection}${sortField}`

    console.log('getClients: Ejecutando query con condiciones:', {
      where: whereConditions,
      sort,
      page: validPage,
      limit: validLimit,
    })

    // Ejecutar consulta principal de usuarios
    const usersResponse = await payload.find({
      collection: 'users',
      where: whereConditions,
      sort,
      page: validPage,
      limit: validLimit,
      depth: 0, // Solo campos básicos del usuario
    })

    const clients = usersResponse.docs as User[]
    console.log(
      `getClients: Encontrados ${clients.length} clientes de ${usersResponse.totalDocs} total`,
    )

    // Obtener estadísticas de proyectos para cada cliente
    const clientsWithStats: ClientWithStats[] = await Promise.all(
      clients.map(async (client) => {
        try {
          // Contar proyectos del cliente
          const projectsResponse = await payload.find({
            collection: 'projects',
            where: {
              createdBy: { equals: client.id },
            },
            limit: 0, // Solo contar, no obtener docs
            depth: 0,
          })

          // TODO: En el futuro se puede obtener lastActivity desde logs o timestamps
          const lastActivity = client.updatedAt

          return {
            ...client,
            projectCount: projectsResponse.totalDocs,
            lastActivity,
            isActive: true, // TODO: Definir lógica de actividad basada en última sesión
          } as ClientWithStats
        } catch (error) {
          console.error(`Error obteniendo estadísticas para cliente ${client.id}:`, error)
          return {
            ...client,
            projectCount: 0,
            lastActivity: client.updatedAt,
            isActive: false,
          } as ClientWithStats
        }
      }),
    )

    // Si se ordena por projectCount, reordenar manualmente
    if (sortBy === 'projectCount') {
      clientsWithStats.sort((a, b) => {
        const comparison = a.projectCount - b.projectCount
        return sortOrder === 'asc' ? comparison : -comparison
      })
    }

    // Calcular metadatos de paginación
    const totalPages = Math.ceil(usersResponse.totalDocs / validLimit)

    const result: ClientsListResult = {
      success: true,
      data: {
        clients: clientsWithStats,
        totalClients: usersResponse.totalDocs,
        page: validPage,
        limit: validLimit,
        totalPages,
      },
      message: `Lista de clientes obtenida correctamente (${clients.length} de ${usersResponse.totalDocs})`,
    }

    console.log('getClients: Resultado exitoso:', {
      clientsCount: clientsWithStats.length,
      totalClients: usersResponse.totalDocs,
      page: validPage,
      totalPages,
    })

    return result
  } catch (error) {
    console.error('Error en getClients:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      filters,
    })

    return {
      success: false,
      message: 'Error interno obteniendo lista de clientes. Intenta nuevamente.',
    }
  }
}
