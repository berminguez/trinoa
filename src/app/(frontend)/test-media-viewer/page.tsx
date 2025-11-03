import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { IconAlertCircle, IconExternalLink, IconFileTypePdf, IconPhoto } from '@tabler/icons-react'
import Link from 'next/link'

export default function TestMediaViewerPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🧪 Prueba de Visor de Media Protegido</h1>
        <p className="text-muted-foreground">
          Esta página te permite probar las nuevas rutas de media con diálogo personalizado
        </p>
      </div>

      {/* Explicación */}
      <Alert className="mb-6">
        <IconAlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Primero debes configurar una contraseña en{' '}
          <Link href="/settings/media-password" className="underline font-medium">
            Configuración de Contraseña Media
          </Link>
        </AlertDescription>
      </Alert>

      {/* Comparación de Rutas */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>📍 Diferencia entre Rutas</CardTitle>
          <CardDescription>Entiende cuál usar en cada caso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 rounded-r">
            <p className="font-medium text-red-900 mb-1">❌ API Directa (devuelve JSON)</p>
            <code className="text-sm text-red-800 break-all">
              /api/media?key=documentos/archivo.pdf
            </code>
            <p className="text-sm text-red-700 mt-2">
              → Devuelve JSON de error si no estás logueado
            </p>
          </div>

          <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 rounded-r">
            <p className="font-medium text-green-900 mb-1">✅ Página Bonita (con diálogo)</p>
            <code className="text-sm text-green-800 break-all">
              /media/documentos/archivo.pdf
            </code>
            <p className="text-sm text-green-700 mt-2">
              → Muestra página bonita con diálogo pidiendo contraseña
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ejemplos para Probar */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🎯 Ejemplos para Probar</CardTitle>
          <CardDescription>
            Abre estos links en una <strong>ventana de incógnito</strong> para simular usuario sin login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ejemplo con archivo que probablemente existe */}
          <div className="p-4 border rounded-lg bg-gray-50">
            <div className="flex items-start gap-3 mb-2">
              <IconFileTypePdf className="h-5 w-5 text-red-600 mt-1" />
              <div className="flex-1">
                <p className="font-medium mb-1">Ejemplo PDF</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Reemplaza esta ruta con la de un archivo real de tu sistema
                </p>
                <code className="text-xs bg-white px-2 py-1 rounded border block mb-2 break-all">
                  /media/[ruta-de-tu-archivo].pdf
                </code>
                <Link
                  href="/media/test-document.pdf"
                  target="_blank"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Probar con documento de ejemplo
                  <IconExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-gray-50">
            <div className="flex items-start gap-3 mb-2">
              <IconPhoto className="h-5 w-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <p className="font-medium mb-1">Ejemplo Imagen</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Reemplaza esta ruta con la de una imagen real de tu sistema
                </p>
                <code className="text-xs bg-white px-2 py-1 rounded border block mb-2 break-all">
                  /media/[ruta-de-tu-imagen].png
                </code>
                <Link
                  href="/media/test-image.png"
                  target="_blank"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Probar con imagen de ejemplo
                  <IconExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Cómo Probar</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              Configura una contraseña en{' '}
              <Link href="/settings/media-password" className="underline text-blue-600">
                Configuración Media
              </Link>
            </li>
            <li>
              Identifica la ruta de un archivo real en tu S3 (por ejemplo:{' '}
              <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                documentos/informe.pdf
              </code>
              )
            </li>
            <li>
              Construye la URL:{' '}
              <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                /media/documentos/informe.pdf
              </code>
            </li>
            <li>
              <strong>Abre esa URL en ventana de incógnito</strong> (para simular usuario sin login)
            </li>
            <li>Deberías ver una página bonita con un diálogo pidiendo solo la contraseña</li>
            <li>Introduce la contraseña configurada</li>
            <li>¡El archivo se mostrará en la página!</li>
          </ol>
        </CardContent>
      </Card>

      {/* Cómo obtener la ruta de un archivo */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>🔍 ¿Cómo Saber la Ruta de un Archivo?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Si tienes una URL como:</p>
          <code className="block bg-gray-100 p-3 rounded text-xs break-all">
            https://trinoa.com/api/media?key=documentos/manual-usuario.pdf
          </code>
          
          <p className="font-medium">Toma solo lo que está después de <code>key=</code>:</p>
          <code className="block bg-blue-100 p-3 rounded text-xs break-all">
            documentos/manual-usuario.pdf
          </code>
          
          <p className="font-medium">Y úsala en la nueva ruta:</p>
          <code className="block bg-green-100 p-3 rounded text-xs break-all">
            https://trinoa.com/media/documentos/manual-usuario.pdf
          </code>
        </CardContent>
      </Card>
    </div>
  )
}

