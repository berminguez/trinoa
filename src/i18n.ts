import { getRequestConfig } from 'next-intl/server'

export const locales = ['es', 'en'] as const
export const defaultLocale = 'es' as const

export default getRequestConfig(async ({ requestLocale }: { requestLocale: string }) => {
  // requestLocale contiene el locale que se pasó al provider
  // Si no hay requestLocale (server-side), usamos el default
  let locale = requestLocale || defaultLocale

  // Validar que el locale sea válido
  if (!locales.includes(locale as (typeof locales)[number])) {
    locale = defaultLocale
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
