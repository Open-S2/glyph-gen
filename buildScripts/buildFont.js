// @flow
const fs = require('fs')
const fsPromises = fs.promises
const { promisify } = require('util')
const zlib = require('zlib')
const { load } = require('opentype.js')
const { buildFontGlyph } = require('../lib/binding.js')
const { buildFont } = require('../lib/index.js')
const { PNG } = require('pngjs')
// const { createCanvas } = require('canvas')
// const { lanczos } = require('@rgba-image/lanczos')
const { encodeLosslessRGBA } = require('webp-wrap')

const brotliCompress = promisify(zlib.brotliCompress)

const log = require('single-line-log').stdout

const NOTOSANSREGULARFONTS = buildNoto(
  ['Sans', 'Regular'],
  ['Mono', 'Condensed', 'UI-', 'Italic', 'Unjoined'],
  ['NotoSansCJK'],
  'NotoSans-Regular.ttf'
)
buildFont({
  name: 'NotoSansRegular',
  outPath: './builtGlyphsV2/Noto',
  fontPaths: NOTOSANSREGULARFONTS,
  extent: 8_192,
  size: 32,
  range: 6,
  alpha: true
})

const NOTOSANSMEDIUMFONTS = buildNoto(
  ['Sans', 'Medium'],
  ['Mono', 'Condensed', 'UI-', 'Italic', 'Unjoined'],
  ['NotoSansCJK'],
  'NotoSans-Medium.ttf'
)
// NOTOSANSMEDIUMFONTS.push(...NOTOSANSREGULARFONTS)
// buildFont({
//   name: 'NotoSansMedium',
//   outPath: './builtGlyphsV2/Noto',
//   fontPaths: NOTOSANSMEDIUMFONTS,
//   extent: 8_192,
//   size: 32,
//   range: 6,
//   alpha: true
// })

// const NOTOSANSBOLDFONTS = buildNoto(
//   ['Sans', 'Bold'],
//   ['Mono', 'Condensed', 'UI-', 'Italic', 'Unjoined'],
//   ['NotoSansCJK'],
//   'NotoSans-Bold.ttf'
// )
// NOTOSANSBOLDFONTS.push(...NOTOSANSREGULARFONTS)
// buildFont({
//   name: 'NotoSansBold',
//   outPath: './builtGlyphsV2/Noto',
//   fontPaths: NOTOSANSBOLDFONTS,
//   extent: 8_192,
//   size: 32,
//   range: 6,
//   alpha: true
// })

// const NOTOSANSBLACKFONTS = buildNoto(
//   ['Sans', 'Black'],
//   ['Mono', 'Condensed', 'UI-', 'Italic', 'Unjoined'],
//   ['NotoSansCJK'],
//   'NotoSans-Black.ttf'
// )
// NOTOSANSBLACKFONTS.push(...NOTOSANSREGULARFONTS)
// buildFont({
//   name: 'NotoSansBlack',
//   outPath: './builtGlyphsV2/Noto',
//   fontPaths: NOTOSANSBLACKFONTS,
//   extent: 8_192,
//   size: 32,
//   range: 6,
//   alpha: true
// })

// const NOTOSANSLIGHTFONTS = buildNoto(
//   ['Sans', 'Light'],
//   ['Mono', 'Condensed', 'UI-', 'Italic', 'Unjoined'],
//   ['NotoSansCJK'],
//   'NotoSans-Light.ttf'
// )
// NOTOSANSLIGHTFONTS.push(...NOTOSANSREGULARFONTS)
// buildFont({
//   name: 'NotoSansLight',
//   outPath: './builtGlyphsV2/Noto',
//   fontPaths: NOTOSANSLIGHTFONTS,
//   extent: 8_192,
//   size: 32,
//   range: 6,
//   alpha: true
// })

// const ROBOTO_FONT = ['./openFonts/Roboto/Roboto-Medium.ttf']
// // ROBOTO_FONT.push(
// //   ...NOTOSANSMEDIUMFONTS.filter(f => {
// //     return !(f.includes('NotoSansJP') ||
// //     f.includes('NotoSansKR') ||
// //     f.includes('NotoSansSC') ||
// //     f.includes('NotoSansTC'))
// //   }),
// //   ...NOTOSANSREGULARFONTS.filter(f => {
// //     return !(f.includes('NotoSansJP') ||
// //     f.includes('NotoSansKR') ||
// //     f.includes('NotoSansSC') ||
// //     f.includes('NotoSansTC'))
// //   })
// // )
// buildFont({
//   name: 'RobotoMedium',
//   outPath: './builtGlyphsTmp/Roboto',
//   fontPaths: ROBOTO_FONT,
//   extent: 8_192,
//   size: 32,
//   range: 6,
//   alpha: true
// })

// buildFont({
//   name: 'NotoSansEthiopic',
//   outPath: './builtGlyphsV2/Noto',
//   fontPaths: ['./openFonts/Noto-unhinted/NotoSansEthiopic-Regular.ttf'],
//   extent: 8_192,
//   size: 32,
//   range: 6,
//   alpha: true
// })

const fonts = [
  'Abel',
  'ArialUnicodeMS',
  'Avenir',
  'Cairo',
  'Cardo',
  'Exo',
  'Inter',
  'Jeko',
  'JetBrainsMono',
  'KulimPark',
  'Lato',
  'Montserrat',
  'NetflixSans',
  'OpenSans',
  'Poppins',
  'Roboto',
  'RobotoMono',
  'RobotoSlab',
  'SourceCodePro',
  'SourcePro',
  'SpaceGrotesk',
  'SpaceMono',
  'SulphurPoint',
  'Ubuntu',
  'UbuntuMono',
  'ZenDots'
]
// buildFonts(fonts)

// buildFont({
//   name: 'RobotoRegular',
//   outPath: './builtGlyphsV2/Roboto',
//   fontPaths: ['./openFonts/Roboto/Roboto-Regular.ttf'],
//   extent: 8_192,
//   size: 28,
//   range: 6,
//   alpha: true
// })

async function buildFonts (fonts) {
  for (const font of fonts) {
    if (!fs.existsSync(`./builtGlyphsV2/${font}`)) fs.mkdirSync(`./builtGlyphsV2/${font}`)
    const subFonts = fs.readdirSync(`./openFonts/${font}`).filter(f => f.includes('.ttf') || f.includes('.otf'))
    for (const subFont of subFonts) {
      const subFontClean = subFont.replaceAll('-', '').replace('.ttf', '').replace('.otf', '')
      const name = subFontClean.replaceAll(/([A-Z])/g, ' $1').trim()
      const build = {
        name: `${name.replaceAll(' ', '')}`,
        fontPaths: [`./openFonts/${font}/${subFont}`],
        outPath: `./builtGlyphsV2/${font}`,
        extent: 8_192,
        size: 28,
        range: 6,
        alpha: true
      }
      if (fs.existsSync(`${build.outPath}/${build.name}.font`)) continue
      console.log(build.name)
      await buildFont(build)
      console.log()
    }
  }
}

// buildNoto(['Sans', 'Regular'], ['Mono', 'Condensed', 'UI-', 'Italic', 'Unjoined'])
function buildNoto (includes, filters, sorters, defaultName) {
  let fonts = []
  // find all fonts in noto-unhinted that have from words in it
  const fontFolders = fs.readdirSync('./openFonts/Noto')
  for (const folder of fontFolders) {
    const fontsPaths = fs.readdirSync(`./openFonts/Noto/${folder}`)
    // get
    for (const font of fontsPaths) {
      if (includes.every(i => font.includes(i))) fonts.push(`./openFonts/Noto/${folder}/${font}`)
    }
  }
  // filter
  fonts = fonts.filter(font => {
    for (const filter of filters) if (font.includes(filter)) return false
    return true
  })
  // sort
  fonts = fonts.sort((a, b) => {
    let aScore = inSorters(sorters, a) ? 1 : a.includes(defaultName) ? -1 : 0
    let bScore = inSorters(sorters, b) ? 1 : b.includes(defaultName) ? -1 : 0
    return aScore - bScore
  })

  return fonts
}

function inSorters (sorters, font) {
  for (const sorter of sorters) {
    if (font.includes(sorter)) return true
  }
  return false
}