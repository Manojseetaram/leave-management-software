import { useEffect } from 'react'

/**
 * Stops the page behind an overlay from scrolling while it is open.
 *
 * The width of the scroll bar is added back, so the page behind does not
 * jump sideways when the overlay opens.
 */
export default function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return

    const { body } = document
    const previousOverflow = body.style.overflow
    const previousPaddingRight = body.style.paddingRight

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPaddingRight
    }
  }, [active])
}
