import { test, expect } from 'vitest'
import { processFont } from '../../dist'

test('test processing a font', async (): Promise<void> => {
  const data = await processFont('Roboto', {
    fontPaths: ['./test/features/fonts/Roboto/Roboto-Medium.ttf'],
    extent: 8192,
    range: 6,
    size: 32
  })
  const unicodeGlyphs = data.glyphs.filter(d => d.type === 'unicode')
  const firstUnicodeGlyph = unicodeGlyphs[0]
  expect(firstUnicodeGlyph).toEqual({
    id: '0',
    path: './test/features/fonts/Roboto/Roboto-Medium.ttf',
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
    glyphBuffer: Buffer.alloc(0),
    type: 'unicode',
    unicode: 0
  })
  const nonDeadUnicodeGlyph = unicodeGlyphs[10]
  expect(nonDeadUnicodeGlyph).toEqual({
    id: '39',
    path: './test/features/fonts/Roboto/Roboto-Medium.ttf',
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
    glyphBuffer: Buffer.alloc(0),
    type: 'unicode',
    unicode: 39
  })
  const substitutionGlyphs = data.glyphs.filter(d => d.type === 'substitution')
  const firstSubstitutionGlyph = substitutionGlyphs[0]
  expect(firstSubstitutionGlyph).toEqual({
    id: '102.102.105',
    path: './test/features/fonts/Roboto/Roboto-Medium.ttf',
    dead: false,
    bbox: { x1: 180, x2: 6732, y1: 0, y2: 6228 },
    advanceWidth: 7308,
    leftSideBearing: 45,
    width: -1,
    height: -1,
    texWidth: -1,
    texHeight: -1,
    xOffset: -1,
    yOffset: -1,
    length: -1,
    glyphBuffer: Buffer.alloc(0),
    type: 'substitution',
    code: 446
  })
})
