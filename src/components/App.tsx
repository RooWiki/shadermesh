import { useEffect, useRef, useState, useCallback } from 'react'
import { Toolbar } from './Toolbar/Toolbar'
import { ObjectList } from './ObjectList/ObjectList'
import { Viewport } from './Viewport/Viewport'
import { Inspector } from './Inspector/Inspector'
import { useSceneStore } from '../state/sceneStore'
import styles from './App.module.css'

const MIN_PANEL_WIDTH = 160
const MAX_PANEL_WIDTH = 520
const DEFAULT_RIGHT_WIDTH = 280
const DEFAULT_LEFT_WIDTH = 200

function useGlobalShortcuts() {
  const setEditorMode = useSceneStore(s => s.setEditorMode)
  const setActiveTool = useSceneStore(s => s.setActiveTool)
  const removeObject = useSceneStore(s => s.removeObject)
  const selectObject = useSceneStore(s => s.selectObject)
  const undo = useSceneStore(s => s.undo)
  const redo = useSceneStore(s => s.redo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        if (e.target instanceof HTMLInputElement) return
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
        return
      }
      if (e.target instanceof HTMLInputElement) return
      switch (e.key) {
        case 'Escape': selectObject(null); break
        case 'Delete': case 'Backspace': {
          const id = useSceneStore.getState().selectedObjectId
          if (id) removeObject(id)
          break
        }
        case 'q': case 'Q': setActiveTool('select'); break
        case 'w': case 'W': setActiveTool('translate'); break
        case 'e': case 'E': setActiveTool('rotate'); break
        case 'r': case 'R': setActiveTool('scale'); break
        case '1': setEditorMode('object'); break
        case '2': setEditorMode('vertex'); break
        case '3': setEditorMode('face'); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setEditorMode, setActiveTool, removeObject, selectObject, undo, redo])
}

function usePanelResize(initialWidth: number, side: 'left' | 'right') {
  const [width, setWidth] = useState(initialWidth)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startW.current = width
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = side === 'right'
        ? startX.current - ev.clientX
        : ev.clientX - startX.current
      setWidth(Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startW.current + delta)))
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [width, side])

  return { width, onMouseDown }
}

export function App() {
  useGlobalShortcuts()
  const left = usePanelResize(DEFAULT_LEFT_WIDTH, 'left')
  const right = usePanelResize(DEFAULT_RIGHT_WIDTH, 'right')

  return (
    <div className={styles.app}>
      <div className={styles.toolbar}>
        <Toolbar />
      </div>

      <div className={styles.workArea}>
        <div className={styles.leftPanel} style={{ width: left.width }}>
          <ObjectList />
        </div>
        <div className={styles.resizeHandle} onMouseDown={left.onMouseDown} />

        <div className={styles.viewport}>
          <Viewport />
        </div>

        <div className={styles.resizeHandle} onMouseDown={right.onMouseDown} />
        <div className={styles.rightPanel} style={{ width: right.width }}>
          <Inspector />
        </div>
      </div>
    </div>
  )
}
