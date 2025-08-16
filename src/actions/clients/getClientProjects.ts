'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { requireAdminAccess } from '@/actions/auth/getUser'
import type { ClientProjectsResult, ClientProjectsFilters } from './types'
import type { User, Project } from '@/payload-types'

/**
 * Server action para obtener proyectos de un cliente específico
 *
 * Solo usuarios admin pueden ejecutar esta función
 * Incluye funcionalidades de búsqueda, filtros, ordenamiento y paginación
 *
 * @param clientId - ID del cliente
 * @param filters - Filtros de búsqueda, ordenamiento y paginación
 * @returns Promise<ClientProjectsResult> - Proyectos del cliente con metadatos
 */
export async function getClientProjects(
  clientId: string,
  filters: ClientProjectsFilters = {},
): Promise<ClientProjectsResult> {
  try {
    // Validar que el usuario es admin
    const adminUser = await requireAdminAccess()
    console.log(
      `getClientProjects: Admin ${adminUser.email} solicitando proyectos del cliente ${clientId}`,
      filters,
    )

    // Validar parámetros de entrada
    if (!clientId || typeof clientId !== 'string') {
      return {
        success: false,
        message: 'ID de cliente inválido',
      }
    }

    // Valores por defecto para filtros
    const {
      searchTerm = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 12,
      dateFrom,
      dateTo,
    } = filters

    // Validar paginación
    const validPage = Math.max(1, page)
    const validLimit = Math.min(Math.max(1, limit), 50) // Máximo 50 por página

    // Obtener payload instance
    const payload = await getPayload({ config })

    // 1. Primero validar que el cliente existe
    const clientQuery = await payload.find({
      collection: 'users',
      where: {
        id: { equals: clientId },
      },
      limit: 1,
    })

    if (!clientQuery.docs.length) {
      console.log(`getClientProjects: Cliente ${clientId} no encontrado`)
      return {
        success: false,
        message: 'Cliente no encontrado',
      }
    }

    const client = clientQuery.docs[0] as User
    console.log(`getClientProjects: Cliente encontrado: ${client.email}`)

    // 2. Construir condiciones de búsqueda para proyectos
    const whereConditions: any = {
      // Solo proyectos creados por este cliente
      createdBy: { equals: clientId },
    }

    // Búsqueda por título del proyecto
    if (searchTerm) {
      whereConditions.title = {
        contains: searchTerm,
      }
    }

    // Filtros de fecha
    if (dateFrom || dateTo) {
      whereConditions.createdAt = {}
      if (dateFrom) {
        whereConditions.createdAt.greater_than_equal = new Date(dateFrom).toISOString()
      }
      if (dateTo) {
        whereConditions.createdAt.less_than_equal = new Date(dateTo).toISOString()
      }
    }

    // 3. Determinar ordenamiento
    const sortField =
      sortBy === 'title' ? 'title' : sortBy === 'updatedAt' ? 'updatedAt' : 'createdAt'
    const sortDirection = sortOrder === 'asc' ? '' : '-'

    console.log(`getClientProjects: Consultando proyectos con condiciones:`, {
      where: whereConditions,
      sort: `${sortDirection}${sortField}`,
      page: validPage,
      limit: validLimit,
    })

    // 4. Ejecutar consulta de proyectos
    const projectsQuery = await payload.find({
      collection: 'projects',
      where: whereConditions,
      sort: `${sortDirection}${sortField}`,
      page: validPage,
      limit: validLimit,
      depth: 2, // Para obtener relaciones
    })

    const projects = projectsQuery.docs as Project[]
    const totalProjects = projectsQuery.totalDocs
    const totalPages = projectsQuery.totalPages

    console.log(
      `getClientProjects: Encontrados ${projects.length} proyectos de ${totalProjects} total para cliente ${client.email}`,
    )

    // 5. Preparar resultado
    const result: ClientProjectsResult = {
      success: true,
      data: {
        client,
        projects,
        totalProjects,
        page: validPage,
        limit: validLimit,
        totalPages,
      },
    }

    return result
  } catch (error) {
    console.error('Error en getClientProjects:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error obteniendo proyectos del cliente',
    }
  }
}
