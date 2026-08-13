import { useEffect, useRef } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import { SceneManager } from '../../viewport/SceneManager'
import styles from './Viewport.module.css'

export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)

  const objects = useSceneStore(s => s.objects)
  const selectedObjectId = useSceneStore(s => s.selectedObjectId)
  const selectObject = useSceneStore(s => s.selectObject)
  const editorMode = useSceneStore(s => s.editorMode)

  useEffect(() => {
    if (!containerRef.current) return
    const sm = new SceneManager(containerRef.current, (id) => selectObject(id))
    sceneManagerRef.current = sm
    return () => {
      sm.dispose()
      sceneManagerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneManagerRef.current?.syncObjects(objects, selectedObjectId)
  }, [objects, selectedObjectId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const sm = sceneManagerRef.current
      if (!sm) return
      if (e.key.toLowerCase() === 'f') sm.frameSelected()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const modeLabel = editorMode === 'object' ? 'OBJECT MODE' : editorMode === 'vertex' ? 'VERTEX MODE' : 'FACE MODE'

  return (
    <div className={styles.viewportWrapper}>
      <div ref={containerRef} className={styles.canvas} />
      <div className={styles.modeIndicator}>{modeLabel}</div>
      <div className={styles.shortcuts}>
        <span>F: Frame</span>
      </div>
    </div>
  )
}
