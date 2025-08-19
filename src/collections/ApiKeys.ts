import type { CollectionConfig } from 'payload'

export const ApiKeys: CollectionConfig = {
  slug: 'api-keys',
  access: {
    // Control de acceso para lectura de API Keys
    read: ({ req: { user } }) => {
      // Usuarios no autenticados no pueden ver ninguna key
      if (!user) {
        console.log('Access denied: No authenticated user for reading API keys')
        return false
      }

      // Validar que el usuario tenga un ID válido
      if (!user.id) {
        console.log('Access denied: User without valid ID')
        return false
      }

      // Los admins pueden ver todas las keys
      if (user.role === 'admin') {
        return true
      }

      // Los usuarios normales solo pueden ver sus propias keys
      if (user.role === 'user') {
        return {
          user: {
            equals: user.id,
          },
        }
      }

      // Los usuarios API no pueden acceder a las keys por seguridad
      if (user.role === 'api') {
        console.log(`Access denied: API users cannot access API keys`)
        return false
      }

      // Cualquier otro rol no reconocido se deniega
      console.log(`Access denied: Unknown role ${user.role} for user ${user.id}`)
      return false
    },

    // Control de acceso para creación de API Keys
    create: ({ req: { user } }) => {
      // Solo usuarios autenticados pueden crear keys
      if (!user) {
        console.log('Access denied: No authenticated user for creating API keys')
        return false
      }

      // Validar ID de usuario
      if (!user.id) {
        console.log('Access denied: User without valid ID for creation')
        return false
      }

      // Solo roles 'user' y 'admin' pueden crear keys
      if (user.role === 'admin' || user.role === 'user') {
        console.log(`Creation access granted: User ${user.id} with role ${user.role}`)
        return true
      }

      console.log(`Creation access denied: Role ${user.role} cannot create API keys`)
      return false
    },

    // Control de acceso para eliminación de API Keys
    delete: ({ req: { user } }) => {
      if (!user) {
        console.log('Access denied: No authenticated user for deleting API keys')
        return false
      }

      if (!user.id) {
        console.log('Access denied: User without valid ID for deletion')
        return false
      }

      // Los admins pueden eliminar todas las keys
      if (user.role === 'admin') {
        console.log(`Admin delete access granted: User ${user.id} can delete all API keys`)
        return true
      }

      // Los usuarios normales pueden eliminar solo sus propias keys
      if (user.role === 'user') {
        console.log(`Delete access granted: User ${user.id} can delete own API keys only`)
        return {
          user: {
            equals: user.id,
          },
        }
      }

      // Los usuarios API no pueden eliminar keys por seguridad
      if (user.role === 'api') {
        console.log(`Delete access denied: API users cannot delete API keys`)
        return false
      }

      console.log(`Delete access denied: Unknown role ${user.role} for user ${user.id}`)
      return false
    },

    // Control de acceso para actualización de API Keys
    update: ({ req: { user } }) => {
      if (!user) {
        console.log('Access denied: No authenticated user for updating API keys')
        return false
      }

      if (!user.id) {
        console.log('Access denied: User without valid ID for update')
        return false
      }

      // Los admins pueden actualizar todas las keys
      if (user.role === 'admin') {
        console.log(`Admin update access granted: User ${user.id} can update all API keys`)
        return true
      }

      // Los usuarios normales pueden actualizar solo sus propias keys
      if (user.role === 'user') {
        console.log(`Update access granted: User ${user.id} can update own API keys only`)
        return {
          user: {
            equals: user.id,
          },
        }
      }

      // Los usuarios API no pueden actualizar keys por seguridad
      if (user.role === 'api') {
        console.log(`Update access denied: API users cannot update API keys`)
        return false
      }

      console.log(`Update access denied: Unknown role ${user.role} for user ${user.id}`)
      return false
    },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'user', 'hasAllProjects', 'createdAt'],
    listSearchableFields: ['name'],
    description: 'Gestiona API Keys para acceso externo a proyectos de usuario',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Nombre descriptivo de la API Key (único por usuario)',
      },
      validate: (value: string | null | undefined) => {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
          return 'El nombre es requerido'
        }

        // Validar longitud
        if (value.length > 50) {
          return 'El nombre no puede exceder 50 caracteres'
        }

        return true
      },
    },
    {
      name: 'keyValue',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Valor de la API Key (generado automáticamente)',
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ data, operation }) => {
            // Solo generar en creación, no en updates
            if (operation === 'create') {
              // Generar API key con formato pcsk_ + 32 caracteres aleatorios
              const generateApiKey = (): string => {
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
                let result = 'pcsk_'

                for (let i = 0; i < 32; i++) {
                  result += characters.charAt(Math.floor(Math.random() * characters.length))
                }

                return result
              }

              const plainKey = generateApiKey()

              // Guardar los últimos 4 caracteres en el campo separado para display
              if (data) {
                data.keyValueLastFour = plainKey.slice(-4)
              }

              // Almacenar la key completa (sin hashear) para que pueda ser copiada
              return plainKey
            }
            // Mantener el valor existente en updates (aunque update está deshabilitado)
            return data?.keyValue
          },
        ],
      },
    },
    {
      name: 'keyValueLastFour',
      type: 'text',
      required: true,
      admin: {
        description: 'Últimos 4 caracteres de la API Key (para mostrar)',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'Usuario propietario de la API Key',
        readOnly: true,
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ req, data, operation }) => {
            // Auto-populate con el usuario actual en creación
            if (operation === 'create' && req.user) {
              return req.user.id
            }
            // Mantener el valor existente
            return data?.user
          },
        ],
      },
    },
    {
      name: 'projects',
      type: 'relationship',
      relationTo: 'projects',
      hasMany: true,
      admin: {
        description: 'Proyectos específicos con acceso (vacío si hasAllProjects es true)',
      },
    },
    {
      name: 'hasAllProjects',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Si esta key tiene acceso a todos los proyectos del usuario',
      },
    },
    {
      name: 'playgroundKey',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Marca esta API Key como la clave automática para el chatbot de playground',
      },
    },
    {
      name: 'createdAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        description: 'Fecha de creación de la API Key',
        readOnly: true,
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      hooks: {
        beforeChange: [
          ({ data, operation }) => {
            // Auto-populate con fecha actual solo en creación
            if (operation === 'create') {
              return new Date()
            }
            // Mantener la fecha existente
            return data?.createdAt
          },
        ],
      },
    },
    {
      name: 'updatedAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        description: 'Fecha de última actualización',
        readOnly: true,
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      hooks: {
        beforeChange: [
          () => {
            // Actualizar siempre con la fecha actual
            return new Date()
          },
        ],
      },
    },
  ],
  hooks: {
    // afterRead hook removido - el formateo se maneja en el frontend
    beforeValidate: [
      // Validar límite de 10 keys por usuario
      async ({ req, data, operation }) => {
        if (operation === 'create' && req?.user?.id) {
          try {
            // Construir condiciones de conteo según el rol del usuario
            const countWhereConditions: any = {
              user: {
                equals: req.user.id,
              },
            }

            // Los usuarios normales no deben contar playground keys para el límite
            // Los administradores ven el conteo real incluyendo playground keys
            if (req.user.role === 'user') {
              countWhereConditions.and = [
                {
                  user: {
                    equals: req.user.id,
                  },
                },
                {
                  or: [
                    {
                      playgroundKey: {
                        not_equals: true,
                      },
                    },
                    {
                      playgroundKey: {
                        exists: false,
                      },
                    },
                  ],
                },
              ]
            }

            const existingKeysCount = await req.payload.count({
              collection: 'api-keys' as any,
              where: countWhereConditions,
            })

            if (existingKeysCount.totalDocs >= 10) {
              throw new Error('No puedes crear más de 10 API Keys')
            }
          } catch (error) {
            console.error('Error validating key limit:', error)
            throw new Error(
              error instanceof Error ? error.message : 'Error validando límite de keys',
            )
          }
        }
      },
      // Validar unicidad del nombre por usuario
      async ({ req, data, operation, originalDoc }) => {
        if (data?.name) {
          try {
            // Determinar el usuario contra el cual validar
            let targetUserId: string | undefined
            let currentDocId: string | undefined

            if (operation === 'create') {
              // En creación, usar el usuario que será asignado a la API key
              targetUserId = data.user || req?.user?.id
            } else if (operation === 'update' && originalDoc) {
              // En update, usar el usuario propietario del documento original
              targetUserId =
                typeof originalDoc.user === 'object' ? originalDoc.user.id : originalDoc.user
              currentDocId = originalDoc.id
            }

            if (!targetUserId) {
              throw new Error('No se pudo determinar el usuario propietario')
            }

            const existingKeys = await req.payload.find({
              collection: 'api-keys' as any,
              where: {
                and: [
                  {
                    user: {
                      equals: targetUserId,
                    },
                  },
                  {
                    name: {
                      equals: data.name.trim(),
                    },
                  },
                  // Excluir el documento actual en caso de update
                  ...(operation === 'update' && currentDocId
                    ? [
                        {
                          id: {
                            not_equals: currentDocId,
                          },
                        },
                      ]
                    : []),
                ],
              },
              limit: 1,
            })

            if (existingKeys.docs.length > 0) {
              throw new Error('Ya existe una API Key con este nombre para este usuario')
            }
          } catch (error) {
            console.error('Error validating name uniqueness:', error)
            throw new Error(
              error instanceof Error ? error.message : 'Error validando unicidad del nombre',
            )
          }
        }
      },
      // Validar que solo keys con hasAllProjects pueden ser playground keys
      async ({ data }) => {
        if (data?.playgroundKey === true && data?.hasAllProjects !== true) {
          throw new Error(
            'Solo las API Keys con acceso a todos los proyectos pueden ser marcadas como playground key',
          )
        }
      },
    ],
    beforeChange: [
      // Desmarcar otras playground keys del mismo usuario al marcar una nueva
      async ({ req, data, operation }) => {
        // Solo procesar si se está marcando como playground key
        if (data?.playgroundKey === true && req?.user?.id) {
          try {
            // Buscar otras API keys del usuario que ya sean playground keys
            const existingPlaygroundKeys = await req.payload.find({
              collection: 'api-keys' as any,
              where: {
                and: [
                  {
                    user: {
                      equals: req.user.id,
                    },
                  },
                  {
                    playgroundKey: {
                      equals: true,
                    },
                  },
                  // Excluir el documento actual en caso de update
                  ...(operation === 'update' && data?.id
                    ? [
                        {
                          id: {
                            not_equals: data.id,
                          },
                        },
                      ]
                    : []),
                ],
              },
            })

            // Desmarcar todas las playground keys existentes
            for (const existingKey of existingPlaygroundKeys.docs) {
              await req.payload.update({
                collection: 'api-keys',
                id: existingKey.id,
                data: {
                  playgroundKey: false,
                },
              })
            }
          } catch (error) {
            console.error('Error unmarking existing playground keys:', error)
            throw new Error('Error al desmarcar playground keys existentes')
          }
        }
      },
    ],
  },
  timestamps: false, // Usamos nuestros propios campos de fecha
}
