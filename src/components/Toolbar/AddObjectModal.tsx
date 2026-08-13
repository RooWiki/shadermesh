import { useState } from 'react'
import { useSceneStore } from '../../state/sceneStore'
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
  const [sphereWS, setSphereWS] = useState(16)
  const [sphereHS, setSphereHS] = useState(12)

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

  const numInput = (label: string, value: number, set: (n: number) => void, min = 0.001, step = 0.1) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="number"
        className={styles.input}
        value={value}
        step={step}
        min={min}
        onChange={e => set(parseFloat(e.target.value) || min)}
      />
    </label>
  )

  const intInput = (label: string, value: number, set: (n: number) => void, min = 1) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="number"
        className={styles.input}
        value={value}
        step={1}
        min={min}
        onChange={e => set(Math.max(min, parseInt(e.target.value) || min))}
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
              {numInput('Width', planeW, setPlaneW)}
              {numInput('Height', planeH, setPlaneH)}
              {intInput('Subdivisions X', planeSX, setPlaneSX)}
              {intInput('Subdivisions Y', planeSY, setPlaneSY)}
              <div className={styles.hint}>
                {(planeSX + 1) * (planeSY + 1)} vertices · {planeSX * planeSY * 2} triangles
              </div>
            </>
          )}
          {type === 'cube' && (
            <>
              {numInput('Width', cubeW, setCubeW)}
              {numInput('Height', cubeH, setCubeH)}
              {numInput('Depth', cubeD, setCubeD)}
              <div className={styles.hint}>24 vertices · 12 triangles</div>
            </>
          )}
          {type === 'sphere' && (
            <>
              {numInput('Radius', sphereR, setSphereR)}
              {intInput('Width Segments', sphereWS, setSphereWS, 3)}
              {intInput('Height Segments', sphereHS, setSphereHS, 2)}
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
