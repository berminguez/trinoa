import type { CollectionConfig } from 'payload'

export const Projects: CollectionConfig = {
  slug: 'projects',
  access: {
    // Control de acceso para lectura de proyectos
    read: ({ req: { user } }) => {
      // Usuarios no autenticados no pueden ver ningún proyecto
      if (!user) {
        console.log('Access denied: No authenticated user for reading projects')
        return false
      }

      // Validar que el usuario tenga un ID válido
      if (!user.id) {
        console.log('Access denied: User without valid ID')
        return false
      }

      // Los admins pueden ver todos los proyectos
      if (user.role === 'admin') {
        console.log(`Admin access granted: User ${user.id} can read all projects`)
        return true
      }

      // Los usuarios con acceso API solo pueden ver a través de endpoints específicos
      if (user.role === 'api') {
        console.log(`API access granted: User ${user.id} can read own projects only`)
        return {
          createdBy: {
            equals: user.id,
          },
        }
      }

      // Los usuarios normales solo pueden ver sus propios proyectos
      if (user.role === 'user') {
        console.log(`User access granted: User ${user.id} can read own projects only`)
        return {
          createdBy: {
            equals: user.id,
          },
        }
      }

      // Cualquier otro rol no reconocido se deniega
      console.log(`Access denied: Unknown role ${user.role} for user ${user.id}`)
      return false
    },

    // Control de acceso para creación de proyectos
    create: ({ req: { user } }) => {
      // Solo usuarios autenticados pueden crear proyectos
      if (!user) {
        console.log('Access denied: No authenticated user for creating projects')
        return false
      }

      // Validar ID de usuario
      if (!user.id) {
        console.log('Access denied: User without valid ID for creation')
        return false
      }

      // Solo roles 'user' y 'admin' pueden crear proyectos
      // Los usuarios 'api' típicamente no crean proyectos directamente
      if (user.role === 'admin' || user.role === 'user') {
        console.log(`Creation access granted: User ${user.id} with role ${user.role}`)
        return true
      }

      console.log(`Creation access denied: Role ${user.role} cannot create projects`)
      return false
    },

    // Control de acceso para edición de proyectos
    update: ({ req: { user } }) => {
      if (!user) {
        console.log('Access denied: No authenticated user for updating projects')
        return false
      }

      if (!user.id) {
        console.log('Access denied: User without valid ID for update')
        return false
      }

      // Los admins pueden editar todos los proyectos
      if (user.role === 'admin') {
        console.log(`Admin update access granted: User ${user.id} can edit all projects`)
        return true
      }

      // Los usuarios normales y API solo pueden editar sus propios proyectos
      if (user.role === 'user' || user.role === 'api') {
        console.log(`Update access granted: User ${user.id} can edit own projects only`)
        return {
          createdBy: {
            equals: user.id,
          },
        }
      }

      console.log(`Update access denied: Unknown role ${user.role} for user ${user.id}`)
      return false
    },

    // Control de acceso para eliminación de proyectos
    delete: ({ req: { user } }) => {
      if (!user) {
        console.log('Access denied: No authenticated user for deleting projects')
        return false
      }

      if (!user.id) {
        console.log('Access denied: User without valid ID for deletion')
        return false
      }

      // Los admins pueden eliminar todos los proyectos
      if (user.role === 'admin') {
        console.log(`Admin delete access granted: User ${user.id} can delete all projects`)
        return true
      }

      // Los usuarios normales pueden eliminar solo sus propios proyectos
      if (user.role === 'user') {
        console.log(`Delete access granted: User ${user.id} can delete own projects only`)
        return {
          createdBy: {
            equals: user.id,
          },
        }
      }

      // Los usuarios API no pueden eliminar proyectos por seguridad
      if (user.role === 'api') {
        console.log(`Delete access denied: API users cannot delete projects`)
        return false
      }

      console.log(`Delete access denied: Unknown role ${user.role} for user ${user.id}`)
      return false
    },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'createdBy', 'createdAt'],
    listSearchableFields: ['title', 'description'],
    description: 'Gestiona proyectos para organizar vídeos temáticamente',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Título descriptivo del proyecto (único por usuario)',
      },
      validate: (value: string | null | undefined) => {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
          return 'El título es requerido'
        }

        // Validar longitud
        if (value.length > 100) {
          return 'El título no puede exceder 100 caracteres'
        }

        return true
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'URL amigable autogenerada desde el título (único globalmente)',
        readOnly: true,
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            // Auto-generar slug desde el título si no existe
            if (!value && data?.title) {
              // Función helper para generar slug base desde título
              const generateSlug = (title: string): string => {
                const baseSlug = title
                  .toLowerCase()
                  .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
                  .replace(/\s+/g, '-') // Reemplazar espacios con guiones
                  .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno solo
                  .replace(/^-+|-+$/g, '') // Remover guiones al inicio y final
                  .trim()
                  .substring(0, 45) // Limitar longitud para dejar espacio al sufijo

                if (!baseSlug) {
                  return 'proyecto-sin-titulo'
                }

                // Añadir sufijo aleatorio para garantizar unicidad
                const randomSuffix = Math.random().toString(36).substring(2, 8)
                return `${baseSlug}-${randomSuffix}`
              }

              return generateSlug(data.title)
            }

            return value
          },
        ],
      },
      validate: (value: string | null | undefined) => {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
          return 'El slug es requerido'
        }

        // Validar formato del slug
        if (!/^[a-z0-9-]+$/.test(value)) {
          return 'El slug debe contener solo letras minúsculas, números y guiones'
        }

        return true
      },
    },
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Descripción detallada del proyecto (opcional)',
      },
    },
    {
      name: 'videos',
      type: 'join',
      collection: 'resources',
      on: 'project',
      hasMany: true,
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'Usuario que creó el proyecto',
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
            // Mantener el valor existente en updates
            return data?.createdBy
          },
        ],
      },
    },
    {
      name: 'createdAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        description: 'Fecha de creación del proyecto',
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
            // Mantener la fecha existente en updates
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
  timestamps: false, // Usamos nuestros propios campos de fecha
}
