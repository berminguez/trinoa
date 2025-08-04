'use client'

import { useState, useRef, useEffect } from 'react'

import { IconSend, IconPaperclip, IconMicrophone } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  minRows?: number
  maxRows?: number
  showAttachments?: boolean
  showVoice?: boolean
  className?: string
}

// Componente principal MessageInput
export default function MessageInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = 'Escribe tu mensaje aquí...',
  disabled = false,
  maxLength = 4000,
  minRows = 1,
  maxRows = 6,
  showAttachments = false,
  showVoice = false,
  className = '',
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [rows, setRows] = useState(minRows)

  // Auto-resize del textarea
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current

      // Resetear height para medir correctamente
      textarea.style.height = 'auto'

      // Calcular filas necesarias
      const lineHeight = 24 // aproximadamente 1.5rem
      const padding = 16 // padding vertical
      const scrollHeight = textarea.scrollHeight - padding
      const newRows = Math.min(Math.max(Math.ceil(scrollHeight / lineHeight), minRows), maxRows)

      setRows(newRows)
      textarea.style.height = `${newRows * lineHeight + padding}px`
    }
  }, [value, minRows, maxRows])

  // Validaciones
  const trimmedValue = value.trim()
  const isValid = trimmedValue.length > 0 && trimmedValue.length <= maxLength
  const characterCount = value.length
  const isNearLimit = characterCount > maxLength * 0.8
  const isOverLimit = characterCount > maxLength

  // Manejar envío
  const handleSubmit = () => {
    console.log('🔥 MessageInput.handleSubmit ejecutado:', {
      isValid,
      isLoading,
      disabled,
      trimmedValue,
      willCall: isValid && !isLoading && !disabled,
    })

    if (isValid && !isLoading && !disabled) {
      console.log('✅ MessageInput llamando a onSubmit')
      onSubmit()
    } else {
      console.log('❌ MessageInput NO llama a onSubmit por condiciones')
    }
  }

  // Manejar teclas
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift + Enter = nueva línea (comportamiento por defecto)
        return
      } else {
        // Enter = enviar mensaje
        e.preventDefault()
        handleSubmit()
      }
    }
  }

  // Manejar cambio de texto
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value

    // Permitir escribir pero advertir cuando supere el límite
    onChange(newValue)
  }

  // Manejar paste para validar contenido
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text')
    const newValue = value + pastedText

    if (newValue.length > maxLength) {
      e.preventDefault()

      // Truncar el texto pegado para que quepa
      const remainingSpace = maxLength - value.length
      const truncatedPaste = pastedText.substring(0, remainingSpace)
      onChange(value + truncatedPaste)
    }
  }

  return (
    <div className={`border-t border-gray-200 p-4 ${className}`}>
      <div className='flex gap-3'>
        {/* Botón de adjuntos (opcional) */}
        {showAttachments && (
          <Button variant='ghost' size='sm' className='self-end mb-1'>
            <IconPaperclip className='h-4 w-4' />
          </Button>
        )}

        {/* Input principal */}
        <div className='flex-1 relative'>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled || isLoading}
            className={`
              w-full px-4 py-2 border border-gray-300 rounded-lg resize-none 
              focus:ring-2 focus:ring-blue-500 focus:border-transparent 
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              ${isOverLimit ? 'border-red-500 focus:ring-red-500' : ''}
              ${isNearLimit && !isOverLimit ? 'border-yellow-500 focus:ring-yellow-500' : ''}
            `}
            style={{
              minHeight: `${minRows * 24 + 16}px`,
              maxHeight: `${maxRows * 24 + 16}px`,
            }}
          />

          {/* Contador de caracteres */}
          {(isNearLimit || isOverLimit) && (
            <div
              className={`absolute -top-6 right-0 text-xs ${
                isOverLimit ? 'text-red-500' : 'text-yellow-600'
              }`}
            >
              {characterCount}/{maxLength}
            </div>
          )}
        </div>

        {/* Botón de voz (opcional) */}
        {showVoice && (
          <Button variant='ghost' size='sm' className='self-end mb-1'>
            <IconMicrophone className='h-4 w-4' />
          </Button>
        )}

        {/* Botón de envío */}
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isLoading || disabled || isOverLimit}
          className='px-4 py-2 self-end'
          size='sm'
        >
          <IconSend className='h-4 w-4' />
        </Button>
      </div>

      {/* Información adicional */}
      <div className='flex items-center justify-between mt-2 text-xs text-gray-500'>
        <span>
          {isLoading
            ? '✨ Generando respuesta...'
            : '✨ RAG habilitado - Shift+Enter para nueva línea'}
        </span>
        <span>
          {isLoading
            ? 'Procesando...'
            : isOverLimit
              ? 'Mensaje muy largo'
              : !isValid && trimmedValue.length === 0
                ? 'Escribe algo para enviar'
                : 'Enter para enviar'}
        </span>
      </div>
    </div>
  )
}
