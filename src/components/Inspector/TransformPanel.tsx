import { useState, useEffect, useRef } from 'react'
import type { Transform } from '../../core/MeshObject'
import styles from './Inspector.module.css'

interface NumberInputProps {
  value: number
  onChange: (n: number) => void
  step?: number
  decimals?: number
  className?: string
}

function NumberInput({ value, onChange, step = 0.1, decimals = 3, className }: NumberInputProps) {
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
      value={display}
      className={className}
      onFocus={() => { focused.current = true }}
      onBlur={e => {
        focused.current = false
        commit(e.target.value)
      }}
      onChange={e => {
        setDisplay(e.target.value)
        const n = parseFloat(e.target.value)
        if (!isNaN(n)) onChange(n)
      }}
      onWheel={e => {
        e.preventDefault()
        const n = parseFloat(display)
        const current = isNaN(n) ? 0 : n
        const next = e.deltaY < 0 ? current + step : current - step
        const rounded = parseFloat(next.toFixed(decimals))
        onChange(rounded)
        if (!focused.current) setDisplay(rounded.toFixed(decimals))
      }}
      onKeyDown={e => {
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

interface Vec3InputProps {
  label: string
  values: [number, number, number]
  onChange: (v: [number, number, number]) => void
  step?: number
  decimals?: number
}

const AXIS_COLORS = ['axisX', 'axisY', 'axisZ'] as const

function Vec3Input({ label, values, onChange, step = 0.1, decimals = 3 }: Vec3InputProps) {
  const axes = ['X', 'Y', 'Z'] as const

  const handleChange = (axis: number, n: number) => {
    const next = [...values] as [number, number, number]
    next[axis] = n
    onChange(next)
  }

  return (
    <div className={styles.vec3Block}>
      <div className={styles.vec3Label}>{label}</div>
      <div className={styles.vec3Inputs}>
        {axes.map((ax, i) => (
          <label key={ax} className={styles.axisField}>
            <span className={`${styles.axisTag} ${styles[AXIS_COLORS[i]]}`}>{ax}</span>
            <NumberInput
              value={values[i]}
              onChange={n => handleChange(i, n)}
              step={step}
              decimals={decimals}
              className={styles.numInput}
            />
          </label>
        ))}
      </div>
    </div>
  )
}

interface TransformPanelProps {
  transform: Transform
  onTransformChange: (t: Partial<Transform>) => void
}

export function TransformPanel({ transform, onTransformChange }: TransformPanelProps) {
  const toDeg = (r: number) => (r * 180) / Math.PI
  const toRad = (d: number) => (d * Math.PI) / 180
  const rotDeg = transform.rotation.map(toDeg) as [number, number, number]

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Transform</div>
      <Vec3Input
        label="Position"
        values={transform.position}
        onChange={position => onTransformChange({ position })}
        step={0.1}
        decimals={3}
      />
      <Vec3Input
        label="Rotation"
        values={rotDeg}
        onChange={deg => onTransformChange({ rotation: deg.map(toRad) as [number, number, number] })}
        step={1}
        decimals={1}
      />
      <Vec3Input
        label="Scale"
        values={transform.scale}
        onChange={scale => onTransformChange({ scale })}
        step={0.01}
        decimals={3}
      />
    </div>
  )
}
