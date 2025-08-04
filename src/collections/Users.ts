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
