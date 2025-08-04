import { CONFIG, VIDEO_PROCESSING } from '../lib/config'
import { validateVideoFile, formatBytes } from '../lib/validation'

import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: ({ req: { user }, data }) => {
      console.log('user', user)
      console.log('data', data)
      return Boolean(user)
    },
  },

  upload: {
    // Configuración específica para archivos multimedia
    staticDir: 'media',
    adminThumbnail: 'thumbnail',
    mimeTypes: [
      // Tipos de video soportados
      ...VIDEO_PROCESSING.SUPPORTED_MIME_TYPES,
      // Tipos de imagen para thumbnails y frames
      'image/jpeg',
      'image/png',
      'image/webp',
      // Tipos de audio futuros
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
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

        // Validación completa para archivos de vídeo usando nuestras utilidades
        const videoFile = {
          size: data.file.size,
          mimeType: data.file.mimeType,
          filename: data.file.filename,
        }

        const validation = validateVideoFile(videoFile)

        if (!validation.isValid) {
          throw new Error(validation.error)
        }

        // Log warnings but don't fail
        if (validation.warnings) {
          console.warn('Media upload warnings:', validation.warnings)
        }

        // Auto-detectar tipo de media basado en MIME type
        if (validation.metadata && !data.mediaType) {
          if (validation.metadata.mimeType.startsWith('video/')) {
            data.mediaType = 'video'
          } else if (validation.metadata.mimeType.startsWith('image/')) {
            data.mediaType = 'image'
          } else if (validation.metadata.mimeType.startsWith('audio/')) {
            data.mediaType = 'audio'
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
        { label: 'Video', value: 'video' },
        { label: 'Image', value: 'image' },
        { label: 'Audio', value: 'audio' },
        { label: 'Frame', value: 'frame' }, // Para fotogramas extraídos
      ],
      admin: {
        description: 'Type of media content',
      },
    },
    {
      name: 'duration',
      type: 'number',
      admin: {
        description: 'Duration in seconds (will be populated after video processing)',
        condition: (data) => data.mediaType === 'video' || data.mediaType === 'audio',
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
        description: 'Tags for organizing and searching media files',
      },
    },
  ],
}
