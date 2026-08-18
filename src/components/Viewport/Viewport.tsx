import { useEffect, useRef, useState } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import { SceneManager, type ViewportId } from '../../viewport/SceneManager'
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
  const showUVChecker = useSceneStore(s => s.showUVChecker)

  const [dragBox, setDragBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [maximizedPanel, setMaximizedPanel] = useState<ViewportId | null>(null)

  // Ref so the box-select handler always has the current selection without stale closure
  const selectionRef = useRef({ vertices: selectedVertexIndices, faces: selectedFaceIndices })
  selectionRef.current = { vertices: selectedVertexIndices, faces: selectedFaceIndices }

  const handleLabelDblClick = (vp: ViewportId) => {
    const next = maximizedPanel === vp ? null : vp
    setMaximizedPanel(next)
    sceneManagerRef.current?.setMaximizedPanel(next)
  }

  useEffect(() => {
    if (!containerRef.current) return
    const sm = new SceneManager(
      containerRef.current,
      (id) => selectObject(id),
      (indices) => selectVertices(indices),
      (indices) => selectFaces(indices),
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

  useEffect(() => {
    sceneManagerRef.current?.setShowUVChecker(showUVChecker)
  }, [showUVChecker])

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

  // Block browser context menu inside the viewport (3D canvas handles all right-click itself)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const prevent = (e: Event) => e.preventDefault()
    el.addEventListener('contextmenu', prevent, { capture: true })
    return () => el.removeEventListener('contextmenu', prevent, { capture: true })
  }, [])

  // Right-click box-select in vertex/face mode — panel-aware NDC
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    type PanelId = 'top' | 'persp' | 'front' | 'right'
    let start: { x: number; y: number } | null = null
    let startPanel: PanelId = 'persp'
    let moved = false
    let isShift = false
    let currentBox: { x: number; y: number; w: number; h: number } | null = null

    const getPanelFromPointer = (cx: number, cy: number, rect: DOMRect): PanelId => {
      const rx = cx - rect.left
      const ry = cy - rect.top
      const left = rx < rect.width / 2
      const top  = ry < rect.height / 2
      if (top  && left)  return 'top'
      if (top  && !left) return 'persp'
      if (!top && left)  return 'front'
      return 'right'
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 2 || (editorMode !== 'vertex' && editorMode !== 'face')) return
      e.preventDefault()
      e.stopPropagation()
      isShift = e.shiftKey
      const rect = el.getBoundingClientRect()
      startPanel = getPanelFromPointer(e.clientX, e.clientY, rect)
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
      // NDC within the panel that started the drag
      const panelLeft = (startPanel === 'persp' || startPanel === 'right') ? rect.left + rect.width / 2 : rect.left
      const panelTop  = (startPanel === 'front' || startPanel === 'right') ? rect.top + rect.height / 2 : rect.top
      const panelW = rect.width / 2
      const panelH = rect.height / 2

      const toNDC = (cx: number, cy: number) => ({
        x: ((cx - panelLeft) / panelW) * 2 - 1,
        y: -((cy - panelTop) / panelH) * 2 + 1,
      })
      const p1 = toNDC(s.x, s.y)
      const p2 = toNDC(e.clientX, e.clientY)

      if (editorMode === 'vertex') {
        const hit = sceneManagerRef.current?.getVerticesInBox(p1.x, p1.y, p2.x, p2.y) ?? []
        if (isShift) {
          const merged = Array.from(new Set([...selectionRef.current.vertices, ...hit]))
          selectVertices(merged)
        } else {
          selectVertices(hit)
        }
      } else {
        const hit = sceneManagerRef.current?.getFacesInBox(p1.x, p1.y, p2.x, p2.y) ?? []
        if (isShift) {
          const merged = Array.from(new Set([...selectionRef.current.faces, ...hit]))
          selectFaces(merged)
        } else {
          selectFaces(hit)
        }
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

      {/* Quad divider cross — hidden when a panel is maximized */}
      {!maximizedPanel && <div className={styles.quadDivider} />}

      {/* Panel labels — double-click to maximize / restore */}
      {(!maximizedPanel || maximizedPanel === 'top') && (
        <span className={`${styles.panelLabel} ${styles.labelTop} ${maximizedPanel === 'top' ? styles.panelLabelMaximized : ''}`} onDoubleClick={() => handleLabelDblClick('top')}>
          Top{maximizedPanel === 'top' ? ' ×' : ''}
        </span>
      )}
      {(!maximizedPanel || maximizedPanel === 'persp') && (
        <span className={`${styles.panelLabel} ${styles.labelPersp} ${maximizedPanel === 'persp' ? styles.panelLabelMaximized : ''}`} onDoubleClick={() => handleLabelDblClick('persp')}>
          Persp{maximizedPanel === 'persp' ? ' ×' : ''}
        </span>
      )}
      {(!maximizedPanel || maximizedPanel === 'front') && (
        <span className={`${styles.panelLabel} ${styles.labelFront} ${maximizedPanel === 'front' ? styles.panelLabelMaximized : ''}`} onDoubleClick={() => handleLabelDblClick('front')}>
          Front{maximizedPanel === 'front' ? ' ×' : ''}
        </span>
      )}
      {(!maximizedPanel || maximizedPanel === 'right') && (
        <span className={`${styles.panelLabel} ${styles.labelRight} ${maximizedPanel === 'right' ? styles.panelLabelMaximized : ''}`} onDoubleClick={() => handleLabelDblClick('right')}>
          Right{maximizedPanel === 'right' ? ' ×' : ''}
        </span>
      )}

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
