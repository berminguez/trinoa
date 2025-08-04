'use server'

import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { Project } from '@/payload-types'

interface CreateProjectData {
  title: string
  description?: string
}

interface CreateProjectResult {
  success: boolean
  data?: Project
  error?: string
}

export async function createProjectAction(data: CreateProjectData): Promise<CreateProjectResult> {
  try {
    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    // Solo usuarios normales y admins pueden crear proyectos
    if (user.role !== 'user' && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para crear proyectos',
      }
    }

    // Validar datos de entrada
    if (!data.title?.trim()) {
      return {
        success: false,
        error: 'El título es requerido',
      }
    }

    if (data.title.trim().length < 3) {
      return {
        success: false,
        error: 'El título debe tener al menos 3 caracteres',
      }
    }

    if (data.title.trim().length > 100) {
      return {
        success: false,
        error: 'El título no puede exceder 100 caracteres',
      }
    }

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Verificar unicidad del título para el usuario actual
    const existingProject = await payload.find({
      collection: 'projects' as any,
      where: {
        and: [{ title: { equals: data.title.trim() } }, { createdBy: { equals: user.id } }],
      },
      limit: 1,
    })

    if (existingProject.docs.length > 0) {
      return {
        success: false,
        error: 'Ya tienes un proyecto con este título. Elige un título diferente.',
      }
    }

    // Preparar datos del proyecto
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
      createdBy: user.id,
    }

    // Crear proyecto
    const project = (await payload.create({
      collection: 'projects' as any,
      data: projectData,
    })) as Project

    console.log('[CREATE_PROJECT] Project created successfully:', {
      projectId: project.id,
      title: project.title,
      slug: project.slug,
      userId: user.id,
      userEmail: user.email,
    })

    return {
      success: true,
      data: project,
    }
  } catch (error) {
    console.error('[CREATE_PROJECT] Error creating project:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      data,
    })

    // Manejar errores específicos
    if (error instanceof Error) {
      // Error de validación de PayloadCMS
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return {
          success: false,
          error: 'Ya existe un proyecto con este título. Elige un título diferente.',
        }
      }

      // Error de validación de slug
      if (error.message.includes('slug')) {
        return {
          success: false,
          error: 'Error al generar el identificador del proyecto. Intenta con un título diferente.',
        }
      }
    }

    return {
      success: false,
      error: 'Error interno del servidor. Intenta nuevamente.',
    }
  }
}
