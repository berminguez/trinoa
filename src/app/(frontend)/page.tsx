import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import { redirect } from 'next/navigation'

import config from '@/payload.config'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  // Redirect based on authentication status
  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }

  // This should never be reached, but TypeScript requires a return
  return null
}
