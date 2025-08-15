import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth user
vi.mock('@/actions/auth/getUser', async (orig) => {
  const actual = await (orig as any)()
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => ({ id: 'u1', email: 'test@example.com', role: 'admin' } as any)),
  }
})

// Mocks variables
let updatedData: any = null

// Mock payload getPayload
vi.mock('payload', () => {
  const mockPayload = {
    findByID: vi.fn(async ({ collection, id }: any) => {
      if (collection === 'pre-resources') {
        return { id, project: 'p1', file: 'm1', status: 'pending' }
      }
      if (collection === 'media') {
        return { id, filename: 'orig.pdf' }
      }
      throw new Error('Unknown collection: ' + collection)
    }),
    update: vi.fn(async ({ collection, id, data }: any) => {
      if (collection === 'pre-resources') {
        updatedData = { id, ...data }
        return { id, ...data }
      }
      return { id, ...data }
    }),
    findGlobal: vi.fn(async () => ({ splitter: { url: 'https://splitter.example/api', bearerToken: 't' } })),
  }
  return { getPayload: vi.fn(async () => mockPayload) }
})

// Mock StorageManager signed URL
vi.mock('@/lib/storage', () => ({
  StorageManager: {
    getSplitterReadUrl: vi.fn(async () => 'https://signed-url/file.pdf'),
  },
}))

// SUT
import { processPreResource } from './processPreResource'

describe('processPreResource', () => {
  beforeEach(() => {
    updatedData = null
    vi.restoreAllMocks()
  })

  it('guarda pages y deja status en processing cuando respuesta es válida', async () => {
    // Mock fetch Splitter
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ pages: [1, 3, 5] }) })) as any)

    const res = await processPreResource({ preResourceId: 'pre1' })
    expect(res.success).toBe(true)
    expect(res.data?.pages).toEqual([1, 3, 5])
    expect(updatedData?.splitterResponse?.pages).toEqual([{ page: 1 }, { page: 3 }, { page: 5 }])
  })

  it('marca error cuando Splitter devuelve pages vacío', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ pages: [] }) })) as any)
    const res = await processPreResource({ preResourceId: 'pre2' })
    expect(res.success).toBe(false)
  })

  it('marca error cuando no hay URL configurada', async () => {
    const { getPayload } = await import('payload')
    const payload = await getPayload()
    ;(payload as any).findGlobal = vi.fn(async () => ({ splitter: { url: '' } }))
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ pages: [1] }) })) as any)
    const res = await processPreResource({ preResourceId: 'pre3' })
    expect(res.success).toBe(false)
  })
})


