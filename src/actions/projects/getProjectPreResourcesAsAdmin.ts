'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { requireAdminAccess } from '@/actions/auth/getUser'
import type { Project, User, PreResource } from '@/payload-types'

interface GetProjectPreResourcesAsAdminResult {
  success: boolean
  data?: {
    project: Project
    client: User
    preResources: PreResource[]
    totalPreResources: number
  }
  message?: string
}

/**
 * Server action para obtener pre-resources de un proyecto como administrador
 *
 * Solo usuarios admin pueden ejecutar esta función
 * Obtiene pre-resources de cualquier proyecto con información del cliente
 *
 * @param projectId - ID del proyecto
 * @param clientId - ID del cliente (opcional, para validación)
 * @returns Promise<GetProjectPreResourcesAsAdminResult> - Pre-resources del proyecto
 */
export async function getProjectPreResourcesAsAdmin(
  projectId: string,
  clientId?: string,
): Promise<GetProjectPreResourcesAsAdminResult> {
  try {
    // Validar que el usuario es admin
    const adminUser = await requireAdminAccess()
    console.log(
      `getProjectPreResourcesAsAdmin: Admin ${adminUser.email} obteniendo pre-resources del proyecto ${projectId}`,
      { clientId },
    )

    // Validar parámetros de entrada
    if (!projectId || typeof projectId !== 'string') {
      return {
        success: false,
        message: 'ID de proyecto inválido',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // 1. Obtener proyecto y validar ownership
    let project: Project
    let client: User

    try {
      console.log(`getProjectPreResourcesAsAdmin: Cargando proyecto ${projectId}`)

      project = await payload.findByID({
        collection: 'projects',
        id: projectId,
        depth: 2,
      })

      console.log(`getProjectPreResourcesAsAdmin: Proyecto encontrado: ${project.title}`)

      // Obtener información del cliente propietario
      const projectClientId =
        typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy

      client = await payload.findByID({
        collection: 'users',
        id: projectClientId,
        depth: 1,
      })

      console.log(`getProjectPreResourcesAsAdmin: Cliente propietario: ${client.email}`)

      // Si se proporciona clientId, validar que coincide
      if (clientId && clientId !== projectClientId) {
        console.log(
          `getProjectPreResourcesAsAdmin: Cliente no coincide. Esperado: ${clientId}, Real: ${projectClientId}`,
        )
        return {
          success: false,
          message: 'El proyecto no pertenece al cliente especificado',
        }
      }
    } catch (error) {
      console.error('getProjectPreResourcesAsAdmin: Error obteniendo proyecto o cliente:', error)
      return {
        success: false,
        message: 'Proyecto no encontrado',
      }
    }

    // 2. Obtener pre-resources del proyecto
    console.log(
      `getProjectPreResourcesAsAdmin: Cargando pre-resources del proyecto ${project.title}`,
    )

    const preResourcesQuery = await payload.find({
      collection: 'pre-resources',
      where: {
        project: { equals: projectId },
      },
      limit: 50, // Límite para administradores
      sort: '-createdAt',
      depth: 2,
    })

    const preResources = preResourcesQuery.docs as PreResource[]
    const totalPreResources = preResourcesQuery.totalDocs

    console.log(
      `getProjectPreResourcesAsAdmin: ${preResources.length} pre-resources encontrados para proyecto ${project.title}`,
    )

    // 3. Logging de auditoría
    console.log(
      `getProjectPreResourcesAsAdmin: Acceso administrativo a pre-resources completado:`,
      {
        projectId: project.id,
        projectTitle: project.title,
        clientId: client.id,
        clientEmail: client.email,
        adminEmail: adminUser.email,
        preResourcesCount: totalPreResources,
        timestamp: new Date().toISOString(),
      },
    )

    return {
      success: true,
      data: {
        project,
        client,
        preResources,
        totalPreResources,
      },
      message: `Pre-resources del proyecto "${project.title}" obtenidos exitosamente`,
    }
  } catch (error) {
    console.error('Error en getProjectPreResourcesAsAdmin:', error)

    // Manejar errores específicos
    if (error instanceof Error) {
      // Error de permisos
      if (error.message.includes('permission') || error.message.includes('access')) {
        return {
          success: false,
          message: 'No tienes permisos para acceder a los pre-resources de este proyecto.',
        }
      }

      return {
        success: false,
        message: error.message,
      }
    }

    return {
      success: false,
      message: 'Error interno del servidor. Intenta nuevamente.',
    }
  }
}
