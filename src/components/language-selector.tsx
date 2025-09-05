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

export function LanguageSelector() {
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()
  const locale = useLocale()
  const t = useTranslations('common')

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) return // No cambiar si ya está en el mismo idioma

    startTransition(async () => {
      try {
        // Establecer la cookie directamente
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`

        // Recargar la página para que tome efecto el cambio
        window.location.reload()
      } catch (error) {
        console.error('Error changing language:', error)
      }
    })
  }

  const getLanguageInfo = (lang: string) => ({
    name: t(`language.${lang}`),
    flag: lang === 'es' ? '🇪🇸' : '🇺🇸',
  })

  const currentLanguageInfo = getLanguageInfo(locale)

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
