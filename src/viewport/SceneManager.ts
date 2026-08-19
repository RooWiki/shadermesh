import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import type { MeshObject } from '../core/MeshObject'
import type { MeshData } from '../core/MeshData'
import type { ActiveTool, EditorMode, WireframeMode } from '../state/sceneStore'
import { meshDataToBufferGeometry } from './MeshRenderer'

type SelectCallback = (id: string | null) => void
type SelectVerticesCallback = (indices: number[]) => void
type SelectFacesCallback = (indices: number[]) => void
type PushHistoryCallback = () => void
type TransformChangeCallback = (id: string, position: [number,number,number], rotation: [number,number,number], scale: [number,number,number]) => void
type NotifyMeshChangedCallback = (id: string) => void

export type ViewportId = 'persp' | 'top' | 'front' | 'right'

const VERTEX_COLOR_DEFAULT = [0.35, 0.55, 0.95] as const
const VERTEX_COLOR_SELECTED = [1.0, 0.85, 0.1] as const
const ORTHO_SIZE = 5  // frustum half-height at zoom=1

function makeUVCheckerTexture(): THREE.CanvasTexture {
  const size = 512
  const cells = 8
  const cell = size / cells
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const colors = ['#00bbcc','#cc2222','#cccc00','#22cc44','#cc22cc','#aaaaaa','#7722cc','#ffffff']
  const dark = [false, true, false, false, false, false, true, false]
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const idx = (row + col) % cells
      const x = col * cell
      const y = row * cell
      ctx.fillStyle = colors[idx]
      ctx.fillRect(x, y, cell, cell)
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1)
      ctx.font = `bold ${cell * 0.48}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const cx = x + cell / 2
      const cy = y + cell / 2
      ctx.lineWidth = cell * 0.1
      ctx.strokeStyle = dark[idx] ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
      ctx.strokeText(String(idx + 1), cx, cy)
      ctx.fillStyle = dark[idx] ? '#ffffff' : '#111111'
      ctx.fillText(String(idx + 1), cx, cy)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

export class SceneManager {
  private scene: THREE.Scene
  private renderer: THREE.WebGLRenderer

  // Four cameras
  private perspCamera: THREE.PerspectiveCamera
  private topCamera: THREE.OrthographicCamera
  private frontCamera: THREE.OrthographicCamera
  private rightCamera: THREE.OrthographicCamera

  // Four controls (all on same domElement, enabled/disabled based on active panel)
  private perspControls: OrbitControls
  private topControls: OrbitControls
  private frontControls: OrbitControls
  private rightControls: OrbitControls

  private activeViewport: ViewportId = 'persp'
  private maximizedPanel: ViewportId | null = null

  private gridHelper: THREE.GridHelper

  private meshMap = new Map<string, THREE.Mesh>()
  private meshMatMap = new Map<string, THREE.MeshStandardMaterial>()
  private wireframeMap = new Map<string, THREE.LineSegments>()
  private meshDataRefMap = new Map<string, MeshData>()

  private transformControls: TransformControls
  private activeTool: ActiveTool = 'select'
  private gizmoDragActive = false

  // Sub-object transform state
  private selectionPivot: THREE.Object3D | null = null
  private pivotBaseMatrix = new THREE.Matrix4()
  private baseVertexPositions: Float32Array | null = null

  private selectedId: string | null = null
  private onSelect: SelectCallback
  private onSelectVertices: SelectVerticesCallback
  private onSelectFaces: SelectFacesCallback
  private onPushHistory: PushHistoryCallback
  private onTransformChange: TransformChangeCallback
  private onNotifyMeshChanged: NotifyMeshChangedCallback
  private wireframeMode: WireframeMode = 'tri'
  private currentMode: EditorMode = 'object'
  private currentObjects: MeshObject[] = []

  // Vertex overlay (only for selected object in vertex mode)
  private vertexPoints: THREE.Points | null = null
  private selectedVertexIndices: number[] = []

  // Weld map: groups render vertices that share the same spatial position so the
  // editor treats them as a single logical vertex.  One overlay point is shown per
  // group; moving it moves all render vertices in the group together.
  private weldMap: { groups: number[][], renderToGroup: Int32Array } | null = null

  // Face overlay (only for selected object in face mode)
  private faceHighlight: THREE.Mesh | null = null
  private selectedFaceIndices: number[] = []

  // Normal overlay
  private normalLines: THREE.LineSegments | null = null
  private showNormals = false

  // Tangent overlay
  private tangentLines: THREE.LineSegments | null = null
  private showTangents = false

  private readonly normalScale = 0.15

  private animFrameId = 0
  private container: HTMLDivElement

  private defaultMat: THREE.MeshStandardMaterial
  private selectedMat: THREE.MeshStandardMaterial
  private vcMat: THREE.MeshBasicMaterial
  private uvCheckerTex!: THREE.CanvasTexture
  private uvCheckerMat!: THREE.MeshBasicMaterial
  private showUVChecker = false
  private wireframeMat: THREE.LineBasicMaterial
  private selectedWireframeMat: THREE.LineBasicMaterial
  private faceHighlightMat: THREE.MeshBasicMaterial
  private showVertexColors = false

  // Theme-driven colors (updated via MutationObserver on data-theme)
  private viewportBgHex    = 0x2c2c2e
  private gizmoBgHex       = 0x3a3a3c
  private sceneMeshColorHex = 0xc7c7cc   // dark-theme fallback, overridden by initThemeObserver
  private themeObserver: MutationObserver | null = null

  constructor(
    container: HTMLDivElement,
    onSelect: SelectCallback,
    onSelectVertices: SelectVerticesCallback,
    onSelectFaces: SelectFacesCallback,
    onPushHistory: PushHistoryCallback,
    onTransformChange: TransformChangeCallback,
    onNotifyMeshChanged: NotifyMeshChangedCallback,
  ) {
    this.container = container
    this.onSelect = onSelect
    this.onSelectVertices = onSelectVertices
    this.onSelectFaces = onSelectFaces
    this.onPushHistory = onPushHistory
    this.onTransformChange = onTransformChange
    this.onNotifyMeshChanged = onNotifyMeshChanged

    const { clientWidth: w, clientHeight: h } = container

    this.scene = new THREE.Scene()

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(w, h)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    container.appendChild(this.renderer.domElement)

    const aspect = (w / 2) / (h / 2)

    // Perspective camera — top-right panel
    this.perspCamera = new THREE.PerspectiveCamera(60, aspect, 0.01, 10000)
    this.perspCamera.position.set(3, 2.5, 4)
    this.perspCamera.lookAt(0, 0, 0)

    // Top orthographic camera — top-left panel (looks down -Y)
    this.topCamera = new THREE.OrthographicCamera(
      -ORTHO_SIZE * aspect, ORTHO_SIZE * aspect, ORTHO_SIZE, -ORTHO_SIZE, 0.01, 10000,
    )
    this.topCamera.position.set(0, 100, 0)
    this.topCamera.up.set(0, 0, -1)
    this.topCamera.lookAt(0, 0, 0)

    // Front orthographic camera — bottom-left panel (looks along -Z)
    this.frontCamera = new THREE.OrthographicCamera(
      -ORTHO_SIZE * aspect, ORTHO_SIZE * aspect, ORTHO_SIZE, -ORTHO_SIZE, 0.01, 10000,
    )
    this.frontCamera.position.set(0, 0, 100)
    this.frontCamera.lookAt(0, 0, 0)

    // Right orthographic camera — bottom-right panel (looks along -X)
    this.rightCamera = new THREE.OrthographicCamera(
      -ORTHO_SIZE * aspect, ORTHO_SIZE * aspect, ORTHO_SIZE, -ORTHO_SIZE, 0.01, 10000,
    )
    this.rightCamera.position.set(100, 0, 0)
    this.rightCamera.lookAt(0, 0, 0)

    const ambient = new THREE.AmbientLight(0xffffff, 1.0)
    this.scene.add(ambient)
    const dirLight = new THREE.DirectionalLight(0xffffff, 3.0)
    dirLight.position.set(3, 5, 4)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(1024, 1024)
    this.scene.add(dirLight)
    const fillLight = new THREE.DirectionalLight(0x998899, 0.8)
    fillLight.position.set(-3, 1, -2)
    this.scene.add(fillLight)

    this.gridHelper = new THREE.GridHelper(20, 20, 0x484848, 0x363636)
    this.scene.add(this.gridHelper)
    this.scene.add(new THREE.AxesHelper(0.5))

    // Colors are set immediately by initThemeObserver → update()
    this.defaultMat = new THREE.MeshStandardMaterial({ color: 0xc7c7cc, roughness: 0.35, metalness: 0.1 })
    this.selectedMat = new THREE.MeshStandardMaterial({ color: 0xc7c7cc, emissive: 0xc7c7cc, emissiveIntensity: 0.15, roughness: 0.35, metalness: 0.1 })
    this.vcMat = new THREE.MeshBasicMaterial({ vertexColors: true })
    this.uvCheckerTex = makeUVCheckerTexture()
    this.uvCheckerMat = new THREE.MeshBasicMaterial({ map: this.uvCheckerTex, side: THREE.DoubleSide })
    this.wireframeMat = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.4 })
    this.selectedWireframeMat = new THREE.LineBasicMaterial({ color: 0xf0a050, transparent: true, opacity: 0.8 })
    this.faceHighlightMat = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthTest: false,
    })

    // Proxy so that OrbitControls and TransformControls see the active panel's
    // bounding rect / clientWidth / clientHeight instead of the full canvas.
    // All event listeners still land on the real canvas via bind(target).
    const sm = this
    const panelEl = new Proxy(this.renderer.domElement, {
      get(target, prop, receiver) {
        if (prop === 'getBoundingClientRect') {
          return () => {
            const r = target.getBoundingClientRect()
            if (sm.maximizedPanel) return r  // full canvas when maximized
            const hw = r.width / 2, hh = r.height / 2
            const isRight  = sm.activeViewport === 'persp' || sm.activeViewport === 'right'
            const isBottom = sm.activeViewport === 'front' || sm.activeViewport === 'right'
            const l = r.left + (isRight  ? hw : 0)
            const t = r.top  + (isBottom ? hh : 0)
            return { left: l, top: t, width: hw, height: hh, right: l+hw, bottom: t+hh, x: l, y: t, toJSON: () => ({}) } as DOMRect
          }
        }
        if (prop === 'clientWidth')  return sm.maximizedPanel ? target.clientWidth  : Math.floor(target.clientWidth  / 2)
        if (prop === 'clientHeight') return sm.maximizedPanel ? target.clientHeight : Math.floor(target.clientHeight / 2)
        const v = Reflect.get(target, prop, target)  // target as receiver avoids native DOM accessor errors
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v
      },
    })

    // Perspective controls — full orbit
    this.perspControls = new OrbitControls(this.perspCamera, panelEl as unknown as HTMLElement)
    this.perspControls.enableDamping = true
    this.perspControls.dampingFactor = 0.1
    this.perspControls.screenSpacePanning = true
    this.perspControls.minDistance = 0.1
    this.perspControls.maxDistance = 500

    // Ortho controls — pan + zoom only, no rotation
    const makeOrthoControls = (camera: THREE.OrthographicCamera) => {
      const ctrl = new OrbitControls(camera, panelEl as unknown as HTMLElement)
      ctrl.enableRotate = false
      ctrl.screenSpacePanning = true
      ctrl.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: null as any }
      ctrl.enabled = false
      ctrl.update()
      return ctrl
    }
    this.topControls = makeOrthoControls(this.topCamera)
    this.frontControls = makeOrthoControls(this.frontCamera)
    this.rightControls = makeOrthoControls(this.rightCamera)

    this.transformControls = new TransformControls(this.perspCamera, panelEl as unknown as HTMLElement)
    this.transformControls.setSize(0.85)
    this.scene.add(this.transformControls.getHelper())

    // Pause orbit while dragging gizmo
    this.transformControls.addEventListener('dragging-changed', (e: any) => {
      this.getActiveControls().enabled = !e.value
    })

    // Push history on first actual movement
    let historyPushedThisDrag = false
    this.transformControls.addEventListener('mouseDown', () => {
      historyPushedThisDrag = false
      this.gizmoDragActive = true
      if (this.currentMode !== 'object' && this.selectionPivot) {
        this.selectionPivot.updateWorldMatrix(true, false)
        this.pivotBaseMatrix.copy(this.selectionPivot.matrixWorld)
        this.snapshotBaseVertexPositions()
      }
    })
    this.transformControls.addEventListener('objectChange', () => {
      if (!historyPushedThisDrag) {
        this.onPushHistory()
        historyPushedThisDrag = true
      }
      if (this.currentMode !== 'object') {
        this.applyPivotTransformToMesh()
      }
    })
    this.transformControls.addEventListener('mouseUp', () => {
      if (this.currentMode !== 'object') {
        this.syncVerticesToStore()
        this.baseVertexPositions = null
        this.updateSelectionPivot()
      } else {
        const attached = this.transformControls.object
        if (attached && this.selectedId) {
          const p = attached.position
          const r = attached.rotation
          const s = attached.scale
          this.onTransformChange(
            this.selectedId,
            [p.x, p.y, p.z],
            [r.x, r.y, r.z],
            [s.x, s.y, s.z],
          )
        }
      }
      setTimeout(() => { this.gizmoDragActive = false }, 0)
    })

    // Hover activates viewport — no click needed
    this.renderer.domElement.addEventListener('pointermove', this.onPointerHover)
    // Capture phase so we update TC camera before TransformControls sees the event
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown, true)

    this.resizeObserver = new ResizeObserver(this.onResize)
    this.resizeObserver.observe(container)

    this.initThemeObserver()
    this.animate()
  }

  private parseCSSHex(varName: string, fallback: number): number {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    if (!val) return fallback
    try { return new THREE.Color(val).getHex() } catch { return fallback }
  }

  private initThemeObserver() {
    const update = () => {
      this.viewportBgHex = this.parseCSSHex('--viewport-bg', 0x2c2c2e)
      this.gizmoBgHex    = this.parseCSSHex('--gizmo-bg', 0x3a3a3c)
      const gridMain = this.parseCSSHex('--viewport-grid-main', 0x484848)
      const gridSub  = this.parseCSSHex('--viewport-grid-sub', 0x363636)
      const wasVisible = this.gridHelper?.visible ?? true
      if (this.gridHelper) {
        this.scene.remove(this.gridHelper)
        this.gridHelper.geometry.dispose()
        const mat = this.gridHelper.material
        if (Array.isArray(mat)) mat.forEach(m => m.dispose())
        else mat.dispose()
      }
      this.gridHelper = new THREE.GridHelper(20, 20, gridMain, gridSub)
      this.gridHelper.visible = wasVisible
      this.scene.add(this.gridHelper)

      // Update default mesh color from theme token
      this.sceneMeshColorHex = this.parseCSSHex('--viewport-mesh-color', 0xc7c7cc)
      this.defaultMat.color.setHex(this.sceneMeshColorHex)
      this.selectedMat.color.setHex(this.sceneMeshColorHex)
      this.selectedMat.emissive.setHex(this.sceneMeshColorHex)
      for (const [id, mat] of this.meshMatMap) {
        mat.color.setHex(this.sceneMeshColorHex)
        if (id === this.selectedId) mat.emissive.setHex(this.sceneMeshColorHex)
      }
    }
    update()
    this.themeObserver = new MutationObserver(update)
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  }

  private resizeObserver: ResizeObserver

  private onResize = () => {
    const { clientWidth: w, clientHeight: h } = this.container
    if (w === 0 || h === 0) return
    const hw = Math.floor(w / 2), hh = Math.floor(h / 2)
    const aspect = hw / hh

    this.perspCamera.aspect = aspect
    this.perspCamera.updateProjectionMatrix()

    for (const cam of [this.topCamera, this.frontCamera, this.rightCamera]) {
      cam.left  = -ORTHO_SIZE * aspect
      cam.right =  ORTHO_SIZE * aspect
      // top/bottom stay at ±ORTHO_SIZE; zoom handles effective scale
      cam.updateProjectionMatrix()
    }

    this.renderer.setSize(w, h)
  }

  private pointerMoved = false
  private pointerDownPos = { x: 0, y: 0 }

  private getViewportFromPointer(clientX: number, clientY: number): ViewportId {
    if (this.maximizedPanel) return this.maximizedPanel
    const rect = this.renderer.domElement.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const left = x < rect.width / 2
    const top  = y < rect.height / 2
    if (top  && left)  return 'top'
    if (top  && !left) return 'persp'
    if (!top && left)  return 'front'
    return 'right'
  }

  private getActiveCamera(): THREE.Camera {
    switch (this.activeViewport) {
      case 'persp': return this.perspCamera
      case 'top':   return this.topCamera
      case 'front': return this.frontCamera
      case 'right': return this.rightCamera
    }
  }

  private getActiveControls(): OrbitControls {
    switch (this.activeViewport) {
      case 'persp': return this.perspControls
      case 'top':   return this.topControls
      case 'front': return this.frontControls
      case 'right': return this.rightControls
    }
  }

  // Updates active viewport and enables the right controls on hover (no click needed).
  // Skipped while any button is held so mid-drag moves don't switch panels.
  private onPointerHover = (e: PointerEvent) => {
    if (e.buttons !== 0) return
    const vp = this.getViewportFromPointer(e.clientX, e.clientY)
    if (vp === this.activeViewport) return
    this.activeViewport = vp
    this.perspControls.enabled  = vp === 'persp'
    this.topControls.enabled    = vp === 'top'
    this.frontControls.enabled  = vp === 'front'
    this.rightControls.enabled  = vp === 'right'
    this.transformControls.camera = this.getActiveCamera()
  }

  private onPointerDown = (e: PointerEvent) => {
    // Viewport is already active from hover; just sync TC camera in case of edge cases
    this.transformControls.camera = this.getActiveCamera()

    if (e.button !== 0) return
    this.pointerMoved = false
    this.pointerDownPos = { x: e.clientX, y: e.clientY }
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove)
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp, { once: true })
  }

  private onPointerMove = (e: PointerEvent) => {
    const dx = e.clientX - this.pointerDownPos.x
    const dy = e.clientY - this.pointerDownPos.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.pointerMoved = true
  }

  private onPointerUp = (e: PointerEvent) => {
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove)
    if (this.pointerMoved) return
    if (e.button !== 0) return
    if (e.altKey) return
    if (this.gizmoDragActive) return
    if (this.currentMode === 'vertex') {
      this.pickVertex(e)
    } else if (this.currentMode === 'face') {
      this.pickFace(e)
    } else {
      this.pickObject(e)
    }
  }

  // NDC computed within the active panel (each panel maps to [-1,1]x[-1,1])
  private getNDC(e: PointerEvent): THREE.Vector2 {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (this.maximizedPanel) {
      return new THREE.Vector2(
        (x / rect.width) * 2 - 1,
        -(y / rect.height) * 2 + 1,
      )
    }
    const hw = rect.width / 2
    const hh = rect.height / 2
    const panelLeft = (this.activeViewport === 'persp' || this.activeViewport === 'right') ? hw : 0
    const panelTop  = (this.activeViewport === 'front' || this.activeViewport === 'right') ? hh : 0
    return new THREE.Vector2(
      ((x - panelLeft) / hw) * 2 - 1,
      -((y - panelTop) / hh) * 2 + 1,
    )
  }

  private pickObject(e: PointerEvent) {
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(this.getNDC(e), this.getActiveCamera())
    const meshes = Array.from(this.meshMap.values())
    const hits = raycaster.intersectObjects(meshes, false)
    if (hits.length > 0) {
      const id = this.findIdByMesh(hits[0].object as THREE.Mesh)
      if (id) { this.onSelect(id); return }
    }
    this.onSelect(null)
  }

  private pickVertex(e: PointerEvent) {
    if (this.vertexPoints && this.selectedId) {
      const raycaster = new THREE.Raycaster()
      raycaster.params.Points = { threshold: 0.08 }
      raycaster.setFromCamera(this.getNDC(e), this.getActiveCamera())
      const hits = raycaster.intersectObject(this.vertexPoints, false)
      if (hits.length > 0) {
        // hits[0].index = overlay point index = weld group index
        const groupIdx = hits[0].index!
        const representative = this.weldMap ? this.weldMap.groups[groupIdx][0] : groupIdx
        if (e.shiftKey) {
          const cur = this.selectedVertexIndices
          const isSelected = cur.includes(representative)
          const next = isSelected
            ? cur.filter(v => v !== representative)
            : [...cur, representative]
          this.onSelectVertices(next)
        } else {
          this.onSelectVertices([representative])
        }
        return
      }
      if (!e.shiftKey) this.onSelectVertices([])
      return
    }
    this.pickObject(e)
  }

  private pickFace(e: PointerEvent) {
    if (this.selectedId) {
      const mesh = this.meshMap.get(this.selectedId)
      if (mesh) {
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(this.getNDC(e), this.getActiveCamera())
        const hits = raycaster.intersectObject(mesh, false)
        if (hits.length > 0 && hits[0].faceIndex != null) {
          const idx = hits[0].faceIndex
          if (e.shiftKey) {
            const cur = this.selectedFaceIndices
            const next = cur.includes(idx) ? cur.filter(i => i !== idx) : [...cur, idx]
            this.onSelectFaces(next)
          } else {
            this.onSelectFaces([idx])
          }
          return
        }
        if (!e.shiftKey) this.onSelectFaces([])
        return
      }
    }
    this.pickObject(e)
  }

  private findIdByMesh(mesh: THREE.Mesh): string | null {
    for (const [id, m] of this.meshMap) {
      if (m === mesh) return id
    }
    return null
  }

  // ── Public API ────────────────────────────────────────────────

  setMaximizedPanel(vp: ViewportId | null) {
    this.maximizedPanel = vp
    if (vp) {
      this.activeViewport = vp
      this.perspControls.enabled  = vp === 'persp'
      this.topControls.enabled    = vp === 'top'
      this.frontControls.enabled  = vp === 'front'
      this.rightControls.enabled  = vp === 'right'
      this.transformControls.camera = this.getActiveCamera()
    }
  }

  syncObjects(objects: MeshObject[], selectedId: string | null) {
    this.currentObjects = objects
    const incoming = new Set(objects.map(o => o.id))

    for (const [id] of this.meshMap) {
      if (!incoming.has(id)) this.removeMeshFromScene(id)
    }

    let newlyAddedSelectedId: string | null = null
    for (const obj of objects) {
      if (!this.meshMap.has(obj.id)) {
        this.addMeshToScene(obj)
        if (obj.id === selectedId) newlyAddedSelectedId = obj.id
      } else {
        this.updateMeshGeometryIfChanged(obj)
        if (!(this.gizmoDragActive && this.currentMode === 'object' && obj.id === this.selectedId)) {
          this.updateMeshTransform(obj)
        }
      }
    }

    if (selectedId !== this.selectedId) {
      this.setSelection(selectedId)
    }

    if (newlyAddedSelectedId) {
      const mesh = this.meshMap.get(newlyAddedSelectedId)
      if (mesh) this.autoFrameNewObject(mesh)
    }
  }

  setActiveTool(tool: ActiveTool) {
    this.activeTool = tool
    this.updateGizmoAttachment()
  }

  setEditorMode(mode: EditorMode) {
    this.currentMode = mode
    // Disable right-click pan in vertex/face mode (right-click = box select)
    ;(this.perspControls.mouseButtons as any).RIGHT = (mode === 'vertex' || mode === 'face') ? null : THREE.MOUSE.PAN
    this.updateGizmoAttachment()
    if (mode === 'vertex' && this.selectedId) {
      const obj = this.currentObjects.find(o => o.id === this.selectedId)
      if (obj) this.buildVertexOverlay(obj.meshData)
    } else {
      this.clearVertexOverlay()
    }
    if (mode !== 'face') {
      this.clearFaceHighlight()
    }
  }

  private updateGizmoAttachment() {
    const modeMap = { translate: 'translate', rotate: 'rotate', scale: 'scale' } as const

    if (this.currentMode === 'object') {
      if (this.selectionPivot) {
        this.scene.remove(this.selectionPivot)
        this.selectionPivot = null
      }
      const mesh = this.selectedId ? this.meshMap.get(this.selectedId) : undefined
      if (this.activeTool !== 'select' && mesh) {
        this.transformControls.attach(mesh)
        this.transformControls.setMode(modeMap[this.activeTool as 'translate' | 'rotate' | 'scale'])
      } else {
        this.transformControls.detach()
      }
    } else {
      this.updateSelectionPivot()
    }
  }

  selectVertex(index: number | null) {
    this.selectVertices(index !== null ? [index] : [])
  }

  selectVertices(indices: number[]) {
    this.selectedVertexIndices = indices
    this.updateVertexHighlight()
    this.updateGizmoAttachment()
  }

  getVerticesInBox(ndcX1: number, ndcY1: number, ndcX2: number, ndcY2: number): number[] {
    if (!this.selectedId) return []
    const obj = this.currentObjects.find(o => o.id === this.selectedId)
    const mesh = this.meshMap.get(this.selectedId)
    if (!obj || !mesh) return []

    const { positions } = obj.meshData
    const result: number[] = []
    const minX = Math.min(ndcX1, ndcX2), maxX = Math.max(ndcX1, ndcX2)
    const minY = Math.min(ndcY1, ndcY2), maxY = Math.max(ndcY1, ndcY2)

    const v = new THREE.Vector3()
    const camera = this.getActiveCamera()

    if (this.weldMap) {
      // Test one representative per logical group; collect only that representative.
      for (const group of this.weldMap.groups) {
        const vi = group[0]
        v.set(positions[vi * 3], positions[vi * 3 + 1], positions[vi * 3 + 2])
        v.applyMatrix4(mesh.matrixWorld)
        v.project(camera)
        if (v.z > 1) continue
        if (v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY) result.push(vi)
      }
    } else {
      const count = positions.length / 3
      for (let i = 0; i < count; i++) {
        v.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
        v.applyMatrix4(mesh.matrixWorld)
        v.project(camera)
        if (v.z > 1) continue
        if (v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY) result.push(i)
      }
    }
    return result
  }

  selectFace(index: number | null) {
    this.selectFaces(index !== null ? [index] : [])
  }

  selectFaces(indices: number[]) {
    this.selectedFaceIndices = indices
    if (indices.length > 0 && this.selectedId) {
      const obj = this.currentObjects.find(o => o.id === this.selectedId)
      if (obj) this.buildFaceHighlight(obj.meshData, indices)
    } else {
      this.clearFaceHighlight()
    }
    this.updateGizmoAttachment()
  }

  getFacesInBox(ndcX1: number, ndcY1: number, ndcX2: number, ndcY2: number): number[] {
    if (!this.selectedId) return []
    const obj = this.currentObjects.find(o => o.id === this.selectedId)
    const mesh = this.meshMap.get(this.selectedId)
    if (!obj || !mesh) return []

    const { positions, indices } = obj.meshData
    const triCount = indices.length / 3
    const result: number[] = []
    const minX = Math.min(ndcX1, ndcX2), maxX = Math.max(ndcX1, ndcX2)
    const minY = Math.min(ndcY1, ndcY2), maxY = Math.max(ndcY1, ndcY2)

    const v = new THREE.Vector3()
    const camera = this.getActiveCamera()
    for (let t = 0; t < triCount; t++) {
      const a = indices[t*3], b = indices[t*3+1], c = indices[t*3+2]
      v.set(
        (positions[a*3] + positions[b*3] + positions[c*3]) / 3,
        (positions[a*3+1] + positions[b*3+1] + positions[c*3+1]) / 3,
        (positions[a*3+2] + positions[b*3+2] + positions[c*3+2]) / 3,
      )
      v.applyMatrix4(mesh.matrixWorld)
      v.project(camera)
      if (v.z > 1) continue
      if (v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY) result.push(t)
    }
    return result
  }

  setWireframeMode(mode: WireframeMode) {
    this.wireframeMode = mode
    for (const [id, mesh] of this.meshMap) {
      const old = this.wireframeMap.get(id)
      if (old) { mesh.remove(old); old.geometry.dispose() }
      const wf = this.buildWireframe(mesh.geometry as THREE.BufferGeometry)
      const mat = id === this.selectedId ? this.selectedWireframeMat : this.wireframeMat
      ;(wf.material as THREE.LineBasicMaterial).copy(mat)
      mesh.add(wf)
      this.wireframeMap.set(id, wf)
    }
  }

  setGridVisible(visible: boolean) {
    this.gridHelper.visible = visible
  }

  setShowVertexColors(show: boolean) {
    this.showVertexColors = show
    for (const obj of this.currentObjects) {
      const mesh = this.meshMap.get(obj.id)
      if (mesh) mesh.material = this.resolveMat(obj.id, obj.meshData)
    }
  }

  setShowUVChecker(show: boolean) {
    this.showUVChecker = show
    for (const obj of this.currentObjects) {
      const mesh = this.meshMap.get(obj.id)
      if (mesh) mesh.material = this.resolveMat(obj.id, obj.meshData)
    }
  }

  private resolveMat(objId: string, meshData: MeshData): THREE.Material {
    if (this.showUVChecker) return this.uvCheckerMat
    if (this.showVertexColors && meshData.colors) return this.vcMat
    return this.meshMatMap.get(objId)!
  }

  setShowNormals(show: boolean) {
    this.showNormals = show
    if (show && this.selectedId) {
      const obj = this.currentObjects.find(o => o.id === this.selectedId)
      if (obj) this.buildNormalOverlay(obj.meshData)
    } else {
      this.clearNormalOverlay()
    }
  }

  setShowTangents(show: boolean) {
    this.showTangents = show
    if (show && this.selectedId) {
      const obj = this.currentObjects.find(o => o.id === this.selectedId)
      if (obj) this.buildTangentOverlay(obj.meshData)
    } else {
      this.clearTangentOverlay()
    }
  }

  // ── Camera framing ───────────────────────────────────────────

  private computeFrameParams(mesh: THREE.Mesh): { center: THREE.Vector3; radius: number; dist: number } {
    const box = new THREE.Box3().setFromObject(mesh)
    const center = box.getCenter(new THREE.Vector3())
    if (box.isEmpty()) return { center, radius: 1, dist: 5 }

    const sphere = new THREE.Sphere()
    box.getBoundingSphere(sphere)
    const radius = Math.max(sphere.radius, 0.01)

    // Distance so the bounding sphere fills the tighter FOV axis, with 1.35× margin
    const fovY = THREE.MathUtils.degToRad(this.perspCamera.fov)
    const fovH = 2 * Math.atan(Math.tan(fovY / 2) * this.perspCamera.aspect)
    const halfFov = Math.min(fovY, fovH) / 2
    const dist = Math.max((radius / Math.sin(halfFov)) * 1.35, radius * 2.5, 0.3)

    return { center, radius, dist }
  }

  frameSelected() {
    if (!this.selectedId) return
    const mesh = this.meshMap.get(this.selectedId)
    if (!mesh) return

    const { center, radius, dist } = this.computeFrameParams(mesh)
    const ctrl = this.getActiveControls()

    // Flush any accumulated pan/rotation inertia so the position reset
    // is not disturbed by pending panOffset/sphericalDelta from damping.
    const wasDamping = ctrl.enableDamping
    ctrl.enableDamping = false
    ctrl.update()
    ctrl.enableDamping = wasDamping

    ctrl.target.copy(center)

    if (this.activeViewport === 'persp') {
      // Diagonal view — simultaneously shows front, side and top
      const dir = new THREE.Vector3(1, 0.7, 1).normalize()
      this.perspCamera.position.copy(center).addScaledVector(dir, dist)
      ctrl.update()
    } else {
      const cam = this.getActiveCamera() as THREE.OrthographicCamera
      // Reset canonical camera position to eliminate pan-induced drift
      const D = 100
      switch (this.activeViewport) {
        case 'front': cam.position.set(center.x, center.y, center.z + D); break
        case 'right': cam.position.set(center.x + D, center.y, center.z); break
        case 'top':   cam.position.set(center.x, center.y + D, center.z); break
      }
      const frustumH = cam.top - cam.bottom
      cam.zoom = frustumH / Math.max(radius * 2.5, 0.1)
      cam.updateProjectionMatrix()
      ctrl.update()
    }
  }

  // Auto-frame when a new object is created: preserve current camera direction,
  // only adjust distance and orbit target so the object fills the viewport.
  private autoFrameNewObject(mesh: THREE.Mesh) {
    const { center, radius, dist } = this.computeFrameParams(mesh)

    // Perspective — keep current view direction, pull/push to correct distance
    let dir = this.perspCamera.position.clone().sub(center)
    if (dir.lengthSq() < 1e-10) dir.set(1, 0.7, 1)
    dir.normalize()
    this.perspCamera.position.copy(center).addScaledVector(dir, dist)
    this.perspControls.target.copy(center)
    this.perspControls.update()

    // Ortho cameras — re-center and adjust zoom
    const orthoZoom = (ORTHO_SIZE * 2) / Math.max(radius * 2.5, 0.1)
    for (const ctrl of [this.topControls, this.frontControls, this.rightControls]) {
      ctrl.target.copy(center)
      ctrl.update()
    }
    for (const cam of [this.topCamera, this.frontCamera, this.rightCamera]) {
      cam.zoom = orthoZoom
      cam.updateProjectionMatrix()
    }
  }

  // ── Private scene management ─────────────────────────────────

  private addMeshToScene(obj: MeshObject) {
    const geometry = meshDataToBufferGeometry(obj.meshData)
    const mat = this.defaultMat.clone()
    this.meshMatMap.set(obj.id, mat)
    const mesh = new THREE.Mesh(geometry, this.resolveMat(obj.id, obj.meshData))
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.applyTransform(mesh, obj)
    this.scene.add(mesh)
    this.meshMap.set(obj.id, mesh)
    this.meshDataRefMap.set(obj.id, obj.meshData)

    const wf = this.buildWireframe(geometry)
    mesh.add(wf)
    this.wireframeMap.set(obj.id, wf)
  }

  private updateMeshGeometryIfChanged(obj: MeshObject) {
    if (this.meshDataRefMap.get(obj.id) === obj.meshData) return
    const mesh = this.meshMap.get(obj.id)
    if (!mesh) return

    mesh.geometry.dispose()
    mesh.geometry = meshDataToBufferGeometry(obj.meshData)

    mesh.material = this.resolveMat(obj.id, obj.meshData)

    const oldWf = this.wireframeMap.get(obj.id)
    if (oldWf) { mesh.remove(oldWf); oldWf.geometry.dispose() }
    const wf = this.buildWireframe(mesh.geometry)
    const wfMat = obj.id === this.selectedId ? this.selectedWireframeMat : this.wireframeMat
    ;(wf.material as THREE.LineBasicMaterial).copy(wfMat)
    mesh.add(wf)
    this.wireframeMap.set(obj.id, wf)

    if (obj.id === this.selectedId) {
      if (this.currentMode === 'vertex') {
        this.buildVertexOverlay(obj.meshData)
        this.updateVertexHighlight()
      }
      if (this.currentMode === 'face' && this.selectedFaceIndices.length > 0) {
        const maxFace = obj.meshData.indices.length / 3
        const validFaces = this.selectedFaceIndices.filter(fi => fi < maxFace)
        if (validFaces.length > 0) this.buildFaceHighlight(obj.meshData, validFaces)
        else this.clearFaceHighlight()
      }
      if (this.showNormals) this.buildNormalOverlay(obj.meshData)
      if (this.showTangents) this.buildTangentOverlay(obj.meshData)
    }

    this.meshDataRefMap.set(obj.id, obj.meshData)
  }

  private updateMeshTransform(obj: MeshObject) {
    const mesh = this.meshMap.get(obj.id)
    if (!mesh) return
    this.applyTransform(mesh, obj)
  }

  private applyTransform(mesh: THREE.Mesh, obj: MeshObject) {
    const { position, rotation, scale } = obj.transform
    mesh.position.set(...position)
    mesh.rotation.set(...rotation)
    mesh.scale.set(...scale)
  }

  private setSelection(id: string | null) {
    if (this.selectedId) {
      const prevMat = this.meshMatMap.get(this.selectedId)
      const prevMesh = this.meshMap.get(this.selectedId)
      const prevObj = this.currentObjects.find(o => o.id === this.selectedId)
      if (prevMat && prevMesh) {
        prevMat.copy(this.defaultMat)
        prevMesh.material = prevObj ? this.resolveMat(this.selectedId, prevObj.meshData) : prevMat
        const wf = this.wireframeMap.get(this.selectedId)
        if (wf) (wf.material as THREE.LineBasicMaterial).copy(this.wireframeMat)
      }
    }

    this.selectedId = id
    this.clearVertexOverlay()
    this.clearFaceHighlight()
    this.clearNormalOverlay()
    this.clearTangentOverlay()
    this.updateGizmoAttachment()

    if (id) {
      const mesh = this.meshMap.get(id)
      const meshMat = this.meshMatMap.get(id)
      const obj = this.currentObjects.find(o => o.id === id)
      if (mesh && meshMat) {
        meshMat.copy(this.selectedMat)
        if (obj) mesh.material = this.resolveMat(id, obj.meshData)
        const wf = this.wireframeMap.get(id)
        if (wf) (wf.material as THREE.LineBasicMaterial).copy(this.selectedWireframeMat)
      }
      if (obj) {
        if (this.currentMode === 'vertex') this.buildVertexOverlay(obj.meshData)
        if (this.showNormals) this.buildNormalOverlay(obj.meshData)
        if (this.showTangents) this.buildTangentOverlay(obj.meshData)
      }
    }
  }

  private removeMeshFromScene(id: string) {
    if (this.selectedId === id) {
      this.clearVertexOverlay()
      this.clearFaceHighlight()
    }
    const mesh = this.meshMap.get(id)
    if (mesh) { mesh.geometry.dispose(); this.scene.remove(mesh); this.meshMap.delete(id) }
    const mat = this.meshMatMap.get(id)
    if (mat) { mat.dispose(); this.meshMatMap.delete(id) }
    const wf = this.wireframeMap.get(id)
    if (wf) { wf.geometry.dispose(); this.wireframeMap.delete(id) }
    this.meshDataRefMap.delete(id)
    if (this.selectedId === id) this.selectedId = null
  }

  private buildWireframe(geometry: THREE.BufferGeometry): THREE.LineSegments {
    const wfGeo = this.wireframeMode === 'quad'
      ? new THREE.EdgesGeometry(geometry, 5)
      : new THREE.WireframeGeometry(geometry)
    return new THREE.LineSegments(wfGeo, this.wireframeMat.clone())
  }

  // ── Sub-object transforms ────────────────────────────────────

  private getSelectionVertexIndicesForMode(): number[] {
    if (this.currentMode === 'vertex') return this.selectedVertexIndices
    if (this.currentMode === 'face') {
      const obj = this.currentObjects.find(o => o.id === this.selectedId)
      if (!obj) return []
      const { indices } = obj.meshData
      const set = new Set<number>()
      for (const fi of this.selectedFaceIndices) {
        set.add(indices[fi*3])
        set.add(indices[fi*3+1])
        set.add(indices[fi*3+2])
      }
      return Array.from(set)
    }
    return []
  }

  private getSelectionCentroid(): THREE.Vector3 | null {
    const vertexIndices = this.getSelectionVertexIndicesForMode()
    if (vertexIndices.length === 0 || !this.selectedId) return null
    const obj = this.currentObjects.find(o => o.id === this.selectedId)
    const mesh = this.meshMap.get(this.selectedId)
    if (!obj || !mesh) return null
    const { positions } = obj.meshData
    const c = new THREE.Vector3()
    for (const vi of vertexIndices) {
      c.x += positions[vi*3]; c.y += positions[vi*3+1]; c.z += positions[vi*3+2]
    }
    c.divideScalar(vertexIndices.length)
    c.applyMatrix4(mesh.matrixWorld)
    return c
  }

  private updateSelectionPivot() {
    if (this.selectionPivot) { this.scene.remove(this.selectionPivot); this.selectionPivot = null }
    this.transformControls.detach()
    const vertexIndices = this.getSelectionVertexIndicesForMode()
    if (vertexIndices.length === 0 || this.activeTool === 'select') return
    const centroid = this.getSelectionCentroid()
    if (!centroid) return
    this.selectionPivot = new THREE.Object3D()
    this.selectionPivot.position.copy(centroid)
    this.scene.add(this.selectionPivot)
    this.transformControls.attach(this.selectionPivot)
    const modeMap = { translate: 'translate', rotate: 'rotate', scale: 'scale' } as const
    this.transformControls.setMode(modeMap[this.activeTool as 'translate' | 'rotate' | 'scale'])
  }

  private snapshotBaseVertexPositions() {
    const vertexIndices = this.getEffectiveVertexIndicesForTransform()
    if (vertexIndices.length === 0 || !this.selectedId) { this.baseVertexPositions = null; return }
    const obj = this.currentObjects.find(o => o.id === this.selectedId)
    if (!obj) { this.baseVertexPositions = null; return }
    const { positions } = obj.meshData
    this.baseVertexPositions = new Float32Array(vertexIndices.length * 3)
    vertexIndices.forEach((vi, idx) => {
      this.baseVertexPositions![idx*3]   = positions[vi*3]
      this.baseVertexPositions![idx*3+1] = positions[vi*3+1]
      this.baseVertexPositions![idx*3+2] = positions[vi*3+2]
    })
  }

  private applyPivotTransformToMesh() {
    if (!this.selectionPivot || !this.baseVertexPositions || !this.selectedId) return
    const obj = this.currentObjects.find(o => o.id === this.selectedId)
    const mesh = this.meshMap.get(this.selectedId)
    if (!obj || !mesh) return
    const vertexIndices = this.getEffectiveVertexIndicesForTransform()
    if (vertexIndices.length === 0) return

    this.selectionPivot.updateWorldMatrix(true, false)
    const mDelta = this.selectionPivot.matrixWorld.clone().multiply(
      this.pivotBaseMatrix.clone().invert()
    )
    mesh.updateWorldMatrix(true, false)
    const mTransform = mesh.matrixWorld.clone().invert().multiply(mDelta).multiply(mesh.matrixWorld)

    const { positions } = obj.meshData
    const v = new THREE.Vector3()
    vertexIndices.forEach((vi, idx) => {
      v.set(this.baseVertexPositions![idx*3], this.baseVertexPositions![idx*3+1], this.baseVertexPositions![idx*3+2])
      v.applyMatrix4(mTransform)
      positions[vi*3] = v.x; positions[vi*3+1] = v.y; positions[vi*3+2] = v.z
    })

    ;(mesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true

    this.refreshOverlaysDuringDrag(obj.meshData)
  }

  private refreshOverlaysDuringDrag(meshData: MeshData) {
    const { positions } = meshData

    if (this.vertexPoints) {
      const attr = this.vertexPoints.geometry.attributes.position as THREE.BufferAttribute
      if (this.weldMap) {
        // One overlay point per logical group — update from the representative render vertex.
        const { groups } = this.weldMap
        for (let gi = 0; gi < groups.length; gi++) {
          const vi = groups[gi][0]
          attr.setXYZ(gi, positions[vi * 3], positions[vi * 3 + 1], positions[vi * 3 + 2])
        }
      } else {
        ;(attr.array as Float32Array).set(positions)
      }
      attr.needsUpdate = true
    }
    if (this.currentMode === 'face' && this.selectedFaceIndices.length > 0) {
      this.buildFaceHighlight(meshData, this.selectedFaceIndices)
    }
  }

  private syncVerticesToStore() {
    if (!this.selectedId) return
    const obj = this.currentObjects.find(o => o.id === this.selectedId)
    const mesh = this.meshMap.get(this.selectedId)
    if (obj && mesh && obj.meshData.normals) {
      mesh.geometry.computeVertexNormals()
      const normalAttr = mesh.geometry.attributes.normal as THREE.BufferAttribute
      obj.meshData.normals!.set(normalAttr.array as Float32Array)
    }
    this.onNotifyMeshChanged(this.selectedId)
  }

  // ── Face highlight ───────────────────────────────────────────

  private buildFaceHighlight(meshData: MeshData, faceIndices: number[]) {
    this.clearFaceHighlight()
    const mesh = this.meshMap.get(this.selectedId!)
    if (!mesh || faceIndices.length === 0) return

    const { positions, indices } = meshData
    const verts = new Float32Array(faceIndices.length * 9)
    faceIndices.forEach((fi, i) => {
      const a = indices[fi*3], b = indices[fi*3+1], c = indices[fi*3+2]
      verts[i*9+0] = positions[a*3];   verts[i*9+1] = positions[a*3+1]; verts[i*9+2] = positions[a*3+2]
      verts[i*9+3] = positions[b*3];   verts[i*9+4] = positions[b*3+1]; verts[i*9+5] = positions[b*3+2]
      verts[i*9+6] = positions[c*3];   verts[i*9+7] = positions[c*3+1]; verts[i*9+8] = positions[c*3+2]
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
    this.faceHighlight = new THREE.Mesh(geo, this.faceHighlightMat)
    mesh.add(this.faceHighlight)
  }

  private clearFaceHighlight() {
    if (!this.faceHighlight) return
    this.faceHighlight.parent?.remove(this.faceHighlight)
    this.faceHighlight.geometry.dispose()
    this.faceHighlight = null
  }

  // ── Normal overlay ───────────────────────────────────────────

  private buildNormalOverlay(meshData: MeshData) {
    this.clearNormalOverlay()
    const mesh = this.meshMap.get(this.selectedId!)
    if (!mesh || !meshData.normals) return

    const { positions, normals } = meshData
    const count = positions.length / 3
    const pts = new Float32Array(count * 6)

    for (let i = 0; i < count; i++) {
      pts[i*6+0] = positions[i*3+0]
      pts[i*6+1] = positions[i*3+1]
      pts[i*6+2] = positions[i*3+2]
      pts[i*6+3] = positions[i*3+0] + normals[i*3+0] * this.normalScale
      pts[i*6+4] = positions[i*3+1] + normals[i*3+1] * this.normalScale
      pts[i*6+5] = positions[i*3+2] + normals[i*3+2] * this.normalScale
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3))
    this.normalLines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0x00ddff, transparent: true, opacity: 0.75, depthTest: false }),
    )
    mesh.add(this.normalLines)
  }

  private clearNormalOverlay() {
    if (!this.normalLines) return
    this.normalLines.parent?.remove(this.normalLines)
    this.normalLines.geometry.dispose()
    ;(this.normalLines.material as THREE.LineBasicMaterial).dispose()
    this.normalLines = null
  }

  // ── Tangent overlay ──────────────────────────────────────────

  private buildTangentOverlay(meshData: MeshData) {
    this.clearTangentOverlay()
    const mesh = this.meshMap.get(this.selectedId!)
    if (!mesh || !meshData.tangents) return

    const { positions, tangents } = meshData
    const count = positions.length / 3
    const pts = new Float32Array(count * 6)

    for (let i = 0; i < count; i++) {
      pts[i*6+0] = positions[i*3+0]
      pts[i*6+1] = positions[i*3+1]
      pts[i*6+2] = positions[i*3+2]
      pts[i*6+3] = positions[i*3+0] + tangents[i*4+0] * this.normalScale
      pts[i*6+4] = positions[i*3+1] + tangents[i*4+1] * this.normalScale
      pts[i*6+5] = positions[i*3+2] + tangents[i*4+2] * this.normalScale
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3))
    this.tangentLines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.75, depthTest: false }),
    )
    mesh.add(this.tangentLines)
  }

  private clearTangentOverlay() {
    if (!this.tangentLines) return
    this.tangentLines.parent?.remove(this.tangentLines)
    this.tangentLines.geometry.dispose()
    ;(this.tangentLines.material as THREE.LineBasicMaterial).dispose()
    this.tangentLines = null
  }

  // ── Logical weld map ─────────────────────────────────────────

  // Groups render vertices that are spatially coincident (within WELD_EPSILON)
  // into logical vertices.  O(n) via spatial hashing.
  private buildWeldMap(positions: Float32Array): void {
    const WELD_EPSILON = 1e-5
    const INV = 1 / WELD_EPSILON
    const count = positions.length / 3
    const groups: number[][] = []
    const renderToGroup = new Int32Array(count).fill(-1)
    const hashMap = new Map<string, number>()

    for (let v = 0; v < count; v++) {
      const x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2]
      const key = `${Math.round(x * INV)},${Math.round(y * INV)},${Math.round(z * INV)}`
      let gi = hashMap.get(key)
      if (gi === undefined) {
        gi = groups.length
        groups.push([v])
        hashMap.set(key, gi)
      } else {
        groups[gi].push(v)
      }
      renderToGroup[v] = gi
    }

    this.weldMap = { groups, renderToGroup }
  }

  // Given a list of representative render-vertex indices (one per selected logical
  // group), return the full set of render-vertex indices that should be moved.
  private expandWithWeldMap(representatives: number[]): number[] {
    if (!this.weldMap) return representatives
    const { groups, renderToGroup } = this.weldMap
    const seenGroups = new Set<number>()
    const result: number[] = []
    for (const vi of representatives) {
      const gi = renderToGroup[vi]
      if (gi === -1 || seenGroups.has(gi)) continue
      seenGroups.add(gi)
      for (const rv of groups[gi]) result.push(rv)
    }
    return result
  }

  // Returns the render-vertex indices that should actually be transformed.
  // In vertex mode: expands selected representatives to all group members.
  // In face mode: unchanged (face vertex indices).
  private getEffectiveVertexIndicesForTransform(): number[] {
    if (this.currentMode === 'vertex') return this.expandWithWeldMap(this.selectedVertexIndices)
    return this.getSelectionVertexIndicesForMode()
  }

  // ── Vertex overlay ───────────────────────────────────────────

  private buildVertexOverlay(meshData: MeshData) {
    this.clearVertexOverlay()
    const mesh = this.meshMap.get(this.selectedId!)
    if (!mesh) return

    const positions = meshData.positions
    this.buildWeldMap(positions)
    const { groups } = this.weldMap!
    const G = groups.length

    // One point per logical group; use the first render vertex as representative.
    const overlayPositions = new Float32Array(G * 3)
    const colors = new Float32Array(G * 3)
    const [dr, dg, db] = VERTEX_COLOR_DEFAULT
    for (let gi = 0; gi < G; gi++) {
      const vi = groups[gi][0]
      overlayPositions[gi * 3]     = positions[vi * 3]
      overlayPositions[gi * 3 + 1] = positions[vi * 3 + 1]
      overlayPositions[gi * 3 + 2] = positions[vi * 3 + 2]
      colors[gi * 3] = dr; colors[gi * 3 + 1] = dg; colors[gi * 3 + 2] = db
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(overlayPositions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 7,
      sizeAttenuation: false,
      vertexColors: true,
      depthTest: false,
    })

    this.vertexPoints = new THREE.Points(geo, mat)
    mesh.add(this.vertexPoints)
  }

  private clearVertexOverlay() {
    if (!this.vertexPoints) return
    this.vertexPoints.parent?.remove(this.vertexPoints)
    this.vertexPoints.geometry.dispose()
    ;(this.vertexPoints.material as THREE.PointsMaterial).dispose()
    this.vertexPoints = null
    this.weldMap = null
  }

  private updateVertexHighlight() {
    if (!this.vertexPoints) return
    const colors = this.vertexPoints.geometry.attributes.color as THREE.BufferAttribute
    const count = colors.count
    const [dr, dg, db] = VERTEX_COLOR_DEFAULT
    const [sr, sg, sb] = VERTEX_COLOR_SELECTED
    const selected = new Set(this.selectedVertexIndices)

    if (this.weldMap) {
      const { groups } = this.weldMap
      // Overlay point gi is selected when its representative (groups[gi][0]) is selected.
      for (let gi = 0; gi < count; gi++) {
        if (selected.has(groups[gi][0])) colors.setXYZ(gi, sr, sg, sb)
        else colors.setXYZ(gi, dr, dg, db)
      }
    } else {
      for (let i = 0; i < count; i++) {
        if (selected.has(i)) colors.setXYZ(i, sr, sg, sb)
        else colors.setXYZ(i, dr, dg, db)
      }
    }
    colors.needsUpdate = true
  }

  // ── Render loop ───────────────────────────────────────────────

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate)

    this.perspControls.update()
    this.topControls.update()
    this.frontControls.update()
    this.rightControls.update()

    const w = this.container.clientWidth
    const h = this.container.clientHeight
    const hw = Math.floor(w / 2)
    const hh = Math.floor(h / 2)

    this.renderer.setScissorTest(true)

    if (this.maximizedPanel) {
      this.renderPanel(this.getActiveCamera(), 0, 0, w, h)
    } else {
      // GL coords: (x, y) = bottom-left of panel
      // Screen layout:        GL layout (y flipped):
      //  TL=top    TR=persp    TL → GL(0, hh)    TR → GL(hw, hh)
      //  BL=front  BR=right    BL → GL(0, 0)     BR → GL(hw, 0)
      this.renderPanel(this.topCamera,   0,  hh, hw, hh)  // top-left
      this.renderPanel(this.perspCamera, hw, hh, hw, hh)  // top-right
      this.renderPanel(this.frontCamera, 0,  0,  hw, hh)  // bottom-left
      this.renderPanel(this.rightCamera, hw, 0,  hw, hh)  // bottom-right
    }

    this.renderer.setScissorTest(false)
    this.renderGizmo()
  }

  private renderPanel(camera: THREE.Camera, glX: number, glY: number, w: number, h: number) {
    this.renderer.setViewport(glX, glY, w, h)
    this.renderer.setScissor(glX, glY, w, h)
    this.renderer.setClearColor(this.viewportBgHex, 1)
    this.renderer.clear(true, true, false)
    this.renderer.render(this.scene, camera)
  }

  // ── Orientation gizmo (perspective panel corner) ─────────────

  private gizmoScene = new THREE.Scene()
  private gizmoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10)
  private gizmoInitialized = false

  private initGizmo() {
    this.gizmoCamera.position.set(0, 0, 5)
    const axes = [
      { dir: new THREE.Vector3(1, 0, 0),  color: 0xff4444, neg: false },
      { dir: new THREE.Vector3(-1, 0, 0), color: 0x883333, neg: true },
      { dir: new THREE.Vector3(0, 1, 0),  color: 0x44ff66, neg: false },
      { dir: new THREE.Vector3(0, -1, 0), color: 0x336644, neg: true },
      { dir: new THREE.Vector3(0, 0, 1),  color: 0x4488ff, neg: false },
      { dir: new THREE.Vector3(0, 0, -1), color: 0x334488, neg: true },
    ]
    for (const ax of axes) {
      const tip = ax.dir.clone().multiplyScalar(0.75)
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), tip])
      this.gizmoScene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: ax.color })))
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(ax.neg ? 0.05 : 0.09, 8, 6),
        new THREE.MeshBasicMaterial({ color: ax.color }),
      )
      s.position.copy(tip)
      this.gizmoScene.add(s)
    }
    this.gizmoScene.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xaaaaaa }),
    ))
    this.gizmoInitialized = true
  }

  private renderGizmo() {
    if (!this.gizmoInitialized) this.initGizmo()

    // Always render gizmo in the perspective panel (top-right), top-right corner
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    const size = 90
    // Perspective panel in GL: x=hw, y=hh, w=hw, h=hh
    // Gizmo top-right corner of that panel: glX = w-size-12, glY = h-size-12
    const gx = w - size - 12
    const gy = h - size - 12

    const dir = new THREE.Vector3()
    this.perspCamera.getWorldDirection(dir)
    this.gizmoCamera.position.copy(dir.negate().multiplyScalar(5))
    this.gizmoCamera.lookAt(0, 0, 0)

    this.renderer.setViewport(gx, gy, size, size)
    this.renderer.setScissor(gx, gy, size, size)
    this.renderer.setScissorTest(true)

    const savedColor = new THREE.Color()
    const savedAlpha = this.renderer.getClearAlpha()
    this.renderer.getClearColor(savedColor)
    this.renderer.setClearColor(this.gizmoBgHex, 1)
    this.renderer.clear(true, true, false)
    this.renderer.render(this.gizmoScene, this.gizmoCamera)
    this.renderer.setClearColor(savedColor, savedAlpha)
    this.renderer.setScissorTest(false)
    this.renderer.setViewport(0, 0, w, h)
  }

  dispose() {
    cancelAnimationFrame(this.animFrameId)
    this.resizeObserver.disconnect()
    this.themeObserver?.disconnect()
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerHover)
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown, true)
    this.clearVertexOverlay()
    this.clearFaceHighlight()
    this.clearNormalOverlay()
    this.clearTangentOverlay()
    if (this.selectionPivot) { this.scene.remove(this.selectionPivot); this.selectionPivot = null }
    for (const [id] of this.meshMap) this.removeMeshFromScene(id)
    this.transformControls.detach()
    this.transformControls.dispose()
    this.perspControls.dispose()
    this.topControls.dispose()
    this.frontControls.dispose()
    this.rightControls.dispose()
    this.uvCheckerMat.dispose()
    this.uvCheckerTex.dispose()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
