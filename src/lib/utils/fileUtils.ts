/**
 * Genera un identificador único de 6 caracteres sin vocales
 * para evitar colisiones en nombres de archivos
 *
 * Usa solo consonantes y números para evitar palabras inapropiadas
 * Caracteres permitidos: bcdfghjklmnpqrstvwxyz0123456789
 */
export function generateFileId(): string {
  // Consonantes sin vocales (a, e, i, o, u)
  const consonants = 'bcdfghjklmnpqrstvwxyz'
  const numbers = '0123456789'
  const chars = consonants + numbers

  let result = ''
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    result += chars[randomIndex]
  }

  return result
}

/**
 * Añade un identificador único al nombre de archivo antes de la extensión
 *
 * Ejemplo:
 * - "documento.pdf" → "documento-k3f9h2.pdf"
 * - "imagen.jpg" → "imagen-p7t4m6.jpg"
 * - "archivo_sin_extension" → "archivo_sin_extension-b8n5r1"
 */
export function addFileId(filename: string): string {
  const fileId = generateFileId()

  // Buscar la última aparición del punto (para manejar archivos como "archivo.backup.pdf")
  const lastDotIndex = filename.lastIndexOf('.')

  if (lastDotIndex === -1) {
    // No hay extensión, añadir al final con guion
    return `${filename}-${fileId}`
  }

  // Separar nombre y extensión
  const name = filename.substring(0, lastDotIndex)
  const extension = filename.substring(lastDotIndex)

  return `${name}-${fileId}${extension}`
}

/**
 * Extrae el nombre base de un archivo sin el identificador único
 *
 * Ejemplo:
 * - "documento-k3f9h2.pdf" → "documento.pdf"
 * - "imagen-p7t4m6.jpg" → "imagen.jpg"
 */
export function removeFileId(filename: string): string {
  // Patrón para identificar el ID al final del nombre (antes de la extensión)
  // Formato: -[6 caracteres sin vocales][.extensión opcional]
  const pattern = /-[bcdfghjklmnpqrstvwxyz0-9]{6}(\.|$)/i

  return filename.replace(pattern, (match, dotOrEnd) => {
    return dotOrEnd === '.' ? '.' : ''
  })
}

// =============================================================
// URL helpers para medios/recursos
// =============================================================

import StorageManager from '@/lib/storage'
import type { Media } from '@/payload-types'

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function deriveBaseUrl(headers?: Headers | Record<string, string> | null): string | undefined {
  const configured = process.env.PAYLOAD_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL
  if (configured) return configured
  if (!headers) return undefined
  const get = (key: string) => {
    if (!headers) return undefined
    if (headers instanceof Headers) return headers.get(key) || undefined
    return (headers as Record<string, string>)[key]
  }
  const host = get('host')
  const proto = get('x-forwarded-proto') || 'https'
  if (host) return `${proto}://${host}`
  return undefined
}

/**
 * Devuelve una URL segura para descargar/ver un `Media` de Payload.
 * - Si el `media.filename` existe y procede de S3, intentará generar una URL firmada (preferida para PDFs).
 * - Si `media.url` es relativo, lo convierte a absoluto usando base derivada de env o cabeceras.
 * - Si falla la firma, hace fallback a la URL pública.
 */
export async function getSafeMediaUrl(
  media: Pick<Media, 'url' | 'filename' | 'mimeType'> | null | undefined,
  options?: { headers?: Headers | Record<string, string>; preferSigned?: boolean },
): Promise<string | null> {
  if (!media) return null

  const preferSigned = options?.preferSigned
  const isPdf = Boolean(
    (media.filename && media.filename.toLowerCase().endsWith('.pdf')) ||
      (media.mimeType && media.mimeType.toLowerCase().includes('pdf')),
  )

  // 1) Intentar URL firmada si aplica
  if (media.filename && (preferSigned === true || (preferSigned !== false && isPdf))) {
    try {
      // En lugar de exponer directamente la URL firmada (CORS), usamos proxy same-origin
      const key = String(media.filename)
      const proxyUrl = `/api/media?key=${encodeURIComponent(key)}`
      return proxyUrl
    } catch {
      // ignorar y continuar con URL pública
    }
  }

  // 2) Fallback a URL pública (absoluta o derivada)
  const rawUrl = media.url
  if (!rawUrl) return null
  if (isAbsoluteUrl(String(rawUrl))) return String(rawUrl)
  const base = deriveBaseUrl(options?.headers)
  return base ? `${base}${String(rawUrl)}` : String(rawUrl)
}

// =============================================================
// File kind helper
// =============================================================

export type FileKind = 'pdf' | 'image' | 'unknown'

export function getFileKind(input?: { mime?: string | null; url?: string | null }): FileKind {
  const mime = input?.mime?.toLowerCase() || ''
  const url = (input?.url || '').toLowerCase()
  if (mime.includes('pdf') || url.endsWith('.pdf')) return 'pdf'
  if (mime.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif|bmp|tiff)$/.test(url)) return 'image'
  return 'unknown'
}
