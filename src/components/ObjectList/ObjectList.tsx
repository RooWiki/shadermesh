import { useState, useRef, useEffect } from 'react'
import { useSceneStore } from '../../state/sceneStore'
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
  const [renamingId, setRenamingId] = useState<string | null>(null)

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
    </div>
  )
}
