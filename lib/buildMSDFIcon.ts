import fs from 'fs'
import path from 'path'
// @ts-expect-error - no types
import { buildSVGGlyph } from '../build/Release/msdf-native'
import Parser from 'fast-xml-parser'
import { stdout as log } from 'single-line-log'
import { parsePath } from './util/elementParser'
import DatabaseConstructor from 'better-sqlite3'

// import type { Database } from 'better-sqlite3'
import type { Color, Path, ParsedPath } from './util/elementParser'

interface SVG {
  g: SVG
  path: Path | Path[]
}

export interface IconOptions {
  /** path to the input folder */
  inputFolder: string
  /** path to the output folder */
  outPath: string
  /** name of the project */
  outName: string
  /** extent of the font; Recommend 8_192 */
  extent: number
  /** Size of the glyph image by height; Recommend 32 to start */
  size: number
  /** range of the buffer around the glyph; recommend 6 */
  range: number
}

export interface Icon {
  glyphID: number
  colorID: number
}

export type IconSet = Record<string, Icon[]>

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

// TODO: example_image

export default function buildIcons ({ inputFolder, outPath, outName, extent, size, range }: IconOptions): void {
  const { round, max } = Math
  // run through each svg, find all duplicates and build an group list.
  // for instance tesla->charger.svg =>
  // {
  //    "charger": [{ id: 0, colorID: 0, index: 0 }, { id: 1, index: 1 }, { id: 2, index: 2 }, { id: 3, index: 3 }],
  //    "service": [{ id: 4, index: 0 }, { id: 1, index: -1 }, { id: 2, index: -1 }, { id: 3, index: -1 }]
  // }
  // notice 1, 2 and 3 are reused but service had one different geometry that is matched to service
  // if index is -1 that means we don't need to build it because a previous svg has already built it
  if (fs.existsSync(`${outPath}/${outName}.icon`)) {
    throw Error(`FAILED, ${outPath}/${outName}.icon already exists.`)
  }

  // prepare DB
  console.log(`${outPath}/${outName}.icon`)
  const db = new DatabaseConstructor(`${outPath}/${outName}.icon`)
  db.pragma('journal_mode = WAL')
  db.exec(schema)

  /* PREP PHASE */

  const icons: IconSet = {}

  // prep variables for build
  const geometries = [] // { path: Array<number> } ID IS THE INDEX
  const colors = [] // { r: number, g: number, b: number, a: number } ID IS THE INDEX
  let glyphs = []
  let maxHeight = 0
  const svgs = fs.readdirSync(inputFolder).filter(f => f.includes('.svg'))
  const length = svgs.length
  let count = 1
  let pos = 512_000
  // build
  for (const svg of svgs) {
    // prep
    const name = svg.replace('.svg', '')
    log(`${name} [${count} / ${length}]`)
    count++
    const icon: Icon[] = icons[name] = []

    // check against geometries, if geometry does not exist, create
    // grab all paths
    const svgLocation = `${inputFolder}/${svg}`
    const svgPaths = getPaths(svgLocation)
    for (const { path, color } of svgPaths) {
      // prep path
      let glyphID = findIndex(path, geometries)
      if (glyphID === -1) {
        glyphID = geometries.length
        let { data, width, height, emSize, r, l, b, t } = buildSVGGlyph(svgLocation, size, range, glyphID, true)
        r = round(r / emSize * extent)
        l = round(l / emSize * extent)
        t = round(t / emSize * extent)
        b = round(b / emSize * extent)

        maxHeight = max(maxHeight, height)

        data = Buffer.from(data)

        const glyphMeta = Buffer.alloc(14)
        // write to buffer
        glyphMeta.writeUInt16LE(glyphID, 0)
        glyphMeta.writeUInt16LE(r - l, 2)
        glyphMeta.writeUInt16LE(t - b, 4)
        glyphMeta.writeUInt8(width, 6)
        glyphMeta.writeUInt8(height, 7)
        glyphMeta.writeUInt16LE(zigzag(l), 8)
        glyphMeta.writeUInt16LE(zigzag(extent - t), 10)
        glyphMeta.writeUInt16LE(zigzag(0), 12)
        const glyphBuffer = Buffer.concat([glyphMeta, data])
        // store
        // STORE GLYPH
        const writeGlyph = db.prepare('REPLACE INTO glyph (code, data) VALUES (@code, @data)')
        writeGlyph.run({ code: glyphID, data: glyphBuffer })

        geometries.push(path)
        glyphs.push({ id: glyphID, pos, length: glyphBuffer.length })
        pos += glyphBuffer.length
      }
      // prep color
      let colorID = findIndex(color, colors)
      if (colorID === -1) {
        colorID = colors.length
        colors.push(color)
      }

      icon.push({ glyphID, colorID })
    }
  }

  glyphs = glyphs.sort((a, b) => a.id - b.id)

  /** STORE PHASE **/

  // store glyph metadata
  const glyphCount = glyphs.length
  const glyphMap = Buffer.alloc(2 * glyphCount)
  let gPos = 0
  for (const glyph of glyphs) {
    glyphMap.writeUInt16LE(glyph.id, gPos)
    gPos += 2
  }

  // store iconMap
  // nameLength, mapLength, name, [glyphID, colorID]
  // [glyphCount (uint8), glyphID (uint16), colorID (uint16), glyphID (uint16), colorID (uint16), ...]
  const iconMapBufs = []
  for (const [name, iconMap] of Object.entries(icons)) { // { glyphID, colorID }
    const buf = Buffer.alloc(name.length + iconMap.length * 4 + 2)
    buf[0] = name.length
    buf[1] = iconMap.length
    // store name
    for (let i = 0; i < name.length; i++) buf.writeUInt8(name.charCodeAt(i), i + 2)
    // store positional data
    for (let i = 0; i < iconMap.length; i++) {
      const { glyphID, colorID } = iconMap[i]
      const pos = name.length + (i * 4) + 2
      buf.writeUInt16LE(glyphID, pos)
      buf.writeUInt16LE(colorID, pos + 2)
    }
    iconMapBufs.push(buf)
  }
  const iconMapBuf = Buffer.concat(iconMapBufs)

  // store colors
  // [r (uint8), g (uint8), b (uint8), a (uint8), ...]
  const colorList = Buffer.from(colors.flatMap(color => [color.r, color.g, color.b, color.a]))
  const colorLength = colorList.length
  const colorBuf = Buffer.alloc(colorLength)
  for (let i = 0; i < colorLength; i++) colorBuf.writeUInt8(colorList[i], i)

  // const glyphMetaBuf = Buffer.concat([glyphMap, iconMapBuf, colorBuf])

  // store the metadata
  const meta = Buffer.alloc(30)
  meta.writeUInt16LE(extent, 0)
  meta.writeUInt16LE(size, 2)
  meta.writeUInt16LE(maxHeight, 4)
  meta.writeUInt16LE(range, 6)
  meta.writeUInt16LE(0, 8) // defaultAdvance (unused for icons)
  meta.writeUInt16LE(glyphCount, 10)
  meta.writeUInt32LE(iconMapBuf.length, 12)
  meta.writeUInt16LE(colorLength / 4, 16) // number of colors, 4 bytes each

  const metadata = Buffer.concat([meta, glyphMap, iconMapBuf, colorBuf])

  // Store metadata in sqlite database
  const writeMetadata = db.prepare('REPLACE INTO metadata (name, data) VALUES (@name, @data)')
  writeMetadata.run({ name: 'metadata', data: metadata })
  console.log()
}

function findIndex (json: string | Color, arr: string[] | Color[]): number {
  const str = JSON.stringify(json)
  for (let i = 0; i < arr.length; i++) {
    const val = JSON.stringify(arr[i])
    if (str === val) return i
  }
  return -1
}

function getPaths (inputFile: string): ParsedPath[] {
  const data = fs.readFileSync(inputFile, 'utf8')
  const parsedSVG = Parser.parse(data, { parseAttributeValue: true, ignoreAttributes: false, attributeNamePrefix: '' })
  const { svg } = parsedSVG
  const res: Array<ParsedPath | undefined> = []

  parseFeatures(svg, res)

  return res.filter(f => f !== undefined) as ParsedPath[]
}

function parseFeatures (svg: SVG, res: Array<ParsedPath | undefined>): void {
  for (const key in svg) {
    if (key === 'path') {
      const svgPaths = svg[key]
      if (svgPaths !== undefined) { // multiple element objects
        if (Array.isArray(svgPaths)) {
          for (const element of svgPaths) res.push(parsePath(element))
        } else {
          res.push(parsePath(svgPaths))
        }
      }
    } else if (key === 'g') {
      parseFeatures(svg[key], res)
    }
  }
}

function zigzag (num: number): number {
  return (num << 1) ^ (num >> 31)
}
