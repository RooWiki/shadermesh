import type { UVMapConfig, UVProjectionType } from '../../geometry/uvProjection'
import { defaultUVMapConfig } from '../../geometry/uvProjection'
import { useSceneStore } from '../../state/sceneStore'
import { NumberInput } from './NumberInput'
import { makeLabelDrag } from './labelDrag'
import styles from './Inspector.module.css'

const PROJECTIONS: { value: UVProjectionType; label: string }[] = [
  { value: 'shape_default', label: 'Shape Default' },
  { value: 'planar',        label: 'Planar' },
  { value: 'disc',          label: 'Disc' },
  { value: 'radial',        label: 'Radial' },
  { value: 'cylindrical',   label: 'Cylindrical' },
  { value: 'spherical',     label: 'Spherical' },
  { value: 'box',           label: 'Box' },
]

interface Props {
  objectId: string
  uvMap: UVMapConfig | undefined
}

export function UVMapPanel({ objectId, uvMap }: Props) {
  const applyUVProjection = useSceneStore(s => s.applyUVProjection)
  const cfg = uvMap ?? defaultUVMapConfig()

  const update = (partial: Partial<UVMapConfig>) =>
    applyUVProjection(objectId, { ...cfg, ...partial })

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>UV Map</div>

      <div className={styles.paramRow}>
        <span className={styles.paramLabel}>Projection</span>
        <select
          className={styles.uvSelect}
          value={cfg.projection}
          onChange={e => update({ projection: e.target.value as UVProjectionType })}
        >
          {PROJECTIONS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.uvRow2}>
        <div className={styles.paramRow}>
          <span className={styles.paramLabel} onMouseDown={makeLabelDrag(cfg.scaleX, v => update({ scaleX: v }), 0.1, 3)}>Scale X</span>
          <NumberInput value={cfg.scaleX} onChange={v => update({ scaleX: v })} step={0.1} decimals={3} className={styles.paramInput} />
        </div>
        <div className={styles.paramRow}>
          <span className={styles.paramLabel} onMouseDown={makeLabelDrag(cfg.scaleY, v => update({ scaleY: v }), 0.1, 3)}>Scale Y</span>
          <NumberInput value={cfg.scaleY} onChange={v => update({ scaleY: v })} step={0.1} decimals={3} className={styles.paramInput} />
        </div>
      </div>

      <div className={styles.uvRow2}>
        <div className={styles.paramRow}>
          <span className={styles.paramLabel} onMouseDown={makeLabelDrag(cfg.offsetX, v => update({ offsetX: v }), 0.01, 3)}>Offset X</span>
          <NumberInput value={cfg.offsetX} onChange={v => update({ offsetX: v })} step={0.01} decimals={3} className={styles.paramInput} />
        </div>
        <div className={styles.paramRow}>
          <span className={styles.paramLabel} onMouseDown={makeLabelDrag(cfg.offsetY, v => update({ offsetY: v }), 0.01, 3)}>Offset Y</span>
          <NumberInput value={cfg.offsetY} onChange={v => update({ offsetY: v })} step={0.01} decimals={3} className={styles.paramInput} />
        </div>
      </div>

      <div className={styles.paramRow}>
        <span className={styles.paramLabel} onMouseDown={makeLabelDrag(cfg.rotation, v => update({ rotation: v }), 1, 1)}>Rotation</span>
        <NumberInput value={cfg.rotation} onChange={v => update({ rotation: v })} step={1} decimals={1} className={styles.paramInput} />
      </div>

      <div className={styles.uvToggles}>
        <button
          className={`${styles.uvToggleBtn} ${cfg.flipU ? styles.uvToggleOn : ''}`}
          onClick={() => update({ flipU: !cfg.flipU })}
        >Flip U</button>
        <button
          className={`${styles.uvToggleBtn} ${cfg.flipV ? styles.uvToggleOn : ''}`}
          onClick={() => update({ flipV: !cfg.flipV })}
        >Flip V</button>
        <button
          className={`${styles.uvToggleBtn} ${cfg.swapUV ? styles.uvToggleOn : ''}`}
          onClick={() => update({ swapUV: !cfg.swapUV })}
        >Swap U/V</button>
      </div>
    </div>
  )
}
