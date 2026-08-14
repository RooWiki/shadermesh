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

  const vertCount = n + 1
  const positions = new Float32Array(vertCount * 3)
  const normals = new Float32Array(vertCount * 3)
  const uvs = new Float32Array(vertCount * 2)
  const indices = new Uint32Array(n * 3)

  positions[0] = cx; positions[1] = 0; positions[2] = cz
  normals[1] = 1
  uvs[0] = (cx - minX) / rX; uvs[1] = 1 - (cz - minZ) / rZ

  for (let i = 0; i < n; i++) {
    const [x, z] = pts[i]
    const v3 = (i + 1) * 3, v2 = (i + 1) * 2
    positions[v3] = x; positions[v3 + 1] = 0; positions[v3 + 2] = z
    normals[v3 + 1] = 1
    uvs[v2] = (x - minX) / rX; uvs[v2 + 1] = 1 - (z - minZ) / rZ
    const ii = i * 3
    indices[ii] = 0; indices[ii + 1] = i + 1; indices[ii + 2] = (i + 1) % n + 1
  }

  return { positions, normals, uvs, indices }
}

// Ring strip — outer CCW, inner CCW (same winding direction)
function buildRingStrip(outer: Pt[], inner: Pt[], closed = true): MeshData {
  const n = outer.length
  const vertCount = n * 2
  const triCount = closed ? n * 2 : (n - 1) * 2
  const positions = new Float32Array(vertCount * 3)
  const normals = new Float32Array(vertCount * 3)
  const uvs = new Float32Array(vertCount * 2)
  const indices = new Uint32Array(triCount * 3)

  for (let i = 0; i < n; i++) {
    const t = closed ? i / n : i / (n - 1)
    const o3 = i * 3, o2 = i * 2, i3 = (n + i) * 3, i2 = (n + i) * 2
    positions[o3] = outer[i][0]; positions[o3 + 1] = 0; positions[o3 + 2] = outer[i][1]
    normals[o3 + 1] = 1
    uvs[o2] = t; uvs[o2 + 1] = 1
    positions[i3] = inner[i][0]; positions[i3 + 1] = 0; positions[i3 + 2] = inner[i][1]
    normals[i3 + 1] = 1
    uvs[i2] = t; uvs[i2 + 1] = 0
  }

  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % n
    const ii = i * 6
    indices[ii] = i; indices[ii + 1] = next; indices[ii + 2] = n + i
    indices[ii + 3] = next; indices[ii + 4] = n + next; indices[ii + 5] = n + i
  }

  return { positions, normals, uvs, indices }
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
    pts.push([r * Math.cos(a), -r * Math.sin(a)])
  }
  return pts
}

function arcPoints(r: number, seg: number, start: number, end: number): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i <= seg; i++) {
    const a = start + (i / seg) * (end - start)
    pts.push([r * Math.cos(a), -r * Math.sin(a)])
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
    pts.push([radiusX * Math.cos(a), -radiusZ * Math.sin(a)])
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
    pts.push([hw + r * Math.cos(a), -r * Math.sin(a)])
  }
  // Left semicircle
  for (let i = 0; i <= seg; i++) {
    const a = Math.PI / 2 + (i / seg) * Math.PI
    pts.push([-hw + r * Math.cos(a), -r * Math.sin(a)])
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
    pts.push([radius * Math.cos(a), -radius * Math.sin(a)])
  }
  // close with center point handled by buildFilled (uses centroid), but we want flat base
  // so push the two endpoints to close the shape
  return buildFilled(pts)
}

export interface ArcParams { innerRadius?: number; outerRadius?: number; startAngle?: number; endAngle?: number; segments?: number }
export function createArc(p: ArcParams = {}): MeshData {
  const { innerRadius = 0.3, outerRadius = 0.5, startAngle = 0, endAngle = 270, segments = 32 } = p
  const a0 = (startAngle * Math.PI) / 180
  const a1 = (endAngle * Math.PI) / 180
  const seg = Math.max(2, segments)
  const outer = arcPoints(outerRadius, seg, a0, a1)
  const inner = arcPoints(innerRadius, seg, a0, a1)
  return buildRingStrip(outer, inner, false)
}

export interface RingParams { innerRadius?: number; outerRadius?: number; segments?: number }
export function createRing(p: RingParams = {}): MeshData {
  const { innerRadius = 0.3, outerRadius = 0.5, segments = 32 } = p
  const seg = Math.max(3, segments)
  return buildRingStrip(circlePoints(outerRadius, seg), circlePoints(innerRadius, seg))
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

export interface CrownParams { innerRadius?: number; outerRadius?: number; segments?: number }
export function createCrown(p: CrownParams = {}): MeshData {
  return createRing(p)
}

export interface CrescentParams { outerRadius?: number; innerRadius?: number; offset?: number; segments?: number }
export function createCrescent(p: CrescentParams = {}): MeshData {
  const { outerRadius = 0.5, innerRadius = 0.42, offset = 0.15, segments = 48 } = p
  const R = outerRadius, r = innerRadius, d = offset
  const seg = Math.max(8, segments)

  // Find intersection angles of two circles: (0,0,R) and (d,0,r)
  const cosA = (R * R + d * d - r * r) / (2 * R * d)
  const capped = Math.min(1, Math.max(-1, cosA))
  const halfAngle = Math.acos(capped)

  const a0outer = halfAngle        // angle on outer where circles intersect
  const a1outer = Math.PI * 2 - halfAngle

  // Inner circle intersection angle (measured from its own center at (d,0))
  const cosB = (r * r + d * d - R * R) / (2 * r * d)
  const cappedB = Math.min(1, Math.max(-1, cosB))
  const halfAngleB = Math.acos(cappedB)
  const a0inner = Math.PI - halfAngleB
  const a1inner = Math.PI + halfAngleB

  // Build outer arc (from a0outer to a1outer going CCW, i.e., decreasing angle wrapping around)
  const outerArcPts: Pt[] = []
  const nOuter = Math.round(seg * (Math.PI * 2 - 2 * halfAngle) / (Math.PI * 2))
  for (let i = 0; i <= nOuter; i++) {
    const a = a0outer + (i / nOuter) * (Math.PI * 2 - 2 * halfAngle)
    outerArcPts.push([R * Math.cos(a), -R * Math.sin(a)])
  }

  // Build inner arc (from a1inner to a0inner going in opposite sense, i.e., going from the right intersection back)
  const innerArcPts: Pt[] = []
  const nInner = Math.round(seg * 2 * halfAngleB / (Math.PI * 2))
  const innerRange = -(Math.PI * 2 - 2 * halfAngleB)
  for (let i = 0; i <= nInner; i++) {
    const a = a1inner + (i / nInner) * innerRange
    innerArcPts.push([d + r * Math.cos(a), -r * Math.sin(a)])
  }

  const pts = [...outerArcPts, ...innerArcPts]
  return buildFilled(pts)
}

export interface SpiralParams { innerRadius?: number; outerRadius?: number; turns?: number; width?: number; segments?: number }
export function createSpiral(p: SpiralParams = {}): MeshData {
  const { innerRadius = 0.05, outerRadius = 0.5, turns = 3, width = 0.04, segments = 180 } = p
  const seg = Math.max(4, segments)
  const outer: Pt[] = [], inner: Pt[] = []

  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    const angle = t * turns * Math.PI * 2
    const r = innerRadius + (outerRadius - innerRadius) * t
    outer.push([r * Math.cos(angle), -r * Math.sin(angle)])
    inner.push([(r - width) * Math.cos(angle), -(r - width) * Math.sin(angle)])
  }

  return buildRingStrip(outer, inner, false)
}

// --- Triangles ---

export interface TriangleParams { base?: number; height?: number }
export function createTriangle(p: TriangleParams = {}): MeshData {
  const { base = 1, height = 1 } = p
  const hb = base / 2
  const pts: Pt[] = [[-hb, height / 2], [hb, height / 2], [0, -height / 2]]
  return buildFilled(pts)
}

export interface EquilateralTriangleParams { side?: number }
export function createEquilateralTriangle(p: EquilateralTriangleParams = {}): MeshData {
  const { side = 1 } = p
  const h = (side * Math.sqrt(3)) / 2
  const r = h / 3  // centroid from base
  const pts: Pt[] = [[-side / 2, r], [side / 2, r], [0, -(h - r)]]
  return buildFilled(pts)
}

export interface IsoscelesTriangleParams { base?: number; height?: number }
export function createIsoscelesTriangle(p: IsoscelesTriangleParams = {}): MeshData {
  return createTriangle(p)
}

export interface ScaleneTriangleParams { base?: number; height?: number; offset?: number }
export function createScaleneTriangle(p: ScaleneTriangleParams = {}): MeshData {
  const { base = 1, height = 0.8, offset = 0.3 } = p
  const hb = base / 2
  const pts: Pt[] = [[-hb, height / 2], [hb, height / 2], [-hb + offset, -height / 2]]
  return buildFilled(pts)
}

export interface ElongatedTriangleParams { base?: number; height?: number }
export function createElongatedTriangle(p: ElongatedTriangleParams = {}): MeshData {
  const { base = 0.2, height = 2 } = p
  return createTriangle({ base, height })
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
    pts.push([r * Math.cos(a), -r * Math.sin(a)])
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
    pts.push([r * Math.cos(a), -r * Math.sin(a)])
  }
  return buildFilled(pts)
}

export interface ArrowParams { length?: number; headWidth?: number; headLength?: number; shaftWidth?: number }
export function createArrow(p: ArrowParams = {}): MeshData {
  const { length = 1, headWidth = 0.5, headLength = 0.35, shaftWidth = 0.18 } = p
  const hl = length / 2
  const hs = shaftWidth / 2
  const hw = headWidth / 2
  const shaftEnd = hl - headLength
  const pts: Pt[] = [
    [-hl, -hs], [shaftEnd, -hs],  // bottom of shaft
    [shaftEnd, -hw], [hl, 0],     // right of head and tip
    [shaftEnd, hw], [shaftEnd, hs], [-hl, hs]  // left of head, top of shaft
  ]
  return buildFilled(pts)
}

export interface WedgeParams { width?: number; depth?: number; thickness?: number }
export function createWedge(p: WedgeParams = {}): MeshData {
  const { width = 1, depth = 0.6, thickness = 0.15 } = p
  const hw = width / 2, th = thickness / 2
  const pts: Pt[] = [
    [0, -depth / 2],                 // tip
    [hw, depth / 2], [hw - thickness * 1.5, depth / 2],
    [0, -depth / 2 + depth * 0.4],
    [-hw + thickness * 1.5, depth / 2], [-hw, depth / 2],
  ]
  return buildFilled(pts)
}

export interface RibbonParams { width?: number; height?: number; thickness?: number; segments?: number }
export function createRibbon(p: RibbonParams = {}): MeshData {
  const { width = 0.8, height = 0.4, thickness = 0.08, segments = 32 } = p
  const hw = width / 2, hh = height / 2
  const seg = Math.max(4, segments)

  // Figure-8 outer and inner traces
  const outer: Pt[] = [], inner: Pt[] = []
  for (let i = 0; i <= seg; i++) {
    const t = (i / seg) * Math.PI * 2
    const x = hw * Math.sin(t)
    const z = hh * Math.sin(t * 2) / 2
    // tangent direction for thickness offset
    const tx = hw * Math.cos(t)
    const tz = hh * Math.cos(t * 2)
    const len = Math.sqrt(tx * tx + tz * tz) || 1
    const nx = tz / len, nz = -tx / len  // perpendicular in XZ
    outer.push([x + nx * thickness / 2, z + nz * thickness / 2])
    inner.push([x - nx * thickness / 2, z - nz * thickness / 2])
  }

  return buildRingStrip(outer, inner, false)
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
    const z = curvature * Math.sin(t * Math.PI)
    const dx = length / seg
    const dz = curvature * Math.PI * Math.cos(t * Math.PI) * (1 / seg)
    const len = Math.sqrt(dx * dx + dz * dz) || 1
    const nx = dz / len, nz = -dx / len
    outer.push([x + nx * width / 2, z + nz * width / 2])
    inner.push([x - nx * width / 2, z - nz * width / 2])
  }
  return buildRingStrip(outer, inner, false)
}

export interface BrokenLineParams { length1?: number; length2?: number; angle?: number; width?: number }
export function createBrokenLine(p: BrokenLineParams = {}): MeshData {
  const { length1 = 0.5, length2 = 0.5, angle = 90, width = 0.04 } = p
  const a = (angle * Math.PI) / 180
  const hw = width / 2
  const seg1Start: Pt = [-length1, 0]
  const joint: Pt = [0, 0]
  const seg2End: Pt = [length2 * Math.cos(a), -length2 * Math.sin(a)]

  // Build two rectangular segments joined at the origin
  const perp1: Pt[] = [
    [seg1Start[0], -hw], [joint[0], -hw],
    [joint[0], hw], [seg1Start[0], hw]
  ]
  const cos2 = Math.cos(a), sin2 = -Math.sin(a)
  const perp2: Pt[] = [
    [joint[0], -hw], [seg2End[0] - sin2 * hw, seg2End[1] - cos2 * hw],
    [seg2End[0] + sin2 * hw, seg2End[1] + cos2 * hw], [joint[0], hw]
  ]

  return mergeMeshData(buildFilled(perp1), buildFilled(perp2))
}

export interface ZigzagParams { width?: number; height?: number; zigzags?: number; thickness?: number }
export function createZigzag(p: ZigzagParams = {}): MeshData {
  const { width = 0.3, height = 1, zigzags = 4, thickness = 0.06 } = p
  const seg = zigzags * 2
  const outer: Pt[] = [], inner: Pt[] = []
  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    const z = (t - 0.5) * height
    const x = (i % 2 === 0 ? -width / 2 : width / 2)
    const nextX = i < seg ? (i % 2 === 0 ? width / 2 : -width / 2) : x
    const nextZ = i < seg ? ((i + 1) / seg - 0.5) * height : z
    const dx = nextX - x, dz = nextZ - z
    const len = Math.sqrt(dx * dx + dz * dz) || 1
    const nx = dz / len * thickness / 2, nz = -dx / len * thickness / 2
    outer.push([x + nx, z + nz])
    inner.push([x - nx, z - nz])
  }
  return buildRingStrip(outer, inner, false)
}

// --- Type map for dispatch ---

export type Shape2DType =
  | 'circle' | 'ellipse' | 'oval' | 'semicircle' | 'arc'
  | 'ring' | 'sector' | 'segment' | 'crown' | 'crescent' | 'spiral'
  | 'triangle' | 'equilateral' | 'isosceles' | 'scalene' | 'elongated'
  | 'rectangle' | 'square' | 'rhombus' | 'rhomboid' | 'trapezoid' | 'parallelogram' | 'kite'
  | 'pentagon' | 'hexagon' | 'heptagon' | 'octagon' | 'irregular'
  | 'star' | 'arrow' | 'wedge' | 'ribbon'
  | 'straight' | 'curved' | 'broken' | 'zigzag'

export type Shape2DParams = Record<string, number>

const DISPLAY_NAMES: Record<Shape2DType, string> = {
  circle: 'Circle', ellipse: 'Ellipse', oval: 'Oval', semicircle: 'Semicircle', arc: 'Arc',
  ring: 'Ring', sector: 'Sector', segment: 'Segment', crown: 'Crown', crescent: 'Crescent', spiral: 'Spiral',
  triangle: 'Triangle', equilateral: 'Equilateral', isosceles: 'Isosceles', scalene: 'Scalene', elongated: 'Elongated',
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
    case 'triangle':    return createTriangle(params)
    case 'equilateral': return createEquilateralTriangle(params)
    case 'isosceles':   return createIsoscelesTriangle(params)
    case 'scalene':     return createScaleneTriangle(params)
    case 'elongated':   return createElongatedTriangle(params)
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
