import { NextRequest } from 'next/server'
import { S3Client, GetObjectCommand, type GetObjectCommandInput } from '@aws-sdk/client-s3'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'

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

/**
 * Verifica si el usuario está autenticado mediante cookies de Payload
 */
async function isUserAuthenticated(req: NextRequest): Promise<boolean> {
  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')

    if (!payloadToken?.value) {
      return false
    }

    // Verificar token con Payload
    const { user } = await payload.auth({ headers: req.headers })
    return !!user
  } catch (error) {
    console.error('Error verificando autenticación:', error)
    return false
  }
}

/**
 * Verifica la contraseña de acceso a media mediante HTTP Basic Auth
 * No requiere usuario específico, solo valida la contraseña
 */
async function verifyMediaPassword(authHeader: string | null): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }

  try {
    const payload = await getPayload({ config })
    const configuracion = await payload.findGlobal({
      slug: 'configuracion',
    })

    // Verificar si el acceso con contraseña está habilitado
    const mediaAccess = (configuracion as any)?.mediaAccess
    if (!mediaAccess?.enabled || !mediaAccess?.password) {
      return false
    }

    // Decodificar credenciales HTTP Basic Auth
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
    const parts = credentials.split(':')

    // Extraer la contraseña (puede venir como "usuario:contraseña" o solo "contraseña")
    // Aceptamos ambos formatos para flexibilidad
    const providedPassword = parts.length > 1 ? parts[1] : parts[0]

    // Verificar que la contraseña coincida
    return providedPassword === mediaAccess.password
  } catch (error) {
    console.error('Error verificando contraseña de media:', error)
    return false
  }
}

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
    let key = url.searchParams.get('key')
    if (!key) return new Response('Parámetro "key" requerido', { status: 400 })

    // Decodificar la key por si viene URL-encoded
    // url.searchParams.get() ya decodifica una vez, pero por seguridad
    try {
      // Si la key contiene %20 o similar, decodificarla
      if (key.includes('%')) {
        key = decodeURIComponent(key)
      }
    } catch (e) {
      // Si falla la decodificación, usar la key tal cual
      console.warn('No se pudo decodificar la key, usando original:', key)
    }

    console.log('📂 Key decodificada para S3:', key)

    // Verificar autenticación: usuario logueado tiene prioridad
    const isAuthenticated = await isUserAuthenticated(req)

    // Si no está autenticado, verificar contraseña mediante Authorization header
    if (!isAuthenticated) {
      const authHeader = req.headers.get('authorization')
      const hasValidPassword = await verifyMediaPassword(authHeader)

      if (!hasValidPassword) {
        console.log('⛔ Acceso denegado a media: sin autenticación ni contraseña válida')

        // Detectar si la petición viene de un navegador (Accept: text/html)
        const acceptHeader = req.headers.get('accept') || ''
        const isBrowserRequest = acceptHeader.includes('text/html')

        if (isBrowserRequest) {
          // Redirigir a la página bonita con el diálogo personalizado
          // Usar URL pública correcta (no el 0.0.0.0 interno del contenedor)
          const publicUrl =
            process.env.PAYLOAD_PUBLIC_SERVER_URL ||
            process.env.NEXT_PUBLIC_SERVER_URL ||
            `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}`

          const mediaPageUrl = new URL(publicUrl)
          mediaPageUrl.pathname = `/media/${key}`
          console.log('🔀 Redirigiendo a página bonita:', mediaPageUrl.toString())
          return Response.redirect(mediaPageUrl.toString(), 302)
        }

        // Para peticiones programáticas (API), devolver JSON
        return new Response(
          JSON.stringify({
            error: 'Acceso denegado',
            message: 'Se requiere contraseña para acceder a este archivo',
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
      }
      console.log('✅ Acceso a media permitido mediante contraseña')
    } else {
      console.log('✅ Acceso a media permitido mediante autenticación de usuario')
    }

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
    return new Response(new Uint8Array(buffer), { status, headers })
  } catch (error: any) {
    const status = error?.$metadata?.httpStatusCode || 500
    return new Response(`Error al obtener media: ${error?.message || 'desconocido'}`, { status })
  }
}
