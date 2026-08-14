import { useState } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import type { EditorMode } from '../../state/sceneStore'
import { AddObjectModal } from './AddObjectModal'
import styles from './Toolbar.module.css'

const WIREFRAME_ICONS = { tri: '△', quad: '◻' } as const

const MODES: { id: EditorMode; label: string; key: string }[] = [
  { id: 'object', label: 'Object', key: '1' },
  { id: 'vertex', label: 'Vertex', key: '2' },
  { id: 'face', label: 'Face', key: '3' },
]

export function Toolbar() {
  const editorMode = useSceneStore(s => s.editorMode)
  const setEditorMode = useSceneStore(s => s.setEditorMode)
  const wireframeMode = useSceneStore(s => s.wireframeMode)
  const setWireframeMode = useSceneStore(s => s.setWireframeMode)
  const gridVisible = useSceneStore(s => s.gridVisible)
  const toggleGrid = useSceneStore(s => s.toggleGrid)
  const showNormals = useSceneStore(s => s.showNormals)
  const toggleNormals = useSceneStore(s => s.toggleNormals)
  const showTangents = useSceneStore(s => s.showTangents)
  const toggleTangents = useSceneStore(s => s.toggleTangents)
  const showVertexColors = useSceneStore(s => s.showVertexColors)
  const toggleVertexColors = useSceneStore(s => s.toggleVertexColors)
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.brand}>ShaderMesh</div>

        <div className={styles.divider} />

        <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>
          + Add Object
        </button>

        <div className={styles.divider} />

        <button
          className={`${styles.wfBtn} ${gridVisible ? styles.wfBtnActive : ''}`}
          onClick={toggleGrid}
          title="Toggle grid"
        >
          ⊞ Grid
        </button>

        <button
          className={`${styles.wfBtn} ${showNormals ? styles.wfBtnActive : ''}`}
          onClick={toggleNormals}
          title="Toggle normal vectors"
        >
          ↑ Normals
        </button>

        <button
          className={`${styles.wfBtn} ${showTangents ? styles.wfBtnActive : ''}`}
          onClick={toggleTangents}
          title="Toggle tangent vectors"
        >
          → Tangents
        </button>

        <button
          className={`${styles.wfBtn} ${showVertexColors ? styles.wfBtnActive : ''}`}
          onClick={toggleVertexColors}
          title="Toggle vertex color display (unlit)"
        >
          ◈ VColors
        </button>

        <div className={styles.divider} />

        <div className={styles.wfGroup}>
          <button
            className={`${styles.wfBtn} ${wireframeMode === 'tri' ? styles.wfBtnActive : ''}`}
            onClick={() => setWireframeMode('tri')}
            title="Show triangles"
          >
            {WIREFRAME_ICONS.tri} Tris
          </button>
          <button
            className={`${styles.wfBtn} ${wireframeMode === 'quad' ? styles.wfBtnActive : ''}`}
            onClick={() => setWireframeMode('quad')}
            title="Show quads"
          >
            {WIREFRAME_ICONS.quad} Quads
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.modeGroup}>
          {MODES.map(m => (
            <button
              key={m.id}
              className={`${styles.modeBtn} ${editorMode === m.id ? styles.modeBtnActive : ''}`}
              onClick={() => setEditorMode(m.id)}
              title={`${m.label} Mode (${m.key})`}
            >
              <span className={styles.modeBtnKey}>{m.key}</span>
              {m.label}
            </button>
          ))}
        </div>

        <div className={styles.spacer} />

        <div className={styles.statusLabel} />
      </div>

      {showAddModal && <AddObjectModal onClose={() => setShowAddModal(false)} />}
    </>
  )
}
