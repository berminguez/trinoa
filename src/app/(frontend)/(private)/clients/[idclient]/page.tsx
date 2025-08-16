import { redirect } from 'next/navigation'
import { requireAdminAccess } from '@/actions/auth/getUser'

interface ClientRedirectPageProps {
  params: Promise<{ idclient: string }>
}

/**
 * Página de redirección para cliente específico
 *
 * Redirige automáticamente a /clients/{idclient}/projects
 * siguiendo el patrón definido en el PRD
 */
export default async function ClientRedirectPage({ params }: ClientRedirectPageProps) {
  // Validar acceso de administrador
  await requireAdminAccess()

  const { idclient } = await params

  // Validar que el ID del cliente es válido
  if (!idclient || idclient.length < 10) {
    redirect('/clients')
  }

  // Redirigir a la página de proyectos del cliente
  redirect(`/clients/${idclient}/projects`)
}
