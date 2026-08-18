import type { MeshData } from './MeshData'
import type { Shape2DType, Shape2DParams } from '../geometry/primitives/create2DShapes'
import type { Primitive3DType } from '../geometry/primitives/registry3D'
import type { UVMapConfig } from '../geometry/uvProjection'

export type PrimitiveSource =
  | { kind: 'plane';     params: { width: number; height: number; subdivisionsX: number; subdivisionsY: number } }
  | { kind: 'cube';      params: { width: number; height: number; depth: number } }
  | { kind: 'sphere';    params: { radius: number; widthSegments: number; heightSegments: number } }
  | { kind: 'cylinder';  params: { radiusTop: number; radiusBottom: number; height: number; radialSegments: number; heightSegments: number; rise: number } }
  | { kind: 'cone';      params: { radius: number; height: number; radialSegments: number; rise: number } }
  | { kind: 'torus';     params: { radius: number; tube: number; radialSegments: number; tubularSegments: number; rise: number } }
  | { kind: 'capsule';   params: { radius: number; height: number; radialSegments: number; hemisphereSegments: number } }
  | { kind: 'shape2d';   shapeType: Shape2DType; params: Shape2DParams }
  | { kind: 'extended3d'; primitiveType: Primitive3DType; params: Record<string, number> }

export interface Transform {
  position: [number, number, number]
  rotation: [number, number, number] // Euler angles in radians
  scale: [number, number, number]
}

export interface MeshObject {
  id: string
  name: string
  meshData: MeshData
  transform: Transform
  visible: boolean
  sourceParams?: PrimitiveSource
  uvMap?: UVMapConfig
}

export function defaultTransform(): Transform {
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  }
}

export function createMeshObject(
  id: string,
  name: string,
  meshData: MeshData,
  transform?: Partial<Transform>,
): MeshObject {
  return {
    id,
    name,
    meshData,
    transform: { ...defaultTransform(), ...transform },
    visible: true,
  }
}
