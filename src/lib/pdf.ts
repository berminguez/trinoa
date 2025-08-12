'use client'

import { pdfjs } from 'react-pdf'

let isConfigured = false

export function ensurePdfWorker(): void {
  if (isConfigured) return
  try {
    const version: string = ((pdfjs as any).version as string) || '5.3.31'
    ;(pdfjs as any).GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
    isConfigured = true
  } catch {
    ;(pdfjs as any).GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs`
    isConfigured = true
  }
}

export default ensurePdfWorker
