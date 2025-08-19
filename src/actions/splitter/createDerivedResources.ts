'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import type { Media, PreResource, Resource } from '@/payload-types'
import { StorageManager } from '@/lib/storage'
import { PDFDocument } from 'pdf-lib'
import { computeRangesFromFirstPages } from '@/lib/pdf/range-utils'
import { splitPdfByRanges } from '@/lib/pdf/splitter'
import { addFileId } from '@/lib/utils/fileUtils'

interface CreateDerivedResourcesInput {
  preResourceId: string
}

interface CreateDerivedResourcesResult {
  success: boolean
  data?: { resourceIds: string[] }
  error?: string
}

export async function createDerivedResources(
  input: CreateDerivedResourcesInput,
): Promise<CreateDerivedResourcesResult> {
  try {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Usuario no autenticado' }

    const payload = await getPayload({ config })

    const pre = (await payload.findByID({
      collection: 'pre-resources',
      id: input.preResourceId,
    })) as PreResource

    if (!pre) return { success: false, error: 'Pre-resource no encontrado' }

    const media = (await payload.findByID({
      collection: 'media',
      id: pre.file as any,
    })) as Media

    const key = (media as any)?.filename as string | undefined
    if (!key) return { success: false, error: 'Media sin filename' }

    // Descargar PDF a buffer desde URL firmada
    const fileUrl = await StorageManager.getSplitterReadUrl(key, 1800)
    const fetched = await fetch(fileUrl)
    if (!fetched.ok) return { success: false, error: `Fallo descargando PDF: ${fetched.status}` }
    const arrayBuffer = await fetched.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // Contar páginas totales
    const src = await PDFDocument.load(inputBuffer)
    const totalPages = src.getPageCount()

    // Construir pages[] desde pre.splitterResponse
    const pages = Array.isArray((pre as any)?.splitterResponse?.pages)
      ? ((pre as any).splitterResponse.pages as Array<{ page: number }>)
          .map((p) => Number(p?.page))
          .filter((n) => Number.isFinite(n) && n > 0)
      : []

    // Calcular rangos 1-based -> [start,end]
    const ranges = computeRangesFromFirstPages(pages, totalPages)

    // Dividir PDF en fragmentos
    const fragments = await splitPdfByRanges(inputBuffer, ranges)

    const projectId = String(pre.project as any)
    const namespace = `project-${projectId}-documents`

    // Usar el nombre original guardado en el PreResource en lugar del filename del media
    const baseName = String((pre as any)?.originalName || 'Documento')

    const createdResourceIds: string[] = []

    for (let i = 0; i < fragments.length; i++) {
      const partBuffer = fragments[i]
      const partIndex = i + 1
      const partName = addFileId(`${baseName}-part-${String(partIndex).padStart(2, '0')}.pdf`)

      // Crear Media para el fragmento
      const partMedia = (await payload.create({
        collection: 'media',
        data: {
          filename: partName,
          mimeType: 'application/pdf',
          filesize: partBuffer.length,
          alt: partName,
          title: partName.replace(/\.[^/.]+$/, ''),
          description: `Fragmento ${partIndex} generado por Splitter`,
          mediaType: 'document',
        },
        file: {
          data: partBuffer,
          mimetype: 'application/pdf',
          name: partName,
          size: partBuffer.length,
        },
      })) as Media

      // Crear Resource para el fragmento
      const resource = (await payload.create({
        collection: 'resources',
        data: {
          title: `${baseName} - Segmento ${partIndex}`,
          project: projectId,
          namespace,
          type: 'document',
          file: partMedia.id,
          status: 'completed',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          logs: [
            {
              step: 'splitter-fragment',
              status: 'success',
              at: new Date().toISOString(),
              details: `Fragmento ${partIndex}/${fragments.length}`,
              data: { range: ranges[i] },
            },
          ],
        },
      })) as Resource

      createdResourceIds.push(String((resource as any).id))
    }

    // Actualizar pre-resource con trazabilidad
    await payload.update({
      collection: 'pre-resources',
      id: pre.id,
      data: {
        status: 'done',
        derivedResourceIds: createdResourceIds.map((id) => ({ resourceId: id })),
        lastUpdatedBy: user.id,
      },
      overrideAccess: true,
    })

    return { success: true, data: { resourceIds: createdResourceIds } }
  } catch (error) {
    console.error('[SPLITTER] createDerivedResources error:', error)
    return { success: false, error: 'Error creando resources derivados' }
  }
}
