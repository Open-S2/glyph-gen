import { stdout as log } from 'single-line-log'
import { buildFontGlyph, buildSVGGlyph } from '../binding'
import { zigzag } from '../util/zigzag'

import type { GlyphMap } from '../process/index'

export type SDF_TYPES = 'sdf' | 'psdf' | 'msdf' | 'mtsdf'

export interface SDFOptions {
  /** type of SDF to convert to. Default is 'mtsdf' */
  convertType?: SDF_TYPES
}

export function convertGlyphsToSDF (
  glyphMap: GlyphMap,
  options: SDFOptions,
  consoleLog = false
): void {
  const { glyphs } = glyphMap
  const notDeadGlyphs = glyphs.filter((glyph) => !glyph.dead)
  const { length } = notDeadGlyphs
  const convertType = options.convertType ?? 'mtsdf'
  let count = 0
  console.info('\nConverting glyphs to SDF...\n')
  for (const glyph of notDeadGlyphs) {
    if (consoleLog) log(`${++count} / ${length}`)
    // prep variables
    const { round } = Math
    const { extent, size, range } = glyphMap
    const { dead, type, file } = glyph
    if (dead) continue
    if (type === 'image') continue
    let buffer = Buffer.alloc(0)
    // STEP 1) BUILD AND CREATE METADATA
    // create the sdf, psdf, msdf or mtsdf
    let { data, width, height, r, l, t, b, emSize } = (type === 'svg')
      ? buildSVGGlyph(file, size, range, glyph.pathIndex + 1, convertType)
      : buildFontGlyph(
        file,
        type === 'unicode' ? glyph.unicode : glyph.code,
        size,
        range,
        convertType,
        type === 'substitution'
      )
    r = round(r / emSize * extent)
    l = round(l / emSize * extent)
    t = round(t / emSize * extent)
    b = round(b / emSize * extent)
    if (data !== undefined) {
    // update height
      glyphMap.maxHeight = Math.max(height, glyphMap.maxHeight)
      // bufferize
      buffer = Buffer.from(data)
      // update glyph information
      glyph.width = r - l // size * ceil(width / extent) = texture-width
      glyph.height = t - b // size * ceil(height / extent) = texture-height
      glyph.texWidth = width
      glyph.texHeight = height
      glyph.xOffset = l
      glyph.yOffset = b
    } else { glyph.dead = true; continue }
    // kill glyph if certain values are out of bounds
    if (glyph.width < 1 || glyph.width > 65535) { glyph.dead = true; continue }
    if (glyph.height < 1 || glyph.height > 65535) { glyph.dead = true; continue }
    if (glyph.texWidth < 1 || glyph.texWidth > 255) { glyph.dead = true; continue }
    if (glyph.texHeight < 1 || glyph.texHeight > 255) { glyph.dead = true; continue }
    // other kill conditions
    const glyphXOffset = zigzag(glyph.xOffset)
    const glyphYOffset = zigzag(glyph.yOffset)
    const glyphAdvanceWidth = zigzag(glyph.advanceWidth)
    if (glyphXOffset < 0 || glyphXOffset > 65535) { glyph.dead = true; continue }
    if (glyphYOffset < 0 || glyphYOffset > 65535) { glyph.dead = true; continue }
    if (glyphAdvanceWidth < 0 || glyphAdvanceWidth > 65535) { glyph.dead = true; continue }

    // STEP 2: STORE METADATA AND IMAGE DATA
    const meta = Buffer.alloc(14)
    meta.writeUInt16LE('unicode' in glyph ? glyph.unicode : 0, 0)
    meta.writeUInt16LE(glyph.width, 2)
    meta.writeUInt16LE(glyph.height, 4)
    meta.writeUInt8(glyph.texWidth, 6)
    meta.writeUInt8(glyph.texHeight, 7)
    meta.writeUInt16LE(glyphXOffset, 8)
    meta.writeUInt16LE(glyphYOffset, 10)
    meta.writeUInt16LE(glyphAdvanceWidth, 12)

    // bundle
    const glyphBuffer = Buffer.concat([meta, buffer])
    glyph.length = glyphBuffer.length
    // store the result into the glyph
    glyph.imageBuffer = buffer
    glyph.glyphBuffer = glyphBuffer
  }
}
