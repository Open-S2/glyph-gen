import fs from 'fs'
import path from 'path'
import DatabaseConstructor from 'better-sqlite3'

import type { Database } from 'better-sqlite3'
import type { GlyphMap, SubstituteParsed } from '../process/index'

export interface SQLiteOptions {
  /** Type of storage */
  storeType: 'SQL'
  /** Path to the sqlite database */
  out: string
  /** If true, index the glyph using both the name and id; otherwise only store the id */
  multi?: boolean
}

export type IconMap = Record<string, Array<{ glyphID: number, colorID: number }>>
export type ColorMap = Array<[r: number, g: number, b: number, a: number]>

export interface ParsedGlyph {
  /** the id */
  code: string
  /** the unicode value (0 if substitute glyph) */
  unicode: number
  /** width of glyph */
  texW: number
  /** height of glyph */
  texH: number
  /** x offset for glyph */
  xOffset: number
  /** y offset for glyph */
  yOffset: number
  /** width of glyph */
  width: number
  /** height of glyph */
  height: number
  /** how far to move the cursor */
  advanceWidth: number
  /** glyph data */
  data: Buffer
}

export interface Metadata {
  /** the store extent of glyph data */
  extent: number
  /** the size of the glyphs */
  size: number
  /** the max height of the glyphs */
  maxHeight: number
  /** the range of the glyphs */
  range: number
  /** the default advance of the glyphs */
  defaultAdvance: number
  /** Glyph Set - only tracks unicodes though not substitution values */
  glyphSet: Set<number>
  /** Store icons { name: { glyphID, colorID }[] } */
  iconMap: IconMap
  /** Store colors name => [r, g, b, a] */
  colors: ColorMap
  /** Store substitutes */
  substitutes: SubstituteParsed[]
}

// 54_081 glyphs in noto sans regular
// 2 bytes per glyph explination (for glyph list)
// 54_081 * 2 = 108_162 bytes (108 kB)
// 14 kB for head metadata

// METADATA
// extent: 4 (writeUInt16LE)
// size: 6 (writeUInt16LE)
// maxHeight: 8 (writeUInt16LE)
// range: 10 (writeUInt16LE)
// defaultAdvance: 12 (writeUInt16LE)
// 14 glyphMapSize (writeUInt32LE)
// 18 image length (writeUInt32LE)
// 22 colors length (writeUInt32LE)
// 26 glyph-remap length (writeUInt32LE)
// 30 glyphs (glyphSize: 8 {unicode (2), position (4), length (2)})
// after glyphs, glyph remap (REMAP)

// REMAP

// SUBSTITUTE TYPE 4
// 0: substitute type (writeUInt8) [4]
// 1: glyph substitute (writeUInt16LE)
// 3: component count (writeUInt8)
// 4+: [repeating] component unicodes (writeUInt16LE)

const schema = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8')

export function storeGlyphsToSQL (
  name: string,
  map: GlyphMap,
  options: SQLiteOptions,
  consoleLog = false
): void {
  const { out, multi } = options
  const serializeName = multi !== false ? name : undefined

  const db = new DatabaseConstructor(out)
  db.pragma('journal_mode = WAL')
  db.exec(schema)

  for (const glyph of map.glyphs) {
    if (glyph.dead) continue
    const { id, glyphBuffer } = glyph
    serializeGlyph(db, id, glyphBuffer, serializeName)
  }
  serializeMetadata(db, map, multi !== false)
  db.close()
}

export function serializeSVGs (name: string, font: GlyphMap, options: SQLiteOptions): void {
  const { out, multi } = options
  const serializeName = multi !== false ? name : undefined

  const db = new DatabaseConstructor(out)
  db.pragma('journal_mode = WAL')
  db.exec(schema)

  for (const glyph of font.glyphs) {
    if (glyph.dead) continue
    const { id, glyphBuffer } = glyph
    serializeGlyph(db, id, glyphBuffer, serializeName)
  }
  serializeMetadata(db, font, multi !== false)
  db.close()
}

export function serializeGlyph (db: Database, code: string, dataBuffer: Buffer, name?: string): void {
  const data = bufferToBase64(dataBuffer)
  //  Write to SQL ask key->unicode and value->glyphBuffer and if multi name->name
  if (name !== undefined) { // this means we want to store to glyph_multi
    const writeGlyph = db.prepare<{ name: string, code: string, data: string }>('REPLACE INTO glyph_multi (name, code, data) VALUES (@name, @code, @data)')
    writeGlyph.run({ name, code, data })
  } else {
    const writeGlyph = db.prepare<{ code: string, data: string }>('REPLACE INTO glyph (code, data) VALUES (@code, @data)')
    writeGlyph.run({ code, data })
  }
}

export function getGlyph (db: Database, code: string, name?: string): undefined | Buffer {
  let base64: string | undefined
  if (name !== undefined) { // this means we want to store to glyph_multi
    const getGlyph = db.prepare<{ code: string, name: string }>('SELECT data FROM glyph_multi WHERE name = @name AND code = @code')
    const res = getGlyph.get({ code, name }) as { data: string | undefined } | undefined
    base64 = res?.data
  } else {
    const getGlyph = db.prepare('SELECT data FROM glyph WHERE code = @code')
    const res = getGlyph.get({ code }) as { data: string | undefined } | undefined
    base64 = res?.data
  }
  if (base64 === undefined) return undefined
  const buffer = base64ToBuffer(base64)
  return buffer
}

// FONT METADATA:
// Buffer [metadata, glyphs]
// metadata: size, maxHeight (largest height value), range, scale, name,
// extent, glyphs
export function serializeMetadata (db: Database, map: GlyphMap, multi: boolean): void {
  const { name, extent, size, maxHeight, range, glyphs, defaultAdvance } = map

  // build the glyph map
  const aliveGlyphs = glyphs.filter(g => !g.dead && g.type === 'unicode')
  const glyphCount = aliveGlyphs.length
  const glyphMap = Buffer.alloc(2 * glyphCount)
  let pos = 0
  for (const glyph of aliveGlyphs) {
    if (!('unicode' in glyph)) continue
    glyphMap.writeUInt16LE(glyph.unicode, pos)
    pos += 2
  }

  // build the substitute metadata buffer
  // 0: substitute type (writeUInt8) [4]
  // 1: component count (writeUInt8)
  // 2+: [repeating] component unicodes (writeUInt16LE)
  let subsBuf = Buffer.alloc(0)
  if ('substitutes' in map) {
    for (const { code } of map.substitutes) {
      const [type, count, ...codes] = code
      // the first two numbers are 8bits, the rest are 16bits
      const length = (code.length - 2) * 2 + 2
      const buf = Buffer.alloc(length)
      buf.writeUInt8(type, 0)
      buf.writeUInt8(count, 1)
      for (let i = 0; i < codes.length; i++) {
        buf.writeUInt16LE(codes[i], i * 2 + 2)
      }
      subsBuf = Buffer.concat([subsBuf, buf])
    }
  }

  // store iconMap
  // nameLength, mapLength, name, [glyphID, colorID]
  // [glyphCount (uint8), glyphID (uint16), colorID (uint16), glyphID (uint16), colorID (uint16), ...]
  const iconMapBufs = []
  if ('paths' in map) {
    for (const [name, iconMap] of map.paths) { // { glyphID, colorID }
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
  }
  const iconMapBuf = Buffer.concat(iconMapBufs)

  // store colors
  // [r (uint8), g (uint8), b (uint8), a (uint8), ...]
  let colorLength = 0
  let colorBuf = Buffer.alloc(0)
  if ('colors' in map) {
    const colorList = Buffer.from(map.colors.flatMap(color => [color.r, color.g, color.b, color.a]))
    colorLength = colorList.length
    colorBuf = Buffer.alloc(colorLength)
    for (let i = 0; i < colorLength; i++) colorBuf.writeUInt8(colorList[i], i)
  }

  // build the metadata
  const meta = Buffer.alloc(30)
  meta.writeUInt16LE(extent, 0)
  meta.writeUInt16LE(size, 2)
  meta.writeUInt16LE(maxHeight, 4)
  meta.writeUInt16LE(range, 6)
  meta.writeUInt16LE(defaultAdvance, 8)
  meta.writeUInt16LE(glyphCount, 10)
  meta.writeUInt32LE(iconMapBuf.length, 12) // iconMapCount (unused in fonts)
  meta.writeUInt16LE(colorLength / 4, 16) // colorCount (unused in fonts)
  meta.writeUint32LE(subsBuf.length, 18) // substituteCount
  const metaBuffer = Buffer.concat([meta, glyphMap, iconMapBuf, colorBuf, subsBuf])
  const data = bufferToBase64(metaBuffer)

  // Store metadata in sqlite database
  const writeMetadata = db.prepare('REPLACE INTO metadata (name, data) VALUES (@name, @data)')
  writeMetadata.run({ name: multi ? name : 'metadata', data })
}

export function getMetadata (db: Database, name = 'metadata'): undefined | Metadata {
  const getMetadata = db.prepare('SELECT data FROM metadata WHERE name = @name')
  const res = getMetadata.get({ name }) as { data: string | undefined } | undefined
  const data = res?.data
  if (data === undefined) return undefined
  const buffer = base64ToBuffer(data)
  return parseMetadata(buffer)
}

export function parseGlyphs (db: Database, name?: string): ParsedGlyph[] {
  const glyphs: ParsedGlyph[] = []
  const glyphBuffers = (
    name === undefined
      ? db.prepare('SELECT data AND code FROM glyph').all()
      : db.prepare<{ name: string }>('SELECT data AND code FROM glyph_multi WHERE name = @name').all({ name })
  ) as unknown as Array<{ data: Buffer, code: string } | undefined>
  if (glyphBuffers === undefined) throw new Error('Glyphs not found')
  for (const gBuffer of glyphBuffers) {
    if (gBuffer === undefined) continue
    const { data, code } = gBuffer
    const glyph = parseGlyphBuffer(code, data)
    glyphs.push(glyph)
  }
  return glyphs
}

export function parseGlyph (db: Database, code: string, name?: string): ParsedGlyph {
  const glyphBuffer = getGlyph(db, code, name)
  if (glyphBuffer === undefined) throw new Error(`Glyph ${code} not found`)
  const glyph = parseGlyphBuffer(code, glyphBuffer)
  return glyph
}

export function parseGlyphBuffer (code: string, data: Buffer): ParsedGlyph {
  // convert Buffer to ArrayBuffer
  const inputBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  const dv = new DataView(inputBuffer)
  const unicode = dv.getUint16(0, true)
  const width = dv.getUint16(2, true)
  const height = dv.getUint16(4, true)
  const texWidth = dv.getUint8(6)
  const texHeight = dv.getUint8(7)
  const xOffset = dv.getUint16(8, true)
  const yOffset = dv.getUint16(10, true)
  const advanceWidth = dv.getUint16(12, true)
  const glyphBuffer = Buffer.from(data.subarray(14))
  return {
    code,
    unicode,
    texW: texWidth,
    texH: texHeight,
    xOffset,
    yOffset,
    width,
    height,
    advanceWidth,
    data: glyphBuffer
  }
}

export function parseMetadata (data: Buffer): Metadata {
  const inputBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  const meta = new DataView(inputBuffer)
  // build the metadata
  const extent = meta.getUint16(0, true)
  const size = meta.getUint16(2, true)
  const maxHeight = meta.getUint16(4, true)
  const range = meta.getUint16(6, true)
  const defaultAdvance = meta.getUint16(8, true) / extent
  const glyphCount = meta.getUint16(10, true)
  const iconMapSize = meta.getUint32(12, true)
  const colorBufSize = meta.getUint16(16, true) * 4
  const substituteSize = meta.getUint16(18, true)

  // store glyphSet
  const glyphSet = new Set<number>()
  const glyphEnd = 30 + (glyphCount * 2)
  const gmdv = new DataView(inputBuffer, 30, glyphCount * 2)
  for (let i = 0; i < glyphCount; i++) {
    glyphSet.add(gmdv.getUint16(i * 2, true))
  }
  const metadata: Metadata = {
    extent,
    size,
    maxHeight,
    range,
    defaultAdvance,
    glyphSet,
    iconMap: {},
    colors: [],
    substitutes: []
  }
  // build icon metadata
  metadata.iconMap = buildIconMap(iconMapSize, new DataView(inputBuffer, glyphEnd, iconMapSize))
  metadata.colors = buildColorMap(colorBufSize, new DataView(inputBuffer, glyphEnd + iconMapSize, colorBufSize))
  metadata.substitutes = buildSubstitutes(substituteSize, new DataView(inputBuffer, glyphEnd + iconMapSize + colorBufSize))

  return metadata
}

function buildIconMap (iconMapSize: number, dv: DataView): IconMap {
  const iconMap: IconMap = {}
  let pos = 0
  while (pos < iconMapSize) {
    const nameLength = dv.getUint8(pos)
    const mapLength = dv.getUint8(pos + 1)
    pos += 2
    const id = []
    for (let i = 0; i < nameLength; i++) id.push(dv.getUint8(pos + i))
    const name = id.map(n => String.fromCharCode(n)).join('')
    pos += nameLength
    const map = []
    for (let i = 0; i < mapLength; i++) {
      map.push({ glyphID: dv.getUint16(pos, true), colorID: dv.getUint16(pos + 2, true) })
      pos += 4
    }
    iconMap[name] = map
  }

  return iconMap
}

function buildColorMap (colorSize: number, dv: DataView): ColorMap {
  const colors: ColorMap = []
  for (let i = 0; i < colorSize; i += 4) {
    colors.push([dv.getUint8(i), dv.getUint8(i + 1), dv.getUint8(i + 2), dv.getUint8(i + 3)])
  }

  return colors
}

function buildSubstitutes (substituteSize: number, dv: DataView): SubstituteParsed[] {
  const substitutes: SubstituteParsed[] = []

  let pos = 0
  while (pos < substituteSize) {
    const type = dv.getUint8(pos)
    if (type === 4) {
      // LIGATURE TYPE
      const count = dv.getUint8(pos + 1)
      const components = []
      for (let j = 0; j < count; j++) {
        components.push(dv.getUint16(pos + 2 + j * 2, true))
      }
      substitutes.push({
        type,
        substitute: components.join('.'),
        components
      })
      pos += 2 + count * 2
    } else {
      throw new Error(`Unknown substitute type: ${type}`)
    }
  }

  return substitutes
}

// create a function that converts a Uint8Array to a base64 string
function bufferToBase64 (buffer: Buffer): string {
  return buffer.toString('base64')
}

function base64ToBuffer (base64: string): Buffer {
  return Buffer.from(base64, 'base64')
}
