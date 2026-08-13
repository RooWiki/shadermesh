import { useSceneStore } from '../../state/sceneStore'
import { TransformPanel } from './TransformPanel'
import { MeshDataPanel } from './MeshDataPanel'
import styles from './Inspector.module.css'

export function Inspector() {
  const selectedId = useSceneStore(s => s.selectedObjectId)
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

          <TransformPanel
            transform={obj.transform}
            onTransformChange={t => updateTransform(obj.id, t)}
          />

          <MeshDataPanel obj={obj} />
        </>
      )}
    </div>
  )
}
