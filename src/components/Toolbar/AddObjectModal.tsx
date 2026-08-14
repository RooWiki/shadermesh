import { useState } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import { NumberInput } from '../Inspector/NumberInput'
import styles from './AddObjectModal.module.css'

type PrimitiveType = 'plane' | 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule'

interface AddObjectModalProps {
  onClose: () => void
}

export function AddObjectModal({ onClose }: AddObjectModalProps) {
  const [type, setType] = useState<PrimitiveType>('plane')

  // Plane
  const [planeW, setPlaneW] = useState(1)
  const [planeH, setPlaneH] = useState(1)
  const [planeSX, setPlaneSX] = useState(1)
  const [planeSY, setPlaneSY] = useState(1)

  // Cube
  const [cubeW, setCubeW] = useState(1)
  const [cubeH, setCubeH] = useState(1)
  const [cubeD, setCubeD] = useState(1)

  // Sphere
  const [sphereR, setSphereR] = useState(0.5)
  const [sphereWS, setSphereWS] = useState(32)
  const [sphereHS, setSphereHS] = useState(16)

  // Cylinder
  const [cylRT, setCylRT] = useState(0.5)
  const [cylRB, setCylRB] = useState(0.5)
  const [cylH, setCylH] = useState(1)
  const [cylRS, setCylRS] = useState(16)
  const [cylHS, setCylHS] = useState(1)

  // Cone
  const [coneR, setConeR] = useState(0.5)
  const [coneH, setConeH] = useState(1)
  const [coneRS, setConeRS] = useState(16)

  // Torus
  const [torR, setTorR] = useState(0.5)
  const [torT, setTorT] = useState(0.2)
  const [torRS, setTorRS] = useState(12)
  const [torTS, setTorTS] = useState(32)

  // Capsule
  const [capR, setCapR] = useState(0.4)
  const [capH, setCapH] = useState(1)
  const [capRS, setCapRS] = useState(16)
  const [capHS, setCapHS] = useState(8)

  const addPlane    = useSceneStore(s => s.addPlane)
  const addCube     = useSceneStore(s => s.addCube)
  const addSphere   = useSceneStore(s => s.addSphere)
  const addCylinder = useSceneStore(s => s.addCylinder)
  const addCone     = useSceneStore(s => s.addCone)
  const addTorus    = useSceneStore(s => s.addTorus)
  const addCapsule  = useSceneStore(s => s.addCapsule)

  const handleAdd = () => {
    if      (type === 'plane')    addPlane({ width: planeW, height: planeH, subdivisionsX: planeSX, subdivisionsY: planeSY })
    else if (type === 'cube')     addCube({ width: cubeW, height: cubeH, depth: cubeD })
    else if (type === 'sphere')   addSphere({ radius: sphereR, widthSegments: sphereWS, heightSegments: sphereHS })
    else if (type === 'cylinder') addCylinder({ radiusTop: cylRT, radiusBottom: cylRB, height: cylH, radialSegments: cylRS, heightSegments: cylHS })
    else if (type === 'cone')     addCone({ radius: coneR, height: coneH, radialSegments: coneRS })
    else if (type === 'torus')    addTorus({ radius: torR, tube: torT, radialSegments: torRS, tubularSegments: torTS })
    else                          addCapsule({ radius: capR, height: capH, radialSegments: capRS, hemisphereSegments: capHS })
    onClose()
  }

  const field = (label: string, value: number, set: (n: number) => void, step = 0.1, decimals = 3, min = 0.001) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <NumberInput className={styles.input} value={value} step={step} decimals={decimals} onChange={n => set(Math.max(min, n))} />
    </label>
  )

  const intField = (label: string, value: number, set: (n: number) => void, min = 1) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <NumberInput className={styles.input} value={value} step={1} decimals={0} onChange={n => set(Math.max(min, Math.round(n)))} />
    </label>
  )

  const TYPES: PrimitiveType[] = ['plane', 'cube', 'sphere', 'cylinder', 'cone', 'torus', 'capsule']
  const LABELS: Record<PrimitiveType, string> = {
    plane: 'Plane', cube: 'Cube', sphere: 'Sphere',
    cylinder: 'Cylinder', cone: 'Cone', torus: 'Torus', capsule: 'Capsule',
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.title}>Add Object</div>

        <div className={styles.typeRow}>
          {TYPES.map(t => (
            <button
              key={t}
              className={`${styles.typeBtn} ${type === t ? styles.typeBtnActive : ''}`}
              onClick={() => setType(t)}
            >
              {LABELS[t]}
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
              <div className={styles.hint}>{(planeSX + 1) * (planeSY + 1)} vertices · {planeSX * planeSY * 2} triangles</div>
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
              <div className={styles.hint}>{(sphereWS + 1) * (sphereHS + 1)} vertices</div>
            </>
          )}
          {type === 'cylinder' && (
            <>
              {field('Radius Top', cylRT, setCylRT, 0.1, 3, 0)}
              {field('Radius Bottom', cylRB, setCylRB, 0.1, 3, 0.001)}
              {field('Height', cylH, setCylH)}
              {intField('Radial Segments', cylRS, setCylRS, 3)}
              {intField('Height Segments', cylHS, setCylHS)}
              <div className={styles.hint}>{(cylRS + 1) * (cylHS + 1) + (cylRT > 0 ? cylRS + 2 : 0) + cylRS + 2} vertices</div>
            </>
          )}
          {type === 'cone' && (
            <>
              {field('Radius', coneR, setConeR)}
              {field('Height', coneH, setConeH)}
              {intField('Radial Segments', coneRS, setConeRS, 3)}
              <div className={styles.hint}>{(coneRS + 1) * 2 + coneRS + 2} vertices</div>
            </>
          )}
          {type === 'torus' && (
            <>
              {field('Radius', torR, setTorR)}
              {field('Tube', torT, setTorT)}
              {intField('Radial Segments', torRS, setTorRS, 3)}
              {intField('Tubular Segments', torTS, setTorTS, 3)}
              <div className={styles.hint}>{(torRS + 1) * (torTS + 1)} vertices · {torRS * torTS * 2} triangles</div>
            </>
          )}
          {type === 'capsule' && (
            <>
              {field('Radius', capR, setCapR)}
              {field('Height', capH, setCapH, 0.1, 3, 0)}
              {intField('Radial Segments', capRS, setCapRS, 3)}
              {intField('Hemisphere Segs', capHS, setCapHS)}
              <div className={styles.hint}>{(2 * capHS + 2) * (capRS + 1)} vertices</div>
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
