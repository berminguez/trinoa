'use client'

import {
  IconVideo,
  IconVideoOff,
  IconChevronDown,
  IconCheck,
  IconMinus,
  IconPlaylist,
} from '@tabler/icons-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlaygroundContextStore } from '@/stores/playground-context-store'
import type { PlaygroundVideo } from '@/types/playground'

interface VideoSelectorProps {
  className?: string
  disabled?: boolean
}

export default function VideoSelector({ className = '', disabled = false }: VideoSelectorProps) {
  const {
    selectedProject,
    selectedVideos,
    allVideosSelected,
    availableVideos,
    isLoadingVideos,
    videosError,
    setSelectedVideos,
    toggleVideo,
    toggleAllVideos,
    clearAllVideoSelections,
    getFilteredVideos,
  } = usePlaygroundContextStore()

  // Obtener videos filtrados según el proyecto seleccionado
  const filteredVideos = React.useMemo(() => {
    const filtered = getFilteredVideos()
    console.log('🎥 VideoSelector Debug:', {
      selectedProject: selectedProject?.title || 'Todos los proyectos',
      availableVideos: availableVideos.length,
      filteredVideos: filtered.length,
      availableVideosList: availableVideos.map((v) => `${v.title} (${v.projectId})`),
      filteredVideosList: filtered.map((v) => `${v.title} (${v.projectId})`),
    })
    return filtered
  }, [getFilteredVideos, selectedProject, availableVideos])

  // Manejar marcar/desmarcar todos los videos
  const handleToggleAll = () => {
    toggleAllVideos()
  }

  // Manejar marcar todos los videos individuales
  const handleMarkAll = () => {
    setSelectedVideos(filteredVideos)
  }

  // Manejar desmarcar todos los videos individuales
  const handleUnmarkAll = () => {
    clearAllVideoSelections()
  }

  // Calcular texto del trigger
  const getTriggerText = () => {
    if (allVideosSelected) {
      return `Todos los videos (${filteredVideos.length})`
    }

    if (selectedVideos.length === 0) {
      return 'Seleccionar videos'
    }

    if (selectedVideos.length === 1) {
      return selectedVideos[0].title
    }

    return `${selectedVideos.length} videos seleccionados`
  }

  // Obtener icono del trigger
  const getTriggerIcon = () => {
    if (allVideosSelected || selectedVideos.length > 0) {
      return <IconPlaylist className='h-4 w-4 text-gray-600 shrink-0' />
    }
    return <IconVideo className='h-4 w-4 text-gray-600 shrink-0' />
  }

  // Determinar si un video específico está seleccionado
  const isVideoSelected = (video: PlaygroundVideo) => {
    return selectedVideos.some((v) => v.id === video.id)
  }

  // Estado de loading
  if (isLoadingVideos) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className='text-xs text-gray-500 font-medium'>Videos</div>
        <Skeleton className='h-9 w-full' />
      </div>
    )
  }

  // Estado de error
  if (videosError) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className='text-xs text-gray-500 font-medium'>Videos</div>
        <div className='h-9 px-3 py-2 border border-red-200 bg-red-50 rounded-md flex items-center text-sm text-red-600'>
          <IconVideoOff className='h-4 w-4 mr-2' />
          Error cargando videos
        </div>
      </div>
    )
  }

  // Sin videos disponibles (incluye el caso donde no hay proyecto seleccionado y no hay videos)
  if (filteredVideos.length === 0) {
    const message = selectedProject
      ? 'No hay videos en este proyecto'
      : availableVideos.length === 0
        ? 'No tienes videos'
        : 'No hay videos disponibles'

    return (
      <div className={`space-y-2 ${className}`}>
        <div className='text-xs text-gray-500 font-medium'>Videos</div>
        <div className='h-9 px-3 py-2 border border-gray-200 bg-gray-50 rounded-md flex items-center text-sm text-gray-500'>
          <IconVideoOff className='h-4 w-4 mr-2' />
          {message}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className='text-xs text-gray-500 font-medium'>Videos</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Button variant='outline' className='w-full justify-between h-9 px-3 py-2 font-normal'>
            <div className='flex items-center gap-2 min-w-0 flex-1'>
              {getTriggerIcon()}
              <span className='truncate text-sm'>{getTriggerText()}</span>
            </div>
            <IconChevronDown className='h-4 w-4 opacity-50 shrink-0' />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className='w-80 max-h-80' align='start'>
          {/* Botones de control en la parte superior */}
          <div className='p-2 space-y-2'>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='flex-1 h-8 text-xs'
                onClick={handleMarkAll}
                disabled={selectedVideos.length === filteredVideos.length && !allVideosSelected}
              >
                <IconCheck className='h-3 w-3 mr-1' />
                Marcar todos
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='flex-1 h-8 text-xs'
                onClick={handleUnmarkAll}
                disabled={selectedVideos.length === 0 && !allVideosSelected}
              >
                <IconMinus className='h-3 w-3 mr-1' />
                Desmarcar todos
              </Button>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Opción "Todos los videos" */}
          <div
            className='flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer font-medium'
            onClick={handleToggleAll}
          >
            {/* Checkbox tradicional */}
            <div className='flex items-center'>
              <div
                className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                  allVideosSelected
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                {allVideosSelected && <IconCheck className='h-3 w-3' />}
              </div>
            </div>

            {/* Icono de playlist */}
            <IconPlaylist className='h-4 w-4 text-gray-600' />

            {/* Texto */}
            <div className='flex items-center gap-2 flex-1'>
              <span>Todos los videos</span>
              <span className='text-xs text-gray-400 ml-auto'>({filteredVideos.length})</span>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Videos individuales */}
          <div className='max-h-48 overflow-y-auto'>
            {filteredVideos.map((video) => {
              const isChecked = allVideosSelected || isVideoSelected(video)
              return (
                <div
                  key={video.id}
                  className={`flex items-start gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer ${
                    allVideosSelected ? 'opacity-75' : ''
                  }`}
                  onClick={() => {
                    console.log('🖱️ Click en video:', {
                      videoTitle: video.title,
                      videoId: video.id,
                      allVideosSelected,
                      currentlySelected: isVideoSelected(video),
                    })
                    toggleVideo(video)
                  }}
                >
                  {/* Checkbox tradicional */}
                  <div className='flex items-center pt-0.5'>
                    <div
                      className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      {isChecked && <IconCheck className='h-3 w-3' />}
                    </div>
                  </div>

                  {/* Icono de video */}
                  <IconVideo className='h-4 w-4 text-gray-600 shrink-0 mt-0.5' />

                  {/* Información del video */}
                  <div className='min-w-0 flex-1'>
                    <div className='text-sm font-medium truncate'>{video.title}</div>
                    <div className='text-xs text-gray-500 truncate'>
                      {video.projectTitle} • {video.type}
                    </div>
                    {video.status !== 'completed' && (
                      <div className='text-xs text-orange-500 mt-1'>Estado: {video.status}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Contador en la parte inferior */}
          {selectedVideos.length > 0 && !allVideosSelected && (
            <>
              <DropdownMenuSeparator />
              <div className='p-2 text-xs text-gray-500 text-center'>
                {selectedVideos.length} de {filteredVideos.length} videos seleccionados
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
