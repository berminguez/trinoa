'use client'

import React from 'react'
import { UploadHandlersProvider } from '@payloadcms/ui'

type Props = {
  children: React.ReactNode
}

export default function AdminProviders({ children }: Props) {
  return <UploadHandlersProvider>{children}</UploadHandlersProvider>
}
