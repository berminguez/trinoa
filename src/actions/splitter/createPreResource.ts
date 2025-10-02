'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { Media, PreResource, Project } from '@/payload-types'

interface CreatePreResourceInput {
  projectId: string
  mediaId: string
}

interface CreatePreResourceResult {
  success: boolean
  data?: { preResource: PreResource }
  error?: string
}

export async function createPreResource(
  input: CreatePreResourceInput,
): Promise<CreatePreResourceResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Usuario no autenticado' }

    const payload = await getPayload({ config })

    // Validaciones mínimas
    const project = (await payload.findByID({
      collection: 'projects',
      id: input.projectId,
    })) as Project
    if (!project) return { success: false, error: 'Proyecto no encontrado' }

    const media = (await payload.findByID({ collection: 'media', id: input.mediaId })) as Media
    if (!media) return { success: false, error: 'Archivo no encontrado' }

    // Extraer nombre original del media para usar en recursos derivados
    const mediaFilename = (media as any)?.filename || 'Documento'
    const originalNameWithoutExtension = mediaFilename
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9\s.-]/g, '_')

    // Crear pre-resource en estado pending
    const pre = (await payload.create({
      collection: 'pre-resources',
      data: {
        project: input.projectId,
        user: user.id,
        file: media.id,
        originalName: originalNameWithoutExtension,
        splitMode: 'auto', // Por defecto modo automático (este endpoint no recibe parámetros de usuario)
        manualPageNumbers: undefined, // No hay números manuales para este flujo
        status: 'pending',
        lastUpdatedBy: user.id,
      },
      overrideAccess: true,
    })) as PreResource

    return { success: true, data: { preResource: pre } }
  } catch (error) {
    console.error('[SPLITTER] createPreResource error:', error)
    return { success: false, error: 'Error creando pre-resource' }
  }
}
