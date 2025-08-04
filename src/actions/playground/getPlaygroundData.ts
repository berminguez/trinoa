'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { Project, Resource } from '@/payload-types'
import type {
  PlaygroundProject,
  PlaygroundVideo,
  PlaygroundDataResponse,
  ProjectToPlaygroundProject,
  ResourceToPlaygroundVideo,
} from '@/types/playground'

/**
 * Transforma un proyecto de PayloadCMS a formato de playground
 */
const transformProject: ProjectToPlaygroundProject = (project: Project): PlaygroundProject => {
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    available: true, // Por defecto disponible, se puede extender la lógica en el futuro
  }
}

/**
 * Transforma un recurso de PayloadCMS a formato de video de playground
 */
const transformResource: ResourceToPlaygroundVideo = (resource: Resource): PlaygroundVideo => {
  // Manejar el campo project que puede ser ID o objeto completo
  const project = typeof resource.project === 'object' ? resource.project : null
  const projectId =
    typeof resource.project === 'string' ? resource.project : project?.id || 'unknown'
  const projectTitle = project?.title || 'Proyecto desconocido'

  return {
    id: resource.id,
    title: resource.title,
    projectId,
    projectTitle,
    type: resource.type as 'video' | 'audio' | 'pdf' | 'ppt', // Asegurar tipos válidos
    status: resource.status as 'pending' | 'processing' | 'completed' | 'failed', // Asegurar tipos válidos
    available: true, // Por defecto disponible, se puede extender la lógica en el futuro
  }
}

/**
 * Server action para obtener proyectos y videos del usuario actual
 * para el contexto de playground
 */
export async function getPlaygroundData(): Promise<PlaygroundDataResponse> {
  try {
    console.log('🔍 Obteniendo datos del playground...')

    // Verificar autenticación
    const user = await getCurrentUser()
    if (!user) {
      console.log('❌ Usuario no autenticado')
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    // Solo usuarios normales y admins pueden acceder
    if (user.role !== 'user' && user.role !== 'admin') {
      console.log('❌ Usuario sin permisos:', user.role)
      return {
        success: false,
        error: 'No tienes permisos para acceder a esta información',
      }
    }

    console.log('✅ Usuario autenticado:', user.id, '- Rol:', user.role)

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Obtener proyectos del usuario actual
    console.log('📁 Obteniendo proyectos del usuario...')
    const projectsResponse = await payload.find({
      collection: 'projects' as any,
      where: {
        createdBy: { equals: user.id },
      },
      limit: 100, // Límite razonable para playground
      sort: 'title', // Ordenar alfabéticamente
      depth: 0, // Solo campos básicos para performance
    })

    const rawProjects = projectsResponse.docs as Project[]
    console.log(`📁 Proyectos encontrados: ${rawProjects.length}`)

    // Transformar proyectos al formato de playground
    const projects: PlaygroundProject[] = rawProjects.map(transformProject)

    // Obtener recursos (videos) del usuario usando IDs de proyectos
    console.log('🎥 Obteniendo recursos de los proyectos del usuario...')

    let rawResources: Resource[] = []

    if (rawProjects.length > 0) {
      // Obtener los IDs de los proyectos del usuario
      const projectIds = rawProjects.map((p) => p.id)
      console.log(`📋 IDs de proyectos del usuario: [${projectIds.join(', ')}]`)

      const resourcesResponse = await payload.find({
        collection: 'resources' as any,
        where: {
          // Buscar recursos que pertenecen a los proyectos del usuario
          project: { in: projectIds },
        },
        limit: 500, // Límite más alto para videos
        sort: 'title', // Ordenar alfabéticamente
        depth: 1, // Incluir información del proyecto para el transform
      })

      rawResources = resourcesResponse.docs as Resource[]
      console.log(`🎥 Recursos encontrados en proyectos del usuario: ${rawResources.length}`)

      // Log de recursos por proyecto para debugging
      const resourcesByProject = rawResources.reduce(
        (acc, resource) => {
          const projectId =
            typeof resource.project === 'string'
              ? resource.project
              : resource.project?.id || 'unknown'
          acc[projectId] = (acc[projectId] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )
      console.log('📊 Recursos por proyecto (raw):', resourcesByProject)
    } else {
      console.log('📂 Usuario no tiene proyectos, no hay recursos que buscar')
    }

    // Transformar recursos al formato de videos de playground
    const videos: PlaygroundVideo[] = rawResources.map(transformResource)

    // Los videos ya están filtrados por proyectos del usuario, pero validamos por seguridad
    const validVideos = videos.filter((video) => {
      const hasValidProject = projects.some((project) => project.id === video.projectId)
      if (!hasValidProject) {
        console.warn(`⚠️ Video "${video.title}" tiene proyecto inválido: ${video.projectId}`)
      }
      return hasValidProject
    })

    console.log(
      `✅ Datos transformados - Proyectos: ${projects.length}, Videos válidos: ${validVideos.length}`,
    )

    // Debug detallado de proyectos
    projects.forEach((p) => {
      console.log(`  📁 Proyecto: "${p.title}" (ID: ${p.id})`)
    })

    // Debug detallado de videos
    validVideos.forEach((v) => {
      console.log(
        `  🎥 Video: "${v.title}" -> Proyecto: "${v.projectTitle}" (${v.projectId}) [${v.type}/${v.status}]`,
      )
    })

    // Estadísticas para logging
    const videosByProject = validVideos.reduce(
      (acc, video) => {
        acc[video.projectId] = (acc[video.projectId] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    console.log('📊 Videos por proyecto:', videosByProject)

    // Validar datos antes de retornar
    if (projects.length === 0 && validVideos.length === 0) {
      console.log('ℹ️ Usuario sin proyectos ni videos')
    }

    return {
      success: true,
      data: {
        projects,
        videos: validVideos,
      },
    }
  } catch (error) {
    console.error('❌ Error obteniendo datos del playground:', error)

    // Mensaje de error detallado para desarrollo, genérico para producción
    const errorMessage =
      process.env.NODE_ENV === 'development'
        ? `Error del servidor: ${error instanceof Error ? error.message : 'Error desconocido'}`
        : 'Error interno del servidor'

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Server action para obtener solo proyectos (útil para cargas rápidas)
 */
export async function getPlaygroundProjects(): Promise<{
  success: boolean
  projects?: PlaygroundProject[]
  error?: string
}> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    const payload = await getPayload({ config })

    const projectsResponse = await payload.find({
      collection: 'projects' as any,
      where: {
        createdBy: { equals: user.id },
      },
      limit: 100,
      sort: 'title',
      depth: 0,
    })

    const projects: PlaygroundProject[] = (projectsResponse.docs as Project[]).map(transformProject)

    return {
      success: true,
      projects,
    }
  } catch (error) {
    console.error('Error obteniendo proyectos:', error)
    return {
      success: false,
      error: 'Error obteniendo proyectos',
    }
  }
}

/**
 * Server action para obtener videos de un proyecto específico
 */
export async function getProjectVideos(
  projectId: string,
): Promise<{ success: boolean; videos?: PlaygroundVideo[]; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    const payload = await getPayload({ config })

    // Primero verificar que el proyecto pertenece al usuario
    const projectResponse = await payload.findByID({
      collection: 'projects' as any,
      id: projectId,
      depth: 0,
    })

    const project = projectResponse as Project
    if (project.createdBy !== user.id) {
      return { success: false, error: 'No tienes permisos para acceder a este proyecto' }
    }

    // Obtener videos del proyecto
    const resourcesResponse = await payload.find({
      collection: 'resources' as any,
      where: {
        project: { equals: projectId },
      },
      limit: 200,
      sort: 'title',
      depth: 1,
    })

    const videos: PlaygroundVideo[] = (resourcesResponse.docs as Resource[]).map(transformResource)

    return {
      success: true,
      videos,
    }
  } catch (error) {
    console.error('Error obteniendo videos del proyecto:', error)
    return {
      success: false,
      error: 'Error obteniendo videos del proyecto',
    }
  }
}
