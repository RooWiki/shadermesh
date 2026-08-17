import type { MouseEvent } from 'react'

export function makeLabelDrag(
  value: number,
  onChange: (n: number) => void,
  step: number,
  decimals: number,
) {
  return (e: MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startValue = value
    let active = false
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: globalThis.MouseEvent) => {
      const delta = ev.clientX - startX
      if (!active && Math.abs(delta) < 3) return
      active = true
      onChange(parseFloat((startValue + delta * step).toFixed(decimals)))
    }

    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }
}
