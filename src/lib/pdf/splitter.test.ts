import { describe, it, expect } from 'vitest'
import { computeRangesFromFirstPages } from './range-utils'
import { PDFDocument } from 'pdf-lib'
import { splitPdfByRanges } from './splitter'

describe('computeRangesFromFirstPages', () => {
  it('calcula rangos correctamente con [1,3,4,7] y P=10', () => {
    const ranges = computeRangesFromFirstPages([1, 3, 4, 7], 10)
    expect(ranges).toEqual([
      { start: 1, end: 2 },
      { start: 3, end: 3 },
      { start: 4, end: 6 },
      { start: 7, end: 10 },
    ])
  })

  it('vacío -> documento completo', () => {
    const ranges = computeRangesFromFirstPages([], 5)
    expect(ranges).toEqual([{ start: 1, end: 5 }])
  })

  it('lanza en duplicados', () => {
    expect(() => computeRangesFromFirstPages([1, 1], 5)).toThrow()
  })

  it('lanza en desorden', () => {
    expect(() => computeRangesFromFirstPages([3, 1], 5)).toThrow()
  })

  it('lanza en fuera de rango', () => {
    expect(() => computeRangesFromFirstPages([6], 5)).toThrow()
  })
})

describe('splitPdfByRanges', () => {
  it('divide un PDF sintético en fragmentos con los rangos esperados', async () => {
    // Crear PDF con 5 páginas en memoria
    const doc = await PDFDocument.create()
    for (let i = 0; i < 5; i++) doc.addPage()
    const bytes = await doc.save()
    const buffer = Buffer.from(bytes)

    const ranges = [
      { start: 1, end: 2 },
      { start: 3, end: 3 },
      { start: 4, end: 5 },
    ]
    const parts = await splitPdfByRanges(buffer, ranges)
    expect(parts).toHaveLength(3)

    // Verificar número de páginas de cada fragmento
    const p0 = await PDFDocument.load(parts[0])
    const p1 = await PDFDocument.load(parts[1])
    const p2 = await PDFDocument.load(parts[2])
    expect(p0.getPageCount()).toBe(2)
    expect(p1.getPageCount()).toBe(1)
    expect(p2.getPageCount()).toBe(2)
  })

  it('lanza si rangos son inválidos', async () => {
    const doc = await PDFDocument.create()
    doc.addPage()
    const bytes = await doc.save()
    const buffer = Buffer.from(bytes)
    await expect(splitPdfByRanges(buffer, [{ start: 2, end: 1 }])).rejects.toThrow()
  })
})


