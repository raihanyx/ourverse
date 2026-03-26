'use client'

import { useEffect, useRef } from 'react'

export default function PageTransition({ children }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(8px)'
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 300ms ease-out, transform 300ms ease-out'
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
        setTimeout(() => {
          el.style.transform = ''
          el.style.transition = ''
        }, 300)
      })
    })
  }, [])

  return <div ref={ref}>{children}</div>
}
