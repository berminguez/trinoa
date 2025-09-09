import { getRequestConfig } from 'next-intl/server'

export const locales = ['es', 'en'] as const
export const defaultLocale = 'es' as const

export default getRequestConfig(async ({ locale }) => {
  // Use the locale parameter directly, fallback to default if not provided
  const currentLocale = locale || defaultLocale

  // Validate the locale
  if (!locales.includes(currentLocale as any)) {
    return {
      locale: defaultLocale,
      messages: (await import(`../messages/${defaultLocale}.json`)).default,
    }
  }

  return {
    locale: currentLocale,
    messages: (await import(`../messages/${currentLocale}.json`)).default,
  }
})
