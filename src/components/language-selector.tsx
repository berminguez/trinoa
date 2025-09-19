'use client'

import { useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { IconLanguage, IconCheck } from '@tabler/icons-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { locales } from '@/i18n'
import { changeLocale } from '@/actions/change-locale'
import { useLocaleContext } from '@/lib/locale-context'

export function LanguageSelector() {
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()

  // Sistema original de next-intl
  const locale = useLocale()
  const t = useTranslations('common')

  // Nuestro sistema personalizado
  const { locale: contextLocale, setLocale } = useLocaleContext()

  // Usar el locale del contexto como fuente de verdad
  const currentLocale = contextLocale || locale

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === currentLocale) return // No cambiar si ya está en el mismo idioma

    startTransition(async () => {
      try {
        // Usar nuestro contexto personalizado para cambio inmediato
        setLocale(newLocale as (typeof locales)[number])

        // También establecer la cookie del lado del servidor para persistencia
        // Esto hará que la próxima carga de página use el locale correcto
        await changeLocale(newLocale, pathname)
      } catch (error) {
        console.error('Error changing language:', error)

        // Fallback: establecer la cookie directamente y recargar
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
        window.location.reload()
      }
    })
  }

  const getLanguageInfo = (lang: string) => ({
    name: t(`language.${lang}`),
    flag: lang === 'es' ? '🇪🇸' : '🇺🇸',
  })

  const currentLanguageInfo = getLanguageInfo(currentLocale)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='sm' className='h-7 w-7 p-0' disabled={isPending}>
          <span className='text-lg'>{currentLanguageInfo.flag}</span>
          <span className='sr-only'>Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        {locales.map((lang) => {
          const langInfo = getLanguageInfo(lang)
          return (
            <DropdownMenuItem
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className='flex items-center justify-between cursor-pointer'
            >
              <div className='flex items-center gap-2'>
                <span>{langInfo.flag}</span>
                <span>{langInfo.name}</span>
              </div>
              {locale === lang && <IconCheck className='h-4 w-4' />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
