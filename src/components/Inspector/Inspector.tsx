import { useState, useRef, useEffect } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import { TransformPanel } from './TransformPanel'
import { MeshDataPanel } from './MeshDataPanel'
import { PrimitiveParamsPanel } from './PrimitiveParamsPanel'
import { VertexPanel, VertexGroupPanel } from './VertexPanel'
import { FacePanel, FaceGroupPanel } from './FacePanel'
import { UVViewer } from './UVViewer'
import { exportOBJ } from '../../io/exportOBJ'
import { exportJSON } from '../../io/exportJSON'
import { downloadText } from '../../io/fileUtils'
import type { MeshObject } from '../../core/MeshObject'
import styles from './Inspector.module.css'

function ExportPanel({ obj }: { obj: MeshObject }) {
  return (
    <div className={styles.exportPanel}>
      <div className={styles.exportTitle}>Export</div>
      <div className={styles.exportRow}>
        <button
          className={styles.exportBtn}
          onClick={() => downloadText(exportOBJ(obj.meshData, obj.name), `${obj.name}.obj`)}
          title="Export as Wavefront OBJ"
        >
          OBJ
        </button>
        <button
          className={styles.exportBtn}
          onClick={() => downloadText(exportJSON(obj.meshData, obj.name), `${obj.name}.json`)}
          title="Export as JSON (all attributes)"
        >
          JSON
        </button>
      </div>
    </div>
  )
}

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
  const selectedVertexIndices = useSceneStore(s => s.selectedVertexIndices)
  const selectedFaceIndices = useSceneStore(s => s.selectedFaceIndices)
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
              {obj.sourceParams && (
                <PrimitiveParamsPanel objectId={obj.id} sourceParams={obj.sourceParams} />
              )}
              <MeshDataPanel obj={obj} />
            </>
          )}

          {editorMode === 'vertex' && selectedVertexIndices.length === 0 && (
            <div className={styles.empty}>Click a vertex or drag right-click to box-select</div>
          )}

          {editorMode === 'vertex' && selectedVertexIndices.length > 1 && (
            <VertexGroupPanel objectId={obj.id} vertexIndices={selectedVertexIndices} />
          )}

          {editorMode === 'vertex' && selectedVertexIndices.length === 1 && (
            <VertexPanel objectId={obj.id} vertexIndex={selectedVertexIndices[0]} />
          )}

          {editorMode === 'face' && selectedFaceIndices.length === 0 && (
            <div className={styles.empty}>Click a face or drag right-click to box-select</div>
          )}

          {editorMode === 'face' && selectedFaceIndices.length > 1 && (
            <FaceGroupPanel objectId={obj.id} faceIndices={selectedFaceIndices} />
          )}

          {editorMode === 'face' && selectedFaceIndices.length === 1 && (
            <FacePanel objectId={obj.id} faceIndex={selectedFaceIndices[0]} />
          )}

          {obj.meshData.uvs && (
            <UVViewer
              meshData={obj.meshData}
              selectedVertexIndices={editorMode === 'vertex' ? selectedVertexIndices : []}
              selectedFaceIndex={editorMode === 'face' && selectedFaceIndices.length === 1 ? selectedFaceIndices[0] : null}
            />
          )}

          <div className={styles.spacer} />
          <ExportPanel obj={obj} />
        </>
      )}
    </div>
  )
}
