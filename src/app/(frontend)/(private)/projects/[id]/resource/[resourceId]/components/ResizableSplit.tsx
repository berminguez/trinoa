'use client'

import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { cn } from '@/lib/utils'

interface ResizableSplitProps {
  left: React.ReactNode
  right: React.ReactNode
  className?: string
}

export default function ResizableSplit({ left, right, className }: ResizableSplitProps) {
  return (
    <PanelGroup
      direction='horizontal'
      className={cn('h-full w-full min-w-0 max-w-full overflow-hidden', className)}
    >
      <Panel
        defaultSize={50}
        minSize={30}
        maxSize={70}
        className='h-full min-w-0 max-w-full overflow-x-hidden'
      >
        <div className='h-full w-full min-w-0 max-w-full overflow-hidden'>{left}</div>
      </Panel>
      <PanelResizeHandle className='mx-1 w-1 shrink-0 cursor-col-resize bg-border' />
      <Panel
        defaultSize={50}
        minSize={30}
        maxSize={70}
        className='h-full min-w-0 max-w-full overflow-hidden'
      >
        <div className='h-full w-full min-w-0 max-w-full overflow-auto'>{right}</div>
      </Panel>
    </PanelGroup>
  )
}
