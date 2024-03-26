import { test, expect } from 'vitest'
import { processSVG } from '../../dist'

test('test processing an SVG', (): void => {
  const data = processSVG('streets', {
    svgFolder: './test/features/svgs/streets-mini',
    extent: 8192,
    range: 6,
    size: 32
  })
  expect(data.colors).toEqual([
    { r: 19, g: 156, b: 241, a: 255 },
    { r: 255, g: 255, b: 255, a: 255 },
    { r: 94, g: 151, b: 236, a: 255 },
    { r: 83, g: 179, b: 196, a: 255 },
    { r: 86, g: 187, b: 249, a: 255 },
    { r: 104, g: 176, b: 83, a: 255 }
  ])
  const svgGlyphs = data.glyphs.filter(d => d.type === 'svg')
  expect(svgGlyphs[0]).toEqual({
    id: '1',
    file: './test/features/svgs/streets-mini/airfield.svg',
    dead: false,
    bbox: { x1: 0, x2: 0, y1: 0, y2: 0 },
    advanceWidth: 0,
    leftSideBearing: 0,
    width: -1,
    height: -1,
    texWidth: -1,
    texHeight: -1,
    xOffset: -1,
    yOffset: -1,
    length: -1,
    imageBuffer: Buffer.alloc(0),
    glyphBuffer: Buffer.alloc(0),
    type: 'svg',
    code: 1,
    path: 'M20.268,7.345c-1.512-4.527-6.069-7.454-10.824-6.962C5.448,0.804,2,3.558,0.736,7.345c-0.918,2.76-0.627,6.087,0.745,8.489c0.659,1.137,1.483,2.061,3.285,3.662c0.677,0.605,1.516,1.381,1.864,1.719c1.773,1.73,2.747,3.225,3.501,5.359c0.214,0.592,0.247,0.646,0.37,0.646c0.118,0,0.157-0.047,0.246-0.309c0.442-1.293,0.901-2.256,1.512-3.199c0.79-1.205,1.662-2.137,3.757-4.01c1.904-1.711,2.59-2.431,3.256-3.461C20.85,13.809,21.238,10.273,20.268,7.345z',
    pathIndex: 0
  })
  expect(svgGlyphs[1]).toEqual({
    id: '2',
    file: './test/features/svgs/streets-mini/airfield.svg',
    dead: false,
    bbox: { x1: 0, x2: 0, y1: 0, y2: 0 },
    advanceWidth: 0,
    leftSideBearing: 0,
    width: -1,
    height: -1,
    texWidth: -1,
    texHeight: -1,
    xOffset: -1,
    yOffset: -1,
    length: -1,
    imageBuffer: Buffer.alloc(0),
    glyphBuffer: Buffer.alloc(0),
    type: 'svg',
    code: 2,
    path: 'M9.971,5.528H8.379c-0.53,0-0.53-0.53,0-0.53h4.242c0.529,0,0.529,0.53,0,0.53h-1.59c0,0,0.636,0.459,0.636,1.52v1.061h4.665v1.555l-4.665,1.555l-0.39,3.888l1.945,1.025v0.529H7.78v-0.529l1.943-1.025l-0.389-3.888L4.669,9.663V8.108h4.665V7.047C9.334,5.987,9.971,5.528,9.971,5.528z',
    pathIndex: 1
  })

  const airfieldPath = data.paths.get('airfield')
  expect(airfieldPath).toEqual([{ glyphID: 1, colorID: 0 }, { glyphID: 2, colorID: 1 }])

  const zoo = data.paths.get('zoo')
  expect(zoo).toEqual([
    { glyphID: 1, colorID: 5 },
    { glyphID: 11, colorID: 1 },
    { glyphID: 12, colorID: 1 },
    { glyphID: 13, colorID: 1 },
    { glyphID: 14, colorID: 1 },
    { glyphID: 15, colorID: 1 }
  ])
})
