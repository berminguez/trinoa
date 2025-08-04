'use client'

import { useEffect, useState } from 'react'

import { getPlaygroundData } from '@/actions/playground/getPlaygroundData'
import { getPlaygroundKeyStatus } from '@/actions/api-keys/getPlaygroundKey'
import { usePlaygroundContext } from '@/hooks/usePlaygroundContext'
import { IconAlertCircle } from '@tabler/icons-react'
import { Card } from '@/components/ui/card'

import ChatInterface from './ChatInterface'

// Componente principal del Playground
export default function PlaygroundContent() {
  // Estado para playground key
  const [playgroundKeyStatus, setPlaygroundKeyStatus] = useState<{
    loading: boolean
    hasKey: boolean
    error: string | null
  }>({
    loading: true,
    hasKey: false,
    error: null,
  })

  const {
    actions: {
      setAvailableProjects,
      setAvailableVideos,
      setLoadingProjects,
      setLoadingVideos,
      setProjectsError,
      setVideosError,
    },
    computed: { isLoading, hasErrors, isEmpty },
    helpers: { validateCurrentState },
  } = usePlaygroundContext()

  // Cargar datos del playground al montar el componente
  useEffect(() => {
    async function loadPlaygroundData() {
      console.log('🎮 PlaygroundContent: Cargando datos...')

      // Activar estados de loading
      setLoadingProjects(true)
      setLoadingVideos(true)

      // Verificar playground key status
      setPlaygroundKeyStatus((prev) => ({ ...prev, loading: true }))

      try {
        // Verificar si el usuario tiene playground key
        const playgroundKeyResult = await getPlaygroundKeyStatus()

        if (playgroundKeyResult.success) {
          setPlaygroundKeyStatus({
            loading: false,
            hasKey: playgroundKeyResult.hasPlaygroundKey,
            error: null,
          })

          console.log('🔑 PlaygroundContent: Playground key status:', {
            hasKey: playgroundKeyResult.hasPlaygroundKey,
          })
        } else {
          setPlaygroundKeyStatus({
            loading: false,
            hasKey: false,
            error: playgroundKeyResult.error || 'Error verificando playground key',
          })
        }

        // Cargar datos del playground
        const result = await getPlaygroundData()

        if (result.success && result.data) {
          console.log('📦 PlaygroundContent: Guardando datos en store:', {
            projects: result.data.projects,
            videos: result.data.videos,
          })

          // Cargar proyectos y videos exitosamente
          setAvailableProjects(result.data.projects)
          setAvailableVideos(result.data.videos)

          // Limpiar errores previos
          setProjectsError(null)
          setVideosError(null)

          console.log('✅ PlaygroundContent: Datos cargados exitosamente', {
            projects: result.data.projects.length,
            videos: result.data.videos.length,
            projectList: result.data.projects.map((p) => `${p.title} (${p.id})`),
            videoList: result.data.videos.map(
              (v) => `${v.title} -> ${v.projectTitle} (${v.projectId})`,
            ),
          })

          // Validar y limpiar datos persistidos después de cargar
          setTimeout(() => {
            const validationResult = validateCurrentState()
            if (validationResult.cleaned) {
              console.log('🧹 PlaygroundContent: Datos persistidos limpiados después de cargar')
            }
          }, 100)
        } else {
          // Manejar error del servidor
          const errorMsg = result.error || 'Error cargando datos del playground'
          console.error('❌ PlaygroundContent: Error del servidor:', errorMsg)

          setProjectsError(errorMsg)
          setVideosError(errorMsg)
        }
      } catch (error) {
        // Manejar error de red o cliente
        const errorMsg = 'Error de conexión al cargar datos'
        console.error('❌ PlaygroundContent: Error de conexión:', error)

        setProjectsError(errorMsg)
        setVideosError(errorMsg)

        // También manejar error de playground key si no se pudo verificar
        setPlaygroundKeyStatus((prev) => ({
          ...prev,
          loading: false,
          error: 'Error verificando playground key',
        }))
      } finally {
        // Desactivar estados de loading
        setLoadingProjects(false)
        setLoadingVideos(false)
      }
    }

    loadPlaygroundData()
  }, [
    setAvailableProjects,
    setAvailableVideos,
    setLoadingProjects,
    setLoadingVideos,
    setProjectsError,
    setVideosError,
    validateCurrentState,
  ])

  // Mostrar error de playground key si no hay key asignada
  if (!playgroundKeyStatus.loading && !playgroundKeyStatus.hasKey) {
    return (
      <div className='h-[calc(100vh-4rem)] w-full flex items-center justify-center p-4'>
        <Card className='max-w-md w-full p-6'>
          <div className='flex flex-col items-center text-center space-y-4'>
            <div className='p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full'>
              <IconAlertCircle className='h-8 w-8 text-amber-600 dark:text-amber-400' />
            </div>

            <div className='space-y-2'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                API Key no asignada
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                El chatbot no tiene ninguna API key asignada. Las funcionalidades avanzadas no están
                disponibles.
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className='h-[calc(100vh-4rem)] w-full'>
      {/* Chat Interface con sidebar integrado */}
      <ChatInterface
        className='h-full'
        playgroundDataLoading={isLoading || playgroundKeyStatus.loading}
        playgroundDataError={hasErrors}
        playgroundDataEmpty={isEmpty}
      />
    </div>
  )
}
