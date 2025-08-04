import type { CollectionConfig } from 'payload'

export const Messages: CollectionConfig = {
  slug: 'messages',
  admin: {
    useAsTitle: 'content',
    defaultColumns: ['role', 'conversation', 'createdAt'],
    description: 'Mensajes individuales de las conversaciones del chat IA',
    listSearchableFields: ['content'],
  },
  access: {
    // Simplificado hasta regenerar tipos de PayloadCMS
    read: ({ req: { user } }) => Boolean(user), // Solo usuarios autenticados
    create: ({ req: { user } }) => Boolean(user), // Solo usuarios autenticados
    update: ({ req: { user } }) => Boolean(user), // Solo usuarios autenticados
    delete: ({ req: { user } }) => Boolean(user), // Solo usuarios autenticados
  },
  fields: [
    {
      name: 'conversation',
      type: 'relationship',
      relationTo: 'conversations' as any,
      label: 'Conversación',
      required: true,
      admin: {
        description: 'Conversación a la que pertenece este mensaje',
      },
    },
    {
      name: 'role',
      type: 'select',
      label: 'Rol del mensaje',
      required: true,
      options: [
        {
          label: 'Usuario',
          value: 'user',
        },
        {
          label: 'Asistente IA',
          value: 'assistant',
        },
      ],
      admin: {
        description: 'Indica si el mensaje es del usuario o del asistente IA',
      },
    },
    {
      name: 'content',
      type: 'textarea',
      label: 'Contenido del mensaje (legacy)',
      required: false,
      admin: {
        description: 'Texto simple del mensaje (para compatibilidad)',
        rows: 4,
      },
    },
    {
      name: 'rawMessage',
      type: 'json',
      label: 'Mensaje completo (JSON)',
      admin: {
        description: 'Mensaje completo del AI SDK con tool calls, parts, etc.',
      },
    },
    {
      name: 'sources',
      type: 'array',
      label: 'Fuentes RAG',
      admin: {
        description:
          'Referencias a documentos/recursos utilizados para generar la respuesta (solo para mensajes del asistente)',
      },
      fields: [
        {
          name: 'resourceId',
          type: 'text',
          label: 'ID del recurso',
          admin: {
            description: 'Identificador del documento o recurso referenciado',
          },
        },
        {
          name: 'title',
          type: 'text',
          label: 'Título del recurso',
          admin: {
            description: 'Título o nombre del documento referenciado',
          },
        },
        {
          name: 'excerpt',
          type: 'textarea',
          label: 'Extracto relevante',
          admin: {
            description: 'Fragmento del documento que fue relevante para la respuesta',
            rows: 2,
          },
        },
        {
          name: 'relevanceScore',
          type: 'number',
          label: 'Puntuación de relevancia',
          admin: {
            description: 'Puntuación de similitud del embedding (0-1)',
            step: 0.001,
          },
          min: 0,
          max: 1,
        },
      ],
    },
    {
      name: 'metadata',
      type: 'group',
      label: 'Metadatos del mensaje',
      admin: {
        description: 'Información adicional sobre el procesamiento del mensaje',
      },
      fields: [
        {
          name: 'tokens',
          type: 'number',
          label: 'Tokens utilizados',
          admin: {
            description:
              'Número de tokens utilizados para generar este mensaje (solo para asistente)',
            readOnly: true,
          },
        },
        {
          name: 'model',
          type: 'text',
          label: 'Modelo utilizado',
          admin: {
            description: 'Modelo de IA utilizado para generar la respuesta (ej: gpt-4)',
            readOnly: true,
          },
        },
        {
          name: 'processingTime',
          type: 'number',
          label: 'Tiempo de procesamiento (ms)',
          admin: {
            description: 'Tiempo en milisegundos que tomó generar la respuesta',
            readOnly: true,
          },
        },
        {
          name: 'ragUsed',
          type: 'checkbox',
          label: 'RAG utilizado',
          admin: {
            description: 'Indica si se utilizó búsqueda RAG para generar esta respuesta',
            readOnly: true,
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          // Actualizar contador de mensajes y fecha del último mensaje en la conversación
          const conversationId =
            typeof doc.conversation === 'object' ? doc.conversation.id : doc.conversation

          try {
            // Contar mensajes totales de la conversación
            const messagesResult = await req.payload.find({
              collection: 'messages',
              where: {
                conversation: {
                  equals: conversationId,
                },
              },
              limit: 1, // Solo necesitamos el count
            })

            // Actualizar la conversación con el nuevo contador y fecha
            await req.payload.update({
              collection: 'conversations',
              id: conversationId,
              data: {
                messageCount: messagesResult.totalDocs,
                lastMessageAt: doc.createdAt,
              },
            })
          } catch (error) {
            console.error('Error actualizando metadatos de conversación:', error)
          }
        }
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        // Actualizar contador cuando se elimina un mensaje
        const conversationId =
          typeof doc.conversation === 'object' ? doc.conversation.id : doc.conversation

        try {
          // Contar mensajes restantes
          const messagesResult = await req.payload.find({
            collection: 'messages',
            where: {
              conversation: {
                equals: conversationId,
              },
            },
            limit: 1,
          })

          // Obtener el último mensaje para actualizar la fecha
          const lastMessageResult = await req.payload.find({
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
            lastMessageResult.docs.length > 0 ? lastMessageResult.docs[0].createdAt : null

          // Actualizar la conversación
          await req.payload.update({
            collection: 'conversations',
            id: conversationId,
            data: {
              messageCount: messagesResult.totalDocs,
              ...(lastMessageAt && { lastMessageAt }),
            },
          })
        } catch (error) {
          console.error('Error actualizando metadatos tras eliminar mensaje:', error)
        }
      },
    ],
  },
  timestamps: true, // Añade automáticamente createdAt y updatedAt
}
