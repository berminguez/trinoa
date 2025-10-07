'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import { addFileId } from '@/lib/utils/fileUtils'
import type { Media, PreResource } from '@/payload-types'

interface CreatePreResourceFromUploadResult {
  success: boolean
  data?: { preResource: PreResource; media: Media }
  error?: string
}

export async function createPreResourceFromUpload(
  formData: FormData,
): Promise<CreatePreResourceFromUploadResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Usuario no autenticado' }

    const projectId = String(formData.get('projectId') || '')
    const file = formData.get('file') as File | null
    const splitMode = String(formData.get('splitMode') || 'auto')
    const manualPages = String(formData.get('manualPages') || '')

    if (!projectId) return { success: false, error: 'projectId es requerido' }
    if (!file) return { success: false, error: 'Archivo requerido' }

    // Validaciones básicas
    if (!file.name || file.size === 0) return { success: false, error: 'Archivo inválido' }
    const isPdf = file.type?.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) return { success: false, error: 'Solo se permiten PDFs en el flujo Splitter' }
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize)
      return { success: false, error: 'Archivo demasiado grande (max 100MB)' }

    // Validar modo manual si está seleccionado
    if (splitMode === 'manual') {
      if (!manualPages || !manualPages.trim()) {
        return { success: false, error: 'Los números de página son requeridos para el modo manual' }
      }

      // Validar formato de números de página (números separados por comas)
      const pageNumbers = manualPages
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p)
      const validPages = pageNumbers.every((p) => /^\d+$/.test(p) && parseInt(p) > 0)

      if (!validPages) {
        return {
          success: false,
          error:
            'Los números de página deben ser números positivos separados por comas (ej: 1,3,5)',
        }
      }

      if (pageNumbers.length < 2) {
        return {
          success: false,
          error: 'Debe especificar al menos 2 números de página para dividir el documento',
        }
      }
    }

    const payload = await getPayload({ config })

    // Preparar buffer y nombre único
    const buffer = Buffer.from(await file.arrayBuffer())
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = addFileId(originalName.endsWith('.pdf') ? originalName : `${originalName}.pdf`)

    // Extraer nombre original limpio sin extensión para usar en recursos derivados
    const originalNameWithoutExtension = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9\s.-]/g, '_')

    // Crear Media en PayloadCMS
    const media = (await payload.create({
      collection: 'media',
      data: {
        filename,
        mimeType: 'application/pdf',
        filesize: buffer.length,
        alt: filename,
        title: filename.replace(/\.[^/.]+$/, ''),
        description: 'PDF subido para proceso Splitter',
        mediaType: 'document',
      },
      file: {
        data: buffer,
        mimetype: 'application/pdf',
        name: filename,
        size: buffer.length,
      },
    })) as Media

    // Crear pre-resource
    const pre = (await payload.create({
      collection: 'pre-resources',
      data: {
        project: projectId,
        user: user.id,
        file: media.id,
        originalName: originalNameWithoutExtension,
        splitMode: splitMode as 'auto' | 'manual',
        manualPageNumbers: splitMode === 'manual' ? manualPages : undefined,
        status: 'pending',
        lastUpdatedBy: user.id,
      },
      overrideAccess: true,
    })) as PreResource

    return { success: true, data: { preResource: pre, media } }
  } catch (error) {
    console.error('[SPLITTER] createPreResourceFromUpload error:', error)
    return { success: false, error: 'Error subiendo archivo y creando pre-resource' }
  }
}
