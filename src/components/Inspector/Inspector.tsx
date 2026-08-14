import { useState, useRef, useEffect } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import { TransformPanel } from './TransformPanel'
import { MeshDataPanel } from './MeshDataPanel'
import { VertexPanel } from './VertexPanel'
import { FacePanel } from './FacePanel'
import { UVViewer } from './UVViewer'
import styles from './Inspector.module.css'

function InlineRename({ value, onCommit }: { value: string; onCommit: (n: string) => void }) {
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])

  const commit = () => { const t = draft.trim(); if (t) onCommit(t) }

  return (
    <input
      ref={ref}
      className={styles.renameInput}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        if (e.key === 'Escape') { e.preventDefault(); onCommit(value) }
        e.stopPropagation()
      }}
    />
  )
}

export function Inspector() {
  const selectedId = useSceneStore(s => s.selectedObjectId)
  const selectedVertexIndex = useSceneStore(s => s.selectedVertexIndex)
  const selectedFaceIndex = useSceneStore(s => s.selectedFaceIndex)
  const editorMode = useSceneStore(s => s.editorMode)
  const objects = useSceneStore(s => s.objects)
  const updateTransform = useSceneStore(s => s.updateTransform)
  const renameObject = useSceneStore(s => s.renameObject)
  const [renaming, setRenaming] = useState(false)

  const obj = objects.find(o => o.id === selectedId)

  // Cancel rename if selection changes
  useEffect(() => { setRenaming(false) }, [selectedId])

  return (
    <div className={styles.inspector}>
      <div className={styles.header}>Inspector</div>

      {!obj && (
        <div className={styles.empty}>Nothing selected</div>
      )}

      {obj && (
        <>
          <div className={styles.objectName}>
            <span className={styles.objectIcon}>▣</span>
            {renaming ? (
              <InlineRename
                value={obj.name}
                onCommit={name => { renameObject(obj.id, name); setRenaming(false) }}
              />
            ) : (
              <span onDoubleClick={() => setRenaming(true)} style={{ cursor: 'text' }}>
                {obj.name}
              </span>
            )}
          </div>

          {editorMode === 'object' && (
            <>
              <TransformPanel
                transform={obj.transform}
                onTransformChange={t => updateTransform(obj.id, t)}
              />
              <MeshDataPanel obj={obj} />
            </>
          )}

          {editorMode === 'vertex' && selectedVertexIndex === null && (
            <div className={styles.empty}>Click a vertex to select it</div>
          )}

          {editorMode === 'vertex' && selectedVertexIndex !== null && (
            <VertexPanel objectId={obj.id} vertexIndex={selectedVertexIndex} />
          )}

          {editorMode === 'face' && selectedFaceIndex === null && (
            <div className={styles.empty}>Click a face to select it</div>
          )}

          {editorMode === 'face' && selectedFaceIndex !== null && (
            <FacePanel objectId={obj.id} faceIndex={selectedFaceIndex} />
          )}

          {obj.meshData.uvs && (
            <UVViewer
              meshData={obj.meshData}
              selectedVertexIndex={editorMode === 'vertex' ? selectedVertexIndex : null}
              selectedFaceIndex={editorMode === 'face' ? selectedFaceIndex : null}
            />
          )}
        </>
      )}
    </div>
  )
}
