import { NextRequest, NextResponse } from 'next/server'
import { incrementVideoUsage, incrementStorageUsage } from '@/actions/subscriptions/reportUsage'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, quantity } = body

    let result

    if (type === 'video') {
      result = await incrementVideoUsage()
    } else if (type === 'storage') {
      result = await incrementStorageUsage(quantity || 0.5)
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid type. Use "video" or "storage"',
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `${type} usage incremented successfully`,
    })
  } catch (error) {
    console.error('Test usage error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error processing usage test',
      },
      { status: 500 },
    )
  }
}
