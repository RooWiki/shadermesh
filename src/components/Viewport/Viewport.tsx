import { useEffect, useRef } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import { SceneManager } from '../../viewport/SceneManager'
import styles from './Viewport.module.css'

export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)

  const objects = useSceneStore(s => s.objects)
  const selectedObjectId = useSceneStore(s => s.selectedObjectId)
  const selectedVertexIndex = useSceneStore(s => s.selectedVertexIndex)
  const selectedFaceIndex = useSceneStore(s => s.selectedFaceIndex)
  const selectObject = useSceneStore(s => s.selectObject)
  const selectVertex = useSceneStore(s => s.selectVertex)
  const selectFace = useSceneStore(s => s.selectFace)
  const editorMode = useSceneStore(s => s.editorMode)
  const wireframeMode = useSceneStore(s => s.wireframeMode)
  const gridVisible = useSceneStore(s => s.gridVisible)
  const showNormals = useSceneStore(s => s.showNormals)
  const showVertexColors = useSceneStore(s => s.showVertexColors)

  useEffect(() => {
    if (!containerRef.current) return
    const sm = new SceneManager(
      containerRef.current,
      (id) => selectObject(id),
      (index) => selectVertex(index),
      (index) => selectFace(index),
    )
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
    sceneManagerRef.current?.setEditorMode(editorMode)
  }, [editorMode])

  useEffect(() => {
    sceneManagerRef.current?.selectVertex(selectedVertexIndex)
  }, [selectedVertexIndex])

  useEffect(() => {
    sceneManagerRef.current?.selectFace(selectedFaceIndex)
  }, [selectedFaceIndex])

  useEffect(() => {
    sceneManagerRef.current?.setWireframeMode(wireframeMode)
  }, [wireframeMode])

  useEffect(() => {
    sceneManagerRef.current?.setGridVisible(gridVisible)
  }, [gridVisible])

  useEffect(() => {
    sceneManagerRef.current?.setShowNormals(showNormals)
  }, [showNormals])

  useEffect(() => {
    sceneManagerRef.current?.setShowVertexColors(showVertexColors)
  }, [showVertexColors])

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
