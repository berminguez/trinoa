'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  IconLoader2,
  IconPlus,
  IconUser,
  IconMail,
  IconBuilding,
  IconKey,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconBuildingSkyscraper,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClientAction } from '@/actions/clients'
import { toast } from 'sonner'
import type { User, Company } from '@/payload-types'
import { CompanySelector } from './CompanySelector'

interface CreateClientModalProps {
  trigger?: React.ReactNode
  onSuccess?: (client: User) => void
}

export function CreateClientModal({ trigger, onSuccess }: CreateClientModalProps) {
  const t = useTranslations('clients.createModal')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [filial, setFilial] = useState('')
  const [password, setPassword] = useState('')
  const [generatePassword, setGeneratePassword] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [companyError, setCompanyError] = useState('')
  const [filialError, setFilialError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [isCreating, setIsCreating] = useState(false)
  const [createdClient, setCreatedClient] = useState<{
    user: User
    generatedPassword?: string
  } | null>(null)

  // Validaciones
  const validateName = (value: string): string => {
    if (!value.trim()) {
      return t('errors.nameRequired')
    }
    if (value.trim().length < 2) {
      return t('errors.nameMinLength')
    }
    if (value.trim().length > 100) {
      return t('errors.nameMaxLength')
    }
    return ''
  }

  const validateEmail = (value: string): string => {
    if (!value.trim()) {
      return t('errors.emailRequired')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value.trim())) {
      return t('errors.emailInvalid')
    }
    return ''
  }

  const validateCompany = (company?: Company | null): string => {
    const companyToValidate = company !== undefined ? company : selectedCompany
    if (!companyToValidate) {
      return t('errors.companyRequired')
    }
    return ''
  }

  const validateFilial = (value: string): string => {
    // Filial es opcional, solo validar si se proporciona
    if (value.trim() && value.trim().length < 2) {
      return t('errors.filialMinLength')
    }
    if (value.trim().length > 100) {
      return t('errors.filialMaxLength')
    }
    return ''
  }

  const validatePassword = (value: string): string => {
    if (!generatePassword && !value.trim()) {
      return t('errors.passwordRequired')
    }
    if (!generatePassword && value.length < 8) {
      return t('errors.passwordMinLength')
    }
    if (!generatePassword && value.length > 128) {
      return t('errors.passwordMinLength') // Reusing this message for max length
    }
    return ''
  }

  const handleNameChange = (value: string) => {
    setName(value)
    setNameError(validateName(value))
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    setEmailError(validateEmail(value))
  }

  const handleCompanyChange = (company: Company | null) => {
    console.log('🔷 handleCompanyChange called with:', company)
    setSelectedCompany(company)
    const error = validateCompany(company)
    setCompanyError(error)
    console.log('🔷 Validation result:', error)
  }

  const handleFilialChange = (value: string) => {
    setFilial(value)
    setFilialError(validateFilial(value))
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setPasswordError(validatePassword(value))
  }

  const handleGeneratePasswordChange = (checked: boolean) => {
    setGeneratePassword(checked)
    if (checked) {
      setPassword('')
      setPasswordError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar todos los campos
    const nameErr = validateName(name)
    const emailErr = validateEmail(email)
    const companyErr = validateCompany(selectedCompany)
    const filialErr = validateFilial(filial)
    const passwordErr = validatePassword(password)

    setNameError(nameErr)
    setEmailError(emailErr)
    setCompanyError(companyErr)
    setFilialError(filialErr)
    setPasswordError(passwordErr)

    if (nameErr || emailErr || companyErr || filialErr || passwordErr) {
      return
    }

    setIsCreating(true)

    try {
      const result = await createClientAction({
        name: name.trim(),
        email: email.trim(),
        empresa: selectedCompany!.id, // Usar ID de la empresa seleccionada
        filial: filial.trim() || undefined, // Filial opcional
        password: generatePassword ? undefined : password.trim(),
      })

      if (result.success && result.data) {
        setCreatedClient(result.data)
        toast.success(result.message || t('success'))
        onSuccess?.(result.data.user)
      } else {
        toast.error(result.message || t('errors.serverError'))
      }
    } catch (error) {
      console.error('Error creating client:', error)
      toast.error(t('errors.serverError'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)

    // Limpiar formulario al cerrar
    if (!newOpen) {
      setName('')
      setEmail('')
      setSelectedCompany(null)
      setFilial('')
      setPassword('')
      setGeneratePassword(true)
      setShowPassword(false)
      setNameError('')
      setEmailError('')
      setCompanyError('')
      setFilialError('')
      setPasswordError('')
      setCreatedClient(null)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t('passwordCopied'))
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      toast.error(t('errors.copyError'))
    }
  }

  const isFormValid =
    name.trim().length >= 2 &&
    selectedCompany !== null &&
    !nameError &&
    !emailError &&
    !companyError &&
    !filialError &&
    !passwordError &&
    !isCreating

  // Si ya se creó el cliente, mostrar información de éxito
  if (createdClient) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger || (
            <Button className='gap-2'>
              <IconPlus className='h-4 w-4' />
              {t('create')}
            </Button>
          )}
        </DialogTrigger>

        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <IconUser className='h-5 w-5 text-green-600' />
              {t('title')} - {t('success')}
            </DialogTitle>
            <DialogDescription>
              El cliente ha sido creado y ya puede acceder al sistema.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            {/* Información del cliente */}
            <Card>
              <CardContent className='p-4 space-y-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <IconUser className='h-4 w-4 text-muted-foreground' />
                    <div>
                      <p className='text-sm font-medium'>{createdClient.user.name}</p>
                      <p className='text-xs text-muted-foreground'>{createdClient.user.email}</p>
                    </div>
                  </div>
                  <Badge variant='secondary' className='text-xs'>
                    USER
                  </Badge>
                </div>

                <div className='flex items-center gap-2'>
                  <IconBuilding className='h-4 w-4 text-muted-foreground' />
                  <p className='text-sm'>
                    {createdClient.user.empresa
                      ? typeof createdClient.user.empresa === 'object' &&
                        createdClient.user.empresa !== null
                        ? (createdClient.user.empresa as Company).name
                        : String(createdClient.user.empresa)
                      : 'Sin empresa'}
                  </p>
                </div>

                {createdClient.user.filial && (
                  <div className='flex items-center gap-2'>
                    <IconBuildingSkyscraper className='h-4 w-4 text-muted-foreground' />
                    <p className='text-sm'>{createdClient.user.filial}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contraseña generada */}
            {createdClient.generatedPassword && (
              <Card className='border-orange-200 bg-orange-50'>
                <CardContent className='p-4'>
                  <div className='flex items-center gap-2 mb-2'>
                    <IconKey className='h-4 w-4 text-orange-600' />
                    <Label className='text-sm font-medium text-orange-800'>
                      {t('generatedPassword')}
                    </Label>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={createdClient.generatedPassword}
                      readOnly
                      className='font-mono text-sm bg-white'
                    />
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <IconEyeOff className='h-4 w-4' />
                      ) : (
                        <IconEye className='h-4 w-4' />
                      )}
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => copyToClipboard(createdClient.generatedPassword!)}
                    >
                      <IconCopy className='h-4 w-4' />
                    </Button>
                  </div>
                  <p className='text-xs text-orange-700 mt-2'>⚠️ {t('generatedPasswordWarning')}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => handleOpenChange(false)}>{t('close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className='gap-2'>
            <IconPlus className='h-4 w-4' />
            {t('create')}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <IconPlus className='h-5 w-5' />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Nombre */}
          <div className='space-y-2'>
            <Label htmlFor='name'>{t('name')} *</Label>
            <Input
              id='name'
              placeholder={t('namePlaceholder')}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={nameError ? 'border-destructive' : ''}
              disabled={isCreating}
              maxLength={100}
            />
            {nameError && <p className='text-sm text-destructive'>{nameError}</p>}
            <p className='text-xs text-muted-foreground'>
              {name.length}/100 {t('characters')}
            </p>
          </div>

          {/* Email */}
          <div className='space-y-2'>
            <Label htmlFor='email'>{t('email')} *</Label>
            <Input
              id='email'
              type='email'
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className={emailError ? 'border-destructive' : ''}
              disabled={isCreating}
            />
            {emailError && <p className='text-sm text-destructive'>{emailError}</p>}
          </div>

          {/* Empresa */}
          <CompanySelector
            value={selectedCompany as Company | null}
            onValueChange={handleCompanyChange}
            placeholder={t('companyPlaceholder')}
            disabled={isCreating}
            required={true}
            error={companyError}
            label={t('company')}
            className='space-y-2'
          />

          {/* Filial/Departamento */}
          <div className='space-y-2'>
            <Label htmlFor='filial' className='flex items-center gap-1'>
              <IconBuildingSkyscraper className='h-4 w-4' />
              {t('filial')}
            </Label>
            <Input
              id='filial'
              placeholder={t('filialPlaceholder')}
              value={filial}
              onChange={(e) => handleFilialChange(e.target.value)}
              className={filialError ? 'border-destructive' : ''}
              disabled={isCreating}
              maxLength={100}
            />
            {filialError && <p className='text-sm text-destructive'>{filialError}</p>}
            <p className='text-xs text-muted-foreground'>
              {t('optional')} - {filial.length}/100 {t('characters')}
            </p>
          </div>

          {/* Contraseña */}
          <div className='space-y-3'>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='generatePassword'
                checked={generatePassword}
                onCheckedChange={handleGeneratePasswordChange}
                disabled={isCreating}
              />
              <Label htmlFor='generatePassword' className='text-sm'>
                {t('generatePassword')}
              </Label>
            </div>

            {!generatePassword && (
              <div className='space-y-2'>
                <Label htmlFor='password'>{t('password')} *</Label>
                <div className='flex items-center gap-2'>
                  <Input
                    id='password'
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('passwordPlaceholder')}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className={passwordError ? 'border-destructive' : ''}
                    disabled={isCreating}
                    maxLength={128}
                  />
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isCreating}
                  >
                    {showPassword ? (
                      <IconEyeOff className='h-4 w-4' />
                    ) : (
                      <IconEye className='h-4 w-4' />
                    )}
                  </Button>
                </div>
                {passwordError && <p className='text-sm text-destructive'>{passwordError}</p>}
                <p className='text-xs text-muted-foreground'>
                  {password.length}/128 {t('characters')}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              {t('cancel')}
            </Button>
            <Button type='submit' disabled={!isFormValid}>
              {isCreating ? (
                <>
                  <IconLoader2 className='mr-2 h-4 w-4 animate-spin' />
                  {t('creating')}
                </>
              ) : (
                <>
                  <IconPlus className='mr-2 h-4 w-4' />
                  {t('create')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
