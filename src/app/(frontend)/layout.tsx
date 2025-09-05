import React from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { cookies } from 'next/headers'
import { locales, defaultLocale } from '@/i18n'

import './styles.css'
import { ActiveThemeProvider } from '@/components/active-theme'

export const metadata = {
  description: 'A blank template using Payload in a Next.js app.',
  title: 'Payload Blank Template',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  // Get locale from cookie first, fallback to default
  let locale: string = defaultLocale
  let messages: any = {}

  try {
    // Try to get locale from cookie
    const cookieStore = await cookies()
    const localeCookie = cookieStore.get('NEXT_LOCALE')
    if (localeCookie && locales.includes(localeCookie.value as any)) {
      locale = localeCookie.value
    }

    // Load messages for the detected locale
    messages = (await import(`../../../messages/${locale}.json`)).default
  } catch (error) {
    // Fallback to default locale if there's an error
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
          <ActiveThemeProvider initialTheme='trinoa'>
            <main>{children}</main>
          </ActiveThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
