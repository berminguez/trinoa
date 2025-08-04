import type { CollectionConfig } from 'payload'

export const Conversations: CollectionConfig = {
  slug: 'conversations',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'user', 'createdAt'],
    description: 'Conversaciones del chat IA con los usuarios',
  },
  access: {
    // Solo el usuario propietario puede ver sus conversaciones
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') {
        return true // Admin puede ver todas las conversaciones
      }

      return {
        user: {
          equals: user?.id,
        },
      }
    },
    create: ({ req: { user } }) => Boolean(user), // Solo usuarios autenticados
    update: ({ req: { user } }) => {
      if (user?.role === 'admin') {
        return true
      }

      return {
        user: {
          equals: user?.id,
        },
      }
    },
    delete: ({ req: { user } }) => {
      if (user?.role === 'admin') {
        return true
      }

      return {
        user: {
          equals: user?.id,
        },
      }
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Título de la conversación',
      required: true,
      maxLength: 100,
      admin: {
        description:
          'Título descriptivo de la conversación (generado automáticamente o personalizado)',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'Usuario',
      required: true,
      admin: {
        description: 'Usuario propietario de esta conversación',
      },
      // Valor por defecto del usuario actual
      defaultValue: ({ user }) => user?.id,
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Conversación activa',
      defaultValue: true,
      admin: {
        description: 'Indica si la conversación está activa o archivada',
      },
    },
    {
      name: 'messageCount',
      type: 'number',
      label: 'Número de mensajes',
      defaultValue: 0,
      admin: {
        description: 'Contador de mensajes en esta conversación (actualizado automáticamente)',
        readOnly: true,
      },
    },
    {
      name: 'lastMessageAt',
      type: 'date',
      label: 'Último mensaje',
      admin: {
        description: 'Fecha del último mensaje en esta conversación',
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        // Asegurar que el usuario esté asociado si no se proporciona
        if (!data.user && req.user) {
          data.user = req.user.id
        }

        // Generar título automático si no se proporciona
        if (!data.title) {
          const now = new Date()
          data.title = `Conversación ${now.toLocaleDateString('es-ES')} ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
        }

        return data
      },
    ],
  },
  timestamps: true, // Añade automáticamente createdAt y updatedAt
}
