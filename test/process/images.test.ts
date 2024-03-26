import { test, expect } from 'vitest'
import sharp from 'sharp'
import { processImages } from '../../dist'

test('test processing images', async (): Promise<void> => {
  const data = await processImages('streets', {
    imageFolder: './test/features/images/streets-mini'
  })
  const imageGlyphs = data.glyphs.filter(d => d.type === 'image')
  const airfieldBuffer = await sharp('./test/features/images/streets-mini/airfield.webp').toBuffer()
  expect(imageGlyphs[0]).toEqual({
    id: '0',
    file: './test/features/images/streets-mini/airfield.webp',
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
    imageBuffer: airfieldBuffer,
    glyphBuffer: Buffer.alloc(0),
    type: 'image',
    code: 0
  })
})
