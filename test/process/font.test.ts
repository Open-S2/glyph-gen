import { test, expect } from 'vitest'
import { processFont } from '../../dist'

test('test processing a font', async (): Promise<void> => {
  const data = await processFont('robotoMedium', {
    fontPaths: ['./test/features/fonts/Roboto/Roboto-Medium.ttf'],
    extent: 8192,
    range: 6,
    size: 32
  })
  const unicodeGlyphs = data.glyphs.filter(d => d.type === 'unicode')
  const firstUnicodeGlyph = unicodeGlyphs[0]
  expect(firstUnicodeGlyph).toEqual({
    id: '0',
    file: './test/features/fonts/Roboto/Roboto-Medium.ttf',
    dead: true,
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
    type: 'unicode',
    unicode: 0
  })
  const nonDeadUnicodeGlyph = unicodeGlyphs[10]
  expect(nonDeadUnicodeGlyph).toEqual({
    id: '39',
    file: './test/features/fonts/Roboto/Roboto-Medium.ttf',
    dead: false,
    bbox: { x1: 328, x2: 1068, y1: 4080, y2: 6144 },
    advanceWidth: 1384,
    leftSideBearing: 82,
    width: -1,
    height: -1,
    texWidth: -1,
    texHeight: -1,
    xOffset: -1,
    yOffset: -1,
    length: -1,
    imageBuffer: Buffer.alloc(0),
    glyphBuffer: Buffer.alloc(0),
    type: 'unicode',
    unicode: 39
  })
  const substitutionGlyphs = data.glyphs.filter(d => d.type === 'substitution')
  const firstSubstitutionGlyph = substitutionGlyphs[0]
  expect(firstSubstitutionGlyph).toEqual({
    id: '65.769',
    file: './test/features/fonts/Roboto/Roboto-Medium.ttf',
    dead: false,
    bbox: { x1: 72, x2: 5384, y1: 0, y2: 7384 },
    advanceWidth: 5452,
    leftSideBearing: 18,
    width: -1,
    height: -1,
    texWidth: -1,
    texHeight: -1,
    xOffset: -1,
    yOffset: -1,
    length: -1,
    imageBuffer: Buffer.alloc(0),
    glyphBuffer: Buffer.alloc(0),
    type: 'substitution',
    code: 640
  })
})
