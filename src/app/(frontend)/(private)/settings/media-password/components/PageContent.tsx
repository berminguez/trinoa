import { getMediaPasswordConfig } from '@/actions/configuracion/updateMediaPassword'
import { redirect } from 'next/navigation'
import MediaPasswordContent from './MediaPasswordContent'

export default async function PageContent() {
  // Obtener la configuración actual
  const result = await getMediaPasswordConfig()

  // Si hay error o no tiene permisos, redirigir
  if (!result.success || !result.data) {
    console.error('Error obteniendo configuración de media:', result.error)
    redirect('/dashboard')
  }

  return (
    <MediaPasswordContent
      initialEnabled={result.data!.enabled}
      initialHasPassword={result.data!.hasPassword}
      currentPassword={result.data!.password}
    />
  )
}

