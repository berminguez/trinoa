'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { locales, defaultLocale } from '@/i18n'

type Locale = (typeof locales)[number]

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  isLoading: boolean
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

interface LocaleProviderProps {
  children: ReactNode
  initialLocale?: Locale
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || defaultLocale)
  const [isLoading, setIsLoading] = useState(true)

  // Detectar locale desde cookie en el cliente
  useEffect(() => {
    const detectLocaleFromCookie = () => {
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';')
        const localeCookie = cookies.find((cookie) => cookie.trim().startsWith('NEXT_LOCALE='))

        if (localeCookie) {
          const cookieValue = localeCookie.split('=')[1]?.trim()
          if (cookieValue && locales.includes(cookieValue as Locale)) {
            setLocaleState(cookieValue as Locale)
          }
        }
      }
      setIsLoading(false)
    }

    detectLocaleFromCookie()
  }, [])

  const setLocale = (newLocale: Locale) => {
    if (!locales.includes(newLocale)) return

    setLocaleState(newLocale)

    // Establecer cookie
    if (typeof document !== 'undefined') {
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    }
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, isLoading }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocaleContext() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error('useLocaleContext must be used within a LocaleProvider')
  }
  return context
}

// Hook para obtener traducciones con nuestro contexto
export function useAppTranslations(namespace?: string) {
  const { locale, isLoading } = useLocaleContext()
  const [messages, setMessages] = useState<any>({})

  useEffect(() => {
    if (!isLoading) {
      import(`../../messages/${locale}.json`)
        .then((module) => {
          const allMessages = module.default
          setMessages(namespace ? allMessages[namespace] : allMessages)
        })
        .catch((error) => {
          console.warn('Error loading messages:', error)
          setMessages({})
        })
    }
  }, [locale, namespace, isLoading])

  const t = (key: string, variables?: Record<string, string | number>) => {
    const keys = key.split('.')
    let value: any = messages

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

  return { t, locale, isLoading }
}
