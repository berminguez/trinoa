'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { IconKey, IconCheck, IconAlertCircle, IconCopy, IconEye, IconEyeOff } from '@tabler/icons-react'
import { updateMediaPassword } from '@/actions/configuracion/updateMediaPassword'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface MediaPasswordContentProps {
  initialEnabled: boolean
  initialHasPassword: boolean
  currentPassword?: string
}

export default function MediaPasswordContent({
  initialEnabled,
  initialHasPassword,
  currentPassword,
}: MediaPasswordContentProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await updateMediaPassword(enabled, password)

      if (result.success) {
        toast.success('Configuración actualizada', {
          description: result.message,
        })
        setPassword('') // Limpiar el campo después de guardar
      } else {
        toast.error('Error', {
          description: result.error,
        })
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Ha ocurrido un error inesperado',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyExampleUrl = () => {
    const exampleUrl = `${window.location.origin}/media/ruta/archivo.pdf`
    navigator.clipboard.writeText(exampleUrl)
    toast.success('URL copiada', {
      description: 'La URL de ejemplo se ha copiado al portapapeles',
    })
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <IconKey className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contraseña de Acceso a Media</h1>
          <p className="text-gray-600">
            Configura una contraseña para permitir acceso a archivos sin autenticación
          </p>
        </div>
      </div>

      {/* Formulario de configuración */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Acceso</CardTitle>
          <CardDescription>
            {enabled
              ? 'El acceso con contraseña está activo'
              : 'Activa el acceso con contraseña para permitir acceso sin login'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Toggle para habilitar/deshabilitar */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Activar acceso con contraseña</Label>
                <p className="text-sm text-gray-500">
                  Permite acceso a archivos media mediante una contraseña
                </p>
              </div>
              <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>

            {/* Contraseña actual (solo visible si hay una guardada) */}
            {enabled && initialHasPassword && currentPassword && (
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Contraseña actual</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    readOnly
                    className="pr-10 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? (
                      <IconEyeOff className="h-4 w-4" />
                    ) : (
                      <IconEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Campo de contraseña (solo visible si está habilitado) */}
            {enabled && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {initialHasPassword ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      initialHasPassword
                        ? 'Dejar en blanco para mantener la actual'
                        : 'Mínimo 8 caracteres'
                    }
                    minLength={initialHasPassword && password ? 8 : undefined}
                    required={!initialHasPassword}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <IconEyeOff className="h-4 w-4" />
                    ) : (
                      <IconEye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {initialHasPassword
                    ? 'Introduce una nueva contraseña solo si deseas cambiarla'
                    : 'Debe tener al menos 8 caracteres. Se recomienda usar letras, números y símbolos.'}
                </p>
              </div>
            )}

            {/* Botón guardar */}
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              <IconCheck className="h-4 w-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Ejemplo de uso */}
      {enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Compartir archivos protegidos</CardTitle>
            <CardDescription>
              Comparte archivos con personas que no tienen cuenta en la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">
                  URLs compatibles para compartir:
                </Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/media/ruta/archivo.pdf`}
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={copyExampleUrl}
                      title="Copiar URL"
                    >
                      <IconCopy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600">
                    También funciona con URLs antiguas:{' '}
                    <code className="bg-gray-100 px-1 py-0.5 rounded">/api/media?key=...</code>
                  </p>
                </div>
              </div>

              <Alert>
                <IconAlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Los usuarios sin login verán un diálogo pidiendo esta contraseña. Los usuarios
                  logueados accederán directamente sin contraseña.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

