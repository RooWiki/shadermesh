import type { MeshData } from '../../core/MeshData'

type Pt = [number, number] // [x, z]

// --- helpers ---

function buildFilled(pts: Pt[]): MeshData {
  const n = pts.length
  let cx = 0, cz = 0
  for (const [x, z] of pts) { cx += x; cz += z }
  cx /= n; cz /= n

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const [x, z] of pts) {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
  }
  const rX = maxX - minX || 1, rZ = maxZ - minZ || 1
  // Normalize by the larger dimension to preserve aspect ratio; center in UV space
  const rMax = Math.max(rX, rZ)
  const uOff = (rMax - rX) * 0.5 / rMax
  const vOff = (rMax - rZ) * 0.5 / rMax

  const vertCount = n + 1
  const positions = new Float32Array(vertCount * 3)
  const normals = new Float32Array(vertCount * 3)
  const uvs = new Float32Array(vertCount * 2)
  const indices = new Uint32Array(n * 3)

  positions[0] = cx; positions[1] = 0; positions[2] = cz
  normals[1] = 1
  uvs[0] = uOff + (cx - minX) / rMax
  uvs[1] = 1 - (vOff + (cz - minZ) / rMax)

  for (let i = 0; i < n; i++) {
    const [x, z] = pts[i]
    const v3 = (i + 1) * 3, v2 = (i + 1) * 2
    positions[v3] = x; positions[v3 + 1] = 0; positions[v3 + 2] = z
    normals[v3 + 1] = 1
    uvs[v2]     = uOff + (x - minX) / rMax
    uvs[v2 + 1] = 1 - (vOff + (z - minZ) / rMax)
    const ii = i * 3
    indices[ii] = 0; indices[ii + 1] = (i + 1) % n + 1; indices[ii + 2] = i + 1
  }

  return { positions, normals, uvs, indices }
}

// Ring strip — outer CCW from above (+Y normal)
// outerY / innerY: optional per-vertex Y values; when provided, normals are omitted so Three.js computes them
function buildRingStrip(outer: Pt[], inner: Pt[], closed = true, outerY?: number[], innerY?: number[]): MeshData {
  const n = outer.length
  const vertCount = n * 2
  const triCount = closed ? n * 2 : (n - 1) * 2
  const positions = new Float32Array(vertCount * 3)
  const uvs = new Float32Array(vertCount * 2)
  const indices = new Uint32Array(triCount * 3)
  const hasY = outerY != null || innerY != null
  const normals = hasY ? undefined : new Float32Array(vertCount * 3)

  // Arc-length U parameterization along the outer edge
  const arcLens: number[] = [0]
  for (let i = 1; i < n; i++) {
    const dx = outer[i][0] - outer[i - 1][0]
    const dz = outer[i][1] - outer[i - 1][1]
    arcLens.push(arcLens[i - 1] + Math.sqrt(dx * dx + dz * dz))
  }
  const closingDx = outer[0][0] - outer[n - 1][0]
  const closingDz = outer[0][1] - outer[n - 1][1]
  const totalArc = closed
    ? arcLens[n - 1] + Math.sqrt(closingDx * closingDx + closingDz * closingDz)
    : arcLens[n - 1]
  const invArc = totalArc > 0 ? 1 / totalArc : 1

  for (let i = 0; i < n; i++) {
    const t = arcLens[i] * invArc
    const o3 = i * 3, o2 = i * 2, i3 = (n + i) * 3, i2 = (n + i) * 2
    const oy = outerY?.[i] ?? 0
    const iy = innerY?.[i] ?? 0
    positions[o3] = outer[i][0]; positions[o3 + 1] = oy; positions[o3 + 2] = outer[i][1]
    positions[i3] = inner[i][0]; positions[i3 + 1] = iy; positions[i3 + 2] = inner[i][1]
    if (normals) { normals[o3 + 1] = 1; normals[i3 + 1] = 1 }
    uvs[o2] = t; uvs[o2 + 1] = 1
    uvs[i2] = t; uvs[i2 + 1] = 0
  }

  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % n
    const ii = i * 6
    indices[ii] = i; indices[ii + 1] = n + i; indices[ii + 2] = next
    indices[ii + 3] = next; indices[ii + 4] = n + i; indices[ii + 5] = n + next
  }

  return normals ? { positions, normals, uvs, indices } : { positions, uvs, indices }
}

// Merge two MeshData together
function mergeMeshData(a: MeshData, b: MeshData): MeshData {
  const aVerts = a.positions.length / 3
  const positions = new Float32Array(a.positions.length + b.positions.length)
  const normals = new Float32Array(a.normals!.length + b.normals!.length)
  const uvs = new Float32Array(a.uvs!.length + b.uvs!.length)
  const indices = new Uint32Array(a.indices.length + b.indices.length)
  positions.set(a.positions); positions.set(b.positions, a.positions.length)
  normals.set(a.normals!); normals.set(b.normals!, a.normals!.length)
  uvs.set(a.uvs!); uvs.set(b.uvs!, a.uvs!.length)
  indices.set(a.indices)
  for (let i = 0; i < b.indices.length; i++) indices[a.indices.length + i] = b.indices[i] + aVerts
  return { positions, normals, uvs, indices }
}

function circlePoints(r: number, seg: number, start = 0, end = Math.PI * 2): Pt[] {
  const pts: Pt[] = []
  const range = end - start
  for (let i = 0; i < seg; i++) {
    const a = start + (i / seg) * range
    pts.push([r * Math.cos(a), r * Math.sin(a)])
  }
  return pts
}

function arcPoints(r: number, seg: number, start: number, end: number): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i <= seg; i++) {
    const a = start + (i / seg) * (end - start)
    pts.push([r * Math.cos(a), r * Math.sin(a)])
  }
  return pts
}

// --- 2D Shape generators ---

export interface CircleParams { radius?: number; segments?: number }
export function createCircle(p: CircleParams = {}): MeshData {
  const { radius = 0.5, segments = 32 } = p
  return buildFilled(circlePoints(radius, Math.max(3, segments)))
}

export interface EllipseParams { radiusX?: number; radiusZ?: number; segments?: number }
export function createEllipse(p: EllipseParams = {}): MeshData {
  const { radiusX = 0.5, radiusZ = 0.3, segments = 32 } = p
  const seg = Math.max(3, segments)
  const pts: Pt[] = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    pts.push([radiusX * Math.cos(a), radiusZ * Math.sin(a)])
  }
  return buildFilled(pts)
}

export interface OvalParams { width?: number; height?: number; segments?: number }
export function createOval(p: OvalParams = {}): MeshData {
  // Stadium shape: rectangle + two semicircles
  const { width = 1, height = 0.4, segments = 16 } = p
  const r = height / 2
  const hw = width / 2 - r
  const seg = Math.max(4, segments)
  const pts: Pt[] = []
  // Right semicircle
  for (let i = 0; i <= seg; i++) {
    const a = -Math.PI / 2 + (i / seg) * Math.PI
    pts.push([hw + r * Math.cos(a), r * Math.sin(a)])
  }
  // Left semicircle
  for (let i = 0; i <= seg; i++) {
    const a = Math.PI / 2 + (i / seg) * Math.PI
    pts.push([-hw + r * Math.cos(a), r * Math.sin(a)])
  }
  return buildFilled(pts)
}

export interface SemicircleParams { radius?: number; segments?: number }
export function createSemicircle(p: SemicircleParams = {}): MeshData {
  const { radius = 0.5, segments = 32 } = p
  const seg = Math.max(3, segments)
  const pts: Pt[] = []
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI
    pts.push([radius * Math.cos(a), radius * Math.sin(a)])
  }
  // close with center point handled by buildFilled (uses centroid), but we want flat base
  // so push the two endpoints to close the shape
  return buildFilled(pts)
}

export interface ArcParams { innerRadius?: number; outerRadius?: number; startAngle?: number; endAngle?: number; segments?: number; rise?: number }
export function createArc(p: ArcParams = {}): MeshData {
  const { innerRadius = 0.3, outerRadius = 0.5, startAngle = 0, endAngle = 270, segments = 32, rise = 0 } = p
  const a0 = (startAngle * Math.PI) / 180
  const a1 = (endAngle * Math.PI) / 180
  const seg = Math.max(2, segments)
  const outer = arcPoints(outerRadius, seg, a0, a1)
  const inner = arcPoints(innerRadius, seg, a0, a1)
  if (rise === 0) return buildRingStrip(outer, inner, false)
  const yVals = Array.from({ length: seg + 1 }, (_, i) => (i / seg) * rise)
  return buildRingStrip(outer, inner, false, yVals, yVals)
}

export interface RingParams { innerRadius?: number; outerRadius?: number; segments?: number; rise?: number }
export function createRing(p: RingParams = {}): MeshData {
  const { innerRadius = 0.3, outerRadius = 0.5, segments = 32, rise = 0 } = p
  const seg = Math.max(3, segments)
  if (rise === 0) return buildRingStrip(circlePoints(outerRadius, seg), circlePoints(innerRadius, seg))
  // Helical band: seg+1 open points spanning one full revolution
  const outer: Pt[] = [], inner: Pt[] = [], yVals: number[] = []
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2
    outer.push([outerRadius * Math.cos(a), outerRadius * Math.sin(a)])
    inner.push([innerRadius * Math.cos(a), innerRadius * Math.sin(a)])
    yVals.push((i / seg) * rise)
  }
  return buildRingStrip(outer, inner, false, yVals, yVals)
}

export interface SectorParams { radius?: number; startAngle?: number; endAngle?: number; segments?: number }
export function createSector(p: SectorParams = {}): MeshData {
  const { radius = 0.5, startAngle = 0, endAngle = 90, segments = 16 } = p
  const a0 = (startAngle * Math.PI) / 180
  const a1 = (endAngle * Math.PI) / 180
  const seg = Math.max(2, segments)
  const pts: Pt[] = [[0, 0], ...arcPoints(radius, seg, a0, a1)]
  return buildFilled(pts)
}

export interface SegmentParams { radius?: number; startAngle?: number; endAngle?: number; segments?: number }
export function createSegment(p: SegmentParams = {}): MeshData {
  const { radius = 0.5, startAngle = -60, endAngle = 60, segments = 16 } = p
  const a0 = (startAngle * Math.PI) / 180
  const a1 = (endAngle * Math.PI) / 180
  const seg = Math.max(2, segments)
  const pts = arcPoints(radius, seg, a0, a1)
  return buildFilled(pts)
}

export interface CrownParams { innerRadius?: number; outerRadius?: number; segments?: number; rise?: number }
export function createCrown(p: CrownParams = {}): MeshData {
  return createRing(p)
}

export interface CrescentParams { outerRadius?: number; innerRadius?: number; offset?: number; segments?: number }
export function createCrescent(p: CrescentParams = {}): MeshData {
  const { outerRadius = 0.5, innerRadius = 0.42, offset = 0.15, segments = 48 } = p
  const R = outerRadius, r = innerRadius, d = offset
  const seg = Math.max(8, segments)

  const cosA = Math.min(1, Math.max(-1, (R*R + d*d - r*r) / (2*R*d)))
  const halfAngle = Math.acos(cosA)

  const cosB = Math.min(1, Math.max(-1, (r*r + d*d - R*R) / (2*r*d)))
  const halfAngleB = Math.acos(cosB)

  // Build parallel outer and inner arcs, paired by parameter t → clean quad strip
  const outerPts: Pt[] = []
  const innerPts: Pt[] = []
  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    const ao = halfAngle + t * (Math.PI * 2 - 2 * halfAngle)
    outerPts.push([R * Math.cos(ao), R * Math.sin(ao)])
    const ai = (Math.PI + halfAngleB) - t * 2 * halfAngleB
    innerPts.push([d + r * Math.cos(ai), r * Math.sin(ai)])
  }

  return buildRingStrip(outerPts, innerPts, false)
}

export interface SpiralParams { innerRadius?: number; outerRadius?: number; turns?: number; width?: number; segments?: number; rise?: number }
export function createSpiral(p: SpiralParams = {}): MeshData {
  const { innerRadius = 0.05, outerRadius = 0.5, turns = 3, width = 0.04, segments = 180, rise = 0 } = p
  const seg = Math.max(4, segments)
  const outer: Pt[] = [], inner: Pt[] = []
  const yVals: number[] | undefined = rise !== 0 ? [] : undefined

  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    const angle = t * turns * Math.PI * 2
    const r = innerRadius + (outerRadius - innerRadius) * t
    outer.push([r * Math.cos(angle), r * Math.sin(angle)])
    inner.push([(r - width) * Math.cos(angle), (r - width) * Math.sin(angle)])
    yVals?.push(t * turns * rise)
  }

  return buildRingStrip(outer, inner, false, yVals, yVals)
}

// --- Triangles ---

export interface EquilateralTriangleParams { side?: number }
export function createEquilateralTriangle(p: EquilateralTriangleParams = {}): MeshData {
  const { side = 1 } = p
  const h = (side * Math.sqrt(3)) / 2
  const r = h / 3
  return buildFilled([[-side / 2, -r], [side / 2, -r], [0, h - r]])
}

export interface IsoscelesTriangleParams { base?: number; height?: number }
export function createIsoscelesTriangle(p: IsoscelesTriangleParams = {}): MeshData {
  const { base = 1, height = 1 } = p
  const hb = base / 2, hh = height / 2
  return buildFilled([[-hb, -hh], [hb, -hh], [0, hh]])
}

export interface ScaleneTriangleParams { base?: number; height?: number; offset?: number }
export function createScaleneTriangle(p: ScaleneTriangleParams = {}): MeshData {
  const { base = 1, height = 0.8, offset = 0.3 } = p
  const hb = base / 2, hh = height / 2
  return buildFilled([[-hb, -hh], [hb, -hh], [-hb + offset, hh]])
}

export interface AcuteTriangleParams { base?: number; height?: number }
export function createAcuteTriangle(p: AcuteTriangleParams = {}): MeshData {
  const { base = 1, height = 0.9 } = p
  const hb = base / 2, hh = height / 2
  return buildFilled([[-hb, -hh], [hb, -hh], [base * 0.12, hh]])
}

export interface RightTriangleParams { leg1?: number; leg2?: number }
export function createRightTriangle(p: RightTriangleParams = {}): MeshData {
  const { leg1 = 0.8, leg2 = 0.6 } = p
  const cx = leg1 / 3, cz = leg2 / 3
  return buildFilled([[-cx, -cz], [leg1 - cx, -cz], [-cx, leg2 - cz]])
}

export interface ObtuseTriangleParams { base?: number; height?: number }
export function createObtuseTriangle(p: ObtuseTriangleParams = {}): MeshData {
  const { base = 1, height = 0.5 } = p
  const hb = base / 2, hh = height / 2
  return buildFilled([[-hb, -hh], [hb, -hh], [-hb - base * 0.3, hh]])
}

// --- Quads ---

export interface RectangleParams { width?: number; height?: number }
export function createRectangle(p: RectangleParams = {}): MeshData {
  const { width = 1, height = 0.5 } = p
  const hw = width / 2, hh = height / 2
  const pts: Pt[] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
  return buildFilled(pts)
}

export interface SquareParams { size?: number }
export function createSquare(p: SquareParams = {}): MeshData {
  return createRectangle({ width: p.size ?? 1, height: p.size ?? 1 })
}

export interface RhombusParams { diagonalH?: number; diagonalV?: number }
export function createRhombus(p: RhombusParams = {}): MeshData {
  const { diagonalH = 1, diagonalV = 0.6 } = p
  const hh = diagonalH / 2, hv = diagonalV / 2
  const pts: Pt[] = [[0, -hv], [hh, 0], [0, hv], [-hh, 0]]
  return buildFilled(pts)
}

export interface RhomboidParams { width?: number; height?: number; skew?: number }
export function createRhomboid(p: RhomboidParams = {}): MeshData {
  const { width = 1, height = 0.5, skew = 0.3 } = p
  const hw = width / 2, hh = height / 2
  const pts: Pt[] = [[-hw + skew, -hh], [hw + skew, -hh], [hw - skew, hh], [-hw - skew, hh]]
  return buildFilled(pts)
}

export interface TrapezoidParams { topWidth?: number; bottomWidth?: number; height?: number }
export function createTrapezoid(p: TrapezoidParams = {}): MeshData {
  const { topWidth = 0.5, bottomWidth = 1, height = 0.6 } = p
  const htw = topWidth / 2, hbw = bottomWidth / 2, hh = height / 2
  const pts: Pt[] = [[-hbw, -hh], [hbw, -hh], [htw, hh], [-htw, hh]]
  return buildFilled(pts)
}

export interface ParallelogramParams { width?: number; height?: number; skew?: number }
export function createParallelogram(p: ParallelogramParams = {}): MeshData {
  const { width = 1, height = 0.5, skew = 0.3 } = p
  const hw = width / 2, hh = height / 2
  const pts: Pt[] = [[-hw, -hh], [hw, -hh], [hw + skew, hh], [-hw + skew, hh]]
  return buildFilled(pts)
}

export interface KiteParams { width?: number; topHeight?: number; bottomHeight?: number }
export function createKite(p: KiteParams = {}): MeshData {
  const { width = 0.6, topHeight = 0.3, bottomHeight = 0.7 } = p
  const hw = width / 2
  const pts: Pt[] = [[0, -(topHeight)], [hw, 0], [0, bottomHeight], [-hw, 0]]
  return buildFilled(pts)
}

// --- Regular polygons ---

export interface RegularPolygonParams { radius?: number; sides?: number }
function regularPoly(radius: number, sides: number): MeshData {
  return buildFilled(circlePoints(radius, Math.max(3, sides)))
}

export function createPentagon(p: RegularPolygonParams = {}): MeshData { return regularPoly(p.radius ?? 0.5, 5) }
export function createHexagon(p: RegularPolygonParams = {}): MeshData { return regularPoly(p.radius ?? 0.5, 6) }
export function createHeptagon(p: RegularPolygonParams = {}): MeshData { return regularPoly(p.radius ?? 0.5, 7) }
export function createOctagon(p: RegularPolygonParams = {}): MeshData { return regularPoly(p.radius ?? 0.5, 8) }

export interface IrregularPolygonParams { radius?: number; sides?: number; irregularity?: number; seed?: number }
export function createIrregularPolygon(p: IrregularPolygonParams = {}): MeshData {
  const { radius = 0.5, sides = 7, irregularity = 0.3, seed = 42 } = p
  const n = Math.max(3, sides)
  let s = seed
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = radius * (1 - irregularity / 2 + rand() * irregularity)
    pts.push([r * Math.cos(a), r * Math.sin(a)])
  }
  return buildFilled(pts)
}

// --- Decorative ---

export interface StarParams { outerRadius?: number; innerRadius?: number; points?: number }
export function createStar(p: StarParams = {}): MeshData {
  const { outerRadius = 0.5, innerRadius = 0.22, points = 5 } = p
  const n = Math.max(3, points)
  const pts: Pt[] = []
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2
    const r = i % 2 === 0 ? outerRadius : innerRadius
    pts.push([r * Math.cos(a), r * Math.sin(a)])
  }
  return buildFilled(pts)
}

export interface ArrowParams { length?: number; headWidth?: number; headLength?: number; shaftWidth?: number }
export function createArrow(p: ArrowParams = {}): MeshData {
  const { length = 1, headWidth = 0.5, headLength = 0.35, shaftWidth = 0.18 } = p
  const hl = length / 2
  const hs = shaftWidth / 2
  const hw = headWidth / 2
  const se = hl - headLength
  // 7-vertex arrow polygon (non-convex — manual triangulation required)
  const v: Pt[] = [
    [-hl, -hs],  // v0 shaft bottom-left
    [se,  -hs],  // v1 shaft bottom-right
    [se,  -hw],  // v2 head bottom wing
    [hl,   0],   // v3 tip
    [se,   hw],  // v4 head top wing
    [se,   hs],  // v5 shaft top-right
    [-hl,  hs],  // v6 shaft top-left
  ]
  const n = v.length
  const positions = new Float32Array(n * 3)
  const normals   = new Float32Array(n * 3)
  const uvs       = new Float32Array(n * 2)
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  for (const [x, z] of v) {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
  }
  const rX = maxX - minX || 1, rZ = maxZ - minZ || 1
  const rMax = Math.max(rX, rZ)
  const uOff = (rMax - rX) * 0.5 / rMax
  const vOff = (rMax - rZ) * 0.5 / rMax
  for (let i = 0; i < n; i++) {
    const [x, z] = v[i]
    positions[i * 3] = x; positions[i * 3 + 2] = z
    normals[i * 3 + 1] = 1
    uvs[i * 2]     = uOff + (x - minX) / rMax
    uvs[i * 2 + 1] = 1 - (vOff + (z - minZ) / rMax)
  }
  const indices = new Uint32Array([
    0, 6, 5,  // shaft top half
    0, 5, 1,  // shaft bottom half
    1, 3, 2,  // arrowhead bottom wing
    1, 5, 3,  // arrowhead center
    3, 5, 4,  // arrowhead top wing
  ])
  return { positions, normals, uvs, indices }
}

export interface WedgeParams { width?: number; depth?: number; thickness?: number }
export function createWedge(p: WedgeParams = {}): MeshData {
  const { width = 1, depth = 0.6, thickness = 0.15 } = p
  const hw = width / 2, hd = depth / 2
  // Right-pointing chevron ">" as an open ring strip
  const outer: Pt[] = [[-hw, -hd], [hw, 0], [-hw, hd]]
  const inner: Pt[] = [[-hw, -hd + thickness], [hw - thickness, 0], [-hw, hd - thickness]]
  return buildRingStrip(outer, inner, false)
}

export interface RibbonParams { width?: number; height?: number; thickness?: number; segments?: number }
export function createRibbon(p: RibbonParams = {}): MeshData {
  const { width = 0.8, height = 0.4, segments = 32 } = p
  const seg = Math.max(4, segments)
  // Two solid elliptical lobes side by side (figure-8 / bow shape)
  const cx = width / 4   // center offset of each lobe
  const rx = width / 4   // x-radius of each lobe
  const rz = height / 2  // z-radius of each lobe
  const leftPts: Pt[] = [], rightPts: Pt[] = []
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2
    leftPts.push([-cx + rx * Math.cos(a), rz * Math.sin(a)])
    rightPts.push([cx + rx * Math.cos(a), rz * Math.sin(a)])
  }
  return mergeMeshData(buildFilled(leftPts), buildFilled(rightPts))
}

// --- Lines (as thin quads) ---

export interface StraightLineParams { length?: number; width?: number }
export function createStraightLine(p: StraightLineParams = {}): MeshData {
  const { length = 1, width = 0.04 } = p
  return createRectangle({ width: length, height: width })
}

export interface CurvedLineParams { length?: number; curvature?: number; width?: number; segments?: number }
export function createCurvedLine(p: CurvedLineParams = {}): MeshData {
  const { length = 1, curvature = 0.3, width = 0.04, segments = 24 } = p
  const seg = Math.max(4, segments)
  const outer: Pt[] = [], inner: Pt[] = []
  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    const x = (t - 0.5) * length
    const z = -curvature * Math.sin(t * Math.PI)
    const dx = length / seg
    const dz = -curvature * Math.PI * Math.cos(t * Math.PI) * (1 / seg)
    const len = Math.sqrt(dx * dx + dz * dz) || 1
    const nx = dz / len, nz = -dx / len
    outer.push([x + nx * width / 2, z + nz * width / 2])
    inner.push([x - nx * width / 2, z - nz * width / 2])
  }
  return buildRingStrip(inner, outer, false)
}

export interface BrokenLineParams { length1?: number; length2?: number; angle?: number; width?: number }
export function createBrokenLine(p: BrokenLineParams = {}): MeshData {
  const { length1 = 0.5, length2 = 0.5, angle = 90, width = 0.04 } = p
  const a = (angle * Math.PI) / 180
  const hw = width / 2
  const seg1Start: Pt = [-length1, 0]
  const joint: Pt = [0, 0]
  const seg2End: Pt = [length2 * Math.cos(a), length2 * Math.sin(a)]

  // Build two rectangular segments joined at the origin
  const perp1: Pt[] = [
    [seg1Start[0], -hw], [joint[0], -hw],
    [joint[0], hw], [seg1Start[0], hw]
  ]
  const cos2 = Math.cos(a), sin2 = Math.sin(a)
  const perp2: Pt[] = [
    [joint[0], -hw], [seg2End[0] + sin2 * hw, seg2End[1] - cos2 * hw],
    [seg2End[0] - sin2 * hw, seg2End[1] + cos2 * hw], [joint[0], hw]
  ]

  return mergeMeshData(buildFilled(perp1), buildFilled(perp2))
}

export interface ZigzagParams { width?: number; height?: number; zigzags?: number; thickness?: number; smoothness?: number }
export function createZigzag(p: ZigzagParams = {}): MeshData {
  const { width = 0.3, height = 1, zigzags = 4, thickness = 0.06, smoothness = 0 } = p
  const hw = thickness / 2
  const s = Math.max(0, Math.min(1, smoothness))
  // More sub-samples per half-period as smoothness increases
  const segsPerHalf = Math.max(1, Math.round(s * 16))
  const totalSegs = zigzags * 2 * segsPerHalf

  // Centerline: blend between triangle wave (sharp) and cosine wave (smooth)
  const pts: Pt[] = []
  for (let i = 0; i <= totalSegs; i++) {
    const t = i / totalSegs
    const phase = t * zigzags * 2
    const frac = phase % 1
    const evenSeg = Math.floor(phase) % 2 === 0
    const sharpX = evenSeg ? -width / 2 + frac * width : width / 2 - frac * width
    const smoothX = -(width / 2) * Math.cos(t * zigzags * 2 * Math.PI)
    pts.push([sharpX * (1 - s) + smoothX * s, (t - 0.5) * height])
  }

  const outer: Pt[] = [], inner: Pt[] = []
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const [cx, cz] = pts[i]
    let px1 = 0, pz1 = 0
    if (i > 0) {
      const dx = pts[i][0] - pts[i - 1][0], dz = pts[i][1] - pts[i - 1][1]
      const len = Math.sqrt(dx * dx + dz * dz) || 1
      px1 = -dz / len; pz1 = dx / len
    }
    let px2 = 0, pz2 = 0
    if (i < n - 1) {
      const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1]
      const len = Math.sqrt(dx * dx + dz * dz) || 1
      px2 = -dz / len; pz2 = dx / len
    }
    let mx: number, mz: number, scale: number
    if (i === 0) {
      mx = px2; mz = pz2; scale = hw
    } else if (i === n - 1) {
      mx = px1; mz = pz1; scale = hw
    } else {
      const bx = px1 + px2, bz = pz1 + pz2
      const bl = Math.sqrt(bx * bx + bz * bz) || 1
      mx = bx / bl; mz = bz / bl
      const dot = mx * px1 + mz * pz1
      scale = hw / Math.max(0.25, dot)
    }
    outer.push([cx + mx * scale, cz + mz * scale])
    inner.push([cx - mx * scale, cz - mz * scale])
  }

  return buildRingStrip(inner, outer, false)
}

// --- Type map for dispatch ---

export type Shape2DType =
  | 'circle' | 'ellipse' | 'oval' | 'semicircle' | 'arc'
  | 'ring' | 'sector' | 'segment' | 'crown' | 'crescent' | 'spiral'
  | 'equilateral' | 'isosceles' | 'scalene' | 'acute' | 'right' | 'obtuse'
  | 'rectangle' | 'square' | 'rhombus' | 'rhomboid' | 'trapezoid' | 'parallelogram' | 'kite'
  | 'pentagon' | 'hexagon' | 'heptagon' | 'octagon' | 'irregular'
  | 'star' | 'arrow' | 'wedge' | 'ribbon'
  | 'straight' | 'curved' | 'broken' | 'zigzag'

export type Shape2DParams = Record<string, number>

const DISPLAY_NAMES: Record<Shape2DType, string> = {
  circle: 'Circle', ellipse: 'Ellipse', oval: 'Oval', semicircle: 'Semicircle', arc: 'Arc',
  ring: 'Ring', sector: 'Sector', segment: 'Segment', crown: 'Crown', crescent: 'Crescent', spiral: 'Spiral',
  equilateral: 'Equilateral', isosceles: 'Isosceles', scalene: 'Scalene', acute: 'Acute', right: 'Right', obtuse: 'Obtuse',
  rectangle: 'Rectangle', square: 'Square', rhombus: 'Rhombus', rhomboid: 'Rhomboid',
  trapezoid: 'Trapezoid', parallelogram: 'Parallelogram', kite: 'Kite',
  pentagon: 'Pentagon', hexagon: 'Hexagon', heptagon: 'Heptagon', octagon: 'Octagon', irregular: 'Irregular',
  star: 'Star', arrow: 'Arrow', wedge: 'Wedge', ribbon: 'Ribbon',
  straight: 'Straight', curved: 'Curved', broken: 'Broken', zigzag: 'Zigzag',
}

export function getShape2DDisplayName(type: Shape2DType): string {
  return DISPLAY_NAMES[type]
}

export function createShape2D(type: Shape2DType, params: Shape2DParams = {}): MeshData {
  switch (type) {
    case 'circle':      return createCircle(params)
    case 'ellipse':     return createEllipse(params)
    case 'oval':        return createOval(params)
    case 'semicircle':  return createSemicircle(params)
    case 'arc':         return createArc(params)
    case 'ring':        return createRing(params)
    case 'sector':      return createSector(params)
    case 'segment':     return createSegment(params)
    case 'crown':       return createCrown(params)
    case 'crescent':    return createCrescent(params)
    case 'spiral':      return createSpiral(params)
    case 'equilateral': return createEquilateralTriangle(params)
    case 'isosceles':   return createIsoscelesTriangle(params)
    case 'scalene':     return createScaleneTriangle(params)
    case 'acute':       return createAcuteTriangle(params)
    case 'right':       return createRightTriangle(params)
    case 'obtuse':      return createObtuseTriangle(params)
    case 'rectangle':   return createRectangle(params)
    case 'square':      return createSquare(params)
    case 'rhombus':     return createRhombus(params)
    case 'rhomboid':    return createRhomboid(params)
    case 'trapezoid':   return createTrapezoid(params)
    case 'parallelogram': return createParallelogram(params)
    case 'kite':        return createKite(params)
    case 'pentagon':    return createPentagon(params)
    case 'hexagon':     return createHexagon(params)
    case 'heptagon':    return createHeptagon(params)
    case 'octagon':     return createOctagon(params)
    case 'irregular':   return createIrregularPolygon(params)
    case 'star':        return createStar(params)
    case 'arrow':       return createArrow(params)
    case 'wedge':       return createWedge(params)
    case 'ribbon':      return createRibbon(params)
    case 'straight':    return createStraightLine(params)
    case 'curved':      return createCurvedLine(params)
    case 'broken':      return createBrokenLine(params)
    case 'zigzag':      return createZigzag(params)
  }
}
