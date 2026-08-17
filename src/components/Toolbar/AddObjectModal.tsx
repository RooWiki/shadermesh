import { useState, useMemo } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import { NumberInput } from '../Inspector/NumberInput'
import {
  createPlane, createCube, createSphere, createCylinder,
  createCone, createTorus, createCapsule, createShape2D,
} from '../../geometry/primitives'
import type { Shape2DType } from '../../geometry/primitives'
import { PrimitivePreview } from './PrimitivePreview'
import styles from './AddObjectModal.module.css'

type PrimitiveType = 'plane' | 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'capsule'
type Tab = '3d' | '2d'
type Category2D = 'curved' | 'triangles' | 'quads' | 'regular' | 'decorative' | 'lines'

interface AddObjectModalProps { onClose: () => void }

const SHAPES_BY_CATEGORY: Record<Category2D, { type: Shape2DType; label: string }[]> = {
  curved: [
    { type: 'circle',    label: 'Circle' },
    { type: 'ellipse',   label: 'Ellipse' },
    { type: 'oval',      label: 'Oval' },
    { type: 'semicircle',label: 'Semicircle' },
    { type: 'arc',       label: 'Arc' },
    { type: 'ring',      label: 'Ring' },
    { type: 'sector',    label: 'Sector' },
    { type: 'segment',   label: 'Segment' },
    { type: 'crown',     label: 'Crown' },
    { type: 'crescent',  label: 'Crescent' },
    { type: 'spiral',    label: 'Spiral' },
  ],
  triangles: [
    { type: 'equilateral', label: 'Equilateral' },
    { type: 'isosceles',   label: 'Isosceles' },
    { type: 'scalene',     label: 'Scalene' },
    { type: 'acute',       label: 'Acute' },
    { type: 'right',       label: 'Right' },
    { type: 'obtuse',      label: 'Obtuse' },
  ],
  quads: [
    { type: 'rectangle',    label: 'Rectangle' },
    { type: 'square',       label: 'Square' },
    { type: 'rhombus',      label: 'Rhombus' },
    { type: 'rhomboid',     label: 'Rhomboid' },
    { type: 'trapezoid',    label: 'Trapezoid' },
    { type: 'parallelogram',label: 'Parallelogram' },
    { type: 'kite',         label: 'Kite' },
  ],
  regular: [
    { type: 'pentagon',  label: 'Pentagon' },
    { type: 'hexagon',   label: 'Hexagon' },
    { type: 'heptagon',  label: 'Heptagon' },
    { type: 'octagon',   label: 'Octagon' },
    { type: 'irregular', label: 'Irregular' },
  ],
  decorative: [
    { type: 'star',   label: 'Star' },
    { type: 'arrow',  label: 'Arrow' },
    { type: 'wedge',  label: 'Wedge' },
    { type: 'ribbon', label: 'Ribbon' },
  ],
  lines: [
    { type: 'straight', label: 'Straight' },
    { type: 'curved',   label: 'Curved' },
    { type: 'broken',   label: 'Broken' },
    { type: 'zigzag',   label: 'Zigzag' },
  ],
}

const CATEGORY_LABELS: Record<Category2D, string> = {
  curved: 'Curved', triangles: 'Triangles', quads: 'Quads',
  regular: 'Regular', decorative: 'Decorative', lines: 'Lines',
}

const CATEGORIES: Category2D[] = ['curved', 'triangles', 'quads', 'regular', 'decorative', 'lines']

export function AddObjectModal({ onClose }: AddObjectModalProps) {
  const [tab, setTab] = useState<Tab>('3d')

  // 3D state
  const [type, setType] = useState<PrimitiveType>('plane')
  const [planeW, setPlaneW] = useState(1)
  const [planeH, setPlaneH] = useState(1)
  const [planeSX, setPlaneSX] = useState(1)
  const [planeSY, setPlaneSY] = useState(1)
  const [cubeW, setCubeW] = useState(1)
  const [cubeH, setCubeH] = useState(1)
  const [cubeD, setCubeD] = useState(1)
  const [sphereR, setSphereR] = useState(0.5)
  const [sphereWS, setSphereWS] = useState(32)
  const [sphereHS, setSphereHS] = useState(16)
  const [cylRT, setCylRT] = useState(0.5)
  const [cylRB, setCylRB] = useState(0.5)
  const [cylH, setCylH] = useState(1)
  const [cylRS, setCylRS] = useState(16)
  const [cylHS, setCylHS] = useState(1)
  const [cylRise, setCylRise] = useState(0)
  const [coneR, setConeR] = useState(0.5)
  const [coneH, setConeH] = useState(1)
  const [coneRS, setConeRS] = useState(16)
  const [coneRise, setConeRise] = useState(0)
  const [torR, setTorR] = useState(0.5)
  const [torT, setTorT] = useState(0.2)
  const [torRS, setTorRS] = useState(12)
  const [torTS, setTorTS] = useState(32)
  const [torRise, setTorRise] = useState(0)
  const [capR, setCapR] = useState(0.4)
  const [capH, setCapH] = useState(1)
  const [capRS, setCapRS] = useState(16)
  const [capHS, setCapHS] = useState(8)

  // 2D state
  const [category, setCategory] = useState<Category2D>('curved')
  const [shape2D, setShape2D] = useState<Shape2DType>('circle')
  // circle / ellipse / oval / semicircle
  const [radius, setRadius] = useState(0.5)
  const [radiusX, setRadiusX] = useState(0.5)
  const [radiusZ, setRadiusZ] = useState(0.3)
  const [ovalW, setOvalW] = useState(1)
  const [ovalH, setOvalH] = useState(0.4)
  const [segments, setSegments] = useState(32)
  // arc / ring / sector / segment / crown
  const [innerRadius, setInnerRadius] = useState(0.3)
  const [outerRadius, setOuterRadius] = useState(0.5)
  const [startAngle, setStartAngle] = useState(0)
  const [endAngle, setEndAngle] = useState(270)
  const [arcRise, setArcRise] = useState(0)
  const [ringRise, setRingRise] = useState(0)
  // crescent
  const [cresOuterR, setCresOuterR] = useState(0.5)
  const [cresInnerR, setCresInnerR] = useState(0.42)
  const [cresOffset, setCresOffset] = useState(0.15)
  // spiral
  const [spiralInner, setSpiralInner] = useState(0.05)
  const [spiralOuter, setSpiralOuter] = useState(0.5)
  const [spiralTurns, setSpiralTurns] = useState(3)
  const [spiralWidth, setSpiralWidth] = useState(0.04)
  const [spiralRise, setSpiralRise] = useState(0)
  // triangle variants
  const [triSide, setTriSide] = useState(1)
  const [isoBase, setIsoBase] = useState(1)
  const [isoHeight, setIsoHeight] = useState(1)
  const [scaBase, setScaBase] = useState(1)
  const [scaHeight, setScaHeight] = useState(0.8)
  const [scaleOffset, setScaleOffset] = useState(0.3)
  const [acuteBase, setAcuteBase] = useState(1)
  const [acuteHeight, setAcuteHeight] = useState(0.9)
  const [rightLeg1, setRightLeg1] = useState(0.8)
  const [rightLeg2, setRightLeg2] = useState(0.6)
  const [obtuseBase, setObtuseBase] = useState(1)
  const [obtuseHeight, setObtuseHeight] = useState(0.5)
  // quads
  const [rectW, setRectW] = useState(1)
  const [rectH, setRectH] = useState(0.5)
  const [squareSize, setSquareSize] = useState(1)
  const [rhDiagH, setRhDiagH] = useState(1)
  const [rhDiagV, setRhDiagV] = useState(0.6)
  const [skew, setSkew] = useState(0.3)
  const [trapTop, setTrapTop] = useState(0.5)
  const [trapBot, setTrapBot] = useState(1)
  const [trapH, setTrapH] = useState(0.6)
  const [kiteW, setKiteW] = useState(0.6)
  const [kiteTop, setKiteTop] = useState(0.3)
  const [kiteBot, setKiteBot] = useState(0.7)
  // regular
  const [polyRadius, setPolyRadius] = useState(0.5)
  const [polySides, setPolySides] = useState(7)
  const [irregularity, setIrregularity] = useState(0.3)
  // decorative
  const [starOuter, setStarOuter] = useState(0.5)
  const [starInner, setStarInner] = useState(0.22)
  const [starPoints, setStarPoints] = useState(5)
  const [arrowLen, setArrowLen] = useState(1)
  const [arrowHW, setArrowHW] = useState(0.5)
  const [arrowHL, setArrowHL] = useState(0.35)
  const [arrowSW, setArrowSW] = useState(0.18)
  const [wedgeW, setWedgeW] = useState(1)
  const [wedgeD, setWedgeD] = useState(0.6)
  const [wedgeT, setWedgeT] = useState(0.15)
  const [ribW, setRibW] = useState(0.8)
  const [ribH, setRibH] = useState(0.4)
  const [ribT, setRibT] = useState(0.08)
  // lines
  const [lineLen, setLineLen] = useState(1)
  const [lineW, setLineW] = useState(0.04)
  const [curvature, setCurvature] = useState(0.3)
  const [brokenL1, setBrokenL1] = useState(0.5)
  const [brokenL2, setBrokenL2] = useState(0.5)
  const [brokenAngle, setBrokenAngle] = useState(90)
  const [zzW, setZzW] = useState(0.3)
  const [zzH, setZzH] = useState(1)
  const [zzSegs, setZzSegs] = useState(4)
  const [zzT, setZzT] = useState(0.06)
  const [zzSmooth, setZzSmooth] = useState(0)

  const [objectName, setObjectName] = useState('')

  const addPlane      = useSceneStore(s => s.addPlane)
  const addCube       = useSceneStore(s => s.addCube)
  const addSphere     = useSceneStore(s => s.addSphere)
  const addCylinder   = useSceneStore(s => s.addCylinder)
  const addCone       = useSceneStore(s => s.addCone)
  const addTorus      = useSceneStore(s => s.addTorus)
  const addCapsule    = useSceneStore(s => s.addCapsule)
  const addShape2D    = useSceneStore(s => s.addShape2D)
  const renameObject  = useSceneStore(s => s.renameObject)

  const get2DParams = (): Record<string, number> => {
    switch (shape2D) {
      case 'circle':      return { radius, segments }
      case 'ellipse':     return { radiusX, radiusZ, segments }
      case 'oval':        return { width: ovalW, height: ovalH, segments }
      case 'semicircle':  return { radius, segments }
      case 'arc':         return { innerRadius, outerRadius, startAngle, endAngle, segments, rise: arcRise }
      case 'ring':        return { innerRadius, outerRadius, segments, rise: ringRise }
      case 'sector':      return { radius, startAngle, endAngle, segments }
      case 'segment':     return { radius, startAngle, endAngle: endAngle, segments }
      case 'crown':       return { innerRadius, outerRadius, segments, rise: ringRise }
      case 'crescent':    return { outerRadius: cresOuterR, innerRadius: cresInnerR, offset: cresOffset, segments }
      case 'spiral':      return { innerRadius: spiralInner, outerRadius: spiralOuter, turns: spiralTurns, width: spiralWidth, segments, rise: spiralRise }
      case 'equilateral': return { side: triSide }
      case 'isosceles':   return { base: isoBase, height: isoHeight }
      case 'scalene':     return { base: scaBase, height: scaHeight, offset: scaleOffset }
      case 'acute':       return { base: acuteBase, height: acuteHeight }
      case 'right':       return { leg1: rightLeg1, leg2: rightLeg2 }
      case 'obtuse':      return { base: obtuseBase, height: obtuseHeight }
      case 'rectangle':   return { width: rectW, height: rectH }
      case 'square':      return { size: squareSize }
      case 'rhombus':     return { diagonalH: rhDiagH, diagonalV: rhDiagV }
      case 'rhomboid':    return { width: rectW, height: rectH, skew }
      case 'trapezoid':   return { topWidth: trapTop, bottomWidth: trapBot, height: trapH }
      case 'parallelogram': return { width: rectW, height: rectH, skew }
      case 'kite':        return { width: kiteW, topHeight: kiteTop, bottomHeight: kiteBot }
      case 'pentagon':    return { radius: polyRadius }
      case 'hexagon':     return { radius: polyRadius }
      case 'heptagon':    return { radius: polyRadius }
      case 'octagon':     return { radius: polyRadius }
      case 'irregular':   return { radius: polyRadius, sides: polySides, irregularity }
      case 'star':        return { outerRadius: starOuter, innerRadius: starInner, points: starPoints }
      case 'arrow':       return { length: arrowLen, headWidth: arrowHW, headLength: arrowHL, shaftWidth: arrowSW }
      case 'wedge':       return { width: wedgeW, depth: wedgeD, thickness: wedgeT }
      case 'ribbon':      return { width: ribW, height: ribH, thickness: ribT }
      case 'straight':    return { length: lineLen, width: lineW }
      case 'curved':      return { length: lineLen, curvature, width: lineW }
      case 'broken':      return { length1: brokenL1, length2: brokenL2, angle: brokenAngle, width: lineW }
      case 'zigzag':      return { width: zzW, height: zzH, zigzags: zzSegs, thickness: zzT, smoothness: zzSmooth }
    }
  }

  const previewMeshData = useMemo(() => {
    try {
      if (tab === '2d') {
        const p2 = (() => {
          switch (shape2D) {
            case 'circle':      return { radius, segments }
            case 'ellipse':     return { radiusX, radiusZ, segments }
            case 'oval':        return { width: ovalW, height: ovalH, segments }
            case 'semicircle':  return { radius, segments }
            case 'arc':         return { innerRadius, outerRadius, startAngle, endAngle, segments, rise: arcRise }
            case 'ring':        return { innerRadius, outerRadius, segments, rise: ringRise }
            case 'sector':      return { radius, startAngle, endAngle, segments }
            case 'segment':     return { radius, startAngle, endAngle, segments }
            case 'crown':       return { innerRadius, outerRadius, segments, rise: ringRise }
            case 'crescent':    return { outerRadius: cresOuterR, innerRadius: cresInnerR, offset: cresOffset, segments }
            case 'spiral':      return { innerRadius: spiralInner, outerRadius: spiralOuter, turns: spiralTurns, width: spiralWidth, segments, rise: spiralRise }
            case 'equilateral': return { side: triSide }
            case 'isosceles':   return { base: isoBase, height: isoHeight }
            case 'scalene':     return { base: scaBase, height: scaHeight, offset: scaleOffset }
            case 'acute':       return { base: acuteBase, height: acuteHeight }
            case 'right':       return { leg1: rightLeg1, leg2: rightLeg2 }
            case 'obtuse':      return { base: obtuseBase, height: obtuseHeight }
            case 'rectangle':   return { width: rectW, height: rectH }
            case 'rhomboid':
            case 'parallelogram': return { width: rectW, height: rectH, skew }
            case 'square':      return { size: squareSize }
            case 'rhombus':     return { diagonalH: rhDiagH, diagonalV: rhDiagV }
            case 'trapezoid':   return { topWidth: trapTop, bottomWidth: trapBot, height: trapH }
            case 'kite':        return { width: kiteW, topHeight: kiteTop, bottomHeight: kiteBot }
            case 'pentagon':
            case 'hexagon':
            case 'heptagon':
            case 'octagon':     return { radius: polyRadius }
            case 'irregular':   return { radius: polyRadius, sides: polySides, irregularity }
            case 'star':        return { outerRadius: starOuter, innerRadius: starInner, points: starPoints }
            case 'arrow':       return { length: arrowLen, headWidth: arrowHW, headLength: arrowHL, shaftWidth: arrowSW }
            case 'wedge':       return { width: wedgeW, depth: wedgeD, thickness: wedgeT }
            case 'ribbon':      return { width: ribW, height: ribH, thickness: ribT }
            case 'straight':    return { length: lineLen, width: lineW }
            case 'curved':      return { length: lineLen, curvature, width: lineW }
            case 'broken':      return { length1: brokenL1, length2: brokenL2, angle: brokenAngle, width: lineW }
            case 'zigzag':      return { width: zzW, height: zzH, zigzags: zzSegs, thickness: zzT, smoothness: zzSmooth }
          }
        })()
        return createShape2D(shape2D, p2)
      }
      switch (type) {
        case 'plane':    return createPlane({ width: planeW, height: planeH, subdivisionsX: planeSX, subdivisionsY: planeSY })
        case 'cube':     return createCube({ width: cubeW, height: cubeH, depth: cubeD })
        case 'sphere':   return createSphere({ radius: sphereR, widthSegments: sphereWS, heightSegments: sphereHS })
        case 'cylinder': return createCylinder({ radiusTop: cylRT, radiusBottom: cylRB, height: cylH, radialSegments: cylRS, heightSegments: cylHS, rise: cylRise })
        case 'cone':     return createCone({ radius: coneR, height: coneH, radialSegments: coneRS, rise: coneRise })
        case 'torus':    return createTorus({ radius: torR, tube: torT, radialSegments: torRS, tubularSegments: torTS, rise: torRise })
        case 'capsule':  return createCapsule({ radius: capR, height: capH, radialSegments: capRS, hemisphereSegments: capHS })
      }
    } catch {
      return createCube({})
    }
  }, [
    tab, type, shape2D,
    planeW, planeH, planeSX, planeSY,
    cubeW, cubeH, cubeD,
    sphereR, sphereWS, sphereHS,
    cylRT, cylRB, cylH, cylRS, cylHS, cylRise,
    coneR, coneH, coneRS, coneRise,
    torR, torT, torRS, torTS, torRise,
    capR, capH, capRS, capHS,
    radius, radiusX, radiusZ, ovalW, ovalH, segments,
    innerRadius, outerRadius, startAngle, endAngle, arcRise, ringRise,
    cresOuterR, cresInnerR, cresOffset,
    spiralInner, spiralOuter, spiralTurns, spiralWidth, spiralRise,
    triSide, isoBase, isoHeight, scaBase, scaHeight, scaleOffset, acuteBase, acuteHeight, rightLeg1, rightLeg2, obtuseBase, obtuseHeight,
    rectW, rectH, squareSize, rhDiagH, rhDiagV, skew,
    trapTop, trapBot, trapH, kiteW, kiteTop, kiteBot,
    polyRadius, polySides, irregularity,
    starOuter, starInner, starPoints,
    arrowLen, arrowHW, arrowHL, arrowSW,
    wedgeW, wedgeD, wedgeT,
    ribW, ribH, ribT,
    lineLen, lineW, curvature,
    brokenL1, brokenL2, brokenAngle,
    zzW, zzH, zzSegs, zzT, zzSmooth,
  ])

  const handleAdd = () => {
    let id: string
    if (tab === '3d') {
      if      (type === 'plane')    id = addPlane({ width: planeW, height: planeH, subdivisionsX: planeSX, subdivisionsY: planeSY })
      else if (type === 'cube')     id = addCube({ width: cubeW, height: cubeH, depth: cubeD })
      else if (type === 'sphere')   id = addSphere({ radius: sphereR, widthSegments: sphereWS, heightSegments: sphereHS })
      else if (type === 'cylinder') id = addCylinder({ radiusTop: cylRT, radiusBottom: cylRB, height: cylH, radialSegments: cylRS, heightSegments: cylHS, rise: cylRise })
      else if (type === 'cone')     id = addCone({ radius: coneR, height: coneH, radialSegments: coneRS, rise: coneRise })
      else if (type === 'torus')    id = addTorus({ radius: torR, tube: torT, radialSegments: torRS, tubularSegments: torTS, rise: torRise })
      else                          id = addCapsule({ radius: capR, height: capH, radialSegments: capRS, hemisphereSegments: capHS })
    } else {
      id = addShape2D(shape2D, get2DParams())
    }
    if (objectName.trim()) renameObject(id!, objectName.trim())
    onClose()
  }

  const field = (label: string, value: number, set: (n: number) => void, step = 0.1, decimals = 3, min = 0.001) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <NumberInput className={styles.input} value={value} step={step} decimals={decimals} onChange={n => set(Math.max(min, n))} />
    </label>
  )

  const intField = (label: string, value: number, set: (n: number) => void, min = 1) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <NumberInput className={styles.input} value={value} step={1} decimals={0} onChange={n => set(Math.max(min, Math.round(n)))} />
    </label>
  )

  const angleField = (label: string, value: number, set: (n: number) => void) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <NumberInput className={styles.input} value={value} step={5} decimals={1} onChange={set} />
    </label>
  )

  const TYPES: PrimitiveType[] = ['plane', 'cube', 'sphere', 'cylinder', 'cone', 'torus', 'capsule']
  const LABELS: Record<PrimitiveType, string> = {
    plane: 'Plane', cube: 'Cube', sphere: 'Sphere',
    cylinder: 'Cylinder', cone: 'Cone', torus: 'Torus', capsule: 'Capsule',
  }

  const namePlaceholder = tab === '2d'
    ? shape2D.charAt(0).toUpperCase() + shape2D.slice(1)
    : LABELS[type]

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.title}>Add Object</div>

        {/* Main tabs */}
        <div className={styles.tabRow}>
          <button className={`${styles.tabBtn} ${tab === '3d' ? styles.tabBtnActive : ''}`} onClick={() => setTab('3d')}>3D Primitives</button>
          <button className={`${styles.tabBtn} ${tab === '2d' ? styles.tabBtnActive : ''}`} onClick={() => setTab('2d')}>2D Shapes</button>
        </div>

        {/* Two-column layout: preview left, controls right */}
        <div className={styles.twoCol}>
          <div className={styles.previewCol}>
            {previewMeshData && <PrimitivePreview meshData={previewMeshData} height={260} />}
          </div>

          <div className={styles.controlCol}>
            {tab === '3d' && (
              <>
                <div className={styles.typeRow}>
                  {TYPES.map(t => (
                    <button
                      key={t}
                      className={`${styles.typeBtn} ${type === t ? styles.typeBtnActive : ''}`}
                      onClick={() => setType(t)}
                    >
                      {LABELS[t]}
                    </button>
                  ))}
                </div>

                <div className={styles.fields}>
                  {type === 'plane' && (
                    <>
                      {field('Width', planeW, setPlaneW)}
                      {field('Height', planeH, setPlaneH)}
                      {intField('Subdivisions X', planeSX, setPlaneSX)}
                      {intField('Subdivisions Y', planeSY, setPlaneSY)}
                      <div className={styles.hint}>{(planeSX + 1) * (planeSY + 1)} verts · {planeSX * planeSY * 2} tris</div>
                    </>
                  )}
                  {type === 'cube' && (
                    <>
                      {field('Width', cubeW, setCubeW)}
                      {field('Height', cubeH, setCubeH)}
                      {field('Depth', cubeD, setCubeD)}
                      <div className={styles.hint}>24 verts · 12 tris</div>
                    </>
                  )}
                  {type === 'sphere' && (
                    <>
                      {field('Radius', sphereR, setSphereR)}
                      {intField('Width Segments', sphereWS, setSphereWS, 3)}
                      {intField('Height Segments', sphereHS, setSphereHS, 2)}
                      <div className={styles.hint}>{(sphereWS + 1) * (sphereHS + 1)} verts</div>
                    </>
                  )}
                  {type === 'cylinder' && (
                    <>
                      {field('Radius Top', cylRT, setCylRT, 0.1, 3, 0)}
                      {field('Radius Bottom', cylRB, setCylRB, 0.1, 3, 0.001)}
                      {field('Height', cylH, setCylH)}
                      {intField('Radial Segments', cylRS, setCylRS, 3)}
                      {intField('Height Segments', cylHS, setCylHS)}
                      {field('Rise / Rev', cylRise, setCylRise, 0.1, 3, -Infinity)}
                    </>
                  )}
                  {type === 'cone' && (
                    <>
                      {field('Radius', coneR, setConeR)}
                      {field('Height', coneH, setConeH)}
                      {intField('Radial Segments', coneRS, setConeRS, 3)}
                      {field('Rise / Rev', coneRise, setConeRise, 0.1, 3, -Infinity)}
                    </>
                  )}
                  {type === 'torus' && (
                    <>
                      {field('Radius', torR, setTorR)}
                      {field('Tube', torT, setTorT)}
                      {intField('Radial Segments', torRS, setTorRS, 3)}
                      {intField('Tubular Segments', torTS, setTorTS, 3)}
                      {field('Rise / Rev', torRise, setTorRise, 0.1, 3, -Infinity)}
                      <div className={styles.hint}>{(torRS + 1) * (torTS + 1)} verts · {torRS * torTS * 2} tris</div>
                    </>
                  )}
                  {type === 'capsule' && (
                    <>
                      {field('Radius', capR, setCapR)}
                      {field('Height', capH, setCapH, 0.1, 3, 0)}
                      {intField('Radial Segments', capRS, setCapRS, 3)}
                      {intField('Hemisphere Segs', capHS, setCapHS)}
                    </>
                  )}
                </div>
              </>
            )}

            {tab === '2d' && (
              <>
                <div className={styles.catRow}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      className={`${styles.catBtn} ${category === cat ? styles.catBtnActive : ''}`}
                      onClick={() => setCategory(cat)}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>

                <div className={styles.shapeGrid}>
                  {SHAPES_BY_CATEGORY[category].map(({ type: t, label }) => (
                    <button
                      key={t}
                      className={`${styles.shapeBtn} ${shape2D === t ? styles.shapeBtnActive : ''}`}
                      onClick={() => setShape2D(t)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className={styles.fields}>
                  {shape2D === 'circle' && (<>{field('Radius', radius, setRadius)}{intField('Segments', segments, setSegments, 3)}</>)}
                  {shape2D === 'ellipse' && (<>{field('Radius X', radiusX, setRadiusX)}{field('Radius Z', radiusZ, setRadiusZ)}{intField('Segments', segments, setSegments, 3)}</>)}
                  {shape2D === 'oval' && (<>{field('Width', ovalW, setOvalW)}{field('Height', ovalH, setOvalH)}{intField('Segments', segments, setSegments, 4)}</>)}
                  {shape2D === 'semicircle' && (<>{field('Radius', radius, setRadius)}{intField('Segments', segments, setSegments, 3)}</>)}
                  {shape2D === 'arc' && (<>{field('Inner Radius', innerRadius, setInnerRadius)}{field('Outer Radius', outerRadius, setOuterRadius)}{angleField('Start Angle°', startAngle, setStartAngle)}{angleField('End Angle°', endAngle, setEndAngle)}{intField('Segments', segments, setSegments, 2)}{field('Rise', arcRise, setArcRise, 0.1, 3, -Infinity)}</>)}
                  {(shape2D === 'ring' || shape2D === 'crown') && (<>{field('Inner Radius', innerRadius, setInnerRadius)}{field('Outer Radius', outerRadius, setOuterRadius)}{intField('Segments', segments, setSegments, 3)}{field('Rise', ringRise, setRingRise, 0.1, 3, -Infinity)}</>)}
                  {shape2D === 'sector' && (<>{field('Radius', radius, setRadius)}{angleField('Start Angle°', startAngle, setStartAngle)}{angleField('End Angle°', endAngle, setEndAngle)}{intField('Segments', segments, setSegments, 2)}</>)}
                  {shape2D === 'segment' && (<>{field('Radius', radius, setRadius)}{angleField('Start Angle°', startAngle, setStartAngle)}{angleField('End Angle°', endAngle, setEndAngle)}{intField('Segments', segments, setSegments, 2)}</>)}
                  {shape2D === 'crescent' && (<>{field('Outer Radius', cresOuterR, setCresOuterR)}{field('Inner Radius', cresInnerR, setCresInnerR)}{field('Offset', cresOffset, setCresOffset)}{intField('Segments', segments, setSegments, 8)}</>)}
                  {shape2D === 'spiral' && (<>{field('Inner Radius', spiralInner, setSpiralInner)}{field('Outer Radius', spiralOuter, setSpiralOuter)}{field('Turns', spiralTurns, setSpiralTurns, 0.5, 1, 0.5)}{field('Width', spiralWidth, setSpiralWidth)}{intField('Segments', segments, setSegments, 4)}{field('Rise / Turn', spiralRise, setSpiralRise, 0.1, 3, -Infinity)}</>)}
                  {shape2D === 'equilateral' && (<>{field('Side', triSide, setTriSide)}</>)}
                  {shape2D === 'isosceles' && (<>{field('Base', isoBase, setIsoBase)}{field('Height', isoHeight, setIsoHeight)}</>)}
                  {shape2D === 'scalene' && (<>{field('Base', scaBase, setScaBase)}{field('Height', scaHeight, setScaHeight)}{field('Offset', scaleOffset, setScaleOffset, 0.1)}</>)}
                  {shape2D === 'acute' && (<>{field('Base', acuteBase, setAcuteBase)}{field('Height', acuteHeight, setAcuteHeight)}</>)}
                  {shape2D === 'right' && (<>{field('Leg 1', rightLeg1, setRightLeg1)}{field('Leg 2', rightLeg2, setRightLeg2)}</>)}
                  {shape2D === 'obtuse' && (<>{field('Base', obtuseBase, setObtuseBase)}{field('Height', obtuseHeight, setObtuseHeight)}</>)}
                  {(shape2D === 'rectangle' || shape2D === 'rhomboid' || shape2D === 'parallelogram') && (<>{field('Width', rectW, setRectW)}{field('Height', rectH, setRectH)}{shape2D !== 'rectangle' && field('Skew', skew, setSkew, 0.1)}</>)}
                  {shape2D === 'square' && (<>{field('Size', squareSize, setSquareSize)}</>)}
                  {shape2D === 'rhombus' && (<>{field('Diagonal H', rhDiagH, setRhDiagH)}{field('Diagonal V', rhDiagV, setRhDiagV)}</>)}
                  {shape2D === 'trapezoid' && (<>{field('Top Width', trapTop, setTrapTop)}{field('Bottom Width', trapBot, setTrapBot)}{field('Height', trapH, setTrapH)}</>)}
                  {shape2D === 'kite' && (<>{field('Width', kiteW, setKiteW)}{field('Top Height', kiteTop, setKiteTop)}{field('Bottom Height', kiteBot, setKiteBot)}</>)}
                  {(shape2D === 'pentagon' || shape2D === 'hexagon' || shape2D === 'heptagon' || shape2D === 'octagon') && (<>{field('Radius', polyRadius, setPolyRadius)}</>)}
                  {shape2D === 'irregular' && (<>{field('Radius', polyRadius, setPolyRadius)}{intField('Sides', polySides, setPolySides, 3)}{field('Irregularity', irregularity, setIrregularity, 0.05, 2, 0)}</>)}
                  {shape2D === 'star' && (<>{field('Outer Radius', starOuter, setStarOuter)}{field('Inner Radius', starInner, setStarInner)}{intField('Points', starPoints, setStarPoints, 3)}</>)}
                  {shape2D === 'arrow' && (<>{field('Length', arrowLen, setArrowLen)}{field('Head Width', arrowHW, setArrowHW)}{field('Head Length', arrowHL, setArrowHL)}{field('Shaft Width', arrowSW, setArrowSW)}</>)}
                  {shape2D === 'wedge' && (<>{field('Width', wedgeW, setWedgeW)}{field('Depth', wedgeD, setWedgeD)}{field('Thickness', wedgeT, setWedgeT)}</>)}
                  {shape2D === 'ribbon' && (<>{field('Width', ribW, setRibW)}{field('Height', ribH, setRibH)}{field('Thickness', ribT, setRibT)}</>)}
                  {shape2D === 'straight' && (<>{field('Length', lineLen, setLineLen)}{field('Width', lineW, setLineW)}</>)}
                  {shape2D === 'curved' && (<>{field('Length', lineLen, setLineLen)}{field('Curvature', curvature, setCurvature, 0.05)}{field('Width', lineW, setLineW)}</>)}
                  {shape2D === 'broken' && (<>{field('Length 1', brokenL1, setBrokenL1)}{field('Length 2', brokenL2, setBrokenL2)}{angleField('Angle°', brokenAngle, setBrokenAngle)}{field('Width', lineW, setLineW)}</>)}
                  {shape2D === 'zigzag' && (<>{field('Width', zzW, setZzW)}{field('Height', zzH, setZzH)}{intField('Zigzags', zzSegs, setZzSegs, 1)}{field('Thickness', zzT, setZzT)}{field('Smoothness', zzSmooth, setZzSmooth, 0.05, 2, 0)}</>)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Name field */}
        <div className={styles.nameRow}>
          <span className={styles.nameLabel}>Name</span>
          <input
            className={styles.nameInput}
            type="text"
            placeholder={namePlaceholder}
            value={objectName}
            onChange={e => setObjectName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          />
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.addBtn} onClick={handleAdd}>Add</button>
        </div>
      </div>
    </div>
  )
}
