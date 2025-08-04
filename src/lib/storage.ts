// ============================================================================
// EIDETIK MVP - ALMACENAMIENTO AWS S3
// ============================================================================

import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
})

const BUCKET_NAME = process.env.S3_BUCKET || ''

export class StorageManager {
  /**
   * Elimina un archivo específico de S3
   */
  static async deleteFile(key: string): Promise<void> {
    if (!BUCKET_NAME) {
      throw new Error('S3_BUCKET environment variable is required')
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })

      await s3Client.send(command)
      console.log(`File deleted from S3: ${key}`)
    } catch (error) {
      console.error(`Error deleting file from S3: ${key}`, error)
      throw error
    }
  }

  /**
   * Elimina múltiples archivos de S3 relacionados con un recurso
   */
  static async deleteResourceFiles(resourceId: string): Promise<void> {
    if (!BUCKET_NAME) {
      throw new Error('S3_BUCKET environment variable is required')
    }

    try {
      // Listar todos los archivos relacionados con el recurso
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: `resources/${resourceId}/`, // Asumiendo estructura: resources/{id}/
      })

      const listedObjects = await s3Client.send(listCommand)

      if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
        console.log(`No files found for resource: ${resourceId}`)
        return
      }

      // Preparar lista de objetos para eliminar
      const objectsToDelete = listedObjects.Contents.map((obj) => ({ Key: obj.Key! }))

      // Eliminar todos los archivos relacionados
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: objectsToDelete,
          Quiet: false,
        },
      })

      const result = await s3Client.send(deleteCommand)

      console.log(`Deleted ${objectsToDelete.length} files for resource: ${resourceId}`)

      if (result.Errors && result.Errors.length > 0) {
        console.error('Some files could not be deleted:', result.Errors)
      }
    } catch (error) {
      console.error(`Error deleting resource files from S3: ${resourceId}`, error)
      throw error
    }
  }

  /**
   * Elimina un archivo de media específico por su filename
   */
  static async deleteMediaFile(filename: string): Promise<void> {
    if (!filename) return

    try {
      await this.deleteFile(filename)
    } catch (error) {
      console.error(`Error deleting media file: ${filename}`, error)
      // No relanzamos el error para que no falle toda la operación si el archivo ya no existe
    }
  }

  static async uploadFile(file: Buffer, key: string): Promise<string> {
    // TODO: Implementar upload a S3 en futuras sub-tareas
    return 'https://s3.amazonaws.com/bucket/file'
  }

  static async downloadFile(key: string): Promise<Buffer> {
    // TODO: Implementar download desde S3 en futuras sub-tareas
    return Buffer.from('')
  }

  static async getSignedUrl(key: string): Promise<string> {
    // TODO: Implementar URL firmada en futuras sub-tareas
    return 'https://s3.amazonaws.com/bucket/file'
  }
}

export { StorageManager as default }
