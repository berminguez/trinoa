import { describe, it, beforeAll, expect, vi } from 'vitest'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { runSplitterPipeline } from '@/actions/splitter/runPipeline'
import { PDFDocument } from 'pdf-lib'

// Mock auth
vi.mock('@/actions/auth/getUser', async (orig) => {
  const actual = await (orig as any)()
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => ({ id: 'test-user', email: 'test@example.com', role: 'admin' } as any)),
  }
})

let payload: Payload

describe('Splitter pipeline (integration)', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('crea resources derivados según pages del Splitter', async () => {
    // Crear proyecto
    const user = await payload.create({
      collection: 'users' as any,
      data: { email: `sp-${Date.now()}@example.com`, password: 'Password123!', role: 'admin' },
    })
    const project = await payload.create({
      collection: 'projects' as any,
      data: { title: 'split-proj', createdBy: String((user as any).id) },
      user: { id: String((user as any).id) } as any,
    })

    // PDF sintético de 5 páginas
    const doc = await PDFDocument.create()
    for (let i = 0; i < 5; i++) doc.addPage()
    const bytes = await doc.save()
    const file = new File([Buffer.from(bytes)], 'multi.pdf', { type: 'application/pdf' })
    const form = new FormData()
    form.append('projectId', String((project as any).id))
    form.append('file', file)

    // Mock config global y fetch del Splitter
    const origGetPayload = await getPayload({ config: await config })
    ;(origGetPayload as any).findGlobal = vi.fn(async () => ({ splitter: { url: 'https://splitter.local', bearerToken: 't' } }))
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('splitter')) {
        return { ok: true, json: async () => ({ pages: [1, 3, 5] }) } as any
      }
      return { ok: true, arrayBuffer: async () => bytes } as any
    }) as any)

    const res = await runSplitterPipeline(form)
    expect(res.success).toBe(true)
  })
})


