import { PDFDocument } from 'pdf-lib'
import { getPayload } from 'payload'
import config from '@payload-config'
import { addFileId } from '@/lib/utils/fileUtils'

/**
 * Calcula los rangos de páginas a cortar basándose en el array de páginas de inicio
 * @param pages Array de páginas de inicio (1-based) ej: [1, 5, 11]
 * @param totalPages Total de páginas del documento
 * @returns Array de rangos ej: [{start: 1, end: 4}, {start: 5, end: 10}, {start: 11, end: totalPages}]
 */
export function calculatePageRanges(
  pages: number[],
  totalPages: number,
): Array<{ start: number; end: number }> {
  if (!pages || pages.length === 0) {
    throw new Error('Array de páginas no puede estar vacío')
  }

  // Ordenar páginas para asegurar orden correcto
  const sortedPages = [...pages].sort((a, b) => a - b)

  // Validar que todas las páginas están dentro del rango válido
  const invalidPages = sortedPages.filter((page) => page < 1 || page > totalPages)
  if (invalidPages.length > 0) {
    throw new Error(
      `Páginas fuera de rango: ${invalidPages.join(', ')}. Total de páginas: ${totalPages}`,
    )
  }

  const ranges: Array<{ start: number; end: number }> = []

  for (let i = 0; i < sortedPages.length; i++) {
    const startPage = sortedPages[i]
    const endPage =
      i < sortedPages.length - 1
        ? sortedPages[i + 1] - 1 // Hasta la página anterior a la siguiente
        : totalPages // Para el último rango, hasta el final

    if (startPage <= endPage) {
      ranges.push({ start: startPage, end: endPage })
    }
  }

  return ranges
}

/**
 * Descarga un PDF desde una URL y lo convierte a PDFDocument
 * @param fileUrl URL del archivo PDF
 * @returns PDFDocument para manipular
 */
export async function loadPdfFromUrl(fileUrl: string): Promise<PDFDocument> {
  try {
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`Error descargando PDF: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)

    return pdfDoc
  } catch (error) {
    throw new Error(
      `Error cargando PDF desde URL: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Corta un PDF en múltiples segmentos basándose en rangos de páginas
 * @param sourceDoc Documento PDF original
 * @param ranges Rangos de páginas a extraer
 * @returns Array de buffers de PDFs cortados
 */
export async function splitPdfIntoSegments(
  sourceDoc: PDFDocument,
  ranges: Array<{ start: number; end: number }>,
): Promise<Buffer[]> {
  const segments: Buffer[] = []

  for (const range of ranges) {
    try {
      // Crear nuevo documento PDF
      const newDoc = await PDFDocument.create()

      // Copiar páginas del rango especificado (pdf-lib usa índices 0-based)
      const pages = await newDoc.copyPages(
        sourceDoc,
        Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start - 1 + i),
      )

      // Añadir páginas al nuevo documento
      pages.forEach((page) => newDoc.addPage(page))

      // Convertir a buffer
      const pdfBytes = await newDoc.save()
      segments.push(Buffer.from(pdfBytes))
    } catch (error) {
      throw new Error(
        `Error cortando rango ${range.start}-${range.end}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  return segments
}

/**
 * Sube un buffer de PDF a S3 usando PayloadCMS y retorna el media record
 * @param pdfBuffer Buffer del PDF
 * @param originalFilename Nombre del archivo original
 * @param segmentIndex Índice del segmento (ej: 1, 2, 3)
 * @param segmentTitle Título para el segmento
 * @returns Media record del segmento subido
 */
export async function uploadPdfSegmentToS3(
  pdfBuffer: Buffer,
  originalFilename: string,
  segmentIndex: number,
  segmentTitle: string,
): Promise<any> {
  try {
    // Generar nombre de archivo único para el segmento
    const baseName = originalFilename.replace(/\.pdf$/i, '')
    const segmentFilename = `${baseName}_segment_${segmentIndex}.pdf`

    // Añadir ID único al filename como hace el endpoint existente
    const uniqueFilename = addFileId(segmentFilename)

    // Obtener payload instance
    const payload = await getPayload({ config })

    // Subir archivo usando PayloadCMS (mismo patrón que resources/upload)
    const mediaRecord = await payload.create({
      collection: 'media',
      data: {
        alt: segmentTitle,
      },
      file: {
        data: pdfBuffer,
        mimetype: 'application/pdf',
        name: uniqueFilename,
        size: pdfBuffer.length,
      },
    })

    return mediaRecord
  } catch (error) {
    throw new Error(
      `Error subiendo segmento ${segmentIndex} a S3: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Función principal que orquesta todo el proceso de división de PDF
 * @param fileUrl URL del PDF original
 * @param pages Array de páginas de inicio
 * @param originalFilename Nombre del archivo original
 * @returns Array de media records de los segmentos subidos a S3
 */
export async function splitPdfAndUpload(
  fileUrl: string,
  pages: number[],
  originalFilename: string,
): Promise<any[]> {
  try {
    console.log('[PDF-SPLITTER] Iniciando división de PDF...', {
      pages,
      originalFilename,
      fileUrlPreview: fileUrl.slice(0, 80),
    })

    // 1. Cargar PDF desde URL
    const sourceDoc = await loadPdfFromUrl(fileUrl)
    const totalPages = sourceDoc.getPageCount()

    console.log('[PDF-SPLITTER] PDF cargado exitosamente', {
      totalPages,
      pagesArray: pages,
    })

    // 2. Calcular rangos de páginas
    const ranges = calculatePageRanges(pages, totalPages)

    console.log('[PDF-SPLITTER] Rangos calculados:', ranges)

    // 3. Cortar PDF en segmentos
    const pdfSegments = await splitPdfIntoSegments(sourceDoc, ranges)

    console.log('[PDF-SPLITTER] PDF cortado en', pdfSegments.length, 'segmentos')

    // 4. Subir cada segmento a S3
    const uploadedMediaRecords: any[] = []

    for (let i = 0; i < pdfSegments.length; i++) {
      const segmentTitle = `Documento - Segmento ${i + 1}`
      const mediaRecord = await uploadPdfSegmentToS3(
        pdfSegments[i],
        originalFilename,
        i + 1,
        segmentTitle,
      )
      uploadedMediaRecords.push(mediaRecord)

      console.log('[PDF-SPLITTER] Segmento', i + 1, 'subido como:', mediaRecord.filename)
    }

    console.log('[PDF-SPLITTER] División completada exitosamente', {
      segmentsCreated: uploadedMediaRecords.length,
      mediaRecords: uploadedMediaRecords.map((m) => ({ id: m.id, filename: m.filename })),
    })

    return uploadedMediaRecords
  } catch (error) {
    console.error('[PDF-SPLITTER] Error en el proceso de división:', error)
    throw error
  }
}
