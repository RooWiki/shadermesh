import { useState, useEffect, useRef } from 'react'

export interface NumberInputProps {
  value: number
  onChange: (n: number) => void
  step?: number
  decimals?: number
  readOnly?: boolean
  className?: string
}

export function NumberInput({ value, onChange, step = 0.1, decimals = 3, readOnly = false, className }: NumberInputProps) {
  const [display, setDisplay] = useState(value.toFixed(decimals))
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) {
      setDisplay(value.toFixed(decimals))
    }
  }, [value, decimals])

  const commit = (raw: string) => {
    const n = parseFloat(raw)
    if (!isNaN(n)) {
      onChange(n)
      setDisplay(n.toFixed(decimals))
    } else {
      setDisplay(value.toFixed(decimals))
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      readOnly={readOnly}
      value={display}
      className={className}
      onFocus={() => { focused.current = true }}
      onBlur={e => {
        focused.current = false
        if (!readOnly) commit(e.target.value)
      }}
      onChange={e => {
        if (readOnly) return
        setDisplay(e.target.value)
        const n = parseFloat(e.target.value)
        if (!isNaN(n)) onChange(n)
      }}
      onWheel={e => {
        if (readOnly) return
        e.preventDefault()
        const n = parseFloat(display)
        const current = isNaN(n) ? 0 : n
        const next = e.deltaY < 0 ? current + step : current - step
        const rounded = parseFloat(next.toFixed(decimals))
        onChange(rounded)
        if (!focused.current) setDisplay(rounded.toFixed(decimals))
      }}
      onKeyDown={e => {
        if (readOnly) return
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          const n = parseFloat(display)
          const next = isNaN(n) ? step : n + step
          onChange(next)
          setDisplay(next.toFixed(decimals))
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          const n = parseFloat(display)
          const next = isNaN(n) ? -step : n - step
          onChange(next)
          setDisplay(next.toFixed(decimals))
        }
      }}
    />
  )
}
