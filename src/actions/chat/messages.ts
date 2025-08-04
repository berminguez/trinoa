'use server'

import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'

import config from '@/payload.config'

import { getCurrentUser } from '../auth/getUser'

import type { Conversation, Message } from '@/payload-types'

// Tipos para las respuestas de los server actions
export interface MessageResponse {
  success: boolean
  message?: Message
  error?: string
}

export interface MessagesListResponse {
  success: boolean
  messages?: Message[]
  totalPages?: number
  error?: string
}

export interface CreateMessageData {
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  rawMessage?: Record<string, unknown> // Mensaje completo del AI SDK como JSON
  sources?: Array<{
    resourceId?: string
    title?: string
    excerpt?: string
    relevanceScore?: number
  }>
  metadata?: {
    tokens?: number
    model?: string
    processingTime?: number
    ragUsed?: boolean
    messageType?: string
    version?: string
    [key: string]: unknown
  }
}

/**
 * Crear un nuevo mensaje en una conversación
 */
export async function createMessage(data: CreateMessageData): Promise<MessageResponse> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    const payload = await getPayload({ config })

    console.log('💾 Datos brutos del mensaje a crear:', data)

    console.log('💾 Datos del mensaje a crear:', {
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      contentType: typeof data.content,
      contentLength: data.content?.length,
      hasContent: Boolean(data.content),
    })

    // Verificar que la conversación existe y pertenece al usuario
    const conversation = await payload.findByID({
      collection: 'conversations',
      id: data.conversationId,
    })

    const conversationUserId =
      typeof conversation.user === 'object' ? conversation.user.id : conversation.user

    if (conversationUserId !== user.id && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para enviar mensajes a esta conversación',
      }
    }

    // Crear el mensaje
    const message = await payload.create({
      collection: 'messages',
      data: {
        conversation: data.conversationId,
        role: data.role,
        content: data.content,
        rawMessage: data.rawMessage || null,
        sources: data.sources || [],
        metadata: data.metadata || {},
      },
    })

    // Actualizar metadatos de la conversación
    await updateConversationMetadata(data.conversationId, payload)

    revalidatePath('/playground')

    return {
      success: true,
      message: message as Message,
    }
  } catch (error) {
    console.error('Error creando mensaje:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Obtener mensajes de una conversación
 */
export async function getMessages(
  conversationId: string,
  page: number = 1,
  limit: number = 50,
): Promise<MessagesListResponse> {
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
    const conversation = await payload.findByID({
      collection: 'conversations',
      id: conversationId,
    })

    const conversationUserId =
      typeof conversation.user === 'object' ? conversation.user.id : conversation.user

    if (conversationUserId !== user.id && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para acceder a esta conversación',
      }
    }

    // Obtener los mensajes
    const result = await payload.find({
      collection: 'messages',
      where: {
        conversation: {
          equals: conversationId,
        },
      },
      sort: 'createdAt', // Ordenar cronológicamente
      page,
      limit,
    })

    return {
      success: true,
      messages: result.docs as Message[],
      totalPages: result.totalPages,
    }
  } catch (error) {
    console.error('Error obteniendo mensajes:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Actualizar un mensaje existente
 */
export async function updateMessage(
  messageId: string,
  updates: {
    content?: string
    sources?: Array<{
      resourceId?: string
      title?: string
      excerpt?: string
      relevanceScore?: number
    }>
    metadata?: {
      tokens?: number
      model?: string
      processingTime?: number
      ragUsed?: boolean
    }
  },
): Promise<MessageResponse> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      }
    }

    const payload = await getPayload({ config })

    // Obtener el mensaje y verificar permisos
    const existingMessage = await payload.findByID({
      collection: 'messages',
      id: messageId,
    })

    // Verificar que la conversación pertenece al usuario
    const conversationId =
      typeof existingMessage.conversation === 'object'
        ? existingMessage.conversation.id
        : existingMessage.conversation

    const conversation = await payload.findByID({
      collection: 'conversations',
      id: conversationId,
    })

    const conversationUserId =
      typeof conversation.user === 'object' ? conversation.user.id : conversation.user

    if (conversationUserId !== user.id && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para modificar este mensaje',
      }
    }

    // Actualizar el mensaje
    const updatedMessage = await payload.update({
      collection: 'messages',
      id: messageId,
      data: updates,
    })

    revalidatePath('/playground')

    return {
      success: true,
      message: updatedMessage as Message,
    }
  } catch (error) {
    console.error('Error actualizando mensaje:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Eliminar un mensaje
 */
export async function deleteMessage(
  messageId: string,
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

    // Obtener el mensaje y verificar permisos
    const existingMessage = await payload.findByID({
      collection: 'messages',
      id: messageId,
    })

    const conversationId =
      typeof existingMessage.conversation === 'object'
        ? existingMessage.conversation.id
        : existingMessage.conversation

    const conversation = await payload.findByID({
      collection: 'conversations',
      id: conversationId,
    })

    const conversationUserId =
      typeof conversation.user === 'object' ? conversation.user.id : conversation.user

    if (conversationUserId !== user.id && user.role !== 'admin') {
      return {
        success: false,
        error: 'No tienes permisos para eliminar este mensaje',
      }
    }

    // Eliminar el mensaje
    await payload.delete({
      collection: 'messages',
      id: messageId,
    })

    // Actualizar metadatos de la conversación
    await updateConversationMetadata(conversationId, payload)

    revalidatePath('/playground')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error eliminando mensaje:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/**
 * Función utilitaria para actualizar metadatos de conversación
 */
async function updateConversationMetadata(
  conversationId: string,
  payloadInstance: Awaited<ReturnType<typeof getPayload>>,
): Promise<void> {
  try {
    // Contar mensajes de la conversación
    const messagesResult = await payloadInstance.find({
      collection: 'messages',
      where: {
        conversation: {
          equals: conversationId,
        },
      },
      limit: 1, // Solo necesitamos el count
    })

    // Obtener el último mensaje
    const lastMessageResult = await payloadInstance.find({
      collection: 'messages',
      where: {
        conversation: {
          equals: conversationId,
        },
      },
      sort: '-createdAt',
      limit: 1,
    })

    const lastMessageAt =
      lastMessageResult.docs.length > 0
        ? new Date(lastMessageResult.docs[0].createdAt).toISOString()
        : new Date().toISOString()

    // Actualizar la conversación
    await payloadInstance.update({
      collection: 'conversations',
      id: conversationId,
      data: {
        messageCount: messagesResult.totalDocs,
        lastMessageAt,
      },
    })
  } catch (error) {
    console.error('Error actualizando metadatos de conversación:', error)
  }
}
