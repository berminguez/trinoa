import { useState, useRef, useCallback } from 'react'

import {
  createConversation,
  updateConversation,
  generateConversationTitle,
  getConversationWithMessages,
} from '@/actions/chat'

import type { Conversation } from '@/payload-types'

export function useConversation() {
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [displayTitle, setDisplayTitle] = useState<string>('Nueva conversación')
  const [titleInTransition, setTitleInTransition] = useState(false)

  // Referencias para autogeneración de títulos y estado
  const currentConversationRef = useRef<Conversation | null>(null)
  const firstUserMessageRef = useRef<string | null>(null)
  const isFirstResponseRef = useRef<boolean>(false)
  const titleInTransitionRef = useRef(false)

  // Sincronizar ref de transición
  titleInTransitionRef.current = titleInTransition

  // Sincronizar referencias con estado - SIN dependencias para evitar bucles
  const updateConversationState = useCallback((conversation: Conversation | null) => {
    setCurrentConversation(conversation)
    currentConversationRef.current = conversation

    // Solo actualizar título si no está en transición (usando ref)
    if (conversation && !titleInTransitionRef.current) {
      setDisplayTitle(conversation.title)
    } else if (!conversation) {
      setDisplayTitle('Nueva conversación')
    }
  }, [])

  // Crear nueva conversación
  const createNewConversation = useCallback(
    async (firstMessage?: string) => {
      try {
        const result = await createConversation()

        if (result.success && result.conversation) {
          updateConversationState(result.conversation)

          // Configurar para autogeneración de título si hay primer mensaje
          if (firstMessage) {
            firstUserMessageRef.current = firstMessage
            isFirstResponseRef.current = true
          }

          return result.conversation
        }
      } catch (error) {
        console.error('Error creando conversación:', error)
      }
      return null
    },
    [updateConversationState],
  )

  // Cargar conversación existente
  const loadConversation = useCallback(
    async (conversationId: string) => {
      try {
        setIsLoadingConversation(true)
        const result = await getConversationWithMessages(conversationId)

        if (result.success && result.conversation) {
          updateConversationState(result.conversation)

          // Limpiar referencias al cargar conversación existente
          firstUserMessageRef.current = null
          isFirstResponseRef.current = false

          return {
            conversation: result.conversation,
            messages: result.messages || [],
          }
        }
      } catch (error) {
        console.error('Error cargando conversación:', error)
      } finally {
        setIsLoadingConversation(false)
      }
      return null
    },
    [updateConversationState],
  )

  // Limpiar conversación actual
  const clearCurrentConversation = useCallback(() => {
    updateConversationState(null)
    firstUserMessageRef.current = null
    isFirstResponseRef.current = false
  }, [updateConversationState])

  // Autogenerar título si es necesario
  const maybeGenerateTitle = useCallback(async () => {
    if (
      isFirstResponseRef.current &&
      firstUserMessageRef.current &&
      currentConversationRef.current?.title.startsWith('Nueva conversación')
    ) {
      try {
        console.log('🚀 Autogenerando título con mensaje:', firstUserMessageRef.current)

        const titleResult = await generateConversationTitle(firstUserMessageRef.current)

        if (titleResult.success && titleResult.title && currentConversationRef.current) {
          const updateResult = await updateConversation(currentConversationRef.current.id, {
            title: titleResult.title,
          })

          if (updateResult.success && updateResult.conversation) {
            updateConversationState(updateResult.conversation)

            // Activar efecto typewriter
            setTitleInTransition(true)

            return updateResult.conversation
          }
        }
      } catch (error) {
        console.error('Error autogenerando título:', error)
      } finally {
        // Limpiar referencias después de usar
        firstUserMessageRef.current = null
        isFirstResponseRef.current = false
      }
    }
    return null
  }, [updateConversationState])

  // Completar efecto typewriter
  const onTitleTypewriterComplete = useCallback(() => {
    setTitleInTransition(false)
    if (currentConversation) {
      setDisplayTitle(currentConversation.title)
    }
  }, [currentConversation])

  return {
    // Estado
    currentConversation,
    isLoadingConversation,
    displayTitle,
    titleInTransition,

    // Referencias (solo lectura)
    currentConversationRef: currentConversationRef.current,
    isFirstResponse: isFirstResponseRef.current,

    // Acciones
    createNewConversation,
    loadConversation,
    clearCurrentConversation,
    maybeGenerateTitle,
    onTitleTypewriterComplete,
    updateConversationState,
  }
}
