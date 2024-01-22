import { stdout as log } from 'single-line-log'
import { buildFontGlyph } from '../binding'

import type { FontGlyphMap } from 'process/font'

export type SDF_TYPES = 'sdf' | 'psdf' | 'msdf' | 'mtsdf'

export interface Options {
  convertType: SDF_TYPES
}

export function convertGlyphsToSDF (fontGlyphMap: FontGlyphMap, options: Options): void {
  const { glyphs } = fontGlyphMap
  const notDeadGlyphs = glyphs.filter((glyph) => !glyph.dead)
  const { length } = notDeadGlyphs
  let count = 0
  console.log()
  for (const glyph of notDeadGlyphs) {
    log(`${++count} / ${length}`)
    // prep variables
    const { round } = Math
    const { extent, size, range } = fontGlyphMap
    const { dead, type, path } = glyph
    if (dead) continue
    let buffer = Buffer.alloc(0)
    // STEP 1) BUILD AND CREATE METADATA
    // create the sdf, psdf, msdf or mtsdf
    let { data, width, height, r, l, t, b, emSize } = buildFontGlyph(
      path,
      'unicode' in glyph ? glyph.unicode : glyph.code,
      size,
      range,
      options.convertType,
      type === 'substitution'
    )
    r = round(r / emSize * extent)
    l = round(l / emSize * extent)
    t = round(t / emSize * extent)
    b = round(b / emSize * extent)
    if (data !== undefined) {
    // update height
      fontGlyphMap.maxHeight = Math.max(height, fontGlyphMap.maxHeight)
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
    glyph.glyphBuffer = glyphBuffer
  }
}

function zigzag (num: number): number {
  return (num << 1) ^ (num >> 31)
}
