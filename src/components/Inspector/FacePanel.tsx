import { useSceneStore } from '../../state/sceneStore'
import { TransformPanel } from './TransformPanel'
import { NumberInput } from './NumberInput'
import styles from './Inspector.module.css'

interface FaceGroupPanelProps {
  objectId: string
  faceIndices: number[]
}

export function FaceGroupPanel({ objectId, faceIndices }: FaceGroupPanelProps) {
  const obj = useSceneStore(s => s.objects.find(o => o.id === objectId))
  const flipFacesNormal = useSceneStore(s => s.flipFacesNormal)
  if (!obj) return null

  const { positions, indices } = obj.meshData
  let pcx = 0, pcy = 0, pcz = 0, totalArea = 0
  for (const fi of faceIndices) {
    const a = indices[fi*3], b = indices[fi*3+1], c = indices[fi*3+2]
    const ax = positions[a*3], ay = positions[a*3+1], az = positions[a*3+2]
    const bx = positions[b*3], by = positions[b*3+1], bz = positions[b*3+2]
    const vx = positions[c*3], vy = positions[c*3+1], vz = positions[c*3+2]
    pcx += (ax+bx+vx)/3; pcy += (ay+by+vy)/3; pcz += (az+bz+vz)/3
    const ex = bx-ax, ey = by-ay, ez = bz-az
    const fx = vx-ax, fy = vy-ay, fz = vz-az
    totalArea += Math.sqrt((ey*fz-ez*fy)**2 + (ez*fx-ex*fz)**2 + (ex*fy-ey*fx)**2) / 2
  }
  const n = faceIndices.length
  pcx /= n; pcy /= n; pcz /= n

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{n} Faces Selected</div>
      <div className={styles.statGrid}>
        <div className={styles.statRow}>
          <span className={styles.statKey}>Total Area</span>
          <span className={styles.statVal}>{totalArea.toFixed(6)}</span>
        </div>
      </div>
      <div className={styles.actionRow}>
        <button
          className={styles.actionBtn}
          onClick={() => flipFacesNormal(objectId, faceIndices)}
          title="Invert winding of all selected faces"
        >
          Flip Normals
        </button>
      </div>

      <div className={styles.vec3Block}>
        <div className={styles.vec3Label}>Centroid</div>
        <div className={styles.vec3Inputs}>
          {(['X', 'Y', 'Z'] as const).map((label, i) => {
            const val = [pcx, pcy, pcz][i]
            const axisKey = (['axisX', 'axisY', 'axisZ'] as const)[i]
            return (
              <label key={label} className={styles.axisField}>
                <span className={`${styles.axisTag} ${styles[axisKey]}`}>{label}</span>
                <NumberInput
                  value={val}
                  onChange={() => {}}
                  step={0.001}
                  decimals={4}
                  readOnly
                  className={`${styles.numInput} ${styles.numInputReadOnly}`}
                />
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface Props {
  objectId: string
  faceIndex: number
}

export function FacePanel({ objectId, faceIndex }: Props) {
  const objects = useSceneStore(s => s.objects)
  const updateTransform = useSceneStore(s => s.updateTransform)
  const flipFaceNormal = useSceneStore(s => s.flipFaceNormal)

  const obj = objects.find(o => o.id === objectId)
  if (!obj) return null

  const { positions, indices } = obj.meshData
  const a = indices[faceIndex * 3]
  const b = indices[faceIndex * 3 + 1]
  const c = indices[faceIndex * 3 + 2]

  const ax = positions[a*3], ay = positions[a*3+1], az = positions[a*3+2]
  const bx = positions[b*3], by = positions[b*3+1], bz = positions[b*3+2]
  const cx = positions[c*3], cy = positions[c*3+1], cz = positions[c*3+2]
  const ex = bx-ax, ey = by-ay, ez = bz-az
  const fx = cx-ax, fy = cy-ay, fz = cz-az
  // cross(f, e) — same winding convention as normals.ts
  const crossX = ez*fy - ey*fz
  const crossY = ex*fz - ez*fx
  const crossZ = ey*fx - ex*fy
  const crossLen = Math.sqrt(crossX*crossX + crossY*crossY + crossZ*crossZ)
  const area = crossLen / 2
  const nx = crossLen > 0 ? crossX / crossLen : 0
  const ny = crossLen > 0 ? crossY / crossLen : 0
  const nz = crossLen > 0 ? crossZ / crossLen : 0

  return (
    <>
      <TransformPanel
        transform={obj.transform}
        onTransformChange={t => updateTransform(obj.id, t)}
      />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Face #{faceIndex}</div>

        <div className={styles.statGrid}>
          <div className={styles.statRow}>
            <span className={styles.statKey}>Vertices</span>
            <span className={styles.statVal}>{a} / {b} / {c}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statKey}>Area</span>
            <span className={styles.statVal}>{area.toFixed(6)}</span>
          </div>
        </div>

        <div className={styles.vec3Block}>
          <div className={styles.vec3Label}>Face Normal</div>
          <div className={styles.vec3Inputs}>
            {(['X', 'Y', 'Z'] as const).map((ax, i) => {
              const axisKey = (['axisX', 'axisY', 'axisZ'] as const)[i]
              const val = [nx, ny, nz][i]
              return (
                <label key={ax} className={styles.axisField}>
                  <span className={`${styles.axisTag} ${styles[axisKey]}`}>{ax}</span>
                  <NumberInput
                    value={val}
                    onChange={() => {}}
                    step={0.001}
                    decimals={4}
                    readOnly
                    className={`${styles.numInput} ${styles.numInputReadOnly}`}
                  />
                </label>
              )
            })}
          </div>
        </div>

        <div className={styles.actionRow}>
          <button
            className={styles.actionBtn}
            onClick={() => flipFaceNormal(objectId, faceIndex)}
            title="Invert face winding — flips the direction of this face's normal"
          >
            Flip Normal
          </button>
        </div>
      </div>
    </>
  )
}
