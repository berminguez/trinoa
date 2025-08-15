export interface PageRange {
  start: number
  end: number
}

export function computeRangesFromFirstPages(firstPages: number[], totalPages: number): PageRange[] {
  if (!Number.isFinite(totalPages) || totalPages <= 0) {
    throw new Error('totalPages debe ser un número positivo')
  }

  if (!Array.isArray(firstPages)) {
    throw new Error('pages debe ser un array')
  }

  // Caso edge: vacío -> documento completo
  if (firstPages.length === 0) {
    return [{ start: 1, end: totalPages }]
  }

  // Validaciones estrictas: 1-based, ordenado asc, sin duplicados, dentro de rango
  for (let i = 0; i < firstPages.length; i++) {
    const p = firstPages[i]
    if (!Number.isFinite(p) || p <= 0) throw new Error('pages debe contener enteros 1-based')
    if (p > totalPages) throw new Error('pages contiene valores fuera de rango')
    if (i > 0) {
      if (firstPages[i - 1] === p) throw new Error('pages contiene duplicados')
      if (firstPages[i - 1] > p) throw new Error('pages debe estar ordenado ascendentemente')
    }
  }

  const ranges: PageRange[] = []
  for (let i = 0; i < firstPages.length; i++) {
    const start = firstPages[i]
    const end = i + 1 < firstPages.length ? firstPages[i + 1] - 1 : totalPages
    if (start > end) throw new Error('Rango inválido derivado de pages')
    ranges.push({ start, end })
  }
  return ranges
}
