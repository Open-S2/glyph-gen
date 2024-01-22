const fs = require('fs')
const { buildSVGGlyph } = require('../../lib/binding.js')
const { PNG } = require('pngjs')

const SVG_PATH = '/Users/craigoconnor/Documents/Projects/S2/msdf-gpu/icons/tesla/charger.svg'
const SIZE = 36
const RANGE = 6
const PATH_INDEX = 4
const USE_ALPHA = true
const COLOR_TYPE = USE_ALPHA ? 6 : 2

const { data, width, height, emSize, r, l, b, t } = buildSVGGlyph(SVG_PATH, SIZE, RANGE, PATH_INDEX, USE_ALPHA)
const uint8 = new Uint8ClampedArray(data)

if (data) {
  console.log(`${width} - ${height} : ${emSize}`)
  console.log(`${r} - ${l} - ${b} - ${t}`)
  const png = new PNG({ width, height, colorType: COLOR_TYPE, inputColorType: COLOR_TYPE }) // 2 -> RGB ; 6 -> RGBA
  png.data = uint8
  const buffer = PNG.sync.write(png, { width, height, colorType: COLOR_TYPE, inputColorType: COLOR_TYPE })
  fs.writeFileSync('./testSVG.png', buffer)
}
