'use client'

import { useState, useEffect } from 'react'
import { MediaPasswordDialog } from './MediaPasswordDialog'
import { toast } from 'sonner'

interface ProtectedMediaViewerProps {
  mediaKey: string
  className?: string
  alt?: string
  type?: 'image' | 'pdf' | 'auto'
  children?: (props: { src: string; isLoading: boolean }) => React.ReactNode
}

export function ProtectedMediaViewer({
  mediaKey,
  className,
  alt,
  type = 'auto',
  children,
}: ProtectedMediaViewerProps) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [authenticatedSrc, setAuthenticatedSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [password, setPassword] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string>('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Obtener contraseña guardada del sessionStorage
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('media-password')
    if (savedPassword) {
      setPassword(savedPassword)
    }
  }, [])

  // Intentar cargar el archivo
  useEffect(() => {
    const tryLoadMedia = async () => {
      setIsLoading(true)
      const baseUrl = `/api/media?key=${encodeURIComponent(mediaKey)}`
      console.log('🔄 Intentando cargar media:', baseUrl)
      console.log('🔐 Contraseña guardada:', password ? 'Sí' : 'No')

      try {
        // Intentar sin contraseña primero (usuario podría estar logueado)
        let response = await fetch(baseUrl)
        console.log('📥 Primera respuesta:', response.status, response.statusText)

        // Si falla y tenemos contraseña guardada, intentar con ella
        if (!response.ok && password) {
          console.log('🔑 Reintentando con contraseña guardada...')
          const credentials = btoa(`:${password}`)
          response = await fetch(baseUrl, {
            headers: {
              Authorization: `Basic ${credentials}`,
            },
          })
          console.log('📥 Segunda respuesta:', response.status, response.statusText)
        }

        if (response.ok) {
          const blob = await response.blob()
          console.log('✅ Blob recibido:', blob.size, 'bytes')
          const url = URL.createObjectURL(blob)
          setAuthenticatedSrc(url)
          setShowPasswordDialog(false)
        } else if (response.status === 401) {
          // Necesita contraseña
          console.log('🔒 Se requiere contraseña - mostrando diálogo')
          setShowPasswordDialog(true)
        } else {
          console.log('❌ Error inesperado:', response.status)
          toast.error('Error al cargar el archivo')
        }
      } catch (error) {
        console.error('Error loading media:', error)
        toast.error('Error de conexión al cargar el archivo')
      } finally {
        setIsLoading(false)
      }
    }

    tryLoadMedia()

    // Cleanup: revocar URL cuando se desmonte el componente
    return () => {
      if (authenticatedSrc) {
        URL.revokeObjectURL(authenticatedSrc)
      }
    }
  }, [mediaKey, password])

  const handlePasswordSubmit = async (submittedPassword: string) => {
    setIsAuthenticating(true)
    setPasswordError('')
    const baseUrl = `/api/media?key=${encodeURIComponent(mediaKey)}`
    const credentials = btoa(`:${submittedPassword}`)

    try {
      console.log('🔑 Intentando autenticar con contraseña...')
      const response = await fetch(baseUrl, {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      })

      console.log('📥 Respuesta recibida:', response.status, response.statusText)

      if (response.ok) {
        const blob = await response.blob()
        console.log('✅ Blob recibido:', blob.size, 'bytes, tipo:', blob.type)
        const url = URL.createObjectURL(blob)
        setAuthenticatedSrc(url)
        setShowPasswordDialog(false)
        setPasswordError('')

        // Guardar contraseña en sessionStorage para futuros accesos
        sessionStorage.setItem('media-password', submittedPassword)
        setPassword(submittedPassword)
        setIsLoading(false)

        toast.success('Archivo desbloqueado correctamente')
      } else {
        console.log('❌ Contraseña incorrecta (status:', response.status + ')')
        setPasswordError('Contraseña incorrecta. Por favor, verifica e intenta de nuevo.')
        toast.error('Contraseña incorrecta', {
          description: 'Por favor, verifica la contraseña e intenta de nuevo',
        })
      }
    } catch (error) {
      console.error('Error authenticating:', error)
      setPasswordError('Error de conexión. Por favor, intenta de nuevo.')
      toast.error('Error al verificar la contraseña')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleCancel = () => {
    setShowPasswordDialog(false)
    setPasswordError('')
    toast.info('Acceso cancelado')
  }

  // Extraer nombre del archivo de la key
  const fileName = mediaKey.split('/').pop() || 'archivo'

  // Si hay children, usar render prop
  if (children) {
    return (
      <>
        {children({ src: authenticatedSrc || '', isLoading })}
        <MediaPasswordDialog
          open={showPasswordDialog}
          onPasswordSubmit={handlePasswordSubmit}
          onCancel={handleCancel}
          fileName={fileName}
          isLoading={isAuthenticating}
          externalError={passwordError}
        />
      </>
    )
  }

  // Renderizado por defecto
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 animate-pulse ${className}`}>
        <div className="text-gray-400">Cargando...</div>
      </div>
    )
  }

  if (!authenticatedSrc) {
    return (
      <>
        <div className={`flex items-center justify-center bg-gray-50 border-2 border-dashed ${className}`}>
          <div className="text-center p-4">
            <IconLock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Archivo protegido</p>
          </div>
        </div>
        <MediaPasswordDialog
          open={showPasswordDialog}
          onPasswordSubmit={handlePasswordSubmit}
          onCancel={handleCancel}
          fileName={fileName}
          isLoading={isAuthenticating}
          externalError={passwordError}
        />
      </>
    )
  }

  // Detectar tipo de archivo
  const fileType = type === 'auto' ? (mediaKey.endsWith('.pdf') ? 'pdf' : 'image') : type

  if (fileType === 'pdf') {
    return (
      <>
        <iframe src={authenticatedSrc} className={className} title={alt || fileName} />
        <MediaPasswordDialog
          open={showPasswordDialog}
          onPasswordSubmit={handlePasswordSubmit}
          onCancel={handleCancel}
          fileName={fileName}
          isLoading={isAuthenticating}
          externalError={passwordError}
        />
      </>
    )
  }

  return (
    <>
      <img src={authenticatedSrc} alt={alt || fileName} className={className} />
      <MediaPasswordDialog
        open={showPasswordDialog}
        onPasswordSubmit={handlePasswordSubmit}
        onCancel={handleCancel}
        fileName={fileName}
        isLoading={isAuthenticating}
        externalError={passwordError}
      />
    </>
  )
}

// Importar IconLock
import { IconLock } from '@tabler/icons-react'

