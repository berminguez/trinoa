import { redirect } from 'next/navigation'
import { requireAdminAccess } from '@/actions/auth/getUser'

interface ClientRedirectPageProps {
  params: Promise<{ idclient: string }>
}

/**
 * Client-specific redirect page
 *
 * Automatically redirects to /clients/{idclient}/projects
 * following the pattern defined in the PRD
 */
export default async function ClientRedirectPage({ params }: ClientRedirectPageProps) {
  // Validate admin access
  await requireAdminAccess()

  const { idclient } = await params

  // Validate that the client ID is valid
  if (!idclient || idclient.length < 10) {
    redirect('/clients')
  }

  // Redirect to the client's projects page
  redirect(`/clients/${idclient}/projects`)
}
