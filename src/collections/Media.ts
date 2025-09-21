import { CONFIG, DOCUMENT_PROCESSING } from '../lib/config'
import { validateDocumentFile, formatBytes } from '../lib/validation'

import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: ({ req: { user } }) => {
      return Boolean(user)
    },
    delete: ({ req: { user } }) => {
      if (user?.role === 'admin') {
        return true
      }
      return false
    },
    update: ({ req: { user } }) => {
      return Boolean(user)
    },
    create: ({ req: { user } }) => {
      return Boolean(user)
    },
  },

  upload: {
    // Configuración específica para documentos e imágenes
    staticDir: 'media',
    adminThumbnail: 'thumbnail',
    mimeTypes: [
      // Tipos de documento soportados
      ...DOCUMENT_PROCESSING.SUPPORTED_MIME_TYPES,
    ],
    formatOptions: {
      format: 'webp',
      options: {
        quality: 80,
      },
    },
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
        formatOptions: {
          format: 'webp',
          options: {
            quality: 70,
          },
        },
      },
      {
        name: 'card',
        width: 768,
        height: 432,
        position: 'centre',
        formatOptions: {
          format: 'webp',
          options: {
            quality: 75,
          },
        },
      },
      {
        name: 'tablet',
        width: 1024,
        position: 'centre',
        formatOptions: {
          format: 'webp',
          options: {
            quality: 80,
          },
        },
      },
    ],
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data?.file) {
          return data
        }

        // Validación completa para documentos usando nuestras utilidades
        const documentFile = {
          size: data.file.size,
          mimeType: data.file.mimeType,
          filename: data.file.filename,
        }

        const validation = validateDocumentFile(documentFile)

        if (!validation.isValid) {
          throw new Error(validation.error)
        }

        // Log warnings but don't fail
        if (validation.warnings) {
          console.warn('Media upload warnings:', validation.warnings)
        }

        // Auto-detectar tipo de media basado en MIME type
        if (validation.metadata && !data.mediaType) {
          if (validation.metadata.mimeType === 'application/pdf') {
            data.mediaType = 'document'
          } else if (validation.metadata.mimeType.startsWith('image/')) {
            data.mediaType = 'image'
          }
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: {
        description: 'Alternative text for accessibility',
      },
    },
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Display title for the media file',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional description of the media content',
      },
    },
    {
      name: 'mediaType',
      type: 'select',
      options: [
        { label: 'Document', value: 'document' },
        { label: 'Image', value: 'image' },
      ],
      admin: {
        description: 'Type of media content',
      },
    },
    {
      name: 'pages',
      type: 'number',
      admin: {
        description: 'Number of pages (for PDF documents)',
        condition: (data) => data.mediaType === 'document',
      },
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
      admin: {
        description: 'Tags for organizing and searching documents and images',
      },
    },
  ],
}
