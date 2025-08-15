import { describe, it, beforeAll, expect, vi } from 'vitest'
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { updateResourceAction } from '@/actions/resources/updateResource'

// Mock mínimo de getCurrentUser para este test de integración controlado
vi.mock('@/actions/auth/getUser', async (orig) => {
  const actual = await (orig as any)()
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => ({ id: 'test-user', email: 'test@example.com', role: 'admin' } as any)),
  }
})

let payload: Payload
let userId: string

describe('updateResourceAction (integration)', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
    const user = await payload.create({
      collection: 'users' as any,
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'admin',
      },
    })
    userId = String((user as any).id)
  })

  it('valida pertenencia y permite actualizar campos básicos (smoke)', async () => {
    // Crear proyecto y media mínimos para el recurso
    const project = await payload.create({
      collection: 'projects' as any,
      data: { title: 'tmp-proj', createdBy: userId },
      user: { id: userId } as any,
    })
    // PNG 1x1 válido en base64
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axlJXkAAAAASUVORK5CYII='
    const buffer = Buffer.from(pngBase64, 'base64')
    const u8 = new Uint8Array(buffer)
    const media = await payload.create({
      collection: 'media' as any,
      data: {
        alt: 'test',
        title: 'file',
        filename: 'file.png',
        mimeType: 'image/png',
        filesize: buffer.length,
        mediaType: 'image',
      },
      file: {
        data: u8,
        mimetype: 'image/png',
        filename: 'file.png',
        size: u8.length,
      },
    } as any)
    const resource = await payload.create({
      collection: 'resources' as any,
      data: {
        title: 'tmp-res',
        project: project.id,
        namespace: 'tmp',
        type: 'image',
        file: (media as any).id,
      },
      user: { id: userId } as any,
    })

    const result = await updateResourceAction(String(project.id), String((resource as any).id), {
      nombre_cliente: 'Cliente Test',
      caso: null,
      tipo: null,
    })

    expect(result.success).toBe(true)
    expect(result.data?.nombre_cliente).toBe('Cliente Test')
  })
})


