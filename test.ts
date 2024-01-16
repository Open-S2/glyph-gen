import fs from 'fs'
import { buildFontGlyph } from './lib/binding'
import sharp from 'sharp'

const sdf = buildFontGlyph(
  './test/features/fonts/Roboto/Roboto-Medium.ttf',
  0x42, // A
  32,
  6,
  'mtsdf'
)

// onvert sdf.data to png using sharp and save as sdf.png
const image = sharp(Buffer.from(sdf.data), {
  raw: {
    width: sdf.width,
    height: sdf.height,
    channels: 4
  }
})

image.png().toBuffer().then((data) => {
  fs.writeFileSync('./test/features/glyphs/mtsdf.png', data)
})
