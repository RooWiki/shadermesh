import { useState } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import { NumberInput } from '../Inspector/NumberInput'
import styles from './AddObjectModal.module.css'

type PrimitiveType = 'plane' | 'cube' | 'sphere'

interface AddObjectModalProps {
  onClose: () => void
}

export function AddObjectModal({ onClose }: AddObjectModalProps) {
  const [type, setType] = useState<PrimitiveType>('plane')
  const [planeW, setPlaneW] = useState(1)
  const [planeH, setPlaneH] = useState(1)
  const [planeSX, setPlaneSX] = useState(1)
  const [planeSY, setPlaneSY] = useState(1)
  const [cubeW, setCubeW] = useState(1)
  const [cubeH, setCubeH] = useState(1)
  const [cubeD, setCubeD] = useState(1)
  const [sphereR, setSphereR] = useState(0.5)
  const [sphereWS, setSphereWS] = useState(32)
  const [sphereHS, setSphereHS] = useState(16)

  const addPlane = useSceneStore(s => s.addPlane)
  const addCube = useSceneStore(s => s.addCube)
  const addSphere = useSceneStore(s => s.addSphere)

  const handleAdd = () => {
    if (type === 'plane') {
      addPlane({ width: planeW, height: planeH, subdivisionsX: planeSX, subdivisionsY: planeSY })
    } else if (type === 'cube') {
      addCube({ width: cubeW, height: cubeH, depth: cubeD })
    } else {
      addSphere({ radius: sphereR, widthSegments: sphereWS, heightSegments: sphereHS })
    }
    onClose()
  }

  const field = (label: string, value: number, set: (n: number) => void, step = 0.1, decimals = 3, min = 0.001) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <NumberInput
        className={styles.input}
        value={value}
        step={step}
        decimals={decimals}
        onChange={n => set(Math.max(min, n))}
      />
    </label>
  )

  const intField = (label: string, value: number, set: (n: number) => void, min = 1) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <NumberInput
        className={styles.input}
        value={value}
        step={1}
        decimals={0}
        onChange={n => set(Math.max(min, Math.round(n)))}
      />
    </label>
  )

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.title}>Add Object</div>

        <div className={styles.typeRow}>
          {(['plane', 'cube', 'sphere'] as PrimitiveType[]).map(t => (
            <button
              key={t}
              className={`${styles.typeBtn} ${type === t ? styles.typeBtnActive : ''}`}
              onClick={() => setType(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.fields}>
          {type === 'plane' && (
            <>
              {field('Width', planeW, setPlaneW)}
              {field('Height', planeH, setPlaneH)}
              {intField('Subdivisions X', planeSX, setPlaneSX)}
              {intField('Subdivisions Y', planeSY, setPlaneSY)}
              <div className={styles.hint}>
                {(planeSX + 1) * (planeSY + 1)} vertices · {planeSX * planeSY * 2} triangles
              </div>
            </>
          )}
          {type === 'cube' && (
            <>
              {field('Width', cubeW, setCubeW)}
              {field('Height', cubeH, setCubeH)}
              {field('Depth', cubeD, setCubeD)}
              <div className={styles.hint}>24 vertices · 12 triangles</div>
            </>
          )}
          {type === 'sphere' && (
            <>
              {field('Radius', sphereR, setSphereR)}
              {intField('Width Segments', sphereWS, setSphereWS, 3)}
              {intField('Height Segments', sphereHS, setSphereHS, 2)}
              <div className={styles.hint}>
                {(sphereWS + 1) * (sphereHS + 1)} vertices
              </div>
            </>
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.addBtn} onClick={handleAdd}>Add</button>
        </div>
      </div>
    </div>
  )
}
