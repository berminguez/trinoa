import { useCallback } from 'react'

interface ToolProcessingOptions {
  extractSimpleContent: (message: any) => string
  extractToolNames: (message: any) => string[]
  isToolResponseMessage: (message: any) => boolean
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  aiHandleSubmit: () => Promise<void>
  saveMessageToDB: (data: any) => Promise<void>
  maybeGenerateTitle: () => Promise<any>
  forceRefresh: () => void
  currentConversation: any
}

export function useToolProcessing(options: ToolProcessingOptions) {
  const {
    extractSimpleContent,
    extractToolNames,
    isToolResponseMessage,
    handleInputChange,
    aiHandleSubmit,
    saveMessageToDB,
    maybeGenerateTitle,
    forceRefresh,
    currentConversation,
  } = options

  // Procesar respuesta de herramienta automáticamente
  const handleToolResponseProcessing = useCallback(
    async (message: any, toolNames: string[]) => {
      try {
        console.log('🔄 Procesando respuesta de herramientas:', toolNames.join(', '))

        const processingPrompt = `Analiza el resultado anterior de la herramienta ${toolNames.join(', ')} y proporciona una respuesta natural y conversacional basada en esa información.`

        console.log('🚀 Enviando prompt de procesamiento automáticamente...')

        // Establecer el prompt y enviarlo
        handleInputChange({
          target: { value: processingPrompt },
        } as React.ChangeEvent<HTMLInputElement>)

        setTimeout(async () => {
          await aiHandleSubmit()
          handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
        }, 100)
      } catch (error) {
        console.error('❌ Error procesando respuesta de herramientas:', error)
      }
    },
    [handleInputChange, aiHandleSubmit],
  )

  // Manejar finalización de mensaje (con herramientas)
  const handleMessageFinish = useCallback(
    async (message: any) => {
      console.log('🤖 onFinish ejecutado:', message.id)

      if (!currentConversation) {
        console.warn('⚠️ No hay conversación actual')
        return
      }

      // Extraer contenido y herramientas
      const simpleContent = extractSimpleContent(message)
      const toolNames = extractToolNames(message)
      const hasToolResults = toolNames.length > 0
      const hasNaturalText =
        simpleContent && !simpleContent.trim().startsWith('{') && !simpleContent.includes('"query"')

      console.log('🔍 Análisis del mensaje:', {
        hasToolResults,
        hasNaturalText,
        simpleContent: simpleContent.substring(0, 100),
        toolNames,
      })

      // Guardar mensaje en BD
      await saveMessageToDB({
        conversationId: currentConversation.id,
        role: 'assistant',
        content: simpleContent,
        rawMessage: message,
        metadata: {
          model: 'gpt-4o-mini',
          ragUsed: false,
          messageType: hasToolResults && !hasNaturalText ? 'tool-response' : 'natural-response',
          version: '1.0',
          toolNames: toolNames,
        },
      })

      // Si es respuesta de herramienta sin texto natural, procesar automáticamente
      if (hasToolResults && !hasNaturalText) {
        console.log('🔧 Detectada respuesta de herramienta pura, procesando...')

        setTimeout(() => {
          handleToolResponseProcessing(message, toolNames)
        }, 100)

        return // No generar título para respuestas de herramientas
      }

      // Si es respuesta natural, intentar generar título si es necesario
      await maybeGenerateTitle()

      // Refresh sidebar
      forceRefresh()
    },
    [
      currentConversation,
      extractSimpleContent,
      extractToolNames,
      saveMessageToDB,
      handleToolResponseProcessing,
      maybeGenerateTitle,
      forceRefresh,
    ],
  )

  return {
    handleMessageFinish,
    handleToolResponseProcessing,
  }
}
