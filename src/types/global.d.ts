// Global type declarations for next-intl and Next.js modules

// Re-export next-intl types to ensure they're available
declare module 'next-intl' {
  export {
    useTranslations,
    useLocale,
    useMessages,
    useNow,
    useTimeZone,
    useFormatter,
  } from 'next-intl/client'
}

declare module 'next-intl/server' {
  export {
    getTranslations,
    getLocale,
    getMessages,
    getNow,
    getTimeZone,
    getFormatter,
    unstable_setRequestLocale,
    getRequestConfig,
  } from 'next-intl/server'
}

// Ensure Next.js navigation types are available
declare module 'next/navigation' {
  export {
    useRouter,
    usePathname,
    useSearchParams,
    useParams,
    notFound,
    redirect,
    permanentRedirect,
  } from 'next/navigation'
}

declare module 'next/headers' {
  export { cookies, headers } from 'next/headers'
}

// Global types for the application
type Messages = typeof import('../../messages/en.json')

declare global {
  // Use type safe message keys with this type
  interface IntlMessages extends Messages {}
}

export {}
