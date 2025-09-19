import React from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { cookies } from 'next/headers'
import { locales, defaultLocale } from '@/i18n'
import { LocaleProvider } from '@/lib/locale-context'

import './styles.css'
import { ActiveThemeProvider } from '@/components/active-theme'

export const metadata = {
  description: 'Trinoa',
  title: 'Trinoa',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  // Detectar locale desde la cookie NEXT_LOCALE
  let locale: (typeof locales)[number] = defaultLocale
  let messages: any = {}

  try {
    const cookieStore = await cookies()
    const localeCookie = cookieStore.get('NEXT_LOCALE')

    if (localeCookie && locales.includes(localeCookie.value as (typeof locales)[number])) {
      locale = localeCookie.value as (typeof locales)[number]
    }

    console.log('[Layout] Detected locale:', locale, 'from cookie:', localeCookie?.value)

    // Cargar mensajes para el locale detectado
    messages = (await import(`../../../messages/${locale}.json`)).default
  } catch (error) {
    console.warn('Error getting locale, falling back to default:', error)
    locale = defaultLocale
    try {
      messages = (await import('../../../messages/es.json')).default
    } catch (importError) {
      console.warn('Error importing fallback messages:', importError)
      messages = {}
    }
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LocaleProvider initialLocale={locale}>
            <ActiveThemeProvider initialTheme='trinoa'>
              <main>{children}</main>
            </ActiveThemeProvider>
          </LocaleProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
