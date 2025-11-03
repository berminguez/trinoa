'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { IconKey, IconEye, IconEyeOff, IconLock } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface MediaPasswordDialogProps {
  open: boolean
  onPasswordSubmit: (password: string) => void | Promise<void>
  onCancel: () => void
  fileName?: string
  isLoading?: boolean
  externalError?: string
}

export function MediaPasswordDialog({
  open,
  onPasswordSubmit,
  onCancel,
  fileName,
  isLoading = false,
  externalError,
}: MediaPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  
  // Usar error externo si existe
  const displayError = externalError || error

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('Por favor, introduce una contraseña')
      return
    }
    onPasswordSubmit(password)
  }

  const handleCancel = () => {
    setPassword('')
    setError('')
    onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <IconLock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Archivo Protegido</DialogTitle>
              <DialogDescription>
                Este archivo requiere una contraseña para acceder
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {fileName && (
          <Alert className="bg-gray-50">
            <IconKey className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Archivo:</strong> {fileName}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña de acceso</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                  // Limpiar error externo también (se hace reseteando desde el padre)
                }}
                placeholder="Introduce la contraseña"
                className="pr-10"
                autoFocus
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
            {displayError && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{displayError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verificando...
                </>
              ) : (
                <>
                  <IconKey className="h-4 w-4 mr-2" />
                  Acceder
                </>
              )}
            </Button>
          </div>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          Si no tienes la contraseña, contacta con el administrador
        </p>
      </DialogContent>
    </Dialog>
  )
}

