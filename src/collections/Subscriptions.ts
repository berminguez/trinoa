import type { CollectionConfig } from 'payload'

export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  admin: {
    useAsTitle: 'planName',
    defaultColumns: ['user', 'planName', 'status', 'updatedAt'],
    description: 'Gestión de suscripciones de usuarios con Stripe',
  },
  access: {
    // Solo admins pueden gestionar suscripciones directamente
    create: ({ req: { user } }) => user?.role === 'admin',
    read: ({ req: { user } }) => {
      // Los usuarios pueden ver solo sus propias suscripciones
      if (user?.role === 'admin') return true
      return {
        user: {
          equals: user?.id,
        },
      }
    },
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Usuario propietario de la suscripción',
      },
    },
    {
      name: 'planId',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Free',
          value: 'free',
        },
        {
          label: 'Basic',
          value: 'basic',
        },
        {
          label: 'Pro',
          value: 'pro',
        },
      ],
      admin: {
        description: 'Identificador del plan de suscripción',
      },
    },
    {
      name: 'planName',
      type: 'text',
      required: true,
      admin: {
        description: 'Nombre del plan para mostrar al usuario',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Activa',
          value: 'active',
        },
        {
          label: 'Inactiva',
          value: 'inactive',
        },
        {
          label: 'Cancelada',
          value: 'canceled',
        },
        {
          label: 'Vencida',
          value: 'past_due',
        },
        {
          label: 'En período de gracia',
          value: 'unpaid',
        },
      ],
      defaultValue: 'active',
      admin: {
        description: 'Estado actual de la suscripción',
      },
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
      admin: {
        description: 'ID del customer en Stripe',
        readOnly: true,
      },
    },
    {
      name: 'stripeSubscriptionId',
      type: 'text',
      admin: {
        description: 'ID de la suscripción en Stripe (null para plan gratuito)',
        readOnly: true,
      },
    },
    {
      name: 'stripePriceId',
      type: 'text',
      admin: {
        description: 'ID del precio en Stripe',
        readOnly: true,
      },
    },
    {
      name: 'currentPeriodStart',
      type: 'date',
      admin: {
        description: 'Inicio del período actual de facturación',
      },
    },
    {
      name: 'currentPeriodEnd',
      type: 'date',
      admin: {
        description: 'Fin del período actual de facturación',
      },
    },
    {
      name: 'cancelAtPeriodEnd',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Si la suscripción se cancelará al final del período',
      },
    },
    // Límites de uso del plan
    {
      name: 'limits',
      type: 'group',
      admin: {
        description: 'Límites del plan actual',
      },
      fields: [
        {
          name: 'videosPerMonth',
          type: 'number',
          defaultValue: 3,
          admin: {
            description: 'Límite de videos por mes (-1 = ilimitado)',
          },
        },
        {
          name: 'messagesPerMonth',
          type: 'number',
          defaultValue: 50,
          admin: {
            description: 'Límite de mensajes de chat por mes (-1 = ilimitado)',
          },
        },
        {
          name: 'storageGB',
          type: 'number',
          defaultValue: 1,
          admin: {
            description: 'Límite de almacenamiento en GB',
          },
        },
      ],
    },
    // Uso actual del mes
    {
      name: 'currentUsage',
      type: 'group',
      admin: {
        description: 'Uso actual del período de facturación',
      },
      fields: [
        {
          name: 'videosProcessed',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Videos procesados en el período actual',
          },
        },
        {
          name: 'messagesUsed',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Mensajes de chat utilizados en el período actual',
          },
        },
        {
          name: 'storageUsedGB',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Almacenamiento utilizado en GB',
          },
        },
        {
          name: 'lastResetDate',
          type: 'date',
          admin: {
            description: 'Última fecha de reset de contadores',
          },
        },
      ],
    },
    // Configuración de facturación variable
    {
      name: 'variableBilling',
      type: 'group',
      admin: {
        description: 'Configuración para facturación por uso adicional (solo Pro)',
        condition: (data) => data.planId === 'pro',
      },
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Habilitar facturación por uso adicional',
          },
        },
        {
          name: 'extraVideosCost',
          type: 'number',
          defaultValue: 0.5,
          admin: {
            description: 'Costo por video adicional procesado',
          },
        },
        {
          name: 'extraStorageCostPerGB',
          type: 'number',
          defaultValue: 0.1,
          admin: {
            description: 'Costo por GB adicional de almacenamiento',
          },
        },
        {
          name: 'pendingCharges',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Cargos pendientes por uso adicional',
            readOnly: true,
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        // Auto-configurar límites basado en el plan seleccionado
        if (operation === 'create' || (operation === 'update' && data.planId)) {
          switch (data.planId) {
            case 'free':
              data.limits = {
                videosPerMonth: 3,
                messagesPerMonth: 50,
                storageGB: 1,
              }
              data.planName = 'Plan Free'
              break
            case 'basic':
              data.limits = {
                videosPerMonth: 25,
                messagesPerMonth: 500,
                storageGB: 10,
              }
              data.planName = 'Plan Basic'
              break
            case 'pro':
              data.limits = {
                videosPerMonth: -1, // Ilimitado
                messagesPerMonth: -1, // Ilimitado
                storageGB: 100,
              }
              data.planName = 'Plan Pro'
              data.variableBilling = {
                enabled: true,
                extraVideosCost: 0.5,
                extraStorageCostPerGB: 0.1,
                pendingCharges: 0,
              }
              break
          }
        }

        // Inicializar uso actual si es una nueva suscripción
        if (operation === 'create') {
          data.currentUsage = {
            videosProcessed: 0,
            messagesUsed: 0,
            storageUsedGB: 0,
            lastResetDate: new Date(),
          }
        }

        return data
      },
    ],
  },
}
