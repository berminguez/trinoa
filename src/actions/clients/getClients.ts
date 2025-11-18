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
        {
          filial: {
            contains: searchTerm,
          },
        },
        {
          'empresa.name': {
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
      depth: 1,
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

          // Calcular última actividad real del usuario
          // Considerando: updatedAt del usuario, proyectos y recursos
          const activityDates: Date[] = []

          // 1. Fecha de actualización del usuario
          if (client.updatedAt) {
            activityDates.push(new Date(client.updatedAt))
          }

          // 2. Obtener el proyecto más reciente del usuario
          const recentProject = await payload.find({
            collection: 'projects',
            where: {
              createdBy: { equals: client.id },
            },
            limit: 1,
            sort: '-updatedAt',
            depth: 0,
          })

          if (recentProject.docs.length > 0 && recentProject.docs[0].updatedAt) {
            activityDates.push(new Date(recentProject.docs[0].updatedAt))
          }

          // 3. Obtener el recurso (documento) más reciente de los proyectos del usuario
          // Como Resources no tiene campo 'user', buscamos por los proyectos del usuario
          if (projectsResponse.totalDocs > 0) {
            // Obtener IDs de todos los proyectos del usuario
            const userProjects = await payload.find({
              collection: 'projects',
              where: {
                createdBy: { equals: client.id },
              },
              limit: 100, // Límite razonable para evitar problemas de performance
              depth: 0,
            })

            if (userProjects.docs.length > 0) {
              const projectIds = userProjects.docs.map((p) => p.id)

              // Buscar el recurso más reciente de cualquiera de esos proyectos
              const recentResource = await payload.find({
                collection: 'resources',
                where: {
                  project: { in: projectIds },
                },
                limit: 1,
                sort: '-updatedAt',
                depth: 0,
              })

              if (recentResource.docs.length > 0 && recentResource.docs[0].updatedAt) {
                activityDates.push(new Date(recentResource.docs[0].updatedAt))
              }
            }
          }

          // Obtener la fecha más reciente de todas las actividades
          const lastActivityDate =
            activityDates.length > 0
              ? new Date(Math.max(...activityDates.map((d) => d.getTime())))
              : new Date(client.updatedAt)

          const lastActivity = lastActivityDate.toISOString()

          // Determinar si el usuario está activo (actividad en los últimos 30 días)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          const isActive = lastActivityDate > thirtyDaysAgo

          return {
            ...client,
            projectCount: projectsResponse.totalDocs,
            lastActivity,
            isActive,
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
