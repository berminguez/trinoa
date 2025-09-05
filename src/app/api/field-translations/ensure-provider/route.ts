import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST() {
  try {
    const payload = await getPayload({ config })

    // Key aligned with analytics and existing schema
    const key = 'proveedor_servicio'
    const label = 'Provider'

    // Check if exists
    const existing = await payload.find({
      collection: 'field-translations' as any,
      where: { key: { equals: key } },
      limit: 1,
    })

    if (existing?.docs?.length) {
      // Ensure label is updated to English as requested
      const doc = existing.docs[0]
      await payload.update({
        collection: 'field-translations' as any,
        id: (doc as any).id,
        data: { label },
      })
      return NextResponse.json({ success: true, updated: true, id: (doc as any).id })
    }

    // Create new translation record
    const created = await payload.create({
      collection: 'field-translations' as any,
      data: {
        key,
        label,
        order: 500, // middle order; adjust as needed
        isRequired: false,
      },
    })

    return NextResponse.json({ success: true, created: true, id: (created as any).id })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 },
    )
  }
}
