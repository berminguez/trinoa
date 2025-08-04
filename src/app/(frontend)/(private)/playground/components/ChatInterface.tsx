'use client'

import React, { useState, useCallback, useMemo, useRef } from 'react'

import { TypewriterText } from '@/components/ui/typewriter-text'
import { useConversation } from '@/hooks/useConversation'
import { useMessages } from '@/hooks/useMessages'
// import { useToolProcessing } from '@/hooks/useToolProcessing' // TODO: implementar cuando sea necesario

import ConversationSidebar from './ConversationSidebar'
import MessageInput from './MessageInput'
import MessageList from './MessageList'
import { SmartContextIndicator } from './ContextIndicator'

interface ChatInterfaceProps {
  className?: string
  playgroundDataLoading?: boolean
  playgroundDataError?: boolean
  playgroundDataEmpty?: boolean
}

export default function ChatInterface({
  className = '',
  playgroundDataLoading = false,
  playgroundDataError = false,
  playgroundDataEmpty = false,
}: ChatInterfaceProps) {
  const [sidebarVisible, setSidebarVisible] = useState(true)

  // Hooks personalizados
  const conversation = useConversation()
  const messages = useMessages(conversation.currentConversation?.id)

  // DEBUG: Logs para identificar re-renders
  console.log('🔄 ChatInterface re-render:', {
    messagesCount: messages.messages.length,
    refreshKey: messages.refreshKey,
    conversationId: conversation.currentConversation?.id,
    isLoading: messages.isLoading,
  })

  // Simplificar - Lógica de tool processing movida al onFinish de useMessages
  // NO usar el hook useToolProcessing para evitar bucles infinitos

  // Estabilizar props del sidebar para evitar re-renders durante streaming
  const stableActiveConversationId = useMemo(() => {
    return conversation.currentConversation?.id
  }, [conversation.currentConversation?.id])

  // Estabilizar refreshKey para evitar re-renders innecesarios
  const stableRefreshKey = useMemo(() => {
    return messages.refreshKey
  }, [messages.refreshKey])

  // Referencias estables para funciones del sidebar - NO cambiarán durante streaming
  const handleLoadConversationRef = useRef<(conversationId: string) => Promise<void>>(() =>
    Promise.resolve(),
  )
  const handleNewConversationRef = useRef<() => Promise<void>>(() => Promise.resolve())

  // Actualizar las referencias pero mantener la función estable
  handleLoadConversationRef.current = async (conversationId: string) => {
    const result = await conversation.loadConversation(conversationId)
    if (result?.messages) {
      messages.loadMessagesFromDB(result.messages)
    }
  }

  handleNewConversationRef.current = async () => {
    conversation.clearCurrentConversation()
    messages.setAiMessages([])
  }

  // Funciones estables que nunca cambian - solo delegan a las referencias
  const stableHandleLoadConversation = useCallback(async (conversationId: string) => {
    await handleLoadConversationRef.current?.(conversationId)
  }, [])

  const stableHandleNewConversation = useCallback(async () => {
    await handleNewConversationRef.current?.()
  }, [])

  // Manejar envío de mensajes
  const handleSendMessage = async () => {
    if (!messages.input.trim() || messages.isLoading) {
      return
    }

    const userMessageContent = messages.input.trim()
    console.log('📤 Enviando mensaje:', userMessageContent)

    // Limpiar input y agregar mensaje optimista
    messages.handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
    messages.sendOptimisticMessage(userMessageContent)

    try {
      // Si no hay conversación, crear una nueva
      if (!conversation.currentConversation) {
        console.log('🆕 Creando nueva conversación...')
        const newConversation = await conversation.createNewConversation(userMessageContent)

        if (newConversation) {
          // Guardar mensaje del usuario
          await messages.saveMessageToDB({
            conversationId: newConversation.id,
            role: 'user',
            content: userMessageContent,
          })

          // Refresh TEMPORALMENTE DESHABILITADO para evitar bucles infinitos
          // Solo refresh manual o al finalizar conversación
          // setTimeout(() => {
          //   messages.forceRefresh()
          // }, 500)
        }
      } else {
        // Guardar mensaje del usuario en conversación existente
        await messages.saveMessageToDB({
          conversationId: conversation.currentConversation.id,
          role: 'user',
          content: userMessageContent,
        })
      }

      // Enviar al AI SDK
      await messages.aiHandleSubmit()
    } catch (error) {
      console.error('💥 Error enviando mensaje:', error)
    }
  }

  // Función para manejar prompts sugeridos
  const handleSuggestedPrompt = (prompt: string) => {
    messages.handleInputChange({ target: { value: prompt } } as React.ChangeEvent<HTMLInputElement>)
  }

  // Función para reintentar mensaje
  const handleRetryMessage = async (messageId: string) => {
    try {
      await messages.reload()
    } catch (error) {
      console.error('Error reintentando mensaje:', error)
    }
  }

  return (
    <div className={`flex h-full ${className}`}>
      {/* Sidebar de conversaciones */}
      {sidebarVisible && (
        <ConversationSidebar
          activeConversationId={stableActiveConversationId}
          onConversationSelect={stableHandleLoadConversation}
          onNewConversation={stableHandleNewConversation}
          refreshKey={stableRefreshKey}
          className='w-80 shrink-0'
          playgroundDataLoading={playgroundDataLoading}
          playgroundDataError={playgroundDataError}
          playgroundDataEmpty={playgroundDataEmpty}
        />
      )}

      {/* Área principal del chat */}
      <div className='flex-1 flex flex-col bg-white'>
        {/* Header del chat */}
        <div className='border-b border-gray-200 p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => setSidebarVisible(!sidebarVisible)}
                className='text-gray-500 hover:text-gray-700'
              >
                ☰
              </button>
              <div>
                <h1 className='text-lg font-semibold text-gray-900'>
                  {conversation.titleInTransition && conversation.currentConversation ? (
                    <TypewriterText
                      text={conversation.currentConversation.title}
                      delay={30}
                      onComplete={conversation.onTitleTypewriterComplete}
                    />
                  ) : (
                    conversation.displayTitle
                  )}
                </h1>
                <p className='text-sm text-gray-500'>
                  {conversation.isLoadingConversation
                    ? 'Cargando conversación...'
                    : conversation.currentConversation
                      ? `${messages.messages.length} mensajes`
                      : 'Escribe un mensaje para comenzar'}
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <button
                onClick={() => {
                  console.log('🔄 Refresh manual solicitado')
                  messages.forceRefresh()
                }}
                className='text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border'
                disabled={messages.isLoading}
              >
                🔄 Actualizar
              </button>
              <span className='text-xs text-green-600'>● Conectado a OpenAI</span>
            </div>
          </div>
        </div>

        {/* Área de mensajes */}
        <div className='flex-1 flex flex-col overflow-hidden'>
          <MessageList
            messages={messages.messages}
            isLoading={messages.isLoading || conversation.isLoadingConversation}
            error={messages.error}
            onSuggestedPrompt={handleSuggestedPrompt}
            onRetryMessage={handleRetryMessage}
          />

          {/* Context Indicator */}
          <div className='px-4 py-2 border-t border-gray-100 bg-gray-50'>
            <SmartContextIndicator
              isLoading={playgroundDataLoading}
              hasError={playgroundDataError}
              isEmpty={playgroundDataEmpty}
              error={playgroundDataError ? 'Error cargando datos' : ''}
              variant='compact'
              className='max-w-md'
            />
          </div>

          {/* Input Area */}
          <MessageInput
            value={messages.input}
            onChange={(value) =>
              messages.handleInputChange({
                target: { value },
              } as React.ChangeEvent<HTMLInputElement>)
            }
            onSubmit={handleSendMessage}
            isLoading={messages.isLoading}
            disabled={!!messages.error && !messages.isLoading}
            placeholder={
              conversation.currentConversation
                ? 'Pregúntame cualquier cosa...'
                : 'Escribe tu primer mensaje para comenzar una nueva conversación...'
            }
          />

          {/* Botones de control del chat */}
          <div className='px-4 pb-2'>
            <div className='flex justify-between items-center text-xs text-gray-500'>
              <div className='flex items-center gap-2'>
                {messages.isLoading && (
                  <button
                    onClick={messages.stop}
                    className='text-red-600 hover:text-red-800 font-medium'
                  >
                    ⏹️ Detener
                  </button>
                )}
                {messages.messages.length > 0 && !messages.isLoading && (
                  <button
                    onClick={stableHandleNewConversation}
                    className='text-gray-600 hover:text-gray-800 font-medium'
                  >
                    🗑️ Nueva conversación
                  </button>
                )}
              </div>
              <div className='text-right'>
                <span className='text-gray-400'>
                  {conversation.currentConversation
                    ? `ID: ${conversation.currentConversation.id.slice(-8)}`
                    : 'Sin guardar'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
