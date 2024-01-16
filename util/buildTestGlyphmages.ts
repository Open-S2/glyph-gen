import fs from 'fs'
import { buildFontGlyph } from '../lib/binding'
import sharp from 'sharp'

const type = 'mtsdf'

const sdf = buildFontGlyph(
  './test/features/fonts/Roboto/Roboto-Medium.ttf',
  0x41, // A
  32,
  6,
  type,
  false
)

// onvert sdf.data to png using sharp and save as sdf.png
const image = sharp(Buffer.from(sdf.data), {
  raw: {
    width: sdf.width,
    height: sdf.height,
    channels: 4
  }
})

image.png().toBuffer()
  .then((data) => {
    fs.writeFileSync(`./test/features/glyphs/${type}.png`, data)
  })
  .catch((err) => {
    console.log(err)
  })

fs.writeFileSync(`./test/features/glyphs/${type}.raw`, new Uint8Array(sdf.data))
