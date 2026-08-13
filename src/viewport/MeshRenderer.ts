import * as THREE from 'three'
import type { MeshData } from '../core/MeshData'

export function meshDataToBufferGeometry(meshData: MeshData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()

  geo.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3))

  if (meshData.normals) {
    geo.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3))
  }

  if (meshData.uvs) {
    geo.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2))
  }

  if (meshData.tangents) {
    geo.setAttribute('tangent', new THREE.BufferAttribute(meshData.tangents, 4))
  }

  if (meshData.colors) {
    geo.setAttribute('color', new THREE.BufferAttribute(meshData.colors, 4))
  }

  geo.setIndex(new THREE.BufferAttribute(meshData.indices, 1))

  if (!meshData.normals) {
    geo.computeVertexNormals()
  }

  return geo
}
