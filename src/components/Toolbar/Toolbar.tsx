import { useState } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import type { EditorMode } from '../../state/sceneStore'
import { AddObjectModal } from './AddObjectModal'
import styles from './Toolbar.module.css'

const MODES: { id: EditorMode; label: string; key: string }[] = [
  { id: 'object', label: 'Object', key: '1' },
  { id: 'vertex', label: 'Vertex', key: '2' },
  { id: 'face', label: 'Face', key: '3' },
]

export function Toolbar() {
  const editorMode = useSceneStore(s => s.editorMode)
  const setEditorMode = useSceneStore(s => s.setEditorMode)
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

        <div className={styles.statusLabel}>
          {editorMode === 'vertex' && (
            <span className={styles.wip}>⚠ Vertex Mode — FASE 2</span>
          )}
          {editorMode === 'face' && (
            <span className={styles.wip}>⚠ Face Mode — FASE 4</span>
          )}
        </div>
      </div>

      {showAddModal && <AddObjectModal onClose={() => setShowAddModal(false)} />}
    </>
  )
}
