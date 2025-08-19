'use client'

import { useAuthStore } from '@/stores/auth-store'
import AdminDashboard from './admin/AdminDashboard'
import UserDashboard from './user/UserDashboard'
import type { User } from '@/payload-types'

interface DashboardContentProps {
  // Props de página si las necesitamos en el futuro
}

// Función helper para crear un User compatible con los dashboards
function createDashboardUser(storeUser: {
  id: string
  name: string
  email: string
  role?: string | null | undefined
}): User {
  return {
    id: storeUser.id,
    name: storeUser.name || null,
    email: storeUser.email,
    role: storeUser.role as User['role'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Campos adicionales requeridos por PayloadCMS con valores por defecto
    loginAttempts: 0,
    resetPasswordToken: null,
    resetPasswordExpiration: null,
    sessions: [],
    enableAPIKey: false,
  } as User
}

/**
 * Componente principal del dashboard que detecta el rol del usuario
 * y muestra la vista correspondiente (admin o user)
 *
 * NOTA: Usa el mismo store de autenticación que PrivateLayout
 * para garantizar consistencia de datos
 */
export default function DashboardContent(props: DashboardContentProps) {
  const { user, isAuthenticated } = useAuthStore()

  // El PrivateLayout garantiza que cuando llegamos aquí, el usuario está autenticado
  // Pero por seguridad, mostramos loading si aún no tenemos los datos
  if (!isAuthenticated || !user) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <div className='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]' />
          <p className='mt-4 text-sm text-gray-600'>Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  // Verificar que el usuario tenga un rol válido
  if (!user.role || !['admin', 'user'].includes(user.role)) {
    console.error(`Usuario ${user.email} tiene rol no válido para dashboard: ${user.role}`)
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <p className='text-gray-600'>Rol de usuario no válido</p>
          <p className='text-sm text-gray-400 mt-2'>Contacta al administrador</p>
        </div>
      </div>
    )
  }

  // Crear objeto user compatible con los dashboards
  const userForDashboard = createDashboardUser(user)

  // Renderizar dashboard según el rol
  if (user.role === 'admin') {
    return <AdminDashboard user={userForDashboard} />
  }

  // Por defecto, mostrar dashboard de usuario normal
  return <UserDashboard user={userForDashboard} />
}
