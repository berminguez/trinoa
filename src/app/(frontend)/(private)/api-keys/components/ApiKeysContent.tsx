import { getCurrentUser } from '@/actions/auth/getUser'
import { redirect } from 'next/navigation'
import { getApiKeysAction } from '@/actions/api-keys'
import { ApiKeysHeader } from './ApiKeysHeader'
import { ApiKeysTable } from './ApiKeysTable'
import { ApiKeysEmptyState } from './ApiKeysEmptyState'

export async function ApiKeysContent() {
  // Verificar autenticación
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  // Solo usuarios normales y admins pueden acceder a API Keys
  if (user.role !== 'user' && user.role !== 'admin') {
    redirect('/dashboard')
  }

  // Obtener API Keys del usuario
  const apiKeysResult = await getApiKeysAction()

  if (!apiKeysResult.success) {
    // Si hay error en la obtención de datos, mostrar error
    console.error('[API_KEYS_CONTENT] Error fetching keys:', apiKeysResult.error)
    redirect('/dashboard')
  }

  const apiKeys = apiKeysResult.data || []

  return (
    <div className='flex-1 space-y-6 p-4 pt-6'>
      <ApiKeysHeader user={user} />

      {apiKeys.length > 0 ? <ApiKeysTable apiKeys={apiKeys} /> : <ApiKeysEmptyState />}
    </div>
  )
}
