import React from 'react'

import './styles.css'
import { ActiveThemeProvider } from '@/components/active-theme'

export const metadata = {
  description: 'A blank template using Payload in a Next.js app.',
  title: 'Payload Blank Template',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang='en'>
      <body>
        <ActiveThemeProvider initialTheme='trinoa'>
          <main>{children}</main>
        </ActiveThemeProvider>
      </body>
    </html>
  )
}
