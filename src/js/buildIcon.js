const fs = require('fs')
const zlib = require('zlib')
const { brotliCompressSync } = zlib
const { buildSVGGlyph } = require('../../lib/binding.js')
const Parser = require('fast-xml-parser')
const log = require('single-line-log').stdout
const { parsePath } = require('./elementParser.js')

function buildIcons ({ inputFolder, outPath, outName, extent, size, range }) {
  const { round, floor, max } = Math
  // run through each svg, find all duplicates and build an group list.
  // for instance tesla->charger.svg =>
  // {
  //    "charger": [{ id: 0, colorID: 0, index: 0 }, { id: 1, index: 1 }, { id: 2, index: 2 }, { id: 3, index: 3 }],
  //    "service": [{ id: 4, index: 0 }, { id: 1, index: -1 }, { id: 2, index: -1 }, { id: 3, index: -1 }]
  // }
  // notice 1, 2 and 3 are reused but service had one different geometry that is matched to service
  // if index is -1 that means we don't need to build it because a previous svg has already built it
  if (fs.existsSync(`${outPath}/${outName}.icon`)) return console.log('FAILED, icon set already exists.')

  // prep file
  fs.appendFileSync(`${outPath}/${outName}.icon`, Buffer.alloc(512_000))
  const file = fs.openSync(`${outPath}/${outName}.icon`, 'r+')

  /* PREP PHASE */

  const icons = {}

  // prep variables for build
  const geometries = [] // { path: Array<number> } ID IS THE INDEX
  const colors = [] // { r: number, g: number, b: number, a: number } ID IS THE INDEX
  let glyphs = []
  let maxHeight = 0
  const svgs = fs.readdirSync(inputFolder).filter(f => f.includes('.svg'))
  const length = svgs.length
  let count = 1
  let pos = 512_000
  // build
  for (const svg of svgs) {
    // prep
    const name = svg.replace('.svg', '')
    log(`${name} [${count} / ${length}]`)
    count++
    const icon = icons[name] = [] // { glyphID: number, colorID: number }

    // check against geometries, if geometry does not exist, create
    // grab all paths
    const svgLocation = `${inputFolder}/${svg}`
    const svgPaths = getPaths(svgLocation).filter(f => f)
    for (let index = 0, sl = svgPaths.length; index < sl; index++) {
      const { path, color } = svgPaths[index]
      // prep path
      let glyphID = findIndex(path, geometries)
      if (glyphID === -1) {
        glyphID = geometries.length
        let { data, width, height, emSize, r, l, b, t } = buildSVGGlyph(svgLocation, size, range, index + 1, true)
        r = round(r / emSize * extent)
        l = round(l / emSize * extent)
        t = round(t / emSize * extent)
        b = round(b / emSize * extent)

        maxHeight = max(maxHeight, height)

        data = Buffer.from(data)

        let glyphMeta = Buffer.alloc(14)
        // write to buffer
        glyphMeta.writeUInt16LE(glyphID, 0)
        glyphMeta.writeUInt16LE(r - l, 2)
        glyphMeta.writeUInt16LE(t - b, 4)
        glyphMeta.writeUInt8(width, 6)
        glyphMeta.writeUInt8(height, 7)
        glyphMeta.writeUInt16LE(zigzag(l), 8)
        glyphMeta.writeUInt16LE(zigzag(extent - t), 10)
        glyphMeta.writeUInt16LE(zigzag(0), 12)
        const glyphBuffer = Buffer.concat([glyphMeta, data])
        // store
        fs.appendFileSync(`${outPath}/${outName}.icon`, glyphBuffer)

        geometries.push(path)
        glyphs.push({ id: glyphID, pos, length: glyphBuffer.length })
        pos += glyphBuffer.length
      }
      // prep color
      let colorID = findIndex(color, colors)
      if (colorID === -1) {
        colorID = colors.length
        colors.push(color)
      }

      icon.push({ glyphID, colorID })
    }
  }

  glyphs = glyphs.sort((a, b) => a.id - b.id)

  /** STORE PHASE **/

  // store glyph metadata
  const glyphCount = glyphs.length
  const glyphMap = Buffer.alloc(8 * glyphCount)
  let gPos = 0
  for (const glyph of glyphs) {
    glyphMap.writeUInt16LE(glyph.id, gPos)
    glyphMap.writeUInt32LE(glyph.pos, gPos + 2)
    glyphMap.writeUInt16LE(glyph.length, gPos + 6)
    gPos += 8
  }

  // store iconMap
  // nameLength, mapLength, name, [glyphID, colorID]
  // [glyphCount (uint8), glyphID (uint16), colorID (uint16), glyphID (uint16), colorID (uint16), ...]
  const iconMapBufs = []
  for (const [name, iconMap] of Object.entries(icons)) { // { glyphID, colorID }
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
  const iconMapBuf = Buffer.concat(iconMapBufs)

  // store colors
  // [r (uint8), g (uint8), b (uint8), a (uint8), ...]
  const colorList = Buffer.from(colors.flatMap(color => [color.r, color.g, color.b, color.a]))
  const colorLength = colorList.length
  const colorBuf = Buffer.alloc(colorLength)
  for (let i = 0; i < colorLength; i++) colorBuf.writeUInt8(colorList[i], i)

  const glyphMetaBuf = Buffer.concat([glyphMap, iconMapBuf, colorBuf])

  const glyphMetaBR = brotliCompressSync(glyphMetaBuf, {
    chunkSize: 32 * 1024,
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_GENERIC,
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: glyphMetaBuf.length
    }
  })
  fs.writeSync(file, glyphMetaBR, 0, glyphMetaBR.length, 30)

  // store the metadata
  const meta = Buffer.alloc(30)
  meta[0] = 83 // S
  meta[1] = 50 // 2
  meta.writeUInt16LE(1, 2) // version
  meta.writeUInt16LE(extent, 4)
  meta.writeUInt16LE(size, 6)
  meta.writeUInt16LE(maxHeight, 8)
  meta.writeUInt16LE(range, 10)
  meta.writeUInt16LE(0, 12)
  meta.writeUInt32LE(glyphMetaBR.length, 14)
  meta.writeUInt32LE(iconMapBuf.length, 22)
  meta.writeUInt32LE(colorBuf.length, 26)
  fs.writeSync(file, meta, 0, meta.length, 0)

  console.log()
}

function findIndex (json, arr) {
  const str = JSON.stringify(json)
  for (let i = 0; i < arr.length; i++) {
    const val = JSON.stringify(arr[i])
    if (str === val) return i
  }
  return -1
}

function getPaths (inputFile) {
  const data = fs.readFileSync(inputFile, 'utf8')
  const parsedSVG = Parser.parse(data, { parseAttributeValue: true, ignoreAttributes: false, attributeNamePrefix: '' })
  const { svg } = parsedSVG
  const res = []

  _parseFeatures(svg, res)

  return res
}

function _parseFeatures (svg, res) {
  for (const key in svg) {
    if (key === 'path') {
      if (svg[key]) { // multiple element objects
        if (Array.isArray(svg[key])) {
          for (const element of svg[key]) res.push(parsePath(element))
        } else { res.push(parsePath(svg[key])) }
      }
    } else if (key === 'g') { _parseFeatures(svg[key], res) }
  }
}

function zigzag (num) {
  return (num << 1) ^ (num >> 31)
}

exports.buildIcons = buildIcons
