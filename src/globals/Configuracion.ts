import type { GlobalConfig } from 'payload'

export const Configuracion: GlobalConfig = {
  slug: 'configuracion',
  label: 'Configuración',
  access: {
    read: ({ req }) => !!req.user && (req.user as any)?.role === 'admin',
    update: ({ req }) => !!req.user && (req.user as any)?.role === 'admin',
  },
  admin: {
    description: 'Ajustes generales del sitio: empresa, SEO, redes sociales y automatizaciones.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Empresa',
          fields: [
            {
              name: 'company',
              type: 'group',
              label: 'Datos de la empresa',
              fields: [
                { name: 'name', type: 'text', label: 'Nombre de la empresa', required: true },
                { name: 'shortName', type: 'text', label: 'Nombre corto' },
                { name: 'taxId', type: 'text', label: 'CIF/NIF' },
                { name: 'email', type: 'email', label: 'Email de contacto' },
                { name: 'phone', type: 'text', label: 'Teléfono' },
                { name: 'website', type: 'text', label: 'Web (URL)' },
                {
                  name: 'address',
                  type: 'group',
                  label: 'Dirección',
                  fields: [
                    { name: 'street', type: 'text', label: 'Calle' },
                    { name: 'city', type: 'text', label: 'Ciudad' },
                    { name: 'province', type: 'text', label: 'Provincia' },
                    { name: 'postalCode', type: 'text', label: 'Código Postal' },
                    { name: 'country', type: 'text', label: 'País' },
                    { name: 'extra', type: 'text', label: 'Info adicional' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Marca y SEO',
          fields: [
            {
              name: 'brand',
              type: 'group',
              label: 'Identidad visual',
              fields: [
                { name: 'siteName', type: 'text', label: 'Nombre del sitio' },
                {
                  name: 'siteDescription',
                  type: 'textarea',
                  label: 'Descripción del sitio',
                },
                {
                  name: 'logo',
                  type: 'relationship',
                  relationTo: 'media',
                  label: 'Logo',
                },
                {
                  name: 'favicon',
                  type: 'relationship',
                  relationTo: 'media',
                  label: 'Favicon',
                },
                {
                  name: 'defaultOgImage',
                  type: 'relationship',
                  relationTo: 'media',
                  label: 'Imagen OG por defecto',
                },
                { name: 'themeColor', type: 'text', label: 'Color del tema (hex)' },
              ],
            },
            {
              name: 'seo',
              type: 'group',
              label: 'SEO por defecto',
              fields: [
                { name: 'defaultTitle', type: 'text', label: 'Título por defecto' },
                {
                  name: 'defaultDescription',
                  type: 'textarea',
                  label: 'Descripción por defecto',
                },
                { name: 'keywords', type: 'text', label: 'Palabras clave (coma separadas)' },
                { name: 'baseUrl', type: 'text', label: 'Base URL del sitio' },
              ],
            },
          ],
        },
        {
          label: 'Redes sociales',
          fields: [
            {
              name: 'social',
              type: 'group',
              label: 'URLs de redes',
              fields: [
                { name: 'twitter', type: 'text', label: 'X/Twitter URL' },
                { name: 'facebook', type: 'text', label: 'Facebook URL' },
                { name: 'instagram', type: 'text', label: 'Instagram URL' },
                { name: 'linkedin', type: 'text', label: 'LinkedIn URL' },
                { name: 'youtube', type: 'text', label: 'YouTube URL' },
                { name: 'tiktok', type: 'text', label: 'TikTok URL' },
                { name: 'github', type: 'text', label: 'GitHub URL' },
                { name: 'telegram', type: 'text', label: 'Telegram URL' },
                { name: 'whatsapp', type: 'text', label: 'WhatsApp (link wa.me)' },
              ],
            },
          ],
        },
        {
          label: 'Analítica',
          fields: [
            {
              name: 'analytics',
              type: 'group',
              label: 'Proveedores',
              fields: [
                { name: 'googleAnalyticsId', type: 'text', label: 'Google Analytics ID' },
                { name: 'metaPixelId', type: 'text', label: 'Meta Pixel ID' },
              ],
            },
            {
              name: 'confidenceSettings',
              type: 'group',
              label: 'Configuración de Confianza',
              admin: {
                description:
                  'Configuración para el sistema de evaluación de confianza de documentos',
              },
              fields: [
                {
                  name: 'confidenceThreshold',
                  type: 'number',
                  label: 'Umbral de Confianza (%)',
                  defaultValue: 70,
                  admin: {
                    description:
                      'Porcentaje mínimo de confianza requerido para que un campo se considere confiable (0-100)',
                  },
                  validate: (value: number | null | undefined) => {
                    if (value == null || typeof value !== 'number') {
                      return 'El umbral de confianza debe ser un número'
                    }
                    if (value < 0 || value > 100) {
                      return 'El umbral de confianza debe estar entre 0 y 100'
                    }
                    return true
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Seguridad',
          fields: [
            {
              name: 'mediaAccess',
              type: 'group',
              label: 'Acceso a Archivos Media',
              admin: {
                description:
                  'Configura una contraseña para permitir el acceso a archivos media sin necesidad de estar autenticado.',
              },
              fields: [
                {
                  name: 'enabled',
                  type: 'checkbox',
                  label: 'Activar acceso con contraseña',
                  defaultValue: false,
                  admin: {
                    description:
                      'Permite acceso a archivos media mediante HTTP Basic Authentication cuando el usuario no está logueado',
                  },
                },
                {
                  name: 'password',
                  type: 'text',
                  label: 'Contraseña de acceso',
                  admin: {
                    description:
                      'Contraseña requerida para acceder a archivos media sin autenticación (usuario: "media")',
                    condition: (data) => data?.mediaAccess?.enabled === true,
                  },
                  validate: (value: string | null | undefined, { data }: { data: any }) => {
                    if (data?.mediaAccess?.enabled && (!value || value.length < 8)) {
                      return 'La contraseña debe tener al menos 8 caracteres'
                    }
                    return true
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Endpoint de automatización',
          fields: [
            {
              name: 'automationEndpoint',
              type: 'group',
              label: 'N8n Webhook',
              admin: {
                description: 'Configura el webhook de N8n que se invoca al crear un Recurso.',
              },
              fields: [
                {
                  name: 'enabled',
                  type: 'checkbox',
                  label: 'Activar automatización',
                  defaultValue: false,
                },
                { name: 'url', type: 'text', label: 'URL del webhook de N8n' },
                {
                  name: 'httpMethod',
                  type: 'select',
                  label: 'Método HTTP',
                  defaultValue: 'POST',
                  options: [
                    { label: 'POST', value: 'POST' },
                    { label: 'GET', value: 'GET' },
                  ],
                },
                {
                  name: 'authType',
                  type: 'select',
                  label: 'Tipo de autenticación',
                  defaultValue: 'none',
                  options: [
                    { label: 'Ninguna', value: 'none' },
                    { label: 'Bearer Token', value: 'bearer' },
                  ],
                },
                {
                  name: 'bearerToken',
                  type: 'text',
                  label: 'Bearer Token',
                  admin: {
                    description: 'Se enviará como Authorization: Bearer <token>',
                    condition: (data) => data?.automationEndpoint?.authType === 'bearer',
                  },
                },
                {
                  name: 'sendResourceBody',
                  type: 'checkbox',
                  label: 'Enviar el recurso en el cuerpo (JSON)',
                  defaultValue: true,
                },
                {
                  name: 'extraHeaders',
                  type: 'array',
                  label: 'Headers adicionales',
                  admin: { description: 'Headers personalizados clave/valor' },
                  fields: [
                    { name: 'key', type: 'text', label: 'Header' },
                    { name: 'value', type: 'text', label: 'Valor' },
                  ],
                },
              ],
            },
            {
              name: 'splitter',
              type: 'group',
              label: 'Splitter Endpoint',
              admin: {
                description: 'Configuración del endpoint para dividir PDFs multi‑factura',
              },
              fields: [
                { name: 'url', type: 'text', label: 'URL del Splitter' },
                {
                  name: 'httpMethod',
                  type: 'select',
                  label: 'Método HTTP',
                  defaultValue: 'POST',
                  options: [{ label: 'POST', value: 'POST' }],
                },
                {
                  name: 'bearerToken',
                  type: 'text',
                  label: 'Bearer Token (opcional)',
                  admin: {
                    description:
                      'Si se deja vacío, reutilizar el Bearer del webhook de automatización si existe',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export default Configuracion
