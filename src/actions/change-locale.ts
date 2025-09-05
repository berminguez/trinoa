'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { locales } from '@/i18n'

export async function changeLocale(locale: string, redirectPath?: string) {
  // Validate the locale
  if (!locales.includes(locale as any)) {
    throw new Error('Invalid locale')
  }

  // Set the locale cookie
  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })

  // Redirect to the same page or provided path
  redirect(redirectPath || '/')
}
