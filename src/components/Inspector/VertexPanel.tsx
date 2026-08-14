import { useSceneStore } from '../../state/sceneStore'
import { TransformPanel } from './TransformPanel'
import { NumberInput } from './NumberInput'
import styles from './Inspector.module.css'

const AXIS_COLORS = ['axisX', 'axisY', 'axisZ'] as const
const RGBA_COLORS = ['axisX', 'axisY', 'axisZ', 'axisA'] as const

interface AxisRowProps {
  labels: readonly string[]
  values: number[]
  step?: number
  decimals?: number
  readOnly?: boolean
  onChange?: (index: number, value: number) => void
}

function AxisRow({ labels, values, step = 0.001, decimals = 4, readOnly = false, onChange }: AxisRowProps) {
  return (
    <div className={styles.vec3Inputs}>
      {labels.map((ax, i) => (
        <label key={ax} className={styles.axisField}>
          <span className={`${styles.axisTag} ${styles[AXIS_COLORS[i] ?? 'axisX']}`}>{ax}</span>
          <NumberInput
            value={values[i]}
            onChange={n => onChange?.(i, n)}
            step={step}
            decimals={decimals}
            readOnly={readOnly}
            className={`${styles.numInput} ${readOnly ? styles.numInputReadOnly : ''}`}
          />
        </label>
      ))}
    </div>
  )
}

interface VertexPanelProps {
  objectId: string
  vertexIndex: number
}

export function VertexPanel({ objectId, vertexIndex }: VertexPanelProps) {
  const objects = useSceneStore(s => s.objects)
  const updateVertexPosition = useSceneStore(s => s.updateVertexPosition)
  const updateVertexNormal = useSceneStore(s => s.updateVertexNormal)
  const updateVertexColor = useSceneStore(s => s.updateVertexColor)
  const updateTransform = useSceneStore(s => s.updateTransform)

  const obj = objects.find(o => o.id === objectId)
  if (!obj) return null

  const { positions, normals, uvs, tangents, colors } = obj.meshData
  const i = vertexIndex

  const pos = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]
  const nor = normals ? [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]] : null
  const uv  = uvs     ? [uvs[i * 2], uvs[i * 2 + 1]] : null
  const tan = tangents ? [tangents[i * 4], tangents[i * 4 + 1], tangents[i * 4 + 2], tangents[i * 4 + 3]] : null
  const col = colors   ? [colors[i * 4], colors[i * 4 + 1], colors[i * 4 + 2], colors[i * 4 + 3]] : null

  const handlePosChange = (axis: number, value: number) => {
    const next: [number, number, number] = [pos[0], pos[1], pos[2]]
    next[axis] = value
    updateVertexPosition(objectId, vertexIndex, next)
  }

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
          <AxisRow
            labels={['X', 'Y', 'Z']}
            values={pos}
            step={0.001}
            decimals={4}
            onChange={handlePosChange}
          />
        </div>

        {nor && (
          <div className={styles.vec3Block}>
            <div className={styles.vec3Label}>Normal</div>
            <AxisRow
              labels={['X', 'Y', 'Z']}
              values={nor}
              step={0.001}
              decimals={3}
              onChange={(axis, value) => {
                const next: [number, number, number] = [nor[0], nor[1], nor[2]]
                next[axis] = value
                updateVertexNormal(objectId, vertexIndex, next)
              }}
            />
          </div>
        )}

        {uv && (
          <div className={styles.vec3Block}>
            <div className={styles.vec3Label}>UV</div>
            <AxisRow
              labels={['U', 'V']}
              values={uv}
              step={0.001}
              decimals={4}
              readOnly
            />
          </div>
        )}

        {tan && (
          <div className={styles.vec3Block}>
            <div className={styles.vec3Label}>Tangent</div>
            <AxisRow
              labels={['X', 'Y', 'Z']}
              values={tan}
              step={0.001}
              decimals={4}
              readOnly
            />
            <div className={styles.statGrid} style={{ marginTop: 4 }}>
              <div className={styles.statRow}>
                <span className={styles.statKey}>Handedness (W)</span>
                <span className={styles.statVal}>{tan[3] >= 0 ? '+1' : '−1'}</span>
              </div>
            </div>
          </div>
        )}

        {col && (
          <div className={styles.vec3Block}>
            <div className={styles.vec3Label}>Color (RGBA)</div>
            <div className={styles.vec3Inputs}>
              {(['R', 'G', 'B', 'A'] as const).map((label, ci) => (
                <label key={label} className={styles.axisField}>
                  <span className={`${styles.axisTag} ${styles[RGBA_COLORS[ci]]}`}>{label}</span>
                  <NumberInput
                    value={col[ci]}
                    onChange={v => {
                      const next: [number, number, number, number] = [col[0], col[1], col[2], col[3]]
                      next[ci] = Math.max(0, Math.min(1, v))
                      updateVertexColor(objectId, vertexIndex, next)
                    }}
                    step={0.01}
                    decimals={3}
                    className={styles.numInput}
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
