'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/actions/auth/getUser'
import { revalidatePath } from 'next/cache'
import { addFileId } from '@/lib/utils/fileUtils'
import type { Resource, Media } from '@/payload-types'

interface UploadFromUrlsData {
  urls: string[]
  projectId: string
}

interface UploadFromUrlsResult {
  success: boolean
  data?: Array<{
    url: string
    success: boolean
    resource?: Resource
    error?: string
  }>
  error?: string
}

// Helper para truncar URLs largas en logs
const truncateUrl = (url: string, maxLength: number = 80): string => {
  if (url.length <= maxLength) return url
  const start = url.substring(0, 40)
  const end = url.substring(url.length - 30)
  return `${start}...${end}`
}

export async function uploadFromUrls(data: UploadFromUrlsData): Promise<UploadFromUrlsResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    const payload = await getPayload({ config })
    console.log('🔗 [URL-UPLOAD] Starting upload from URLs:', {
      urls: data.urls.map((url) => truncateUrl(url)),
      projectId: data.projectId,
    })

    const results = []

    for (const url of data.urls) {
      const urlTrimmed = url.trim()
      if (!urlTrimmed) continue

      try {
        // Validar URL
        const urlObj = new URL(urlTrimmed)
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          results.push({
            url: urlTrimmed,
            success: false,
            error: 'Only HTTP/HTTPS URLs are allowed',
          })
          continue
        }

        console.log(`📥 [URL-UPLOAD] Downloading from: ${truncateUrl(urlTrimmed)}`)

        // Descargar el archivo
        const response = await fetch(urlTrimmed, {
          method: 'GET',
          headers: {
            'User-Agent': 'Trinoa Document Downloader 1.0',
          },
        })

        if (!response.ok) {
          results.push({
            url: urlTrimmed,
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
          })
          continue
        }

        // Obtener el tipo de contenido y el tamaño
        const contentType = response.headers.get('content-type') || ''
        const contentLength = parseInt(response.headers.get('content-length') || '0')

        // Validar tipo de archivo
        const supportedMimeTypes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ]

        if (!supportedMimeTypes.some((type) => contentType.includes(type))) {
          results.push({
            url: urlTrimmed,
            success: false,
            error: `Unsupported file type: ${contentType}. Supported: PDF, JPG, PNG, WebP`,
          })
          continue
        }

        // Validar tamaño (100MB máximo)
        const maxSize = 100 * 1024 * 1024 // 100MB
        if (contentLength > maxSize) {
          results.push({
            url: urlTrimmed,
            success: false,
            error: `File too large: ${(contentLength / (1024 * 1024)).toFixed(1)}MB (max: 100MB)`,
          })
          continue
        }

        // Obtener el buffer del archivo
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Generar nombre de archivo desde la URL
        let filename = urlObj.pathname.split('/').pop() || 'document'

        // Si no tiene extensión, añadirla basada en el content-type
        if (!filename.includes('.')) {
          const ext = contentType.includes('pdf')
            ? '.pdf'
            : contentType.includes('jpeg')
              ? '.jpg'
              : contentType.includes('png')
                ? '.png'
                : contentType.includes('webp')
                  ? '.webp'
                  : '.bin'
          filename += ext
        }

        // Limpiar el nombre de archivo
        filename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')

        // ⭐ AÑADIR IDENTIFICADOR ÚNICO para evitar colisiones
        filename = addFileId(filename)

        console.log(
          `📄 [URL-UPLOAD] Processing file: ${filename} (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) from ${truncateUrl(urlTrimmed)}`,
        )

        // Crear el archivo en PayloadCMS usando la colección Media
        const mediaDoc = await payload.create({
          collection: 'media',
          data: {
            filename,
            mimeType: contentType,
            filesize: buffer.length,
            alt: `Document downloaded from ${urlTrimmed}`, // Campo requerido
            title: filename.replace(/\.[^/.]+$/, ''), // Sin extensión
            description: `Document automatically downloaded from URL: ${urlTrimmed}`,
            mediaType: contentType.includes('pdf') ? 'document' : 'image',
          },
          file: {
            data: buffer,
            mimetype: contentType,
            name: filename,
            size: buffer.length,
          },
        })

        console.log(`✅ [URL-UPLOAD] Media created: ${mediaDoc.id}`)

        // Crear el recurso
        const namespace = `project-${data.projectId}-documents`
        const resource = await payload.create({
          collection: 'resources',
          data: {
            title: filename.replace(/\.[^/.]+$/, ''), // Sin extensión
            project: data.projectId, // Campo requerido: relación con proyecto
            namespace,
            type: contentType.includes('pdf') ? 'document' : 'image',
            file: mediaDoc.id,
            status: 'completed',
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            logs: [
              {
                step: 'url-download',
                status: 'success',
                at: new Date().toISOString(),
                details: `Document downloaded from URL: ${urlTrimmed}`,
                data: {
                  jobType: 'url-download',
                  sourceUrl: urlTrimmed,
                  fileName: filename,
                  fileSize: buffer.length,
                  namespace,
                },
              },
            ],
          },
        })

        console.log(`🎉 [URL-UPLOAD] Resource created: ${resource.id}`)

        results.push({
          url: urlTrimmed,
          success: true,
          resource: resource as Resource,
        })
      } catch (urlError) {
        console.error(`❌ [URL-UPLOAD] Error processing ${truncateUrl(urlTrimmed)}:`, urlError)
        results.push({
          url: urlTrimmed,
          success: false,
          error: urlError instanceof Error ? urlError.message : 'Unknown error',
        })
      }
    }

    // Revalidar páginas del proyecto para actualizar la tabla de documentos
    try {
      console.log(`📱 [URL-UPLOAD] Revalidating project pages for: ${data.projectId}`)

      // Revalidar página de proyecto normal
      revalidatePath(`/projects/${data.projectId}`)

      // Obtener información del proyecto para revalidar también las rutas de cliente
      try {
        const projectInfo = await payload.findByID({
          collection: 'projects',
          id: data.projectId,
          depth: 1,
        })

        if (projectInfo) {
          const clientId =
            typeof projectInfo.createdBy === 'object'
              ? projectInfo.createdBy.id
              : projectInfo.createdBy

          // Revalidar también la ruta del cliente específico
          revalidatePath(`/clients/${clientId}/projects/${data.projectId}`)
          console.log(`📱 [URL-UPLOAD] Client page revalidated for client: ${clientId}`)
        }
      } catch (projectError) {
        console.error(
          `⚠️ [URL-UPLOAD] Could not get project info for client revalidation:`,
          projectError,
        )
        // No fallar por esto - el upload fue exitoso y la ruta principal se revalidó
      }

      console.log(`✅ [URL-UPLOAD] Project pages revalidated successfully`)
    } catch (revalidationError) {
      console.error(`❌ [URL-UPLOAD] Failed to revalidate paths:`, revalidationError)
      // No fallar por esto - el upload fue exitoso
    }

    const successCount = results.filter((r) => r.success).length
    console.log(`📊 [URL-UPLOAD] Completed: ${successCount}/${results.length} files`)

    return {
      success: successCount > 0,
      data: results,
    }
  } catch (error) {
    console.error('❌ [URL-UPLOAD] Global error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
