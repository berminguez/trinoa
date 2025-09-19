import { cookies } from 'next/headers'
import { locales, defaultLocale } from '@/i18n'

/**
 * Helper para obtener traducciones en server components
 * sin depender de la configuración compleja de next-intl
 */
export async function getServerTranslations(namespace?: string) {
  // Detectar locale desde la cookie NEXT_LOCALE
  let locale: (typeof locales)[number] = defaultLocale

  try {
    const cookieStore = await cookies()
    const localeCookie = cookieStore.get('NEXT_LOCALE')

    if (localeCookie && locales.includes(localeCookie.value as (typeof locales)[number])) {
      locale = localeCookie.value as (typeof locales)[number]
    }
  } catch (error) {
    console.warn('Error reading locale cookie, using default:', error)
  }

  // Cargar mensajes para el locale detectado
  let messages: any = {}
  try {
    messages = (await import(`../../messages/${locale}.json`)).default
  } catch (error) {
    console.warn('Error loading messages, falling back to default:', error)
    try {
      messages = (await import('../../messages/es.json')).default
    } catch (importError) {
      console.warn('Error importing fallback messages:', importError)
      messages = {}
    }
  }

  // Crear función de traducción con soporte para interpolación de variables
  const t = (key: string, variables?: Record<string, string | number>) => {
    const keys = key.split('.')
    let value: any = namespace ? messages[namespace] : messages

    for (const k of keys) {
      value = value?.[k]
    }

    if (typeof value === 'string') {
      // Si hay variables, realizar interpolación
      if (variables) {
        let result = value
        Object.entries(variables).forEach(([varKey, varValue]) => {
          const placeholder = new RegExp(`{{${varKey}}}`, 'g')
          result = result.replace(placeholder, String(varValue))
        })
        return result
      }
      return value
    }

    return key
  }

  return {
    locale,
    t,
    messages: namespace ? messages[namespace] : messages,
  }
}
