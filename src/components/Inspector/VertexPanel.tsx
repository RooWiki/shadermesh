import { useSceneStore } from '../../state/sceneStore'
import { TransformPanel } from './TransformPanel'
import styles from './Inspector.module.css'

interface VertexPanelProps {
  objectId: string
  vertexIndex: number
}

export function VertexPanel({ objectId, vertexIndex }: VertexPanelProps) {
  const objects = useSceneStore(s => s.objects)
  const updateVertexPosition = useSceneStore(s => s.updateVertexPosition)
  const updateTransform = useSceneStore(s => s.updateTransform)

  const obj = objects.find(o => o.id === objectId)
  if (!obj) return null

  const { positions, normals, uvs } = obj.meshData
  const i = vertexIndex

  const pos: [number, number, number] = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]
  const nor: [number, number, number] | null = normals
    ? [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]]
    : null
  const uv: [number, number] | null = uvs
    ? [uvs[i * 2], uvs[i * 2 + 1]]
    : null

  return (
    <>
      <TransformPanel
        transform={obj.transform}
        onTransformChange={t => updateTransform(obj.id, t)}
      />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Vertex #{vertexIndex}</div>

        <div className={styles.vec3Block}>
          <div className={styles.vec3Label}>Position</div>
          <div className={styles.vec3Inputs}>
            {(['X', 'Y', 'Z'] as const).map((ax, k) => (
              <label key={ax} className={`${styles.axisField}`}>
                <span className={`${styles.axisTag} ${styles[(['axisX', 'axisY', 'axisZ'] as const)[k]]}`}>{ax}</span>
                <input
                  type="number"
                  step={0.001}
                  value={pos[k]}
                  onChange={e => {
                    const n = parseFloat(e.target.value)
                    if (isNaN(n)) return
                    const next = [...pos] as [number, number, number]
                    next[k] = n
                    updateVertexPosition(objectId, vertexIndex, next)
                  }}
                  className={styles.numInput}
                />
              </label>
            ))}
          </div>
        </div>

        {nor && (
          <div className={styles.vec3Block}>
            <div className={styles.vec3Label}>Normal</div>
            <div className={styles.vec3Inputs}>
              {(['X', 'Y', 'Z'] as const).map((ax, k) => (
                <label key={ax} className={styles.axisField}>
                  <span className={`${styles.axisTag} ${styles[(['axisX', 'axisY', 'axisZ'] as const)[k]]}`}>{ax}</span>
                  <input
                    type="number"
                    readOnly
                    value={nor[k].toFixed(3)}
                    className={`${styles.numInput} ${styles.numInputReadOnly}`}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {uv && (
          <div className={styles.vec3Block}>
            <div className={styles.vec3Label}>UV</div>
            <div className={styles.vec3Inputs}>
              {(['U', 'V'] as const).map((ax, k) => (
                <label key={ax} className={styles.axisField}>
                  <span className={`${styles.axisTag} ${styles[(['axisX', 'axisY'] as const)[k]]}`}>{ax}</span>
                  <input
                    type="number"
                    readOnly
                    value={uv[k].toFixed(4)}
                    className={`${styles.numInput} ${styles.numInputReadOnly}`}
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
