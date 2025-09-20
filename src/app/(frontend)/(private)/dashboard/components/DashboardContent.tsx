import { Suspense } from 'react'
import { getCurrentUser } from '@/actions/auth/getUser'
import { redirect } from 'next/navigation'

import AdminDashboard from './admin/AdminDashboard'
import UserDashboard from './user/UserDashboard'

interface DashboardContentProps {
  // Props de página si las necesitamos en el futuro
}

/**
 * Componente principal del dashboard que detecta el rol del usuario
 * y muestra la vista correspondiente (admin o user)
 */
export default async function DashboardContent(props: DashboardContentProps) {
  try {
    // Obtener usuario actual con datos completos
    const user = await getCurrentUser()

    // Verificar autenticación
    if (!user) {
      redirect('/login')
      return // Esto nunca se ejecuta pero ayuda a TypeScript
    }

    // Verificar que el usuario tenga un rol válido
    if (!user.role || !['admin', 'user'].includes(user.role)) {
      console.error(`Usuario ${user.email} tiene rol no válido para dashboard: ${user.role}`)
      redirect('/login')
      return // Esto nunca se ejecuta pero ayuda a TypeScript
    }

    // Renderizar dashboard según el rol
    if (user.role === 'admin') {
      return <AdminDashboard user={user} />
    }

    // Por defecto, mostrar dashboard de usuario normal
    return <UserDashboard user={user} />
  } catch (error) {
    console.error('Error en DashboardContent:', error)
    redirect('/login')
  }
}
