import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    useAPIKey: true,
  },
  fields: [
    // Email y password añadidos automáticamente por auth: true
    {
      name: 'name',
      type: 'text',
      label: 'Nombre',
      access: {
        // Los usuarios pueden editar su propio nombre, admins pueden editar todos
        update: ({ req: { user }, id }) => {
          if (!user) return false
          
          // Los admins pueden editar el nombre de cualquier usuario
          if (user.role === 'admin') return true
          
          // Los usuarios normales solo pueden editar su propio nombre
          if (user.role === 'user') {
            return user.id === id
          }
          
          // Los usuarios API no pueden editar nombres
          return false
        },
      },
    },
    {
      name: 'empresa',
      type: 'relationship',
      relationTo: 'companies',
      required: false, // Temporalmente no requerido para permitir migración de datos legacy
      label: 'Empresa',
      access: {
        // Solo admins pueden editar la empresa de un usuario
        update: ({ req: { user } }) => {
          if (!user) return false
          return user.role === 'admin'
        },
      },
      admin: {
        description: 'Empresa o organización a la que pertenece el usuario',
      },
    },
    {
      name: 'filial',
      type: 'text',
      label: 'Filial/Departamento',
      access: {
        // Solo admins pueden editar la filial de un usuario
        update: ({ req: { user } }) => {
          if (!user) return false
          return user.role === 'admin'
        },
      },
      admin: {
        description: 'Filial o departamento dentro de la empresa (opcional)',
      },
    },
    {
      name: 'role',
      type: 'select',
      label: 'Rol',
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'User',
          value: 'user',
        },
        {
          label: 'API Access',
          value: 'api',
        },
      ],
      defaultValue: 'user',
      admin: {
        description: 'Rol del usuario para control de acceso',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        // Manejar migración automática de empresa legacy (string) a relación
        if (data?.empresa && typeof data.empresa === 'string' && data.empresa.trim()) {
          const payload = req.payload
          const empresaNombre = data.empresa.trim()
          
          try {
            // Buscar si ya existe una empresa con este nombre
            const existingCompany = await payload.find({
              collection: 'companies',
              where: {
                name: {
                  equals: empresaNombre
                }
              },
              limit: 1
            })

            if (existingCompany.docs.length > 0) {
              // Si existe, usar esa empresa
              data.empresa = existingCompany.docs[0].id
              console.log(`[USER_MIGRATION] Empresa legacy "${empresaNombre}" migrada a ID: ${existingCompany.docs[0].id}`)
            } else {
              // Si no existe, crear una nueva empresa
              const newCompany = await payload.create({
                collection: 'companies',
                data: {
                  name: empresaNombre,
                  cif: `LEGACY-${Date.now()}` // CIF temporal para empresas migradas
                }
              })
              data.empresa = newCompany.id
              console.log(`[USER_MIGRATION] Nueva empresa "${empresaNombre}" creada con ID: ${newCompany.id}`)
            }
          } catch (error) {
            console.error('[USER_MIGRATION] Error al migrar empresa legacy:', error)
            // En caso de error, dejar el campo vacío para no bloquear el login
            data.empresa = null
          }
        }
      }
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        // Solo crear proyecto Default cuando se crea un nuevo usuario
        if (operation === 'create') {
          try {
            console.log('[USER_HOOK] Creating default project for new user:', {
              userId: doc.id,
              email: doc.email,
              role: doc.role,
            })

            // Solo crear proyecto para usuarios normales (no para usuarios API o admin automáticamente)
            if (doc.role === 'user') {
              // Crear proyecto "Default" para el usuario
              const defaultProject = await req.payload.create({
                collection: 'projects' as any, // Uso 'as any' temporalmente hasta regenerar tipos
                data: {
                  title: 'Default',
                  description: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          text: 'Proyecto creado automáticamente para organizar tus recursos. Puedes editarlo o crear nuevos proyectos.',
                        },
                      ],
                    },
                  ],
                  createdBy: doc.id,
                },
              })

              console.log('[USER_HOOK] Default project created successfully:', {
                projectId: defaultProject.id,
                projectTitle: defaultProject.title,
                projectSlug: defaultProject.slug,
                userId: doc.id,
                userEmail: doc.email,
              })
            } else {
              console.log('[USER_HOOK] Skipped default project creation for user role:', doc.role)
            }
          } catch (error) {
            // Log el error pero no fallar la creación del usuario
            console.error('[USER_HOOK] Failed to create default project:', {
              userId: doc.id,
              userEmail: doc.email,
              error: error instanceof Error ? error.message : String(error),
            })

            // Nota: No lanzamos el error para que la creación del usuario no falle
            // El proyecto se puede crear manualmente más tarde
          }
        }
      },
    ],
  },
}
