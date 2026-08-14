import { useEffect, useRef } from 'react'
import type { MeshData } from '../../core/MeshData'
import styles from './Inspector.module.css'

interface Props {
  meshData: MeshData
  selectedVertexIndices: number[]
  selectedFaceIndex: number | null
}

const CANVAS_SIZE = 512

export function UVViewer({ meshData, selectedVertexIndices, selectedFaceIndex }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !meshData.uvs) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { uvs, indices } = meshData
    const S = CANVAS_SIZE
    const pad = 24
    const dim = S - pad * 2

    const toCanvas = (u: number, v: number): [number, number] => [
      pad + u * dim,
      pad + (1 - v) * dim,
    ]

    ctx.clearRect(0, 0, S, S)
    ctx.fillStyle = '#12121a'
    ctx.fillRect(0, 0, S, S)

    // Checkerboard in the 0-1 tile
    const checks = 8
    const cs = dim / checks
    for (let cy = 0; cy < checks; cy++) {
      for (let cx = 0; cx < checks; cx++) {
        ctx.fillStyle = (cx + cy) % 2 === 0 ? '#1c1c28' : '#222232'
        ctx.fillRect(pad + cx * cs, pad + cy * cs, cs, cs)
      }
    }

    // 0-1 boundary
    ctx.strokeStyle = '#44445a'
    ctx.lineWidth = 1
    ctx.strokeRect(pad + 0.5, pad + 0.5, dim - 1, dim - 1)

    // Grid lines at 0.25 intervals
    ctx.strokeStyle = '#28283a'
    ctx.lineWidth = 0.5
    for (let g = 1; g < 4; g++) {
      const t = g / 4
      const gx = pad + t * dim
      const gy = pad + t * dim
      ctx.beginPath(); ctx.moveTo(gx, pad); ctx.lineTo(gx, pad + dim); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(pad + dim, gy); ctx.stroke()
    }

    const triCount = indices.length / 3

    // Highlighted face triangles
    if (selectedFaceIndex !== null) {
      const a = indices[selectedFaceIndex*3]
      const b = indices[selectedFaceIndex*3+1]
      const c = indices[selectedFaceIndex*3+2]
      const [ax, ay] = toCanvas(uvs[a*2], uvs[a*2+1])
      const [bx, by] = toCanvas(uvs[b*2], uvs[b*2+1])
      const [cx2, cy2] = toCanvas(uvs[c*2], uvs[c*2+1])
      ctx.fillStyle = 'rgba(255, 140, 0, 0.25)'
      ctx.beginPath()
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx2, cy2)
      ctx.closePath(); ctx.fill()
    }

    // All UV edges
    ctx.strokeStyle = '#4a6aaa'
    ctx.lineWidth = 0.75
    ctx.beginPath()
    for (let t = 0; t < triCount; t++) {
      const a = indices[t*3], b = indices[t*3+1], c2 = indices[t*3+2]
      const [ax, ay] = toCanvas(uvs[a*2], uvs[a*2+1])
      const [bx, by] = toCanvas(uvs[b*2], uvs[b*2+1])
      const [cx, cy] = toCanvas(uvs[c2*2], uvs[c2*2+1])
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by)
      ctx.moveTo(bx, by); ctx.lineTo(cx, cy)
      ctx.moveTo(cx, cy); ctx.lineTo(ax, ay)
    }
    ctx.stroke()

    // All UV vertices (small dots)
    const vCount = uvs.length / 2
    ctx.fillStyle = '#33446688'
    for (let i = 0; i < vCount; i++) {
      const [px, py] = toCanvas(uvs[i*2], uvs[i*2+1])
      ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill()
    }

    // Selected vertex UV dots
    for (const vi of selectedVertexIndices) {
      const u = uvs[vi * 2]
      const v = uvs[vi * 2 + 1]
      const [px, py] = toCanvas(u, v)
      ctx.fillStyle = '#ffdd00'
      ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // UV label for first selected vertex
    if (selectedVertexIndices.length === 1) {
      const vi = selectedVertexIndices[0]
      const u = uvs[vi * 2]
      const v = uvs[vi * 2 + 1]
      ctx.fillStyle = '#ffdd00'
      ctx.font = '20px monospace'
      ctx.fillText(`${u.toFixed(3)}, ${v.toFixed(3)}`, pad, S - 6)
    }

  }, [meshData, selectedVertexIndices, selectedFaceIndex])

  if (!meshData.uvs) return null

  return (
    <div className={styles.uvViewer}>
      <div className={styles.sectionTitle}>UV Layout</div>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className={styles.uvCanvas}
      />
    </div>
  )
}
