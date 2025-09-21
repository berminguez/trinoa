import type { CollectionConfig } from 'payload'

export const Companies: CollectionConfig = {
  slug: 'companies',
  access: {
    // Control de acceso para lectura de empresas
    read: ({ req: { user } }) => {
      // Usuarios no autenticados no pueden ver ninguna empresa
      if (!user) {
        console.log('Access denied: No authenticated user for reading companies')
        return false
      }

      // Validar que el usuario tenga un ID válido
      if (!user.id) {
        console.log('Access denied: User without valid ID')
        return false
      }

      // Los admins pueden ver todas las empresas
      if (user.role === 'admin') {
        return true
      }

      // Los usuarios normales y API pueden ver todas las empresas (para selectors)
      if (user.role === 'user' || user.role === 'api') {
        return true
      }

      // Cualquier otro rol no reconocido se deniega
      console.log(`Access denied: Unknown role ${user.role} for user ${user.id}`)
      return false
    },

    // Control de acceso para creación de empresas
    create: ({ req: { user } }) => {
      // Solo usuarios autenticados pueden crear empresas
      if (!user) {
        console.log('Access denied: No authenticated user for creating companies')
        return false
      }

      // Validar ID de usuario
      if (!user.id) {
        console.log('Access denied: User without valid ID for creation')
        return false
      }

      // Solo admins pueden crear empresas
      if (user.role === 'admin') {
        console.log(`Creation access granted: Admin ${user.id} can create companies`)
        return true
      }

      console.log(`Creation access denied: Role ${user.role} cannot create companies`)
      return false
    },

    // Control de acceso para edición de empresas
    update: ({ req: { user } }) => {
      if (!user) {
        console.log('Access denied: No authenticated user for updating companies')
        return false
      }

      if (!user.id) {
        console.log('Access denied: User without valid ID for update')
        return false
      }

      // Solo admins pueden editar empresas
      if (user.role === 'admin') {
        console.log(`Admin update access granted: User ${user.id} can edit companies`)
        return true
      }

      console.log(`Update access denied: Role ${user.role} cannot update companies`)
      return false
    },

    // Control de acceso para eliminación de empresas
    delete: ({ req: { user } }) => {
      if (!user) {
        console.log('Access denied: No authenticated user for deleting companies')
        return false
      }

      if (!user.id) {
        console.log('Access denied: User without valid ID for deletion')
        return false
      }

      // Solo admins pueden eliminar empresas
      if (user.role === 'admin') {
        console.log(`Admin delete access granted: User ${user.id} can delete companies`)
        return true
      }

      console.log(`Delete access denied: Role ${user.role} cannot delete companies`)
      return false
    },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'code', 'cif', 'createdAt'],
    listSearchableFields: ['name', 'code', 'cif'],
    description: 'Gestiona empresas del sistema para asignación a usuarios',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Nombre de la empresa (único)',
      },
      validate: (value: string | null | undefined) => {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
          return 'El nombre de la empresa es requerido'
        }

        // Validar longitud
        if (value.trim().length < 2) {
          return 'El nombre debe tener al menos 2 caracteres'
        }

        if (value.length > 100) {
          return 'El nombre no puede exceder 100 caracteres'
        }

        return true
      },
    },
    {
      name: 'cif',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'CIF de la empresa (único)',
      },
      validate: (value: string | null | undefined) => {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
          return 'El CIF es requerido'
        }

        // Validar formato básico: no vacío, alfanumérico
        const cleanCif = value.trim().toUpperCase()

        if (cleanCif.length < 9 || cleanCif.length > 20) {
          return 'El CIF debe tener entre 9 y 20 caracteres'
        }

        // Validar que sea alfanumérico
        if (!/^[A-Z0-9]+$/.test(cleanCif)) {
          return 'El CIF debe contener solo letras y números'
        }

        return true
      },
      hooks: {
        beforeChange: [
          ({ value }) => {
            // Normalizar CIF a mayúsculas
            if (value && typeof value === 'string') {
              return value.trim().toUpperCase()
            }
            return value
          },
        ],
      },
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Código único de 3 letras mayúsculas para la empresa',
      },
      validate: (value: string | null | undefined) => {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
          return 'El código de la empresa es requerido'
        }

        const cleanCode = value.trim().toUpperCase()

        // Validar que sean exactamente 3 caracteres
        if (cleanCode.length !== 3) {
          return 'El código debe tener exactamente 3 caracteres'
        }

        // Validar que sean solo letras A-Z
        if (!/^[A-Z]{3}$/.test(cleanCode)) {
          return 'El código debe contener solo 3 letras mayúsculas (A-Z)'
        }

        return true
      },
      hooks: {
        beforeChange: [
          ({ value }) => {
            // Normalizar código a mayúsculas y quitar espacios
            if (value && typeof value === 'string') {
              return value.trim().toUpperCase()
            }
            return value
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
        description: 'Fecha de creación de la empresa',
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
  hooks: {
    beforeValidate: [
      // Validar que no existan empresas duplicadas por nombre
      async ({ req, data, operation, originalDoc }) => {
        if (data?.name) {
          try {
            const trimmedName = data.name.trim()
            let currentDocId: string | undefined

            if (operation === 'update' && originalDoc) {
              currentDocId = originalDoc.id
            }

            const existingCompanies = await req.payload.find({
              collection: 'companies' as any,
              where: {
                and: [
                  {
                    name: {
                      equals: trimmedName,
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

            if (existingCompanies.docs.length > 0) {
              throw new Error('Ya existe una empresa con este nombre')
            }
          } catch (error) {
            console.error('Error validating company name uniqueness:', error)
            throw new Error(
              error instanceof Error
                ? error.message
                : 'Error validando unicidad del nombre de empresa',
            )
          }
        }
      },
      // Validar que no existan empresas duplicadas por CIF
      async ({ req, data, operation, originalDoc }) => {
        if (data?.cif) {
          try {
            const normalizedCif = data.cif.trim().toUpperCase()
            let currentDocId: string | undefined

            if (operation === 'update' && originalDoc) {
              currentDocId = originalDoc.id
            }

            const existingCompanies = await req.payload.find({
              collection: 'companies' as any,
              where: {
                and: [
                  {
                    cif: {
                      equals: normalizedCif,
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

            if (existingCompanies.docs.length > 0) {
              const existingCompany = existingCompanies.docs[0]
              throw new Error(
                `El CIF "${normalizedCif}" ya está en uso por la empresa "${existingCompany.name}" (ID: ${existingCompany.id})`,
              )
            }
          } catch (error) {
            console.error('Error validating company CIF uniqueness:', error)
            throw new Error(
              error instanceof Error
                ? error.message
                : 'Error validando unicidad del CIF de empresa',
            )
          }
        }
      },
      // Validar que no existan empresas duplicadas por código
      async ({ req, data, operation, originalDoc }) => {
        if (data?.code) {
          try {
            const normalizedCode = data.code.trim().toUpperCase()
            let currentDocId: string | undefined

            if (operation === 'update' && originalDoc) {
              currentDocId = originalDoc.id
            }

            const existingCompanies = await req.payload.find({
              collection: 'companies' as any,
              where: {
                and: [
                  {
                    code: {
                      equals: normalizedCode,
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

            if (existingCompanies.docs.length > 0) {
              const existingCompany = existingCompanies.docs[0]
              throw new Error(
                `El código "${normalizedCode}" ya está en uso por la empresa "${existingCompany.name}" (ID: ${existingCompany.id})`,
              )
            }
          } catch (error) {
            console.error('Error validating company code uniqueness:', error)
            throw new Error(
              error instanceof Error
                ? error.message
                : 'Error validando unicidad del código de empresa',
            )
          }
        }
      },
    ],
  },
  timestamps: false, // Usamos nuestros propios campos de fecha
}
