import type { PrimitiveSource } from '../../core/MeshObject'
import { useSceneStore } from '../../state/sceneStore'
import { NumberInput } from './NumberInput'
import styles from './Inspector.module.css'

const INT_KEYS = new Set(['radialSegments', 'tubularSegments', 'heightSegments', 'widthSegments', 'hemisphereSegments', 'subdivisionsX', 'subdivisionsY', 'sides', 'points', 'zigzags', 'segments'])

function toLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
}

function ParamRow({ label, value, onChange, isInt }: {
  label: string
  value: number
  onChange: (n: number) => void
  isInt: boolean
}) {
  return (
    <div className={styles.paramRow}>
      <span className={styles.paramLabel}>{label}</span>
      <NumberInput
        value={value}
        onChange={onChange}
        step={isInt ? 1 : 0.01}
        decimals={isInt ? 0 : 3}
        className={styles.paramInput}
      />
    </div>
  )
}

const PARAM_CONFIGS: Record<string, { label: string; isInt?: boolean }> = {
  width:             { label: 'Width' },
  height:            { label: 'Height' },
  depth:             { label: 'Depth' },
  subdivisionsX:     { label: 'Subdivisions X', isInt: true },
  subdivisionsY:     { label: 'Subdivisions Y', isInt: true },
  radius:            { label: 'Radius' },
  widthSegments:     { label: 'Width Segments', isInt: true },
  heightSegments:    { label: 'Height Segments', isInt: true },
  radiusTop:         { label: 'Radius Top' },
  radiusBottom:      { label: 'Radius Bottom' },
  radialSegments:    { label: 'Radial Segments', isInt: true },
  tube:              { label: 'Tube' },
  tubularSegments:   { label: 'Tubular Segments', isInt: true },
  rise:              { label: 'Rise / Rev' },
  hemisphereSegments:{ label: 'Hemisphere Segments', isInt: true },
}

interface Props {
  objectId: string
  sourceParams: PrimitiveSource
}

export function PrimitiveParamsPanel({ objectId, sourceParams }: Props) {
  const updatePrimitiveParams = useSceneStore(s => s.updatePrimitiveParams)

  const setParam = (key: string, value: number) => {
    if (sourceParams.kind === 'shape2d') {
      updatePrimitiveParams(objectId, { ...sourceParams, params: { ...sourceParams.params, [key]: value } })
    } else {
      updatePrimitiveParams(objectId, { ...sourceParams, params: { ...sourceParams.params, [key]: value } } as PrimitiveSource)
    }
  }

  const params = sourceParams.kind === 'shape2d' ? sourceParams.params : sourceParams.params as Record<string, number>
  const entries = Object.entries(params)

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Geometry</div>
      {entries.map(([key, value]) => {
        const cfg = PARAM_CONFIGS[key]
        const label = cfg?.label ?? toLabel(key)
        const isInt = cfg?.isInt ?? INT_KEYS.has(key)
        return (
          <ParamRow
            key={key}
            label={label}
            value={value}
            onChange={n => setParam(key, n)}
            isInt={isInt}
          />
        )
      })}
    </div>
  )
}
