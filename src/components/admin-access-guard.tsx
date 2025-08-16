import { ReactNode } from 'react'
import { requireAdminAccess } from '@/actions/auth/getUser'
import type { User } from '@/payload-types'

interface AdminAccessGuardProps {
  children: (adminUser: User) => ReactNode
}

/**
 * Componente wrapper que valida acceso de administrador
 *
 * Este componente debe ser usado en todas las páginas administrativas
 * para asegurar que solo usuarios con rol 'admin' puedan acceder.
 *
 * Si el usuario no está autenticado o no es admin, se redirige automáticamente.
 *
 * @param children - Función que recibe el usuario admin y retorna el contenido a renderizar
 *
 * @example
 * // En una página administrativa:
 * export default async function ClientsPage() {
 *   return (
 *     <AdminAccessGuard>
 *       {(adminUser) => (
 *         <div>
 *           <h1>Panel de Administración</h1>
 *           <p>Bienvenido, {adminUser.name || adminUser.email}</p>
 *           // ... resto del contenido
 *         </div>
 *       )}
 *     </AdminAccessGuard>
 *   )
 * }
 */
export async function AdminAccessGuard({ children }: AdminAccessGuardProps): Promise<ReactNode> {
  // Validar acceso de administrador (redirige automáticamente si no cumple)
  const adminUser = await requireAdminAccess()

  // Si llegamos aquí, el usuario es admin autenticado
  return children(adminUser)
}
