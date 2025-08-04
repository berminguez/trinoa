// Helper functions para renderizar mensajes desde rawMessage JSON

export interface RenderableMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  hasTools: boolean
  toolCalls?: Array<{
    name: string
    args: any
    result?: any
  }>
  sources?: Array<{
    title: string
    excerpt: string
  }>
  status?: 'sending' | 'sent' | 'error'
}

/**
 * Convierte un mensaje de la base de datos a formato renderizable
 */
export function renderMessage(dbMessage: any): RenderableMessage {
  const message: RenderableMessage = {
    id: dbMessage.id,
    role: dbMessage.role,
    content: '',
    timestamp: new Date(dbMessage.createdAt),
    hasTools: false,
    status: 'sent',
  }

  // Si hay rawMessage (mensaje del AI SDK), procesarlo
  if (dbMessage.rawMessage) {
    const processed = processAISDKMessage(dbMessage.rawMessage)
    message.content = processed.content
    message.hasTools = processed.hasTools
    message.toolCalls = processed.toolCalls
  }
  // Fallback al content legacy
  else if (dbMessage.content) {
    message.content = dbMessage.content
  }

  // Agregar sources si existen
  if (dbMessage.sources && Array.isArray(dbMessage.sources)) {
    message.sources = dbMessage.sources.map((source: any) => ({
      title: source.title || '',
      excerpt: source.excerpt || '',
    }))
  }

  return message
}

/**
 * Procesa un mensaje del AI SDK (con tool calls) para renderizado
 */
function processAISDKMessage(aiMessage: any) {
  let content = ''
  let hasTools = false
  const toolCalls: Array<{ name: string; args: any; result?: any }> = []

  // Si hay texto directo, usarlo
  if (aiMessage.content && typeof aiMessage.content === 'string') {
    content = aiMessage.content
  }

  // Procesar parts si existen
  if (aiMessage.parts && Array.isArray(aiMessage.parts)) {
    const textParts: string[] = []

    for (const part of aiMessage.parts) {
      switch (part.type) {
        case 'text':
          if (part.text) {
            textParts.push(part.text)
          }
          break

        case 'tool-invocation':
        case 'tool-call':
          hasTools = true
          toolCalls.push({
            name: part.toolName || part.toolInvocation?.toolName || 'herramienta-desconocida',
            args: part.args || part.toolInvocation?.args || {},
          })
          break

        case 'tool-result':
          hasTools = true
          // Buscar el tool call correspondiente y agregar resultado
          const existingTool = toolCalls.find((tool) => tool.name === part.toolName)
          if (existingTool) {
            existingTool.result = part.result
          }
          break
      }
    }

    // Unir partes de texto
    if (textParts.length > 0) {
      content = textParts.join('\n')
    }
  }

  // Si no hay contenido de texto pero hay herramientas, crear descripción
  if (!content && hasTools && toolCalls.length > 0) {
    const toolNames = toolCalls.map((tool) => tool.name).join(', ')
    content = `He utilizado las siguientes herramientas: ${toolNames}`

    // Agregar resultados si existen
    const resultsText = toolCalls
      .filter((tool) => tool.result)
      .map((tool) => `${tool.name}: ${JSON.stringify(tool.result)}`)
      .join('\n')

    if (resultsText) {
      content += `\n\nResultados:\n${resultsText}`
    }
  }

  return {
    content: content || '[Mensaje sin contenido]',
    hasTools,
    toolCalls,
  }
}

/**
 * Renderiza tool calls de forma legible
 */
export function renderToolCalls(
  toolCalls: Array<{ name: string; args: any; result?: any }>,
): string {
  if (!toolCalls || toolCalls.length === 0) {
    return ''
  }

  return toolCalls
    .map((tool) => {
      let text = `🔧 **${tool.name}**`

      // Mostrar argumentos si existen
      if (tool.args && Object.keys(tool.args).length > 0) {
        const argsText = Object.entries(tool.args)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join(', ')
        text += `\n  📝 Argumentos: ${argsText}`
      }

      // Mostrar resultado si existe
      if (tool.result) {
        text += `\n  ✅ Resultado: ${JSON.stringify(tool.result)}`
      }

      return text
    })
    .join('\n\n')
}

/**
 * Obtiene un resumen simple del mensaje para mostrar en listas
 */
export function getMessageSummary(dbMessage: any, maxLength: number = 100): string {
  const rendered = renderMessage(dbMessage)

  let summary = rendered.content

  if (rendered.hasTools && rendered.toolCalls) {
    const toolNames = rendered.toolCalls.map((tool) => tool.name).join(', ')
    summary = `[${toolNames}] ${summary}`
  }

  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength) + '...'
  }

  return summary
}
