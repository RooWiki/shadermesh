import { useSceneStore } from '../../state/sceneStore'
import { TransformPanel } from './TransformPanel'
import { MeshDataPanel } from './MeshDataPanel'
import { VertexPanel } from './VertexPanel'
import { FacePanel } from './FacePanel'
import styles from './Inspector.module.css'

export function Inspector() {
  const selectedId = useSceneStore(s => s.selectedObjectId)
  const selectedVertexIndex = useSceneStore(s => s.selectedVertexIndex)
  const selectedFaceIndex = useSceneStore(s => s.selectedFaceIndex)
  const editorMode = useSceneStore(s => s.editorMode)
  const objects = useSceneStore(s => s.objects)
  const updateTransform = useSceneStore(s => s.updateTransform)

  const obj = objects.find(o => o.id === selectedId)

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
            <span>{obj.name}</span>
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
        </>
      )}
    </div>
  )
}
