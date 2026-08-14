import { useEffect, useRef, useState } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import { SceneManager } from '../../viewport/SceneManager'
import styles from './Viewport.module.css'

export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)

  const objects = useSceneStore(s => s.objects)
  const selectedObjectId = useSceneStore(s => s.selectedObjectId)
  const selectedVertexIndices = useSceneStore(s => s.selectedVertexIndices)
  const selectedFaceIndices = useSceneStore(s => s.selectedFaceIndices)
  const selectObject = useSceneStore(s => s.selectObject)
  const selectVertex = useSceneStore(s => s.selectVertex)
  const selectVertices = useSceneStore(s => s.selectVertices)
  const selectFace = useSceneStore(s => s.selectFace)
  const selectFaces = useSceneStore(s => s.selectFaces)
  const editorMode = useSceneStore(s => s.editorMode)
  const activeTool = useSceneStore(s => s.activeTool)
  const wireframeMode = useSceneStore(s => s.wireframeMode)
  const gridVisible = useSceneStore(s => s.gridVisible)
  const showNormals = useSceneStore(s => s.showNormals)
  const showTangents = useSceneStore(s => s.showTangents)
  const showVertexColors = useSceneStore(s => s.showVertexColors)

  // Box-select overlay state (client-space rect)
  const [dragBox, setDragBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const sm = new SceneManager(
      containerRef.current,
      (id) => selectObject(id),
      (index) => selectVertex(index),
      (index) => selectFace(index),
      () => { useSceneStore.getState().pushHistory() },
      (id, pos, rot, scale) => { useSceneStore.getState().setTransformSilent(id, pos, rot, scale) },
      (id) => { useSceneStore.getState().notifyMeshChanged(id) },
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
    sceneManagerRef.current?.setActiveTool(activeTool)
  }, [activeTool])

  useEffect(() => {
    sceneManagerRef.current?.selectVertices(selectedVertexIndices)
  }, [selectedVertexIndices])

  useEffect(() => {
    sceneManagerRef.current?.selectFaces(selectedFaceIndices)
  }, [selectedFaceIndices])

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
    sceneManagerRef.current?.setShowTangents(showTangents)
  }, [showTangents])

  useEffect(() => {
    sceneManagerRef.current?.setShowVertexColors(showVertexColors)
  }, [showVertexColors])

  // F key shortcut
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

  // Right-click box-select in vertex mode
  // Use capture phase so we intercept before OrbitControls (bubble phase)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let start: { x: number; y: number } | null = null
    let moved = false
    let currentBox: { x: number; y: number; w: number; h: number } | null = null

    const onDown = (e: PointerEvent) => {
      if (e.button !== 2 || (editorMode !== 'vertex' && editorMode !== 'face')) return
      e.preventDefault()
      e.stopPropagation()
      start = { x: e.clientX, y: e.clientY }
      moved = false
      currentBox = null
    }

    const onMove = (e: PointerEvent) => {
      if (!start) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true
      if (!moved) return
      currentBox = {
        x: Math.min(start.x, e.clientX),
        y: Math.min(start.y, e.clientY),
        w: Math.abs(dx),
        h: Math.abs(dy),
      }
      setDragBox(currentBox)
    }

    const onUp = (e: PointerEvent) => {
      if (e.button !== 2 || !start) return
      const s = start
      start = null
      setDragBox(null)
      currentBox = null

      if (!moved) return

      const rect = el.getBoundingClientRect()
      const toNDC = (cx: number, cy: number) => ({
        x: ((cx - rect.left) / rect.width) * 2 - 1,
        y: -((cy - rect.top) / rect.height) * 2 + 1,
      })
      const p1 = toNDC(s.x, s.y)
      const p2 = toNDC(e.clientX, e.clientY)
      if (editorMode === 'vertex') {
        const indices = sceneManagerRef.current?.getVerticesInBox(p1.x, p1.y, p2.x, p2.y) ?? []
        selectVertices(indices)
      } else {
        const indices = sceneManagerRef.current?.getFacesInBox(p1.x, p1.y, p2.x, p2.y) ?? []
        selectFaces(indices)
      }
    }

    const onContext = (e: Event) => {
      if (editorMode === 'vertex' || editorMode === 'face') e.preventDefault()
    }

    el.addEventListener('pointerdown', onDown, { capture: true })
    el.addEventListener('pointermove', onMove, { capture: true })
    el.addEventListener('pointerup', onUp, { capture: true })
    el.addEventListener('contextmenu', onContext)

    return () => {
      el.removeEventListener('pointerdown', onDown, { capture: true })
      el.removeEventListener('pointermove', onMove, { capture: true })
      el.removeEventListener('pointerup', onUp, { capture: true })
      el.removeEventListener('contextmenu', onContext)
      setDragBox(null)
    }
  }, [editorMode, selectVertices, selectFaces])

  const modeLabel = editorMode === 'object' ? 'OBJECT MODE' : editorMode === 'vertex' ? 'VERTEX MODE' : 'FACE MODE'
  const toolLabel = activeTool === 'select' ? 'SELECT' : activeTool === 'translate' ? 'MOVE' : activeTool === 'rotate' ? 'ROTATE' : 'SCALE'

  return (
    <div className={styles.viewportWrapper}>
      <div ref={containerRef} className={styles.canvas} />
      <div className={styles.modeIndicator}>{modeLabel} &nbsp;·&nbsp; {toolLabel}</div>
      <div className={styles.shortcuts}>
        <span>F: Frame &nbsp; Q/W/E/R: Tools</span>
      </div>
      {dragBox && (
        <div
          style={{
            position: 'fixed',
            left: dragBox.x,
            top: dragBox.y,
            width: dragBox.w,
            height: dragBox.h,
            border: '1px solid rgba(92, 124, 250, 0.85)',
            background: 'rgba(92, 124, 250, 0.08)',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        />
      )}
    </div>
  )
}
