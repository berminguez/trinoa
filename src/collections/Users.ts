import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    useAPIKey: true,
    forgotPassword: {
      generateEmailHTML: (args) => {
        const { token, user } = args || {}
        const resetURL = `${process.env.NEXT_PUBLIC_SERVER_URL}/reset-password?token=${token}`
        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Recuperar Contraseña - Trinoa</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); overflow: hidden;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Recuperar Contraseña</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px;">
                  <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Hola${user.name ? ` ${user.name}` : ''},</p>
                  
                  <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">
                    Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Si no solicitaste esto, puedes ignorar este correo de forma segura.
                  </p>
                  
                  <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">
                    Para crear una nueva contraseña, haz clic en el siguiente botón:
                  </p>
                  
                  <!-- Button -->
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${resetURL}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);">
                      Restablecer Contraseña
                    </a>
                  </div>
                  
                  <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                    Si el botón no funciona, copia y pega este enlace en tu navegador:
                  </p>
                  <p style="color: #667eea; font-size: 13px; word-break: break-all; margin: 10px 0 0;">
                    ${resetURL}
                  </p>
                  
                  <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 30px 0 0;">
                    <strong>Importante:</strong> Este enlace expirará en 1 hora por seguridad.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #eeeeee;">
                  <p style="color: #999999; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                    Este es un correo automático, por favor no respondas a este mensaje.
                  </p>
                  <p style="color: #999999; font-size: 12px; line-height: 1.5; margin: 10px 0 0; text-align: center;">
                    © ${new Date().getFullYear()} Trinoa. Todos los derechos reservados.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `
      },
      generateEmailSubject: () => 'Recuperar contraseña - Trinoa',
    },
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
      label: 'Unidad',
      access: {
        // Solo admins pueden editar la filial de un usuario
        update: ({ req: { user } }) => {
          if (!user) return false
          return user.role === 'admin'
        },
      },
      admin: {
        description: 'Unidad dentro de la empresa. (opcional)',
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
