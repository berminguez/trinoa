import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ ok: false }, { status: 403 })

  try {
    const payload = await getPayload({ config })
    const form = await req.formData()
    const idsJson = (form.get('documentIds') as string) || '[]'
    const ids: string[] = JSON.parse(idsJson)
    const nowIso = new Date().toISOString()
    await Promise.all(
      (ids || []).map((id) =>
        payload
          .update({
            collection: 'resources' as any,
            id: String(id),
            data: { processed: true, processedAt: nowIso },
            depth: 0,
            where: { processed: { equals: false } },
          } as any)
          .catch(() => null),
      ),
    )
  } catch {}

  return NextResponse.json({ ok: true })
}
