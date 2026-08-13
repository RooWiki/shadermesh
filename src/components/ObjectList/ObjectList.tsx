import { useSceneStore } from '../../state/sceneStore'
import styles from './ObjectList.module.css'

export function ObjectList() {
  const objects = useSceneStore(s => s.objects)
  const selectedObjectId = useSceneStore(s => s.selectedObjectId)
  const selectObject = useSceneStore(s => s.selectObject)
  const removeObject = useSceneStore(s => s.removeObject)

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
            <span className={styles.name}>{obj.name}</span>
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
