import { getMeshStats } from '../../core/MeshData'
import type { MeshObject } from '../../core/MeshObject'
import styles from './Inspector.module.css'

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(2)} MB`
}

interface Props {
  obj: MeshObject
}

export function MeshDataPanel({ obj }: Props) {
  const stats = getMeshStats(obj.meshData)

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Mesh Data</div>

      <div className={styles.statGrid}>
        <div className={styles.statRow}>
          <span className={styles.statKey}>Vertices</span>
          <span className={styles.statVal}>{stats.vertexCount.toLocaleString()}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statKey}>Triangles</span>
          <span className={styles.statVal}>{stats.triangleCount.toLocaleString()}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statKey}>Normals</span>
          <span className={`${styles.statVal} ${stats.hasNormals ? styles.attrOn : styles.attrOff}`}>
            {stats.hasNormals ? '✓' : '✗'}
          </span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statKey}>UVs</span>
          <span className={`${styles.statVal} ${stats.hasUVs ? styles.attrOn : styles.attrOff}`}>
            {stats.hasUVs ? '✓' : '✗'}
          </span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statKey}>Tangents</span>
          <span className={`${styles.statVal} ${stats.hasTangents ? styles.attrOn : styles.attrOff}`}>
            {stats.hasTangents ? '✓' : '✗'}
          </span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statKey}>Vertex Colors</span>
          <span className={`${styles.statVal} ${stats.hasColors ? styles.attrOn : styles.attrOff}`}>
            {stats.hasColors ? '✓' : '✗'}
          </span>
        </div>
      </div>

      <div className={styles.sectionSubtitle}>Memory</div>
      <div className={styles.statGrid}>
        <div className={styles.statRow}>
          <span className={styles.statKey}>Positions</span>
          <span className={styles.statVal}>{formatBytes(stats.bytesPositions)}</span>
        </div>
        {stats.hasNormals && (
          <div className={styles.statRow}>
            <span className={styles.statKey}>Normals</span>
            <span className={styles.statVal}>{formatBytes(stats.bytesNormals)}</span>
          </div>
        )}
        {stats.hasUVs && (
          <div className={styles.statRow}>
            <span className={styles.statKey}>UVs</span>
            <span className={styles.statVal}>{formatBytes(stats.bytesUVs)}</span>
          </div>
        )}
        {stats.hasTangents && (
          <div className={styles.statRow}>
            <span className={styles.statKey}>Tangents</span>
            <span className={styles.statVal}>{formatBytes(stats.bytesTangents)}</span>
          </div>
        )}
        {stats.hasColors && (
          <div className={styles.statRow}>
            <span className={styles.statKey}>Colors</span>
            <span className={styles.statVal}>{formatBytes(stats.bytesColors)}</span>
          </div>
        )}
        <div className={styles.statRow}>
          <span className={styles.statKey}>Indices</span>
          <span className={styles.statVal}>{formatBytes(stats.bytesIndices)}</span>
        </div>
        <div className={`${styles.statRow} ${styles.totalRow}`}>
          <span className={styles.statKey}>Total</span>
          <span className={styles.statVal}>{formatBytes(stats.bytesTotal)}</span>
        </div>
      </div>
    </div>
  )
}
