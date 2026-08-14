import type { MeshData } from '../core/MeshData'

export function exportOBJ(meshData: MeshData, name: string): string {
  const { positions, normals, uvs, indices } = meshData
  const lines: string[] = [`# ShaderMesh — ${name}`, `g ${name}`, '']

  const vCount = positions.length / 3
  for (let i = 0; i < vCount; i++)
    lines.push(`v ${positions[i*3]} ${positions[i*3+1]} ${positions[i*3+2]}`)

  if (uvs) {
    lines.push('')
    const uvCount = uvs.length / 2
    for (let i = 0; i < uvCount; i++)
      lines.push(`vt ${uvs[i*2]} ${uvs[i*2+1]}`)
  }

  if (normals) {
    lines.push('')
    const nCount = normals.length / 3
    for (let i = 0; i < nCount; i++)
      lines.push(`vn ${normals[i*3]} ${normals[i*3+1]} ${normals[i*3+2]}`)
  }

  lines.push('')
  const triCount = indices.length / 3
  for (let t = 0; t < triCount; t++) {
    const a = indices[t*3] + 1
    const b = indices[t*3+1] + 1
    const c = indices[t*3+2] + 1
    if (uvs && normals)  lines.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`)
    else if (uvs)        lines.push(`f ${a}/${a} ${b}/${b} ${c}/${c}`)
    else if (normals)    lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`)
    else                 lines.push(`f ${a} ${b} ${c}`)
  }

  return lines.join('\n')
}
