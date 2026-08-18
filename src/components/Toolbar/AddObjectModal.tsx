import { useState, useMemo } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import { NumberInput } from '../Inspector/NumberInput'
import { makeLabelDrag } from '../Inspector/labelDrag'
import {
  createShape2D,
  generate3D, defaultParams3D,
  PRIMITIVE_3D_REGISTRY, CATEGORIES_3D, CATEGORY_LABELS_3D, TYPES_BY_CATEGORY_3D,
} from '../../geometry/primitives'
import type { Shape2DType, Primitive3DType, Category3D } from '../../geometry/primitives'
import { PrimitivePreview } from './PrimitivePreview'
import styles from './AddObjectModal.module.css'

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
  const [tab, setTab] = useState<Tab>('2d')

  // 3D state — registry-based
  const [prim3DType, setPrim3DType] = useState<Primitive3DType>('cube')
  const [prim3DParams, setPrim3DParams] = useState<Record<string, number>>(defaultParams3D('cube'))
  const [prim3DCategory, setPrim3DCategory] = useState<Category3D>('basic')

  const selectType3D = (t: Primitive3DType) => {
    setPrim3DType(t)
    setPrim3DParams(defaultParams3D(t))
    setPrim3DCategory(PRIMITIVE_3D_REGISTRY[t].category)
  }

  const selectCategory3D = (cat: Category3D) => {
    const firstType = TYPES_BY_CATEGORY_3D[cat][0]
    setPrim3DCategory(cat)
    setPrim3DType(firstType)
    setPrim3DParams(defaultParams3D(firstType))
  }

  const updateParam3D = (key: string, val: number) => {
    setPrim3DParams(prev => ({ ...prev, [key]: val }))
  }

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

  const addPrimitive3D = useSceneStore(s => s.addPrimitive3D)
  const addShape2D     = useSceneStore(s => s.addShape2D)
  const renameObject   = useSceneStore(s => s.renameObject)

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
      if (tab === '3d') {
        return generate3D(prim3DType, prim3DParams)
      }
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
      return createShape2D(shape2D, p2 as never)
    } catch {
      return generate3D('cube', defaultParams3D('cube'))
    }
  }, [
    tab, prim3DType, prim3DParams, shape2D,
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
      id = addPrimitive3D(prim3DType, prim3DParams)
    } else {
      id = addShape2D(shape2D, get2DParams())
    }
    if (objectName.trim()) renameObject(id!, objectName.trim())
    onClose()
  }

  const field = (label: string, value: number, set: (n: number) => void, step = 0.1, decimals = 3, min = 0.001) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel} onMouseDown={makeLabelDrag(value, n => set(Math.max(min, n)), step, decimals)}>{label}</span>
      <NumberInput className={styles.input} value={value} step={step} decimals={decimals} onChange={n => set(Math.max(min, n))} />
    </label>
  )

  const intField = (label: string, value: number, set: (n: number) => void, min = 1) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel} onMouseDown={makeLabelDrag(value, n => set(Math.max(min, Math.round(n))), 1, 0)}>{label}</span>
      <NumberInput className={styles.input} value={value} step={1} decimals={0} onChange={n => set(Math.max(min, Math.round(n)))} />
    </label>
  )

  const angleField = (label: string, value: number, set: (n: number) => void) => (
    <label className={styles.field}>
      <span className={styles.fieldLabel} onMouseDown={makeLabelDrag(value, set, 5, 1)}>{label}</span>
      <NumberInput className={styles.input} value={value} step={5} decimals={1} onChange={set} />
    </label>
  )

  const namePlaceholder = tab === '2d'
    ? shape2D.charAt(0).toUpperCase() + shape2D.slice(1)
    : PRIMITIVE_3D_REGISTRY[prim3DType].label

  const vertCount = previewMeshData ? previewMeshData.positions.length / 3 : 0
  const triCount  = previewMeshData ? previewMeshData.indices.length / 3 : 0

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.title}>Add Object</div>

        {/* Main tabs */}
        <div className={styles.tabRow}>
          <button className={`${styles.tabBtn} ${tab === '2d' ? styles.tabBtnActive : ''}`} onClick={() => setTab('2d')}>2D Shapes</button>
          <button className={`${styles.tabBtn} ${tab === '3d' ? styles.tabBtnActive : ''}`} onClick={() => setTab('3d')}>3D Primitives</button>
        </div>

        {/* Two-column layout: preview left, controls right */}
        <div className={styles.twoCol}>
          <div className={styles.previewCol}>
            {previewMeshData && <PrimitivePreview meshData={previewMeshData} height={260} />}
          </div>

          <div className={styles.controlCol}>
            {tab === '3d' && (
              <>
                {/* Category tabs */}
                <div className={styles.catRow}>
                  {CATEGORIES_3D.map(cat => (
                    <button
                      key={cat}
                      className={`${styles.catBtn} ${prim3DCategory === cat ? styles.catBtnActive : ''}`}
                      onClick={() => selectCategory3D(cat)}
                    >
                      {CATEGORY_LABELS_3D[cat]}
                    </button>
                  ))}
                </div>

                {/* Shape grid */}
                <div className={styles.shapeGrid}>
                  {TYPES_BY_CATEGORY_3D[prim3DCategory].map(t => (
                    <button
                      key={t}
                      className={`${styles.shapeBtn} ${prim3DType === t ? styles.shapeBtnActive : ''}`}
                      onClick={() => selectType3D(t)}
                    >
                      {PRIMITIVE_3D_REGISTRY[t].label}
                    </button>
                  ))}
                </div>

                {/* Dynamic fields */}
                <div className={styles.fields}>
                  {PRIMITIVE_3D_REGISTRY[prim3DType].fields.map(fd => {
                    const val = prim3DParams[fd.key] ?? fd.default
                    const setVal = (n: number) => updateParam3D(fd.key, Math.max(fd.min, fd.isInt ? Math.round(n) : n))
                    return (
                      <label key={fd.key} className={styles.field}>
                        <span className={styles.fieldLabel} onMouseDown={makeLabelDrag(val, setVal, fd.step, fd.decimals)}>{fd.label}</span>
                        <NumberInput className={styles.input} value={val} step={fd.step} decimals={fd.decimals} onChange={setVal} />
                      </label>
                    )
                  })}
                  <div className={styles.hint}>{vertCount} verts · {triCount} tris</div>
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
                      onClick={() => { setCategory(cat); setShape2D(SHAPES_BY_CATEGORY[cat][0].type) }}
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
