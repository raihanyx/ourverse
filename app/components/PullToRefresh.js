'use client'

import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 70
const MAX_PULL = 120

export default function PullToRefresh() {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const pullRef = useRef(0)
  const startY = useRef(null)
  const tracking = useRef(false)
  const rafId = useRef(0)

  useEffect(() => {
    const schedule = () => {
      if (rafId.current) return
      rafId.current = requestAnimationFrame(() => {
        rafId.current = 0
        setPull(pullRef.current)
      })
    }

    function isInsideScrollableAtNonTop(target) {
      let el = target
      while (el && el !== document.body && el.nodeType === 1) {
        const style = el instanceof Element ? getComputedStyle(el) : null
        if (style) {
          const oy = style.overflowY
          if ((oy === 'auto' || oy === 'scroll') && el.scrollTop > 0) return true
        }
        el = el.parentElement
      }
      return false
    }

    function onTouchStart(e) {
      if (refreshing) return
      if (window.scrollY > 0) return
      if (e.touches.length !== 1) return
      if (isInsideScrollableAtNonTop(e.target)) return
      startY.current = e.touches[0].clientY
      tracking.current = true
    }

    function onTouchMove(e) {
      if (!tracking.current || startY.current === null) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) {
        if (pullRef.current !== 0) {
          pullRef.current = 0
          schedule()
        }
        return
      }
      if (window.scrollY > 0) {
        tracking.current = false
        pullRef.current = 0
        schedule()
        return
      }
      const resisted = Math.min(MAX_PULL, dy * 0.5)
      pullRef.current = resisted
      schedule()
      if (e.cancelable && dy > 5) e.preventDefault()
    }

    function onTouchEnd() {
      if (!tracking.current) return
      tracking.current = false
      startY.current = null
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true)
        pullRef.current = THRESHOLD
        setPull(THRESHOLD)
        window.location.reload()
      } else {
        pullRef.current = 0
        setPull(0)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchEnd)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [refreshing])

  const progress = Math.min(1, pull / THRESHOLD)
  const ready = pull >= THRESHOLD || refreshing

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 100,
        transform: `translateY(${pull - 40}px)`,
        opacity: pull > 0 || refreshing ? 1 : 0,
        transition: (refreshing || pull === 0) ? 'transform 200ms ease, opacity 200ms ease' : 'none',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          style={{
            transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
            animation: refreshing ? 'ptr-spin 0.8s linear infinite' : 'none',
            color: ready ? '#E8675A' : '#A07060',
            transition: refreshing ? 'none' : 'transform 80ms linear',
          }}
        >
          <path
            d="M21 12a9 9 0 1 1-3.2-6.9"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M21 4v5h-5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
      <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
