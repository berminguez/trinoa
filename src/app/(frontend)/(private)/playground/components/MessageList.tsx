'use client'

import { IconFileAi } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTranslations, useLocale } from 'next-intl'

// Tipos para los mensajes (compatible con Vercel AI SDK)
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
  toolsUsed?: string[] // Nombres de las herramientas utilizadas
}

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  error?: string | null
  onSuggestedPrompt?: (prompt: string) => void
  onRetryMessage?: (messageId: string) => void
  className?: string
}

// Componente individual de mensaje
function MessageItem({
  message,
  onRetry,
}: {
  message: Message
  onRetry?: (messageId: string) => void
}) {
  const t = useTranslations('playground')
  const locale = useLocale()
  const getStatusColor = () => {
    switch (message.status) {
      case 'sending':
        return 'border-yellow-200 bg-yellow-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'retrying':
        return 'border-blue-200 bg-blue-50'
      default:
        return ''
    }
  }

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return '⏳'
      case 'error':
        return '❌'
      case 'retrying':
        return '🔄'
      case 'sent':
        return '✓'
      default:
        return ''
    }
  }

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
        {/* Message header */}
        <div
          className={`text-xs text-gray-500 mb-2 flex items-center gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <span>
            {message.role === 'user' ? t('you') : t('assistant')} •{' '}
            {message.timestamp.toLocaleTimeString(locale)}
          </span>
          {message.status && (
            <span className='flex items-center gap-1'>
              {getStatusIcon()}
              {message.status === 'sending' && t('sending')}
              {message.status === 'retrying' && t('retrying')}
            </span>
          )}
        </div>

        {/* Message content */}
        <div
          className={`p-3 rounded-lg whitespace-pre-wrap break-words border ${
            message.role === 'user'
              ? `bg-blue-600 text-white ${getStatusColor()}`
              : `bg-gray-100 text-gray-900 ${getStatusColor()}`
          }`}
        >
          {/* Truncar mensajes muy largos con expandir/colapsar */}
          <MessageContent content={message.content} role={message.role} />

          {/* Tool indicator */}
          {message.toolsUsed && message.toolsUsed.length > 0 && (
            <div className='flex justify-end mt-2'>
              <span className='text-xs opacity-60 italic'>
                {t('tool')}: {message.toolsUsed.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Error message y retry button */}
        {message.status === 'error' && message.error && (
          <div className='mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm'>
            <div className='text-red-800 mb-2'>❌ {message.error}</div>
            {onRetry && (
              <button
                onClick={() => onRetry(message.id)}
                className='text-red-600 hover:text-red-800 underline text-xs'
              >
                🔄 {t('retrySend')}
              </button>
            )}
          </div>
        )}

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className='mt-2 space-y-2'>
            {message.sources.map((source, idx) => (
              <div key={idx} className='text-xs bg-blue-50 p-2 rounded border-l-2 border-blue-200'>
                <div className='font-medium text-blue-900'>{source.title}</div>
                <div className='text-blue-700'>{source.excerpt}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Componente de markdown customizado con estilos mejorados para chat
function MarkdownContent({ children }: { children: string }) {
  return (
    <div className='prose prose-gray max-w-none'>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Encabezados - Tamaños más apropiados para chat
          h1: ({ node: _node, ...props }) => (
            <h1
              className='text-lg font-bold text-gray-900 mb-3 mt-4 first:mt-0 leading-tight'
              {...props}
            />
          ),
          h2: ({ node: _node, ...props }) => (
            <h2
              className='text-base font-semibold text-gray-900 mb-2 mt-3 first:mt-0 leading-tight'
              {...props}
            />
          ),
          h3: ({ node: _node, ...props }) => (
            <h3
              className='text-sm font-medium text-gray-800 mb-2 mt-3 first:mt-0 leading-tight'
              {...props}
            />
          ),
          h4: ({ node: _node, ...props }) => (
            <h4 className='text-sm font-medium text-gray-800 mb-1 mt-2 first:mt-0' {...props} />
          ),

          // Párrafos - Mejor espaciado y line-height
          p: ({ node: _node, ...props }) => (
            <p className='text-sm text-gray-900 leading-relaxed mb-3 last:mb-0' {...props} />
          ),

          // Listas - Estilo mejorado con viñetas nativas
          ul: ({ node: _node, ...props }) => (
            <ul
              className='list-disc list-inside mb-3 space-y-1 text-sm text-gray-900 leading-relaxed pl-4'
              {...props}
            />
          ),
          ol: ({ node: _node, ...props }) => (
            <ol
              className='list-decimal list-inside mb-3 space-y-1 text-sm text-gray-900 leading-relaxed pl-4'
              {...props}
            />
          ),
          li: ({ node: _node, ...props }) => (
            <li className='marker:text-blue-600 marker:text-sm' {...props} />
          ),

          // Código - Mejor contraste y estilo
          code: (props) => {
            const isInline = !props.className?.includes('language-')
            return isInline ? (
              <code
                className='bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded text-xs font-mono border'
                {...props}
              />
            ) : (
              <code
                className='block bg-gray-50 text-gray-900 p-3 rounded-md text-xs font-mono whitespace-pre-wrap mb-3 border border-gray-200 leading-relaxed'
                {...props}
              />
            )
          },
          pre: ({ node: _node, ...props }) => (
            <pre
              className='bg-gray-50 text-gray-900 p-3 rounded-md text-xs font-mono whitespace-pre-wrap mb-3 overflow-x-auto border border-gray-200 leading-relaxed'
              {...props}
            />
          ),

          // Enlaces - Mejor estilo
          a: ({ node: _node, ...props }) => (
            <a
              className='text-blue-600 hover:text-blue-800 underline decoration-blue-200 hover:decoration-blue-400 transition-colors'
              target='_blank'
              rel='noopener noreferrer'
              {...props}
            />
          ),

          // Énfasis - Mejor contraste
          strong: ({ node: _node, ...props }) => (
            <strong className='font-semibold text-gray-900' {...props} />
          ),
          em: ({ node: _node, ...props }) => <em className='italic text-gray-700' {...props} />,

          // Citas - Estilo más elegante
          blockquote: ({ node: _node, ...props }) => (
            <blockquote
              className='border-l-4 border-blue-200 bg-blue-50 pl-4 pr-3 py-2 mb-3 italic text-gray-700 text-sm leading-relaxed rounded-r-md'
              {...props}
            />
          ),

          // Divisores
          hr: ({ node: _node, ...props }) => (
            <hr className='border-gray-200 my-4 border-t-2' {...props} />
          ),

          // Tablas - Mejor estilo
          table: ({ node: _node, ...props }) => (
            <div className='overflow-x-auto mb-3 rounded-md border border-gray-200'>
              <table className='min-w-full text-sm' {...props} />
            </div>
          ),
          thead: ({ node: _node, ...props }) => (
            <thead className='bg-gray-50 border-b border-gray-200' {...props} />
          ),
          th: ({ node: _node, ...props }) => (
            <th
              className='px-3 py-2 text-left font-medium text-gray-900 text-xs uppercase tracking-wider'
              {...props}
            />
          ),
          td: ({ node: _node, ...props }) => (
            <td className='px-3 py-2 text-gray-900 text-sm border-t border-gray-100' {...props} />
          ),

          // Elementos adicionales
          img: ({ node: _node, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className='max-w-full h-auto rounded-md mb-3 border border-gray-200'
              alt={props.alt || 'Image from message content'}
              {...props}
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

// Función para detectar si el contenido contiene markdown
function hasMarkdownSyntax(content: string): boolean {
  const markdownPatterns = [
    /^#{1,6}\s/m, // Headers
    /\*\*.*?\*\*/, // Bold
    /\*.*?\*/, // Italic
    /`.*?`/, // Inline code
    /```[\s\S]*?```/, // Code blocks
    /^\s*[-*+]\s/m, // Unordered lists
    /^\s*\d+\.\s/m, // Ordered lists
    /\[.*?\]\(.*?\)/, // Links
    /^\s*>\s/m, // Blockquotes
    /\|.*?\|/, // Tables
  ]

  return markdownPatterns.some((pattern) => pattern.test(content))
}

// Componente para manejar contenido de mensaje largo
function MessageContent({ content, role }: { content: string; role: 'user' | 'assistant' }) {
  const maxLength = 500
  const isLong = content.length > maxLength
  const [isExpanded, setIsExpanded] = useState(false)

  // Solo aplicar markdown a mensajes del asistente que contengan sintaxis markdown
  const shouldRenderMarkdown = role === 'assistant' && hasMarkdownSyntax(content)

  const displayContent = isLong && !isExpanded ? `${content.substring(0, maxLength)}...` : content

  if (!isLong) {
    return shouldRenderMarkdown ? (
      <MarkdownContent>{content}</MarkdownContent>
    ) : (
      <span>{content}</span>
    )
  }

  return (
    <div>
      {shouldRenderMarkdown ? (
        <MarkdownContent>{displayContent}</MarkdownContent>
      ) : (
        <span>{displayContent}</span>
      )}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className='block mt-2 text-xs underline opacity-75 hover:opacity-100'
      >
        {isExpanded ? 'Ver menos' : 'Ver más'}
      </button>
    </div>
  )
}

// Componente de loading indicator
function LoadingIndicator() {
  return (
    <div className='flex justify-start'>
      <div className='max-w-[80%]'>
        <div className='text-xs text-gray-500 mb-2'>Asistente IA está escribiendo...</div>
        <div className='bg-gray-100 p-3 rounded-lg'>
          <div className='flex space-x-1'>
            <div className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'></div>
            <div
              className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'
              style={{ animationDelay: '0.1s' }}
            ></div>
            <div
              className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'
              style={{ animationDelay: '0.2s' }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente principal MessageList
export default function MessageList({
  messages,
  isLoading,
  error,
  onSuggestedPrompt,
  onRetryMessage,
  className = '',
}: MessageListProps) {
  const t = useTranslations('playground')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Scroll automático cuando hay nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      })
    }
  }, [messages, isLoading])

  // Auto-scroll suave cuando aparece el loading
  useEffect(() => {
    if (isLoading && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        })
      }, 100)
    }
  }, [isLoading])

  if (messages.length === 0) {
    return (
      <div className={`flex-1 p-4 overflow-y-auto ${className}`}>
        {/* Empty state */}
        <div className='flex flex-col items-center justify-center h-full text-center'>
          <div className='mb-6'>
            <IconFileAi className='h-16 w-16 text-gray-300 mx-auto mb-4' />
            <h3 className='text-lg font-medium text-gray-900 mb-2'>{t('startConversation')}</h3>
            <p className='text-gray-600 max-w-md'>{t('askQuestions')}</p>
          </div>

          {/* Suggested prompts */}
          {onSuggestedPrompt && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full'>
              <button
                onClick={() => onSuggestedPrompt('¡Hola! ¿Cómo puedes ayudarme hoy?')}
                className='p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200'
              >
                <div className='font-medium text-gray-900 mb-1'>{t('initialGreeting')}</div>
                <div className='text-sm text-gray-600'>{t('startConversationDesc')}</div>
              </button>

              <button
                onClick={() => onSuggestedPrompt('Explícame qué es TRINOA y sus capacidades')}
                className='p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200'
              >
                <div className='font-medium text-gray-900 mb-1'>{t('aboutTrinoa')}</div>
                <div className='text-sm text-gray-600'>{t('aboutTrinoaDesc')}</div>
              </button>

              <button
                onClick={() =>
                  onSuggestedPrompt('¿Qué planes tienes para el futuro con RAG y MCP?')
                }
                className='p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200'
              >
                <div className='font-medium text-gray-900 mb-1'>{t('futurePlans')}</div>
                <div className='text-sm text-gray-600'>{t('futurePlansDesc')}</div>
              </button>

              <button
                onClick={() => onSuggestedPrompt('Ayúdame a crear un plan de proyecto')}
                className='p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200'
              >
                <div className='font-medium text-gray-900 mb-1'>{t('productiveAssistance')}</div>
                <div className='text-sm text-gray-600'>{t('productiveAssistanceDesc')}</div>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div ref={messagesContainerRef} className={`flex-1 p-4 overflow-y-auto ${className}`}>
      {/* Messages list */}
      <div className='space-y-4'>
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} onRetry={onRetryMessage} />
        ))}

        {/* Loading indicator */}
        {isLoading && <LoadingIndicator />}

        {/* Error global indicator */}
        {error && !isLoading && (
          <div className='mt-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
            <div className='text-red-800 text-sm font-medium mb-1'>⚠️ Error de conexión</div>
            <div className='text-red-700 text-xs'>{error}</div>
          </div>
        )}

        {/* Elemento invisible para el scroll */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
