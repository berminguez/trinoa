import { NextRequest } from 'next/server'
import { S3Client, GetObjectCommand, type GetObjectCommandInput } from '@aws-sdk/client-s3'

const BUCKET_NAME = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || ''
const REGION = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1'
const ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || ''
const SECRET_ACCESS_KEY =
  process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || ''

export const runtime = 'nodejs'

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
})

async function nodeStreamToBuffer(stream: any): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    stream.on('error', (err: unknown) => reject(err))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    if (!BUCKET_NAME) {
      return new Response('S3 bucket no configurado', { status: 500 })
    }

    const url = new URL(req.url)
    const key = url.searchParams.get('key')
    if (!key) return new Response('Parámetro "key" requerido', { status: 400 })

    // Soportar range requests para PDF.js
    const range = req.headers.get('range') || undefined

    const input: GetObjectCommandInput = {
      Bucket: BUCKET_NAME,
      Key: key,
      Range: range,
    }

    const result = await s3Client.send(new GetObjectCommand(input))

    const body: any = result.Body
    const buffer = body ? await nodeStreamToBuffer(body) : Buffer.alloc(0)

    const headers = new Headers()
    headers.set('Accept-Ranges', 'bytes')
    if (result.ContentType) headers.set('Content-Type', result.ContentType)
    headers.set('Content-Length', String(buffer.length))
    if (result.ContentRange) headers.set('Content-Range', result.ContentRange)
    if (result.ETag) headers.set('ETag', result.ETag)
    // Evitar problemas de CORS ya que es same-origin, pero añadimos por seguridad
    headers.set('Access-Control-Allow-Origin', '*')

    const status = range ? 206 : 200
    return new Response(buffer, { status, headers })
  } catch (error: any) {
    const status = error?.$metadata?.httpStatusCode || 500
    return new Response(`Error al obtener media: ${error?.message || 'desconocido'}`, { status })
  }
}
