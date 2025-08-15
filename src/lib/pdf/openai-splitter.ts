import OpenAI from 'openai'
import { toFile } from 'openai/uploads'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface OpenAISplitterResult {
  success: boolean
  pages?: number[]
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Analiza un PDF adjuntándolo como archivo a OpenAI (Files API + Responses API)
 * @param pdfUrl URL accesible del PDF (presigned URL de S3)
 */
export async function analyzeInvoicePagesWithOpenAI(pdfUrl: string): Promise<OpenAISplitterResult> {
  try {
    console.log('[OPENAI-SPLITTER] Starting PDF analysis with Files API:', {
      urlPreview: pdfUrl.slice(0, 80),
    })

    // 1) Descargar el PDF
    const res = await fetch(pdfUrl)
    if (!res.ok) {
      return { success: false, error: `No se pudo descargar el PDF: HTTP ${res.status}` }
    }
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 2) Subir a OpenAI Files API
    const upload = await openai.files.create({
      file: await toFile(buffer, 'document.pdf', { type: 'application/pdf' }),
      purpose: 'assistants',
    })

    // 3) Llamar a Responses API con el archivo adjunto
    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Este PDF presumiblemente está formado por varias facturas o recibos. Debes devolver una única respuesta en JSON indicando las páginas donde empieza una nueva factura o recibo. Responde únicamente con un array JSON de enteros, por ejemplo: {pages: [1,3,4,7]}.',
            },
            { type: 'input_file', file_id: upload.id },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_object',
        },
      },
      max_output_tokens: 150,
    })

    // 4) Extraer texto de salida
    // SDK expone output_text; fallback a explorar estructura si no existe
    const rawText: string =
      (response as any).output_text ||
      (((response as any).output || [])[0]?.content?.[0]?.text?.value ?? '')

    if (!rawText) {
      return { success: false, error: 'OpenAI no devolvió texto de salida' }
    }

    // 5) Parsear JSON a array de páginas
    // esperamos que el json sea {pages: [1,3,4,7]}
    let pages: number[] | null = null
    try {
      const parsed = JSON.parse(rawText)
      if (Array.isArray(parsed)) {
        pages = parsed
      }
      if (Array.isArray(parsed?.pages)) {
        pages = parsed.pages
      }
    } catch {
      // Intento de extracción por regex si viniera con texto adicional (no debería por json_schema)
      const match = rawText.match(/\[[\d,\s]+\]/)
      if (match) {
        try {
          pages = JSON.parse(match[0])
        } catch {}
      }
    }

    if (!pages || pages.length === 0) {
      return { success: false, error: `Respuesta inválida: ${rawText.slice(0, 200)}` }
    }

    const uniquePages = Array.from(
      new Set(pages.map((p) => Number(p)).filter((p) => Number.isInteger(p) && p > 0)),
    ).sort((a, b) => a - b)

    if (uniquePages.length === 0) {
      return { success: false, error: 'No se encontraron páginas válidas' }
    }

    return { success: true, pages: uniquePages }
  } catch (error: any) {
    console.error('[OPENAI-SPLITTER] Error analyzing PDF with Files API:', error)
    return { success: false, error: error?.message || 'Error desconocido' }
  }
}
