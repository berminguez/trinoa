import { getCurrentUser } from '@/actions/auth/getUser'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ProfileCard } from './ProfileCard'
import { AccountSettings } from './AccountSettings'

/**
 * Contenido principal de la página de cuenta
 *
 * Server component que obtiene los datos del usuario y renderiza la interfaz
 */
export async function PageContent() {
  // Obtener usuario actual
  const user = await getCurrentUser()
  const t = await getTranslations('account')

  // Verificar autenticación
  if (!user) {
    redirect('/login?redirect=/account')
  }

  // Verificar que el usuario existe (no debería pasar, pero por seguridad)
  if (!user.id) {
    notFound()
  }

  console.log(`PageContent: Renderizando página de cuenta para usuario ${user.email}`)

  return (
    <div className='container mx-auto p-6 max-w-4xl'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold tracking-tight'>{t('title')}</h1>
        <p className='text-muted-foreground mt-2'>{t('description')}</p>
      </div>

      {/* Contenido principal */}
      <div className='space-y-6'>
        {/* Información del perfil */}
        <ProfileCard user={user} />

        {/* Configuración de cuenta */}
        <AccountSettings user={user} />
      </div>
    </div>
  )
}
