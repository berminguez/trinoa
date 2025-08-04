import { useChat } from 'ai/react'
import { useState, useCallback, useEffect, useRef } from 'react'

import { createMessage } from '@/actions/chat'
import { usePlaygroundContext } from './usePlaygroundContext'

import type { Message as DBMessage } from '@/payload-types'

// Tipos para mensajes en UI
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  status?: 'sending' | 'sent' | 'error' | 'retrying'
  error?: string
  sources?: Array<{
    title: string
    excerpt: string
  }>
  toolsUsed?: string[]
}

// Funciones helper para extraer contenido y herramientas
function extractSimpleContent(message: any): string {
  let content = ''

  if (message.content && typeof message.content === 'string') {
    content = message.content
  }

  if (message.parts && Array.isArray(message.parts)) {
    const contentParts: string[] = []

    for (const part of message.parts) {
      if (part.type === 'text' && part.text) {
        contentParts.push(part.text)
      } else if (part.type === 'tool-invocation' && part.toolInvocation) {
        const toolResult = part.toolInvocation.result
        if (toolResult && toolResult.content && Array.isArray(toolResult.content)) {
          for (const resultContent of toolResult.content) {
            if (resultContent.type === 'text' && resultContent.text) {
              contentParts.push(resultContent.text)
            }
          }
        }
      }
    }

    if (contentParts.length > 0) {
      content = contentParts.join('\n')
    }
  }

  if (!content && message.toolInvocations && Array.isArray(message.toolInvocations)) {
    const resultTexts: string[] = []

    for (const toolInvocation of message.toolInvocations) {
      if (toolInvocation.result && toolInvocation.result.content) {
        for (const resultContent of toolInvocation.result.content) {
          if (resultContent.type === 'text' && resultContent.text) {
            resultTexts.push(resultContent.text)
          }
        }
      }
    }

    if (resultTexts.length > 0) {
      content = resultTexts.join('\n')
    }
  }

  return content || ''
}

function extractToolNames(message: any): string[] {
  const toolNames: string[] = []

  if (message.parts && Array.isArray(message.parts)) {
    for (const part of message.parts) {
      if (part.type === 'tool-invocation' && part.toolInvocation) {
        const toolName = part.toolInvocation.toolName
        if (toolName && !toolNames.includes(toolName)) {
          toolNames.push(toolName)
        }
      }
    }
  }

  if (message.toolInvocations && Array.isArray(message.toolInvocations)) {
    for (const toolInvocation of message.toolInvocations) {
      const toolName = toolInvocation.toolName
      if (toolName && !toolNames.includes(toolName)) {
        toolNames.push(toolName)
      }
    }
  }

  return toolNames
}

function isToolResponseMessage(message: any): boolean {
  const toolsUsed = extractToolNames(message)
  const content = extractSimpleContent(message)

  // Si tiene herramientas usadas y el contenido parece ser JSON/tool result
  const hasToolContent = Boolean(
    toolsUsed.length > 0 &&
      content &&
      (content.trim().startsWith('{') ||
        content.includes('"query"') ||
        content.includes('"results"') ||
        content.includes('"totalResults"') ||
        content.includes('"segmentId"') ||
        content.includes('"relevanceScore"') ||
        content.includes('"position"')),
  )

  // Si el contenido es muy largo y parece ser un JSON dump completo
  const isLargeJsonDump = Boolean(
    content &&
      content.length > 1000 &&
      content.trim().startsWith('{') &&
      content.includes('"metadata"') &&
      (content.includes('"video"') || content.includes('"transcript"')),
  )

  return hasToolContent || isLargeJsonDump
}

function isProcessingPrompt(content: string): boolean {
  return (
    content.includes('Interpreta y explica de manera conversacional') ||
    content.includes('Analiza el resultado anterior') ||
    content.includes('resultados de herramientas para el usuario') ||
    content.includes('enfocándote en responder su pregunta original')
  )
}

export function useMessages(currentConversationId?: string) {
  const [refreshKey, setRefreshKey] = useState(0)

  // Obtener contexto del playground para enviarlo con cada mensaje
  const {
    computed: { chatContext },
  } = usePlaygroundContext()

  // Usar ref para la conversationId para evitar re-renders del hook useChat
  const conversationIdRef = useRef(currentConversationId)
  conversationIdRef.current = currentConversationId

  // Ref para isLoading para usar en callbacks sin dependencias
  const isLoadingRef = useRef(false)

  // Ref para evitar bucles infinitos de procesamiento de herramientas
  const processingToolResultRef = useRef(false)

  // Ref para evitar mensajes optimistas durante procesamiento automático
  const autoProcessingRef = useRef(false)

  // Hook de Vercel AI SDK para chat con streaming
  const {
    messages: aiMessages,
    input,
    handleInputChange,
    handleSubmit: aiHandleSubmit,
    append,
    isLoading,
    error: aiError,
    reload,
    stop,
    setMessages: setAiMessages,
  } = useChat({
    api: '/api/chat',
    body: {
      // Incluir contexto del playground en cada petición
      context: chatContext,
    },
    onResponse: async (response) => {
      console.log('📡 onResponse:', response.status)
      console.log('🎯 Contexto enviado:', chatContext)
    },
    onFinish: async (message) => {
      console.log('🤖 onFinish ejecutado:', message.id)

      if (conversationIdRef.current) {
        console.log('💾 Guardando mensaje del asistente...')

        // Extraer contenido simple del mensaje
        const simpleContent = extractSimpleContent(message)
        const toolNames = extractToolNames(message)
        const hasToolResults = toolNames.length > 0

        // Detectar si es un tool result sin respuesta natural
        const isOnlyToolResult =
          hasToolResults &&
          simpleContent &&
          (simpleContent.trim().startsWith('{') || // JSON response
            simpleContent.includes('"query"') || // MCP query response
            simpleContent.includes('"results"') || // Results array
            simpleContent.includes('"totalResults"')) // Video search response

        const hasNaturalText = simpleContent && !isOnlyToolResult

        // Guardar mensaje en BD
        try {
          await createMessage({
            conversationId: conversationIdRef.current!, // Non-null assertion ya que verificamos arriba
            role: 'assistant',
            content: simpleContent,
            rawMessage: message as unknown as Record<string, unknown>,
            metadata: {
              model: 'gpt-4o-mini',
              ragUsed: false,
              messageType: isOnlyToolResult ? 'tool-response' : 'natural-response',
              version: '1.0',
              toolNames: toolNames,
            },
          })

          console.log('✅ Mensaje del asistente guardado')

          // 🚀 PROCESAMIENTO AUTOMÁTICO DE HERRAMIENTAS
          // Si es un tool result sin texto natural, relanzar automáticamente
          if (isOnlyToolResult && !processingToolResultRef.current) {
            console.log('🔧 Detectado tool result sin respuesta natural, relanzando modelo...')

            // Activar flag para evitar bucles infinitos
            processingToolResultRef.current = true
            autoProcessingRef.current = true

            // Delay para asegurar que el mensaje se guardó
            setTimeout(async () => {
              try {
                // Enviar prompt de procesamiento automáticamente SIN crear mensaje optimista del usuario
                const processingPrompt = `Interpreta y explica de manera conversacional estos resultados de herramientas para el usuario, enfocándote en responder su pregunta original:`

                console.log('🚀 Enviando prompt de procesamiento automático (usando append)...')

                // Usar append para enviar mensaje directamente sin UI optimista
                await append({
                  role: 'user',
                  content: processingPrompt,
                })

                console.log('✅ Prompt de procesamiento enviado con append')

                // Resetear flags después de enviar
                setTimeout(() => {
                  processingToolResultRef.current = false
                  autoProcessingRef.current = false
                }, 1000)
              } catch (error) {
                console.error('❌ Error en procesamiento automático de herramientas:', error)
                processingToolResultRef.current = false
                autoProcessingRef.current = false
              }
            }, 200)
          } else if (isOnlyToolResult) {
            console.log('⚠️ Tool result detectado pero procesamiento ya en curso, saltando...')
          }
        } catch (error) {
          console.error('❌ Error guardando mensaje del asistente:', error)
        }
      } else {
        console.warn('⚠️ No hay conversación actual para guardar el mensaje')
      }
    },
    onError: (error) => {
      console.error('💥 Error en useChat:', error)
    },
  })

  // Referencias estables para evitar bucles infinitos
  const setAiMessagesRef = useRef(setAiMessages)
  setAiMessagesRef.current = setAiMessages

  // Detectar duplicados y limpiar mensajes optimistas
  useEffect(() => {
    const hasTemporaryMessages = aiMessages.some((msg) => msg.id.startsWith('temp-'))
    const hasRealMessages = aiMessages.some(
      (msg) => !msg.id.startsWith('temp-') && msg.role === 'user',
    )

    if (hasTemporaryMessages && hasRealMessages) {
      console.log('🔄 Eliminando mensajes optimistas duplicados')
      const realMessages = aiMessages.filter((msg) => !msg.id.startsWith('temp-'))
      setAiMessagesRef.current(realMessages)
    }
  }, [aiMessages])

  // Convertir y filtrar mensajes para UI
  const messages: Message[] = aiMessages
    .filter((msg) => {
      // Durante procesamiento automático, filtrar más agresivamente
      if (autoProcessingRef.current && msg.role === 'user') {
        // Verificar si es un mensaje reciente (últimos 5 segundos)
        const messageTime = msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now()
        const now = Date.now()
        const isRecent = now - messageTime < 5000

        if (isRecent && isProcessingPrompt(msg.content)) {
          console.log('🚫 Filtrando prompt de procesamiento automático:', msg.id)
          return false
        }
      }

      // Filtrar prompts de procesamiento automático
      if (msg.role === 'user' && msg.content && isProcessingPrompt(msg.content)) {
        console.log('🚫 Filtrando prompt de procesamiento:', msg.id)
        return false
      }

      // Filtrar respuestas de herramientas puras
      if (msg.role === 'assistant') {
        // Verificar si tiene solo tool-invocations/tool-results en parts
        if (msg.parts && Array.isArray(msg.parts)) {
          const hasOnlyToolParts = msg.parts.every(
            (part: any) => part.type === 'tool-invocation' || part.type === 'tool-result',
          )

          if (hasOnlyToolParts) {
            console.log('🚫 Filtrando mensaje con solo tool parts:', msg.id)
            return false
          }
        }

        // Verificar por contenido
        if (isToolResponseMessage(msg)) {
          console.log('🚫 Filtrando mensaje de herramienta:', msg.id)
          return false
        }
      }

      return true
    })
    .map((msg) => {
      let content = msg.content

      if (msg.role === 'assistant' && (!content || content.trim() === '')) {
        content = extractSimpleContent(msg)
      }

      const toolsUsed = msg.role === 'assistant' ? extractToolNames(msg) : undefined

      return {
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: content || '[Procesando...]',
        timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
        status: 'sent',
        toolsUsed,
      }
    })

  // Guardar mensaje en BD
  const saveMessageToDB = useCallback(
    async (data: {
      conversationId: string
      role: 'user' | 'assistant'
      content: string
      rawMessage?: any
      metadata?: any
    }) => {
      try {
        console.log('💾 Guardando en BD:', data.role, data.content.substring(0, 50) + '...')
        await createMessage(data)
        console.log('✅ Mensaje guardado en BD')
      } catch (error) {
        console.error('❌ Error guardando mensaje:', error)
      }
    },
    [],
  )

  // Cargar mensajes desde BD
  const loadMessagesFromDB = useCallback((dbMessages: DBMessage[]) => {
    console.log('📥 Cargando mensajes desde BD:', dbMessages.length)

    // Filtrar y procesar mensajes para el contexto del modelo
    const filteredMessages = dbMessages
      .filter((msg) => {
        // Filtrar mensajes marcados como tool-response en metadata
        const metadata = (msg as any).metadata
        if (metadata?.messageType === 'tool-response') {
          console.log('🚫 Filtrando tool-response desde BD:', msg.id)
          return false
        }

        // Filtrar prompts de procesamiento desde BD
        if (msg.role === 'user' && msg.content && isProcessingPrompt(msg.content)) {
          console.log('🚫 Filtrando prompt de procesamiento desde BD:', msg.id)
          return false
        }

        // Detectar tool-responses por rawMessage si no hay metadata
        if (msg.role === 'assistant' && (msg as any).rawMessage) {
          const rawMessage = (msg as any).rawMessage

          // Verificar si el rawMessage tiene solo tool-invocations
          if (rawMessage.parts && Array.isArray(rawMessage.parts)) {
            const hasOnlyToolInvocations = rawMessage.parts.every(
              (part: any) => part.type === 'tool-invocation' || part.type === 'tool-result',
            )

            if (hasOnlyToolInvocations) {
              console.log('🚫 Filtrando mensaje con solo tool-invocations desde BD:', msg.id)
              return false
            }
          }

          // Verificar por contenido si es tool-response
          if (isToolResponseMessage(rawMessage)) {
            console.log('🚫 Filtrando tool-response detectado por contenido desde BD:', msg.id)
            return false
          }
        }

        return true
      })
      .map((msg) => {
        let content = msg.content || ''

        if ((msg as any).rawMessage) {
          content = extractSimpleContent((msg as any).rawMessage)
        }

        return {
          id: msg.id,
          role: msg.role,
          content: content || '[Sin contenido]',
          createdAt: new Date(msg.createdAt),
          rawMessage: (msg as any).rawMessage, // Preservar rawMessage para procesamiento posterior
        }
      })

    console.log(`📥 Mensajes filtrados: ${filteredMessages.length} de ${dbMessages.length}`)
    setAiMessagesRef.current(filteredMessages)
  }, [])

  // Enviar mensaje optimista
  const sendOptimisticMessage = useCallback((content: string) => {
    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      role: 'user' as const,
      content,
      createdAt: new Date(),
    }

    setAiMessagesRef.current((prev) => [...prev, optimisticMessage])
    console.log('⚡ Mensaje optimista agregado:', tempId)

    return tempId
  }, [])

  // Forzar refresh del sidebar - CON DEBOUNCE para evitar llamadas excesivas
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const forceRefreshRef = useRef<(() => void) | null>(null)

  const forceRefresh = useCallback(() => {
    // Limpiar timeout anterior si existe
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    // Programar actualización con delay para evitar llamadas excesivas
    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshKey((prev) => {
        console.log('🔄 useMessages: forceRefresh incrementando refreshKey de', prev, 'a', prev + 1)
        return prev + 1
      })
    }, 200)
  }, [])

  // Mantener referencia estable para usar en onFinish
  forceRefreshRef.current = forceRefresh
  isLoadingRef.current = isLoading

  return {
    // Estado de mensajes
    messages,
    aiMessages,
    input,
    isLoading,
    error: aiError?.message || null,
    refreshKey,

    // Acciones de mensajes
    handleInputChange,
    aiHandleSubmit,
    reload,
    stop,
    setAiMessages,

    // Funciones de gestión
    saveMessageToDB,
    loadMessagesFromDB,
    sendOptimisticMessage,
    forceRefresh,

    // Utilidades
    extractSimpleContent,
    extractToolNames,
    isToolResponseMessage,
    isProcessingPrompt,
  }
}
