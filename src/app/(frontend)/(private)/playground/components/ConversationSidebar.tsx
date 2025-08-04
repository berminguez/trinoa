'use client'

import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconCheck,
  IconX,
  IconDots,
  IconArchive,
} from '@tabler/icons-react'
import React, { useState, useEffect } from 'react'

import {
  getConversations,
  createConversation,
  updateConversation,
  deleteConversation,
  toggleArchiveConversation,
} from '@/actions/chat'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import type { Conversation } from '@/payload-types'

import ContextSelectors from './ContextSelectors'

interface ConversationSidebarProps {
  activeConversationId?: string
  onConversationSelect: (conversationId: string) => void
  onNewConversation: () => void
  refreshKey?: number
  className?: string
  playgroundDataLoading?: boolean
  playgroundDataError?: boolean
  playgroundDataEmpty?: boolean
}

function ConversationSidebar({
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  refreshKey = 0,
  className = '',
  playgroundDataLoading = false,
  playgroundDataError = false,
  playgroundDataEmpty = false,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true) // Solo skeleton en carga inicial
  const [isRefreshing, setIsRefreshing] = useState(false) // Para refreshes sin skeleton
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  // Estados para el modal de confirmación de eliminación
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Cargar conversaciones al montar el componente
  useEffect(() => {
    loadConversations(true) // true = es carga inicial
  }, [])

  // Recargar conversaciones cuando cambie refreshKey (sin skeleton)
  // TEMPORALMENTE DESHABILITADO hasta resolver bucle infinito del dropdown
  /*
  useEffect(() => {
    if (refreshKey > 0) {
      console.log('🔄 ConversationSidebar: refreshKey cambió a', refreshKey)
      
      // Debounce más largo para evitar llamadas excesivas
      const timeoutId = setTimeout(() => {
        console.log('🔄 ConversationSidebar: Ejecutando loadConversations...')
        loadConversations(false) // false = es refresh, no mostrar skeleton
      }, 300)

      return () => {
        console.log('🔄 ConversationSidebar: Cancelando timeout...')
        clearTimeout(timeoutId)
      }
    }
  }, [refreshKey])
  */

  const loadConversations = async (isInitial = false) => {
    try {
      if (isInitial) {
        setIsInitialLoading(true)
      } else {
        setIsRefreshing(true)
      }

      const result = await getConversations(1, 50) // Obtener las primeras 50 conversaciones

      if (result.success) {
        setConversations(result.conversations || [])
        setError(null)
      } else {
        setError(result.error || 'Error cargando conversaciones')
      }
    } catch (err) {
      console.error('Error cargando conversaciones:', err)
      setError('Error de conexión')
    } finally {
      if (isInitial) {
        setIsInitialLoading(false)
      } else {
        setIsRefreshing(false)
      }
    }
  }

  const handleNewConversation = async () => {
    try {
      setIsCreating(true)
      const result = await createConversation()

      if (result.success && result.conversation) {
        setConversations((prev) => [result.conversation!, ...prev])
        onConversationSelect(result.conversation.id)
        onNewConversation()
        setError(null)
      } else {
        setError(result.error || 'Error creando conversación')
      }
    } catch (err) {
      console.error('Error creando conversación:', err)
      setError('Error de conexión')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRename = (conversation: Conversation) => {
    setEditingId(conversation.id)
    setEditingTitle(conversation.title)
  }

  const handleSaveRename = async () => {
    if (!editingId || !editingTitle.trim()) return

    // Validaciones
    if (editingTitle.trim().length < 3) {
      setError('El título debe tener al menos 3 caracteres')
      return
    }

    if (editingTitle.trim().length > 100) {
      setError('El título no puede superar los 100 caracteres')
      return
    }

    try {
      const result = await updateConversation(editingId, {
        title: editingTitle.trim(),
      })

      if (result.success && result.conversation) {
        setConversations((prev) =>
          prev.map((conv) => (conv.id === editingId ? result.conversation! : conv)),
        )
        setEditingId(null)
        setEditingTitle('')
        setError(null)
      } else {
        setError(result.error || 'Error actualizando conversación')
      }
    } catch (err) {
      console.error('Error editando conversación:', err)
      setError('Error de conexión')
    }
  }

  const handleCancelRename = () => {
    setEditingId(null)
    setEditingTitle('')
    setError(null) // Limpiar errores al cancelar
  }

  const handleArchive = async (conversation: Conversation) => {
    const isCurrentlyActive = conversation.isActive !== false // Por defecto true si no está definido
    const newStatus = !isCurrentlyActive
    const action = newStatus ? 'desarchivar' : 'archivar'

    if (!confirm(`¿Estás seguro de que quieres ${action} esta conversación?`)) return

    try {
      const result = await toggleArchiveConversation(conversation.id, newStatus)

      if (result.success && result.conversation) {
        setConversations((prev) =>
          prev.map((conv) => (conv.id === conversation.id ? result.conversation! : conv)),
        )
        setError(null)
      } else {
        setError(result.error || `Error al ${action} conversación`)
      }
    } catch (err) {
      console.error(`Error ${action} conversación:`, err)
      setError('Error de conexión')
    }
  }

  // Función para abrir el modal de confirmación
  const handleDeleteClick = (conversation: Conversation) => {
    setConversationToDelete(conversation)
    setShowDeleteDialog(true)
  }

  // Función para confirmar la eliminación
  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return

    try {
      setIsDeleting(true)
      const result = await deleteConversation(conversationToDelete.id)

      if (result.success) {
        setConversations((prev) => prev.filter((conv) => conv.id !== conversationToDelete.id))

        // Si la conversación eliminada era la activa, limpiar
        if (activeConversationId === conversationToDelete.id) {
          onNewConversation()
        }

        setError(null)
        setShowDeleteDialog(false)
        setConversationToDelete(null)
      } else {
        setError(result.error || 'Error eliminando conversación')
      }
    } catch (err) {
      console.error('Error eliminando conversación:', err)
      setError('Error de conexión')
    } finally {
      setIsDeleting(false)
    }
  }

  // Función para cancelar la eliminación
  const handleCancelDelete = () => {
    setShowDeleteDialog(false)
    setConversationToDelete(null)
  }

  // Solo mostrar skeleton en carga inicial, no en refreshes
  if (isInitialLoading) {
    return (
      <div className={`bg-gray-50 border-r border-gray-200 ${className}`}>
        <div className='p-4 border-b border-gray-200'>
          <div className='h-8 bg-gray-200 rounded animate-pulse' />
        </div>
        <div className='p-4 space-y-3'>
          {[...Array(5)].map((_, i) => (
            <div key={i} className='bg-gray-200 rounded-lg h-16 animate-pulse' />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`bg-gray-50 border-r border-gray-200 flex flex-col ${className}`}>
        {/* Selectores de contexto de playground */}
        <div className='p-4 border-b border-gray-200'>
          <ContextSelectors />
        </div>

        {/* Header */}
        <div className='p-4 border-b border-gray-200'>
          <Button
            onClick={handleNewConversation}
            disabled={isCreating || isRefreshing}
            className='w-full flex items-center gap-2'
            size='sm'
          >
            <IconPlus className='h-4 w-4' />
            {isCreating ? 'Creando...' : 'Nueva conversación'}
          </Button>
        </div>

        {/* Indicador de refresh (sutil) */}
        {isRefreshing && (
          <div className='px-4 py-2 text-xs text-gray-500 text-center border-b border-gray-200'>
            Actualizando...
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className='mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
            <div className='text-red-800 text-sm'>{error}</div>
          </div>
        )}

        {/* Conversations list */}
        <div className='flex-1 overflow-y-auto p-4 space-y-3'>
          {conversations.length === 0 ? (
            <div className='text-gray-500 text-sm text-center py-8'>
              No hay conversaciones.
              <br />
              <span className='text-xs'>Crea una nueva para comenzar.</span>
            </div>
          ) : (
            conversations.map((conversation) => {
              const isArchived = conversation.isActive === false

              return (
                <Card
                  key={conversation.id}
                  className={`p-3 cursor-pointer transition-all hover:shadow-md group ${
                    activeConversationId === conversation.id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : isArchived
                        ? 'bg-gray-100 opacity-75 hover:bg-gray-200'
                        : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() =>
                    editingId !== conversation.id && onConversationSelect(conversation.id)
                  }
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex-1 min-w-0'>
                      {editingId === conversation.id ? (
                        <div className='space-y-2'>
                          <input
                            type='text'
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className='w-full text-sm font-medium bg-white border border-gray-300 rounded px-2 py-1'
                            placeholder='Título de la conversación'
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename()
                              if (e.key === 'Escape') handleCancelRename()
                            }}
                          />
                          <div className='flex gap-1'>
                            <Button
                              onClick={handleSaveRename}
                              size='sm'
                              className='h-6 px-2 text-xs'
                              disabled={!editingTitle.trim()}
                            >
                              <IconCheck className='h-3 w-3' />
                            </Button>
                            <Button
                              onClick={handleCancelRename}
                              variant='outline'
                              size='sm'
                              className='h-6 px-2 text-xs'
                            >
                              <IconX className='h-3 w-3' />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className='flex items-center gap-2'>
                            <h3
                              className={`font-medium text-sm truncate ${
                                isArchived ? 'text-gray-600' : 'text-gray-900'
                              }`}
                            >
                              {conversation.title}
                            </h3>
                            {isArchived && (
                              <IconArchive className='h-3 w-3 text-gray-500 flex-shrink-0' />
                            )}
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              isArchived ? 'text-gray-500' : 'text-gray-600'
                            }`}
                          >
                            {conversation.messageCount || 0} mensajes
                            {conversation.lastMessageAt && (
                              <span className='ml-2'>
                                {new Date(conversation.lastMessageAt).toLocaleDateString()}
                              </span>
                            )}
                            {isArchived && (
                              <span className='ml-2 text-orange-600 font-medium'>• Archivada</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {editingId !== conversation.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity'
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconDots className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-40'>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRename(conversation)
                            }}
                            className='cursor-pointer'
                          >
                            <IconEdit className='h-4 w-4 mr-2' />
                            Renombrar
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArchive(conversation)
                            }}
                            className='cursor-pointer'
                          >
                            <IconArchive className='h-4 w-4 mr-2' />
                            {isArchived ? 'Desarchivar' : 'Archivar'}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(conversation)
                            }}
                            className='cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50'
                          >
                            <IconTrash className='h-4 w-4 mr-2' />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la conversación &quot;
              {conversationToDelete?.title}&quot; y todos sus mensajes. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className='bg-red-600 hover:bg-red-700 focus:ring-red-600'
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Memoizar componente para evitar re-renders innecesarios durante streaming
export default React.memo(ConversationSidebar)
