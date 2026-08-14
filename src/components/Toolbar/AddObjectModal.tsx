import { useState } from 'react'
import { useSceneStore } from '../../state/sceneStore'
import { NumberInput } from '../Inspector/NumberInput'
import type { Shape2DType } from '../../geometry/primitives'
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
    { type: 'triangle',    label: 'Triangle' },
    { type: 'equilateral', label: 'Equilateral' },
    { type: 'isosceles',   label: 'Isosceles' },
    { type: 'scalene',     label: 'Scalene' },
    { type: 'elongated',   label: 'Elongated' },
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
  const [coneR, setConeR] = useState(0.5)
  const [coneH, setConeH] = useState(1)
  const [coneRS, setConeRS] = useState(16)
  const [torR, setTorR] = useState(0.5)
  const [torT, setTorT] = useState(0.2)
  const [torRS, setTorRS] = useState(12)
  const [torTS, setTorTS] = useState(32)
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
  // crescent
  const [cresOuterR, setCresOuterR] = useState(0.5)
  const [cresInnerR, setCresInnerR] = useState(0.42)
  const [cresOffset, setCresOffset] = useState(0.15)
  // spiral
  const [spiralInner, setSpiralInner] = useState(0.05)
  const [spiralOuter, setSpiralOuter] = useState(0.5)
  const [spiralTurns, setSpiralTurns] = useState(3)
  const [spiralWidth, setSpiralWidth] = useState(0.04)
  // triangle variants
  const [triBase, setTriBase] = useState(1)
  const [triHeight, setTriHeight] = useState(1)
  const [triSide, setTriSide] = useState(1)
  const [scaleOffset, setScaleOffset] = useState(0.3)
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

  const addPlane    = useSceneStore(s => s.addPlane)
  const addCube     = useSceneStore(s => s.addCube)
  const addSphere   = useSceneStore(s => s.addSphere)
  const addCylinder = useSceneStore(s => s.addCylinder)
  const addCone     = useSceneStore(s => s.addCone)
  const addTorus    = useSceneStore(s => s.addTorus)
  const addCapsule  = useSceneStore(s => s.addCapsule)
  const addShape2D  = useSceneStore(s => s.addShape2D)

  const get2DParams = (): Record<string, number> => {
    switch (shape2D) {
      case 'circle':      return { radius, segments }
      case 'ellipse':     return { radiusX, radiusZ, segments }
      case 'oval':        return { width: ovalW, height: ovalH, segments }
      case 'semicircle':  return { radius, segments }
      case 'arc':         return { innerRadius, outerRadius, startAngle, endAngle, segments }
      case 'ring':        return { innerRadius, outerRadius, segments }
      case 'sector':      return { radius, startAngle, endAngle, segments }
      case 'segment':     return { radius, startAngle, endAngle: endAngle, segments }
      case 'crown':       return { innerRadius, outerRadius, segments }
      case 'crescent':    return { outerRadius: cresOuterR, innerRadius: cresInnerR, offset: cresOffset, segments }
      case 'spiral':      return { innerRadius: spiralInner, outerRadius: spiralOuter, turns: spiralTurns, width: spiralWidth, segments }
      case 'triangle':    return { base: triBase, height: triHeight }
      case 'equilateral': return { side: triSide }
      case 'isosceles':   return { base: triBase, height: triHeight }
      case 'scalene':     return { base: triBase, height: triHeight, offset: scaleOffset }
      case 'elongated':   return { base: triBase, height: triHeight }
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
      case 'zigzag':      return { width: zzW, height: zzH, zigzags: zzSegs, thickness: zzT }
    }
  }

  const handleAdd = () => {
    if (tab === '3d') {
      if      (type === 'plane')    addPlane({ width: planeW, height: planeH, subdivisionsX: planeSX, subdivisionsY: planeSY })
      else if (type === 'cube')     addCube({ width: cubeW, height: cubeH, depth: cubeD })
      else if (type === 'sphere')   addSphere({ radius: sphereR, widthSegments: sphereWS, heightSegments: sphereHS })
      else if (type === 'cylinder') addCylinder({ radiusTop: cylRT, radiusBottom: cylRB, height: cylH, radialSegments: cylRS, heightSegments: cylHS })
      else if (type === 'cone')     addCone({ radius: coneR, height: coneH, radialSegments: coneRS })
      else if (type === 'torus')    addTorus({ radius: torR, tube: torT, radialSegments: torRS, tubularSegments: torTS })
      else                          addCapsule({ radius: capR, height: capH, radialSegments: capRS, hemisphereSegments: capHS })
    } else {
      addShape2D(shape2D, get2DParams())
    }
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

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>
        <div className={styles.title}>Add Object</div>

        {/* Main tabs */}
        <div className={styles.tabRow}>
          <button className={`${styles.tabBtn} ${tab === '3d' ? styles.tabBtnActive : ''}`} onClick={() => setTab('3d')}>3D Primitives</button>
          <button className={`${styles.tabBtn} ${tab === '2d' ? styles.tabBtnActive : ''}`} onClick={() => setTab('2d')}>2D Shapes</button>
        </div>

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
                  <div className={styles.hint}>{(planeSX + 1) * (planeSY + 1)} vertices · {planeSX * planeSY * 2} triangles</div>
                </>
              )}
              {type === 'cube' && (
                <>
                  {field('Width', cubeW, setCubeW)}
                  {field('Height', cubeH, setCubeH)}
                  {field('Depth', cubeD, setCubeD)}
                  <div className={styles.hint}>24 vertices · 12 triangles</div>
                </>
              )}
              {type === 'sphere' && (
                <>
                  {field('Radius', sphereR, setSphereR)}
                  {intField('Width Segments', sphereWS, setSphereWS, 3)}
                  {intField('Height Segments', sphereHS, setSphereHS, 2)}
                  <div className={styles.hint}>{(sphereWS + 1) * (sphereHS + 1)} vertices</div>
                </>
              )}
              {type === 'cylinder' && (
                <>
                  {field('Radius Top', cylRT, setCylRT, 0.1, 3, 0)}
                  {field('Radius Bottom', cylRB, setCylRB, 0.1, 3, 0.001)}
                  {field('Height', cylH, setCylH)}
                  {intField('Radial Segments', cylRS, setCylRS, 3)}
                  {intField('Height Segments', cylHS, setCylHS)}
                </>
              )}
              {type === 'cone' && (
                <>
                  {field('Radius', coneR, setConeR)}
                  {field('Height', coneH, setConeH)}
                  {intField('Radial Segments', coneRS, setConeRS, 3)}
                </>
              )}
              {type === 'torus' && (
                <>
                  {field('Radius', torR, setTorR)}
                  {field('Tube', torT, setTorT)}
                  {intField('Radial Segments', torRS, setTorRS, 3)}
                  {intField('Tubular Segments', torTS, setTorTS, 3)}
                  <div className={styles.hint}>{(torRS + 1) * (torTS + 1)} vertices · {torRS * torTS * 2} triangles</div>
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
            {/* Category filter */}
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

            {/* Shape grid */}
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

            {/* Params for selected 2D shape */}
            <div className={styles.fields}>
              {/* circle */}
              {shape2D === 'circle' && (<>{field('Radius', radius, setRadius)}{intField('Segments', segments, setSegments, 3)}</>)}
              {/* ellipse */}
              {shape2D === 'ellipse' && (<>{field('Radius X', radiusX, setRadiusX)}{field('Radius Z', radiusZ, setRadiusZ)}{intField('Segments', segments, setSegments, 3)}</>)}
              {/* oval */}
              {shape2D === 'oval' && (<>{field('Width', ovalW, setOvalW)}{field('Height', ovalH, setOvalH)}{intField('Segments', segments, setSegments, 4)}</>)}
              {/* semicircle */}
              {shape2D === 'semicircle' && (<>{field('Radius', radius, setRadius)}{intField('Segments', segments, setSegments, 3)}</>)}
              {/* arc */}
              {shape2D === 'arc' && (<>{field('Inner Radius', innerRadius, setInnerRadius)}{field('Outer Radius', outerRadius, setOuterRadius)}{angleField('Start Angle°', startAngle, setStartAngle)}{angleField('End Angle°', endAngle, setEndAngle)}{intField('Segments', segments, setSegments, 2)}</>)}
              {/* ring / crown */}
              {(shape2D === 'ring' || shape2D === 'crown') && (<>{field('Inner Radius', innerRadius, setInnerRadius)}{field('Outer Radius', outerRadius, setOuterRadius)}{intField('Segments', segments, setSegments, 3)}</>)}
              {/* sector */}
              {shape2D === 'sector' && (<>{field('Radius', radius, setRadius)}{angleField('Start Angle°', startAngle, setStartAngle)}{angleField('End Angle°', endAngle, setEndAngle)}{intField('Segments', segments, setSegments, 2)}</>)}
              {/* segment */}
              {shape2D === 'segment' && (<>{field('Radius', radius, setRadius)}{angleField('Start Angle°', startAngle, setStartAngle)}{angleField('End Angle°', endAngle, setEndAngle)}{intField('Segments', segments, setSegments, 2)}</>)}
              {/* crescent */}
              {shape2D === 'crescent' && (<>{field('Outer Radius', cresOuterR, setCresOuterR)}{field('Inner Radius', cresInnerR, setCresInnerR)}{field('Offset', cresOffset, setCresOffset)}{intField('Segments', segments, setSegments, 8)}</>)}
              {/* spiral */}
              {shape2D === 'spiral' && (<>{field('Inner Radius', spiralInner, setSpiralInner)}{field('Outer Radius', spiralOuter, setSpiralOuter)}{field('Turns', spiralTurns, setSpiralTurns, 0.5, 1, 0.5)}{field('Width', spiralWidth, setSpiralWidth)}{intField('Segments', segments, setSegments, 4)}</>)}
              {/* triangles */}
              {(shape2D === 'triangle' || shape2D === 'isosceles' || shape2D === 'elongated') && (<>{field('Base', triBase, setTriBase)}{field('Height', triHeight, setTriHeight)}</>)}
              {shape2D === 'equilateral' && (<>{field('Side', triSide, setTriSide)}</>)}
              {shape2D === 'scalene' && (<>{field('Base', triBase, setTriBase)}{field('Height', triHeight, setTriHeight)}{field('Offset', scaleOffset, setScaleOffset, 0.1)}</>)}
              {/* quads */}
              {(shape2D === 'rectangle' || shape2D === 'rhomboid' || shape2D === 'parallelogram') && (<>{field('Width', rectW, setRectW)}{field('Height', rectH, setRectH)}{shape2D !== 'rectangle' && field('Skew', skew, setSkew, 0.1)}</>)}
              {shape2D === 'square' && (<>{field('Size', squareSize, setSquareSize)}</>)}
              {shape2D === 'rhombus' && (<>{field('Diagonal H', rhDiagH, setRhDiagH)}{field('Diagonal V', rhDiagV, setRhDiagV)}</>)}
              {shape2D === 'trapezoid' && (<>{field('Top Width', trapTop, setTrapTop)}{field('Bottom Width', trapBot, setTrapBot)}{field('Height', trapH, setTrapH)}</>)}
              {shape2D === 'kite' && (<>{field('Width', kiteW, setKiteW)}{field('Top Height', kiteTop, setKiteTop)}{field('Bottom Height', kiteBot, setKiteBot)}</>)}
              {/* regular */}
              {(shape2D === 'pentagon' || shape2D === 'hexagon' || shape2D === 'heptagon' || shape2D === 'octagon') && (<>{field('Radius', polyRadius, setPolyRadius)}</>)}
              {shape2D === 'irregular' && (<>{field('Radius', polyRadius, setPolyRadius)}{intField('Sides', polySides, setPolySides, 3)}{field('Irregularity', irregularity, setIrregularity, 0.05, 2, 0)}</>)}
              {/* decorative */}
              {shape2D === 'star' && (<>{field('Outer Radius', starOuter, setStarOuter)}{field('Inner Radius', starInner, setStarInner)}{intField('Points', starPoints, setStarPoints, 3)}</>)}
              {shape2D === 'arrow' && (<>{field('Length', arrowLen, setArrowLen)}{field('Head Width', arrowHW, setArrowHW)}{field('Head Length', arrowHL, setArrowHL)}{field('Shaft Width', arrowSW, setArrowSW)}</>)}
              {shape2D === 'wedge' && (<>{field('Width', wedgeW, setWedgeW)}{field('Depth', wedgeD, setWedgeD)}{field('Thickness', wedgeT, setWedgeT)}</>)}
              {shape2D === 'ribbon' && (<>{field('Width', ribW, setRibW)}{field('Height', ribH, setRibH)}{field('Thickness', ribT, setRibT)}</>)}
              {/* lines */}
              {shape2D === 'straight' && (<>{field('Length', lineLen, setLineLen)}{field('Width', lineW, setLineW)}</>)}
              {shape2D === 'curved' && (<>{field('Length', lineLen, setLineLen)}{field('Curvature', curvature, setCurvature, 0.05)}{field('Width', lineW, setLineW)}</>)}
              {shape2D === 'broken' && (<>{field('Length 1', brokenL1, setBrokenL1)}{field('Length 2', brokenL2, setBrokenL2)}{angleField('Angle°', brokenAngle, setBrokenAngle)}{field('Width', lineW, setLineW)}</>)}
              {shape2D === 'zigzag' && (<>{field('Width', zzW, setZzW)}{field('Height', zzH, setZzH)}{intField('Zigzags', zzSegs, setZzSegs, 1)}{field('Thickness', zzT, setZzT)}</>)}
            </div>
          </>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.addBtn} onClick={handleAdd}>Add</button>
        </div>
      </div>
    </div>
  )
}
