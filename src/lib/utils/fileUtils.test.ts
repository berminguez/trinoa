import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/src/lib/storage', () => {
  return {
    default: {
      getSignedUrl: vi.fn(async (key: string) => `https://signed.example/${key}`),
    },
  }
})

import { getSafeMediaUrl, getFileKind } from './fileUtils'

describe('fileUtils.getFileKind', () => {
  it('detecta pdf por mime', () => {
    expect(getFileKind({ mime: 'application/pdf' })).toBe('pdf')
  })

  it('detecta pdf por extensión en url', () => {
    expect(getFileKind({ url: 'https://x/y/file.PDF' })).toBe('pdf')
  })

  it('detecta image por mime', () => {
    expect(getFileKind({ mime: 'image/png' })).toBe('image')
  })

  it('detecta image por extensión', () => {
    expect(getFileKind({ url: '/media/photo.jpeg' })).toBe('image')
  })

  it('unknown cuando no coincide', () => {
    expect(getFileKind({ mime: 'text/plain' })).toBe('unknown')
  })
})

describe('fileUtils.getSafeMediaUrl', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('retorna null si media es null', async () => {
    const res = await getSafeMediaUrl(null)
    expect(res).toBeNull()
  })

  it('usa URL firmada para PDFs cuando hay filename', async () => {
    const res = await getSafeMediaUrl({ url: '/media/doc.pdf', filename: 'doc.pdf', mimeType: 'application/pdf' })
    expect(res).toMatch(/^https:\/\/signed\.example\/doc\.pdf$/)
  })

  it('convierte url relativa a absoluta usando PAYLOAD_PUBLIC_SERVER_URL', async () => {
    const prev = process.env.PAYLOAD_PUBLIC_SERVER_URL
    process.env.PAYLOAD_PUBLIC_SERVER_URL = 'https://app.example'
    // Forzar fallo de firma simulando filename sin pdf y preferSigned false
    const res = await getSafeMediaUrl({ url: '/media/img.png', filename: 'img.png', mimeType: 'image/png' }, {
      preferSigned: false,
    })
    expect(res).toBe('https://app.example/media/img.png')
    process.env.PAYLOAD_PUBLIC_SERVER_URL = prev
  })

  it('retorna url absoluta sin cambios', async () => {
    const url = 'https://cdn.example/file.jpg'
    const res = await getSafeMediaUrl({ url, filename: 'file.jpg', mimeType: 'image/jpeg' }, { preferSigned: false })
    expect(res).toBe(url)
  })
})


