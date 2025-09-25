import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/actions/auth/getUser'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const documentIdsJson = formData.get('documentIds') as string

    if (!documentIdsJson) {
      return NextResponse.json({ error: 'No document IDs provided' }, { status: 400 })
    }

    let ids: string[] = []
    try {
      const parsed = JSON.parse(documentIdsJson)
      if (Array.isArray(parsed)) ids = parsed.map((v) => String(v))
    } catch (_e) {
      return NextResponse.json({ error: 'Invalid document IDs format' }, { status: 400 })
    }

    if (ids.length === 0) {
      return NextResponse.json({ needsReviewCount: 0, ids: [] })
    }

    const payload = await getPayload({ config })

    // Buscar recursos por IDs
    const res = await payload.find({
      collection: 'resources',
      where: { id: { in: ids } },
      limit: ids.length,
      depth: 0,
      overrideAccess: false,
    })

    const flagged = (res.docs || []).filter((r: any) => {
      const statusNeeds = r?.status === 'needs_review'
      const confidenceNeeds = r?.confidence === 'needs_revision'
      return statusNeeds || confidenceNeeds
    })

    return NextResponse.json({
      needsReviewCount: flagged.length,
      ids: flagged.map((r: any) => String(r.id)),
    })
  } catch (error) {
    console.error('check-needs-review error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
