import { useState, useRef, useEffect } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import { UVViewer } from '../Inspector/UVViewer'
import { UVMapPanel } from '../Inspector/UVMapPanel'
import styles from './ObjectList.module.css'

interface RenameInputProps {
  initialValue: string
  onCommit: (name: string) => void
  onCancel: () => void
}

function RenameInput({ initialValue, onCommit, onCancel }: RenameInputProps) {
  const [value, setValue] = useState(initialValue)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const commit = () => {
    const trimmed = value.trim()
    if (trimmed) onCommit(trimmed); else onCancel()
  }

  return (
    <input
      ref={ref}
      className={styles.renameInput}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        if (e.key === 'Escape') { e.preventDefault(); onCancel() }
        e.stopPropagation()
      }}
      onClick={e => e.stopPropagation()}
    />
  )
}

export function ObjectList() {
  const objects = useSceneStore(s => s.objects)
  const selectedObjectId = useSceneStore(s => s.selectedObjectId)
  const selectObject = useSceneStore(s => s.selectObject)
  const removeObject = useSceneStore(s => s.removeObject)
  const renameObject = useSceneStore(s => s.renameObject)
  const editorMode = useSceneStore(s => s.editorMode)
  const selectedVertexIndices = useSceneStore(s => s.selectedVertexIndices)
  const selectedFaceIndices = useSceneStore(s => s.selectedFaceIndices)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [uvCollapsed, setUvCollapsed] = useState(false)

  const selectedObj = objects.find(o => o.id === selectedObjectId)

  return (
    <div className={styles.panel}>
      <div className={styles.header}>Scene</div>
      <div className={styles.list}>
        {objects.length === 0 && (
          <div className={styles.empty}>No objects in scene</div>
        )}
        {objects.map(obj => (
          <div
            key={obj.id}
            className={`${styles.item} ${obj.id === selectedObjectId ? styles.selected : ''}`}
            onClick={() => selectObject(obj.id)}
          >
            <span className={styles.icon}>▣</span>

            {renamingId === obj.id ? (
              <RenameInput
                initialValue={obj.name}
                onCommit={name => { renameObject(obj.id, name); setRenamingId(null) }}
                onCancel={() => setRenamingId(null)}
              />
            ) : (
              <span
                className={styles.name}
                onDoubleClick={e => { e.stopPropagation(); setRenamingId(obj.id) }}
              >
                {obj.name}
              </span>
            )}

            <button
              className={styles.deleteBtn}
              onClick={e => { e.stopPropagation(); removeObject(obj.id) }}
              title="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {selectedObj?.meshData.uvs && (
        <>
          <div className={styles.divider} />
          <UVMapPanel objectId={selectedObj.id} uvMap={selectedObj.uvMap} />
          <div className={styles.divider} />
          <div className={styles.uvSection}>
            <div className={styles.uvHeader} onClick={() => setUvCollapsed(c => !c)}>
              <span>UV Layout</span>
              <span>{uvCollapsed ? '▲' : '▼'}</span>
            </div>
            {!uvCollapsed && (
              <UVViewer
                meshData={selectedObj.meshData}
                selectedVertexIndices={editorMode === 'vertex' ? selectedVertexIndices : []}
                selectedFaceIndex={editorMode === 'face' && selectedFaceIndices.length === 1 ? selectedFaceIndices[0] : null}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
