'use server'

import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'

import config from '@/payload.config'

import { getCurrentUser } from '../auth/getUser'

import type { Conversation, Message } from '@/payload-types'

// Tipos para las respuestas de los server actions
export interface ConversationResponse {
  success: boolean
  conversation?: Conversation
  error?: string
}

export interface ConversationsListResponse {
  success: boolean
  conversations?: Conversation[]
  totalPages?: number
  error?: string
}

export interface ConversationWithMessagesResponse {
  success: boolean
  conversation?: Conversation
  messages?: Message[]
  error?: string
}

export interface GenerateTitleResponse {
  success: boolean
  title?: string
  error?: string
}

/**
 * Server action para generar título de conversación basado en el primer mensaje
 */
export async function generateConversationTitle(
  firstMessage: string,
): Promise<GenerateTitleResponse> {
  try {
    // Validar que hay mensaje
    if (!firstMessage || firstMessage.trim().length === 0) {
      return {
        success: false,
        error: 'No se proporcionó mensaje para generar título',
      }
    }

    // Validar clave de OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY no está configurada')
      return {
        success: false,
        error: 'Configuración de OpenAI no disponible',
      }
    }

    // Crear prompt específico para generar títulos
    const systemMessage = {
      role: 'system' as const,
      content: `Eres un asistente que genera títulos concisos y descriptivos para conversaciones.

Instrucciones:
- Genera un título corto (máximo 5-7 palabras) basado en el primer mensaje del usuario
- El título debe ser descriptivo y dar una idea del tema principal
- Usa español
- No uses comillas, puntos ni caracteres especiales
- Ejemplos:
  * "¿Cómo hacer una pizza?" → "Receta para hacer pizza"
  * "Necesito ayuda con Python" → "Ayuda con programación Python"
  * "Explícame qué es la IA" → "Explicación sobre inteligencia artificial"

Responde SOLO con el título, sin texto adicional.`,
    }

    const userMessage = {
      role: 'user' as const,
      content: firstMessage.trim(),
    }

    // Generar título usando OpenAI
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: [systemMessage, userMessage],
      temperature: 0.3, // Menos creatividad para títulos más consistentes
      maxTokens: 50, // Títulos cortos
    })

    // Obtener el resultado completo
    let title = ''
    const reader = result.textStream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) title += value
    }

    // Limpiar el título
    title = title.trim().replace(/['"]/g, '').substring(0, 80) // Máximo 80 caracteres

    if (!title) {
      return {
        success: false,
        error: 'No se pudo generar título',
      }
    }

    return {
      success: true,
      title,
    }
  } catch (error) {
    console.error('Error generando título:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Crear una nueva conversación para el usuario autenticado
 */
export async function createConversation(title?: string): Promise<ConversationResponse> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    const payload = await getPayload({ config })

    // Generar título automático si no se proporciona
    const conversationTitle =
      title || `Nueva conversación ${new Date().toLocaleDateString('es-ES')}`

    const conversation = await payload.create({
      collection: 'conversations',
      data: {
        title: conversationTitle,
        user: user.id,
        isActive: true,
        messageCount: 0,
      },
    })

    revalidatePath('/playground')

    return {
      success: true,
      conversation: conversation as Conversation,
    }
  } catch (error) {
    console.error('Error creando conversación:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Obtener todas las conversaciones del usuario autenticado
 */
export async function getConversations(
  page: number = 1,
  limit: number = 20,
): Promise<ConversationsListResponse> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'conversations',
      where: {
        user: {
          equals: user.id,
        },
      },
      sort: '-lastMessageAt,-createdAt', // Ordenar por último mensaje, luego por creación
      page,
      limit,
    })

    return {
      success: true,
      conversations: result.docs as Conversation[],
      totalPages: result.totalPages,
    }
  } catch (error) {
    console.error('Error obteniendo conversaciones:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Obtener una conversación específica con sus mensajes
 */
export async function getConversationWithMessages(
  conversationId: string,
  messagesPage: number = 1,
  messagesLimit: number = 50,
): Promise<ConversationWithMessagesResponse> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    const payload = await getPayload({ config })

    // Obtener la conversación y verificar que pertenece al usuario
    const conversation = await payload.findByID({
      collection: 'conversations',
      id: conversationId,
    })

    // Verificar permisos - que la conversación pertenezca al usuario
    const conversationUserId =
      typeof conversation.user === 'object' ? conversation.user.id : conversation.user

    if (conversationUserId !== user.id && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para acceder a esta conversación',
      }
    }

    // Obtener los mensajes de la conversación
    const messagesResult = await payload.find({
      collection: 'messages',
      where: {
        conversation: {
          equals: conversationId,
        },
      },
      sort: 'createdAt', // Ordenar cronológicamente
      page: messagesPage,
      limit: messagesLimit,
    })

    return {
      success: true,
      conversation: conversation as Conversation,
      messages: messagesResult.docs as Message[],
    }
  } catch (error) {
    console.error('Error obteniendo conversación:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Actualizar metadatos de una conversación
 */
export async function updateConversation(
  conversationId: string,
  updates: {
    title?: string
    isActive?: boolean
  },
): Promise<ConversationResponse> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    const payload = await getPayload({ config })

    // Verificar que la conversación pertenece al usuario
    const existingConversation = await payload.findByID({
      collection: 'conversations',
      id: conversationId,
    })

    const conversationUserId =
      typeof existingConversation.user === 'object'
        ? existingConversation.user.id
        : existingConversation.user

    if (conversationUserId !== user.id && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para modificar esta conversación',
      }
    }

    // Actualizar la conversación
    const updatedConversation = await payload.update({
      collection: 'conversations',
      id: conversationId,
      data: updates,
    })

    revalidatePath('/playground')

    return {
      success: true,
      conversation: updatedConversation as Conversation,
    }
  } catch (error) {
    console.error('Error actualizando conversación:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Archivar/desarchivar una conversación
 */
export async function toggleArchiveConversation(
  conversationId: string,
  isActive: boolean = false,
): Promise<ConversationResponse> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    const payload = await getPayload({ config })

    // Verificar que la conversación existe y pertenece al usuario
    const existingConversation = await payload.findByID({
      collection: 'conversations',
      id: conversationId,
    })

    const conversationUserId =
      typeof existingConversation.user === 'object'
        ? existingConversation.user.id
        : existingConversation.user

    if (conversationUserId !== user.id && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para modificar esta conversación',
      }
    }

    // Actualizar el estado de la conversación
    const updatedConversation = await payload.update({
      collection: 'conversations',
      id: conversationId,
      data: {
        isActive,
      },
    })

    revalidatePath('/playground')

    return {
      success: true,
      conversation: updatedConversation as Conversation,
    }
  } catch (error) {
    console.error('Error archivando conversación:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Eliminar una conversación y todos sus mensajes
 */
export async function deleteConversation(
  conversationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    const payload = await getPayload({ config })

    // Verificar que la conversación pertenece al usuario
    const existingConversation = await payload.findByID({
      collection: 'conversations',
      id: conversationId,
    })

    const conversationUserId =
      typeof existingConversation.user === 'object'
        ? existingConversation.user.id
        : existingConversation.user

    if (conversationUserId !== user.id && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para eliminar esta conversación',
      }
    }

    // Eliminar todos los mensajes de la conversación
    const messagesResult = await payload.find({
      collection: 'messages',
      where: {
        conversation: {
          equals: conversationId,
        },
      },
      limit: 1000, // Obtener todos los mensajes
    })

    // Eliminar mensajes en lotes
    for (const message of messagesResult.docs) {
      await payload.delete({
        collection: 'messages',
        id: message.id,
      })
    }

    // Eliminar la conversación
    await payload.delete({
      collection: 'conversations',
      id: conversationId,
    })

    revalidatePath('/playground')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error eliminando conversación:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}
