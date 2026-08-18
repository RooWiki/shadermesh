import type { MeshData } from '../../core/MeshData'
import { createCube } from './createCube'
import { createSphere } from './createSphere'
import { createCylinder } from './createCylinder'
import { createCone } from './createCone'
import { createTorus } from './createTorus'
import { createCapsule } from './createCapsule'
import { createPlane } from './createPlane'
import { createUVSphere, createIcosphere, createHemisphere, createDome, createEllipsoid, createTube, createFrustum } from './createCurved3D'
import { createPrism, createPyramid, createTetrahedron, createTruncatedPyramid, createOctahedron, createIcosahedron, createDodecahedron, createDiamond, createIrregularPolyhedron } from './createPolyhedra3D'
import { createWedge3D, createSpike, createShard, createCrystal, createRibbon3D, createArc3D, createRing3D, createStar3D } from './createVFX3D'

export type Category3D = 'basic' | 'curved' | 'prisms' | 'pyramids' | 'polyhedra' | 'vfx'

export type Primitive3DType =
  // Basic
  | 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule' | 'plane'
  // Curved
  | 'uvSphere' | 'icosphere' | 'hemisphere' | 'ellipsoid' | 'tube' | 'frustum' | 'dome'
  // Prisms
  | 'prism3' | 'prism4' | 'prism5' | 'prism6' | 'prism7' | 'prism8'
  // Pyramids
  | 'tetrahedron' | 'pyramidSquare' | 'pyramidPenta' | 'pyramidHexa' | 'pyramidTrunc'
  // Polyhedra
  | 'octahedron' | 'dodecahedron' | 'icosahedron' | 'diamond' | 'polyIrregular'
  // VFX
  | 'wedge3d' | 'spike' | 'shard' | 'crystal' | 'ribbon3d' | 'arc3d' | 'ring3d' | 'star3d'

export interface Field3D {
  key: string
  label: string
  default: number
  step: number
  decimals: number
  min: number
  isInt?: boolean
}

export interface Prim3DConfig {
  label: string
  category: Category3D
  defaults: Record<string, number>
  fields: Field3D[]
  create: (params: Record<string, number>) => MeshData
}

const f = (key: string, label: string, def: number, step: number, decimals: number, min: number, isInt?: boolean): Field3D =>
  ({ key, label, default: def, step, decimals, min, isInt })

export const PRIMITIVE_3D_REGISTRY: Record<Primitive3DType, Prim3DConfig> = {
  // ─── Basic ────────────────────────────────────────────────────────────────
  cube: {
    label: 'Cube', category: 'basic',
    defaults: { width: 1, height: 1, depth: 1 },
    fields: [f('width','Width',1,0.1,3,0.001), f('height','Height',1,0.1,3,0.001), f('depth','Depth',1,0.1,3,0.001)],
    create: p => createCube({ width: p.width, height: p.height, depth: p.depth }),
  },
  sphere: {
    label: 'Sphere', category: 'basic',
    defaults: { radius: 0.5, widthSegments: 32, heightSegments: 16 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('widthSegments','Width Segs',32,1,0,3,true), f('heightSegments','Height Segs',16,1,0,2,true)],
    create: p => createSphere({ radius: p.radius, widthSegments: p.widthSegments, heightSegments: p.heightSegments }),
  },
  cylinder: {
    label: 'Cylinder', category: 'basic',
    defaults: { radiusTop: 0.5, radiusBottom: 0.5, height: 1, radialSegments: 16, heightSegments: 1 },
    fields: [f('radiusTop','Radius Top',0.5,0.05,3,0), f('radiusBottom','Radius Bot',0.5,0.05,3,0.001), f('height','Height',1,0.1,3,0.001), f('radialSegments','Radial Segs',16,1,0,3,true), f('heightSegments','Height Segs',1,1,0,1,true)],
    create: p => createCylinder({ radiusTop: p.radiusTop, radiusBottom: p.radiusBottom, height: p.height, radialSegments: p.radialSegments, heightSegments: p.heightSegments }),
  },
  cone: {
    label: 'Cone', category: 'basic',
    defaults: { radius: 0.5, height: 1, radialSegments: 16, heightSegments: 4 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('height','Height',1,0.1,3,0.001), f('radialSegments','Radial Segs',16,1,0,3,true), f('heightSegments','Height Segs',4,1,0,1,true)],
    create: p => createCylinder({ radiusTop: 0, radiusBottom: p.radius, height: p.height, radialSegments: p.radialSegments, heightSegments: p.heightSegments }),
  },
  torus: {
    label: 'Torus', category: 'basic',
    defaults: { radius: 0.5, tube: 0.2, radialSegments: 12, tubularSegments: 32 },
    fields: [f('radius','Radius',0.5,0.05,3,0.01), f('tube','Tube',0.2,0.02,3,0.005), f('radialSegments','Tube Segs',12,1,0,3,true), f('tubularSegments','Ring Segs',32,1,0,3,true)],
    create: p => createTorus({ radius: p.radius, tube: p.tube, radialSegments: p.radialSegments, tubularSegments: p.tubularSegments }),
  },
  capsule: {
    label: 'Capsule', category: 'basic',
    defaults: { radius: 0.4, height: 1, radialSegments: 16, hemisphereSegments: 8 },
    fields: [f('radius','Radius',0.4,0.05,3,0.001), f('height','Height',1,0.1,3,0), f('radialSegments','Radial Segs',16,1,0,3,true), f('hemisphereSegments','Hemi Segs',8,1,0,1,true)],
    create: p => createCapsule({ radius: p.radius, height: p.height, radialSegments: p.radialSegments, hemisphereSegments: p.hemisphereSegments }),
  },
  plane: {
    label: 'Plane', category: 'basic',
    defaults: { width: 1, height: 1, subdivisionsX: 1, subdivisionsY: 1 },
    fields: [f('width','Width',1,0.1,3,0.001), f('height','Height',1,0.1,3,0.001), f('subdivisionsX','Segs X',1,1,0,1,true), f('subdivisionsY','Segs Y',1,1,0,1,true)],
    create: p => createPlane({ width: p.width, height: p.height, subdivisionsX: p.subdivisionsX, subdivisionsY: p.subdivisionsY }),
  },

  // ─── Curved ───────────────────────────────────────────────────────────────
  uvSphere: {
    label: 'UV Sphere', category: 'curved',
    defaults: { radius: 0.5, segments: 32, rings: 16 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('segments','Segments',32,1,0,3,true), f('rings','Rings',16,1,0,2,true)],
    create: p => createUVSphere(p),
  },
  icosphere: {
    label: 'Icosphere', category: 'curved',
    defaults: { radius: 0.5, subdivisions: 2 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('subdivisions','Subdivisions',2,1,0,0,true)],
    create: p => createIcosphere(p),
  },
  hemisphere: {
    label: 'Hemisphere', category: 'curved',
    defaults: { radius: 0.5, segments: 32, rings: 8 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('segments','Segments',32,1,0,3,true), f('rings','Rings',8,1,0,1,true)],
    create: p => createHemisphere(p),
  },
  ellipsoid: {
    label: 'Ellipsoid', category: 'curved',
    defaults: { radiusX: 0.6, radiusY: 0.5, radiusZ: 0.4, segments: 24, rings: 12 },
    fields: [f('radiusX','Radius X',0.6,0.05,3,0.001), f('radiusY','Radius Y',0.5,0.05,3,0.001), f('radiusZ','Radius Z',0.4,0.05,3,0.001), f('segments','Segments',24,1,0,3,true), f('rings','Rings',12,1,0,2,true)],
    create: p => createEllipsoid(p),
  },
  tube: {
    label: 'Tube', category: 'curved',
    defaults: { outerRadius: 0.5, innerRadius: 0.35, height: 1, segments: 16, heightSegments: 1 },
    fields: [f('outerRadius','Outer Radius',0.5,0.05,3,0.01), f('innerRadius','Inner Radius',0.35,0.05,3,0.005), f('height','Height',1,0.1,3,0.001), f('segments','Segments',16,1,0,3,true), f('heightSegments','Height Segs',1,1,0,1,true)],
    create: p => createTube(p),
  },
  frustum: {
    label: 'Frustum', category: 'curved',
    defaults: { radiusTop: 0.3, radiusBottom: 0.5, height: 1, segments: 16, heightSegments: 1 },
    fields: [f('radiusTop','Radius Top',0.3,0.05,3,0.001), f('radiusBottom','Radius Bot',0.5,0.05,3,0.001), f('height','Height',1,0.1,3,0.001), f('segments','Segments',16,1,0,3,true), f('heightSegments','Height Segs',1,1,0,1,true)],
    create: p => createFrustum(p),
  },
  dome: {
    label: 'Dome', category: 'curved',
    defaults: { radius: 0.5, segments: 32, rings: 10 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('segments','Segments',32,1,0,3,true), f('rings','Rings',10,1,0,1,true)],
    create: p => createDome(p),
  },

  // ─── Prisms ───────────────────────────────────────────────────────────────
  prism3: {
    label: 'Tri Prism', category: 'prisms',
    defaults: { radius: 0.5, height: 1, sides: 3 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('height','Height',1,0.1,3,0.001)],
    create: p => createPrism({ ...p, sides: 3 }),
  },
  prism4: {
    label: 'Rect Prism', category: 'prisms',
    defaults: { radius: 0.5, height: 1, sides: 4 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('height','Height',1,0.1,3,0.001)],
    create: p => createPrism({ ...p, sides: 4 }),
  },
  prism5: {
    label: 'Penta Prism', category: 'prisms',
    defaults: { radius: 0.5, height: 1, sides: 5 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('height','Height',1,0.1,3,0.001)],
    create: p => createPrism({ ...p, sides: 5 }),
  },
  prism6: {
    label: 'Hexa Prism', category: 'prisms',
    defaults: { radius: 0.5, height: 1, sides: 6 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('height','Height',1,0.1,3,0.001)],
    create: p => createPrism({ ...p, sides: 6 }),
  },
  prism7: {
    label: 'Hepta Prism', category: 'prisms',
    defaults: { radius: 0.5, height: 1, sides: 7 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('height','Height',1,0.1,3,0.001)],
    create: p => createPrism({ ...p, sides: 7 }),
  },
  prism8: {
    label: 'Octa Prism', category: 'prisms',
    defaults: { radius: 0.5, height: 1, sides: 8 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('height','Height',1,0.1,3,0.001)],
    create: p => createPrism({ ...p, sides: 8 }),
  },

  // ─── Pyramids ─────────────────────────────────────────────────────────────
  tetrahedron: {
    label: 'Tetrahedron', category: 'pyramids',
    defaults: { radius: 0.5 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001)],
    create: p => createTetrahedron(p),
  },
  pyramidSquare: {
    label: 'Square Pyr.', category: 'pyramids',
    defaults: { radius: 0.5, height: 1, sides: 4 },
    fields: [f('radius','Base Radius',0.5,0.05,3,0.001), f('height','Height',1,0.1,3,0.001)],
    create: p => createPyramid({ ...p, sides: 4 }),
  },
  pyramidPenta: {
    label: 'Penta Pyr.', category: 'pyramids',
    defaults: { radius: 0.5, height: 1, sides: 5 },
    fields: [f('radius','Base Radius',0.5,0.05,3,0.001), f('height','Height',1,0.1,3,0.001)],
    create: p => createPyramid({ ...p, sides: 5 }),
  },
  pyramidHexa: {
    label: 'Hexa Pyr.', category: 'pyramids',
    defaults: { radius: 0.5, height: 1, sides: 6 },
    fields: [f('radius','Base Radius',0.5,0.05,3,0.001), f('height','Height',1,0.1,3,0.001)],
    create: p => createPyramid({ ...p, sides: 6 }),
  },
  pyramidTrunc: {
    label: 'Trunc. Pyr.', category: 'pyramids',
    defaults: { baseRadius: 0.5, topRadius: 0.2, height: 1, sides: 4 },
    fields: [f('baseRadius','Base Radius',0.5,0.05,3,0.001), f('topRadius','Top Radius',0.2,0.05,3,0.001), f('height','Height',1,0.1,3,0.001), f('sides','Sides',4,1,0,3,true)],
    create: p => createTruncatedPyramid(p),
  },

  // ─── Polyhedra ────────────────────────────────────────────────────────────
  octahedron: {
    label: 'Octahedron', category: 'polyhedra',
    defaults: { radius: 0.5 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001)],
    create: p => createOctahedron(p),
  },
  dodecahedron: {
    label: 'Dodecahedron', category: 'polyhedra',
    defaults: { radius: 0.5 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001)],
    create: p => createDodecahedron(p),
  },
  icosahedron: {
    label: 'Icosahedron', category: 'polyhedra',
    defaults: { radius: 0.5 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001)],
    create: p => createIcosahedron(p),
  },
  diamond: {
    label: 'Diamond', category: 'polyhedra',
    defaults: { radius: 0.4, topHeight: 0.3, bottomHeight: 0.7, sides: 8 },
    fields: [f('radius','Radius',0.4,0.05,3,0.001), f('topHeight','Top Height',0.3,0.05,3,0.001), f('bottomHeight','Bot Height',0.7,0.05,3,0.001), f('sides','Sides',8,1,0,3,true)],
    create: p => createDiamond(p),
  },
  polyIrregular: {
    label: 'Irregular', category: 'polyhedra',
    defaults: { radius: 0.5, subdivisions: 1, irregularity: 0.35 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('subdivisions','Subdivisions',1,1,0,0,true), f('irregularity','Irregularity',0.35,0.05,2,0)],
    create: p => createIrregularPolyhedron(p),
  },

  // ─── VFX ──────────────────────────────────────────────────────────────────
  wedge3d: {
    label: 'Wedge', category: 'vfx',
    defaults: { width: 1, depth: 0.6, height: 0.7 },
    fields: [f('width','Width',1,0.1,3,0.001), f('depth','Depth',0.6,0.1,3,0.001), f('height','Height',0.7,0.1,3,0.001)],
    create: p => createWedge3D(p),
  },
  spike: {
    label: 'Spike', category: 'vfx',
    defaults: { radius: 0.12, length: 1.5, segments: 12, heightSegments: 6 },
    fields: [f('radius','Base Radius',0.12,0.01,3,0.001), f('length','Length',1.5,0.1,3,0.001), f('segments','Segments',12,1,0,3,true), f('heightSegments','Height Segs',6,1,0,1,true)],
    create: p => createSpike(p),
  },
  shard: {
    label: 'Shard', category: 'vfx',
    defaults: { radius: 0.35, height: 0.7, sides: 5, irregularity: 0.3 },
    fields: [f('radius','Radius',0.35,0.05,3,0.001), f('height','Height',0.7,0.1,3,0.001), f('sides','Sides',5,1,0,3,true), f('irregularity','Irregularity',0.3,0.05,2,0)],
    create: p => createShard(p),
  },
  crystal: {
    label: 'Crystal', category: 'vfx',
    defaults: { radius: 0.22, bodyHeight: 0.45, tipHeight: 0.5, sides: 6 },
    fields: [f('radius','Radius',0.22,0.02,3,0.001), f('bodyHeight','Body Height',0.45,0.05,3,0), f('tipHeight','Tip Height',0.5,0.05,3,0.001), f('sides','Sides',6,1,0,3,true)],
    create: p => createCrystal(p),
  },
  ribbon3d: {
    label: 'Ribbon', category: 'vfx',
    defaults: { width: 0.2, length: 2, widthSegments: 1, lengthSegments: 20 },
    fields: [f('width','Width',0.2,0.02,3,0.001), f('length','Length',2,0.1,3,0.001), f('widthSegments','Width Segs',1,1,0,1,true), f('lengthSegments','Length Segs',20,1,0,1,true)],
    create: p => createRibbon3D(p),
  },
  arc3d: {
    label: 'Arc', category: 'vfx',
    defaults: { radius: 0.5, angle: 180, height: 0.15, thickness: 0.1, segments: 24 },
    fields: [f('radius','Radius',0.5,0.05,3,0.001), f('angle','Angle°',180,5,1,1), f('height','Height',0.15,0.02,3,0.001), f('thickness','Thickness',0.1,0.02,3,0.001), f('segments','Segments',24,1,0,2,true)],
    create: p => createArc3D(p),
  },
  ring3d: {
    label: 'Ring', category: 'vfx',
    defaults: { outerRadius: 0.5, innerRadius: 0.3, height: 0.1, segments: 32 },
    fields: [f('outerRadius','Outer Radius',0.5,0.05,3,0.001), f('innerRadius','Inner Radius',0.3,0.05,3,0.001), f('height','Height',0.1,0.02,3,0.001), f('segments','Segments',32,1,0,3,true)],
    create: p => createRing3D(p),
  },
  star3d: {
    label: 'Star', category: 'vfx',
    defaults: { points: 5, outerRadius: 0.5, innerRadius: 0.22, depth: 0.2 },
    fields: [f('points','Points',5,1,0,3,true), f('outerRadius','Outer Radius',0.5,0.05,3,0.001), f('innerRadius','Inner Radius',0.22,0.02,3,0.001), f('depth','Depth',0.2,0.02,3,0.001)],
    create: p => createStar3D(p),
  },
}

export const CATEGORIES_3D: Category3D[] = ['basic', 'curved', 'prisms', 'pyramids', 'polyhedra', 'vfx']

export const CATEGORY_LABELS_3D: Record<Category3D, string> = {
  basic: 'Basic', curved: 'Curved', prisms: 'Prisms',
  pyramids: 'Pyramids', polyhedra: 'Polyhedra', vfx: 'VFX',
}

export const TYPES_BY_CATEGORY_3D: Record<Category3D, Primitive3DType[]> = {
  basic:     ['cube','sphere','cylinder','cone','torus','capsule','plane'],
  curved:    ['uvSphere','icosphere','hemisphere','ellipsoid','tube','frustum','dome'],
  prisms:    ['prism3','prism4','prism5','prism6','prism7','prism8'],
  pyramids:  ['tetrahedron','pyramidSquare','pyramidPenta','pyramidHexa','pyramidTrunc'],
  polyhedra: ['octahedron','dodecahedron','icosahedron','diamond','polyIrregular'],
  vfx:       ['wedge3d','spike','shard','crystal','ribbon3d','arc3d','ring3d','star3d'],
}

// Quick-access row (top 6 classics)
export const QUICK_ACCESS_3D: Primitive3DType[] = ['cube', 'sphere', 'cylinder', 'cone', 'torus', 'capsule']

export function generate3D(type: Primitive3DType, params: Record<string, number>): MeshData {
  return PRIMITIVE_3D_REGISTRY[type].create(params)
}

export function defaultParams3D(type: Primitive3DType): Record<string, number> {
  return { ...PRIMITIVE_3D_REGISTRY[type].defaults }
}
