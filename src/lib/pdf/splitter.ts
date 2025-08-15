import { PDFDocument } from 'pdf-lib'
import type { PageRange } from './range-utils'

export async function splitPdfByRanges(
  inputBuffer: Buffer,
  ranges: PageRange[],
): Promise<Buffer[]> {
  if (!Buffer.isBuffer(inputBuffer)) throw new Error('inputBuffer debe ser Buffer')
  if (!Array.isArray(ranges) || ranges.length === 0) throw new Error('ranges requerido')

  const src = await PDFDocument.load(inputBuffer)
  const total = src.getPageCount()

  const outputs: Buffer[] = []
  for (const r of ranges) {
    if (!Number.isFinite(r.start) || !Number.isFinite(r.end)) throw new Error('Rango inválido')
    if (r.start < 1 || r.end > total || r.start > r.end) throw new Error('Rango fuera de límites')

    const doc = await PDFDocument.create()
    const pageIndices = [] as number[]
    for (let p = r.start; p <= r.end; p++) pageIndices.push(p - 1) // pdf-lib es 0-based
    const copied = await doc.copyPages(src, pageIndices)
    copied.forEach((pg) => doc.addPage(pg))
    const bytes = await doc.save()
    outputs.push(Buffer.from(bytes))
  }
  return outputs
}

// Procesamiento secuencial que emite buffers uno a uno para reducir el pico de memoria.
export async function* splitPdfByRangesStream(
  inputBuffer: Buffer,
  ranges: PageRange[],
): AsyncGenerator<Buffer> {
  if (!Buffer.isBuffer(inputBuffer)) throw new Error('inputBuffer debe ser Buffer')
  if (!Array.isArray(ranges) || ranges.length === 0) throw new Error('ranges requerido')

  const src = await PDFDocument.load(inputBuffer)
  const total = src.getPageCount()

  for (const r of ranges) {
    if (!Number.isFinite(r.start) || !Number.isFinite(r.end)) throw new Error('Rango inválido')
    if (r.start < 1 || r.end > total || r.start > r.end) throw new Error('Rango fuera de límites')

    const doc = await PDFDocument.create()
    const pageIndices: number[] = []
    for (let p = r.start; p <= r.end; p++) pageIndices.push(p - 1)
    const copied = await doc.copyPages(src, pageIndices)
    copied.forEach((pg) => doc.addPage(pg))
    const bytes = await doc.save()
    yield Buffer.from(bytes)
  }
}
