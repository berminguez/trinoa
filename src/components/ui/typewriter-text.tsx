'use client'

import { useState, useEffect } from 'react'

interface TypewriterTextProps {
  text: string
  delay?: number
  onComplete?: () => void
  className?: string
}

export function TypewriterText({
  text,
  delay = 50,
  onComplete,
  className = '',
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    // Resetear cuando cambie el texto
    setDisplayedText('')
    setCurrentIndex(0)
  }, [text])

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex])
        setCurrentIndex((prev) => prev + 1)
      }, delay)

      return () => clearTimeout(timer)
    } else if (currentIndex === text.length && onComplete) {
      onComplete()
    }
  }, [currentIndex, text, delay, onComplete])

  return (
    <span className={className}>
      {displayedText}
      {currentIndex < text.length && <span className='animate-pulse'>|</span>}
    </span>
  )
}
