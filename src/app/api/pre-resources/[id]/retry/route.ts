import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { processPreResource } = await import('@/actions/splitter/processPreResource')
    const result = await processPreResource({ preResourceId: params.id })
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
