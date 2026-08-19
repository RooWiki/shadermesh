import type { MeshData } from '../core/MeshData'

function f(n: number): string {
  // Fixed-point with up to 6 decimal places; avoids scientific notation
  return n.toFixed(6).replace(/\.?0+$/, '') || '0'
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function exportOBJ(meshData: MeshData, name: string): string {
  const { positions, normals, uvs, indices } = meshData
  const grp = safeName(name)
  const lines: string[] = [`# Roowiki - ${name}`, `g ${grp}`, '']

  const vCount = positions.length / 3
  for (let i = 0; i < vCount; i++)
    lines.push(`v ${f(positions[i*3])} ${f(positions[i*3+1])} ${f(positions[i*3+2])}`)

  if (uvs) {
    lines.push('')
    const uvCount = uvs.length / 2
    for (let i = 0; i < uvCount; i++)
      lines.push(`vt ${f(uvs[i*2])} ${f(uvs[i*2+1])}`)
  }

  if (normals) {
    lines.push('')
    const nCount = normals.length / 3
    for (let i = 0; i < nCount; i++)
      lines.push(`vn ${f(normals[i*3])} ${f(normals[i*3+1])} ${f(normals[i*3+2])}`)
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
