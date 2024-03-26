import fs from 'fs'
import { getSVGData } from '../util/elementParser'
import { stdout as log } from 'single-line-log'

import type { Glyph, PathID, SVGGlyph, SVGGlyphMap } from './'
import type { Color } from '../util/elementParser'

export interface SVGOptions {
  /** path to the font files; Glyphs will be stored in order of the font order provided */
  svgFolder: string
  /** extent of the font; Recommend 8_192 */
  extent?: number
  /** Size of the glyph image by height; Recommend 32 to start */
  size?: number
  /** range of the buffer around the glyph; recommend 6 */
  range?: number
}

export function processSVG (
  name: string,
  {
    svgFolder,
    extent = 8_192,
    size = 32,
    range = 6
  }: SVGOptions,
  consoleLog = false
): SVGGlyphMap {
  // create an msdf object
  const fontGlyphMap: SVGGlyphMap = {
    type: 'svg',
    name,
    glyphSet: new Set<string>(),
    glyphs: [],
    defaultAdvance: 0,
    extent,
    range,
    size,
    maxHeight: 0,
    colors: [],
    paths: new Map<string, PathID[]>()
  }

  parseSVGs(svgFolder, fontGlyphMap, consoleLog)

  return fontGlyphMap
}

/** Grab all the svgs and group them by colors and glyphs */
function parseSVGs (path: string, svgGlyphMap: SVGGlyphMap, consoleLog: boolean): void {
  if (consoleLog) log(`parsing ${path}`)
  const svgs = fs.readdirSync(path).filter(f => f.includes('.svg'))
  if (svgs.length === 0) throw new Error(`Loading svgs from ${path} has failed`)

  const length = svgs.length
  let count = 1

  // build svg paths
  for (const svg of svgs) {
    const name = svg.replace('.svg', '')
    const pathName = `${path}/${svg}`
    if (consoleLog) log(`${name} [${count} / ${length}]`)
    const pathData = getSVGData(pathName)
    // prep a path ID array
    const pathIDs: PathID[] = []
    // store each path
    for (const { index, path, color } of pathData) {
      // if color doesn't exist, add it
      let colorID = findColorIndex(color, svgGlyphMap.colors)
      if (colorID === -1) {
        colorID = svgGlyphMap.colors.length
        svgGlyphMap.colors.push(color)
      }
      // if glyphs doesn't have the path, add it
      let glyphID: number = findGlyphCode(path, svgGlyphMap.glyphs)
      if (glyphID === -1) {
        const len: number = svgGlyphMap.glyphs.length
        glyphID = len + 1
        svgGlyphMap.glyphs.push(buildGlyph(pathName, glyphID, path, index))
      }
      // store the path ID
      pathIDs.push({ glyphID, colorID })
    }
    // store the paths
    svgGlyphMap.paths.set(name, pathIDs)

    count++
  }
}

function buildGlyph (file: string, code: number, path: string, pathIndex: number): SVGGlyph {
  return {
    type: 'svg',
    code,
    file,
    id: String(code),
    path,
    pathIndex,
    // used by Fonts:
    bbox: { x1: 0, x2: 0, y1: 0, y2: 0 },
    dead: false,
    advanceWidth: 0,
    leftSideBearing: 0,
    // these are filled in later if using SDF
    width: -1,
    height: -1,
    texWidth: -1,
    texHeight: -1,
    xOffset: -1,
    yOffset: -1,
    length: -1,
    // Stored later regardless of store type
    imageBuffer: Buffer.alloc(0),
    glyphBuffer: Buffer.alloc(0)
  }
}

function findColorIndex (json: Color, arr: Color[]): number {
  const str = JSON.stringify(json)
  for (let i = 0; i < arr.length; i++) {
    const val = JSON.stringify(arr[i])
    if (str === val) return i
  }
  return -1
}

function findGlyphCode (path: string, glyphs: Glyph[]): number {
  for (const glyph of glyphs) {
    if (glyph.type !== 'svg') continue
    if (path === glyph.path) return glyph.code
  }
  return -1
}
