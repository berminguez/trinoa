import path from 'path'
import { fileURLToPath } from 'url'

import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Conversations } from './collections/Conversations'
import { ApiKeys } from './collections/ApiKeys'
import { Media } from './collections/Media'
import { Messages } from './collections/Messages'
import { Projects } from './collections/Projects'
import { PreResources } from './collections/PreResources'
import { Resources } from './collections/Resources'
import { FieldTranslations } from './collections/FieldTranslations'
import { Subscriptions } from './collections/Subscriptions'
import { Users } from './collections/Users'
import { Configuracion } from './globals/Configuracion'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      providers: [
        {
          path: '@/payload-admin/AdminProviders',
          exportName: 'default',
        },
      ],
    },
  },
  collections: [
    Users,
    Media,
    Resources,
    FieldTranslations,
    Projects,
    PreResources,
    ApiKeys,
    Conversations,
    Messages,
    Subscriptions,
  ],
  globals: [Configuracion],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
    connectOptions: {
      // Configuración muy tolerante para Railway
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000, // 10 segundos timeout
      socketTimeoutMS: 15000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  }),
  sharp,
  plugins: [
    // Removido payloadCloudPlugin() por ahora para evitar problemas de arranque
    ...(process.env.AWS_S3_BUCKET
      ? [
          s3Storage({
            collections: {
              media: {
                // Configuración específica para documentos (PDFs e imágenes)
                signedDownloads: {
                  shouldUseSignedURL: ({ collection, filename, req }) => {
                    // Usar URLs firmadas para archivos PDF (mejor seguridad)
                    return filename.endsWith('.pdf') || filename.endsWith('.PDF')
                  },
                },
              },
            },
            bucket: process.env.AWS_S3_BUCKET,
            config: {
              credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
              },
              region: process.env.AWS_REGION || 'eu-west-1',
            },
          }),
        ]
      : []),
  ],
})
