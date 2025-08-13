'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

import { getCurrentUser } from '@/actions/auth/getUser'
import type { Project, Resource } from '@/payload-types'

interface GetProjectResourcesResult {
  success: boolean
  resources?: Array<Pick<Resource, 'id' | 'title' | 'createdAt'>>
  error?: string
}

export async function getProjectResources(projectId: string): Promise<GetProjectResourcesResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    const payload = await getPayload({ config })

    // Verificar que el proyecto pertenece al usuario (o es admin)
    const projectResponse = await payload.findByID({
      collection: 'projects' as any,
      id: projectId,
      depth: 0,
    })

    const project = projectResponse as Project
    const createdByUserId =
      typeof project.createdBy === 'object' ? project.createdBy?.id : project.createdBy

    const isAdmin = (user as any).role === 'admin'
    if (!isAdmin && createdByUserId !== user.id) {
      return { success: false, error: 'No tienes permisos para acceder a este proyecto' }
    }

    const resourcesResponse = await payload.find({
      collection: 'resources' as any,
      where: { project: { equals: projectId } },
      limit: 500,
      sort: '-createdAt',
      depth: 0,
    })

    const resources = (resourcesResponse.docs as Resource[]).map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt,
    }))

    return { success: true, resources }
  } catch (error) {
    console.error('[getProjectResources] Error:', error)
    return { success: false, error: 'Error obteniendo recursos del proyecto' }
  }
}
