'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { requireAdminAccess } from '@/actions/auth/getUser'
import type { Project, User } from '@/payload-types'

interface CreateProjectForClientData {
  title: string
  description?: string
  clientId: string
}

interface CreateProjectForClientResult {
  success: boolean
  data?: {
    project: Project
    client: User
  }
  message?: string
}

/**
 * Server action para crear proyectos como administrador para otros clientes
 *
 * Solo usuarios admin pueden ejecutar esta función
 * Permite crear proyectos en nombre de cualquier cliente
 *
 * @param data - Datos del proyecto y ID del cliente
 * @returns Promise<CreateProjectForClientResult> - Resultado con proyecto creado
 */
export async function createProjectForClient(
  data: CreateProjectForClientData,
): Promise<CreateProjectForClientResult> {
  try {
    // Validar que el usuario es admin
    const adminUser = await requireAdminAccess()
    console.log(
      `createProjectForClient: Admin ${adminUser.email} creando proyecto para cliente ${data.clientId}`,
      { title: data.title },
    )

    // Validar parámetros de entrada
    if (!data.clientId || typeof data.clientId !== 'string') {
      return {
        success: false,
        message: 'ID de cliente inválido',
      }
    }

    if (!data.title?.trim()) {
      return {
        success: false,
        message: 'El título es requerido',
      }
    }

    if (data.title.trim().length < 3) {
      return {
        success: false,
        message: 'El título debe tener al menos 3 caracteres',
      }
    }

    if (data.title.trim().length > 100) {
      return {
        success: false,
        message: 'El título no puede exceder 100 caracteres',
      }
    }

    if (data.description && data.description.trim().length > 500) {
      return {
        success: false,
        message: 'La descripción no puede exceder 500 caracteres',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // 1. Validar que el cliente existe
    const clientQuery = await payload.find({
      collection: 'users',
      where: {
        id: { equals: data.clientId },
      },
      limit: 1,
    })

    if (!clientQuery.docs.length) {
      console.log(`createProjectForClient: Cliente ${data.clientId} no encontrado`)
      return {
        success: false,
        message: 'Cliente no encontrado',
      }
    }

    const client = clientQuery.docs[0] as User
    console.log(`createProjectForClient: Cliente encontrado: ${client.email}`)

    // 2. Verificar unicidad del título para el cliente específico
    const existingProject = await payload.find({
      collection: 'projects',
      where: {
        and: [{ title: { equals: data.title.trim() } }, { createdBy: { equals: data.clientId } }],
      },
      limit: 1,
    })

    if (existingProject.docs.length > 0) {
      console.log(
        `createProjectForClient: Proyecto con título "${data.title}" ya existe para cliente ${client.email}`,
      )
      return {
        success: false,
        message: `El cliente ya tiene un proyecto con el título "${data.title}". Elige un título diferente.`,
      }
    }

    // 3. Preparar datos del proyecto
    const projectData = {
      title: data.title.trim(),
      description: data.description?.trim()
        ? [
            {
              type: 'paragraph',
              children: [
                {
                  text: data.description.trim(),
                },
              ],
            },
          ]
        : undefined,
      createdBy: data.clientId, // El proyecto pertenece al cliente, no al admin
    }

    console.log(`createProjectForClient: Creando proyecto con datos:`, {
      title: projectData.title,
      clientId: data.clientId,
      clientEmail: client.email,
      adminEmail: adminUser.email,
    })

    // 4. Crear proyecto
    const project = (await payload.create({
      collection: 'projects',
      data: projectData,
    })) as Project

    console.log(`createProjectForClient: Proyecto creado exitosamente:`, {
      projectId: project.id,
      title: project.title,
      slug: project.slug,
      clientId: data.clientId,
      clientEmail: client.email,
      adminEmail: adminUser.email,
    })

    return {
      success: true,
      data: {
        project,
        client,
      },
      message: `Proyecto "${project.title}" creado exitosamente para ${client.name || client.email}`,
    }
  } catch (error) {
    console.error('Error en createProjectForClient:', error)

    // Manejar errores específicos
    if (error instanceof Error) {
      // Error de validación de PayloadCMS
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return {
          success: false,
          message:
            'Ya existe un proyecto con este título para este cliente. Elige un título diferente.',
        }
      }

      // Error de validación de slug
      if (error.message.includes('slug')) {
        return {
          success: false,
          message:
            'Error al generar el identificador del proyecto. Intenta con un título diferente.',
        }
      }

      // Error de permisos
      if (error.message.includes('permission') || error.message.includes('access')) {
        return {
          success: false,
          message: 'No tienes permisos para crear proyectos para este cliente.',
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
