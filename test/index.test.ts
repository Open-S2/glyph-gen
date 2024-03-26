import fs from 'fs'
import sharp from 'sharp'
import { test, expect } from 'vitest'
import Database from 'better-sqlite3'
import { parseGlyph, generateGlyphs, getMetadata } from '../dist'

const SCHEMA = fs.readFileSync('./lib/schema.sql', 'utf8')

test('processing a font into SQL', async (): Promise<void> => {
  const name = 'Roboto'
  const out = './tmp-process-roboto-sdf.sqlite'
  await generateGlyphs({
    name,
    processOptions: {
      fontPaths: ['./test/features/fonts/Roboto/Roboto-Medium.ttf'],
      extent: 8192,
      range: 6,
      size: 32
    },
    convertOptions: {
      convertType: 'mtsdf'
    },
    storeOptions: {
      storeType: 'SQL',
      out,
      multi: true
    }
  })

  const unicodeA = 0x41 // A
  const codeA = String(unicodeA)

  const db = new Database(out, { readonly: true })
  db.exec(SCHEMA)
  const glyph = parseGlyph(db, codeA, name)

  const metadata = getMetadata(db, name)
  if (metadata === undefined) throw new Error('metadata is undefined')
  {
    const { extent, size, maxHeight, range, defaultAdvance, substitutes } = metadata
    expect(extent).toEqual(8192)
    expect(size).toEqual(32)
    expect(maxHeight).toEqual(49)
    expect(range).toEqual(6)
    expect(defaultAdvance).toEqual(0.2490234375)
    // expect(substitutes).toEqual([
    //   { type: 4, substitute: '102.102.105', components: [102, 102, 105] },
    //   { type: 4, substitute: '102.105', components: [102, 105] },
    //   { type: 4, substitute: '102.102.108', components: [102, 102, 108] },
    //   { type: 4, substitute: '102.108', components: [102, 108] },
    //   { type: 4, substitute: '102.102', components: [102, 102] },
    //   { type: 4, substitute: '115.116', components: [115, 116] },
    //   { type: 4, substitute: '383.116', components: [383, 116] }
    // ])
  }

  // try grabbing A glyph
  {
    const { code, unicode, texW, texH, xOffset, yOffset, width, height, advanceWidth } = glyph
    expect(code).toEqual('65')
    expect(unicode).toEqual(65)
    expect(texW).toEqual(27)
    expect(texH).toEqual(29)
    expect(xOffset).toEqual(1391)
    expect(yOffset).toEqual(1535)
    expect(width).toEqual(6848)
    expect(height).toEqual(7360)
    expect(advanceWidth).toEqual(10904)
  }

  // try grabbing a replacement glyph
  const replaceCode = '102.102.108' // ffl
  const replaceGlyph = parseGlyph(db, replaceCode, 'Roboto')
  {
    const { code, unicode, texW, texH, xOffset, yOffset, width, height, advanceWidth } = replaceGlyph
    expect(code).toEqual('102.102.108')
    expect(unicode).toEqual(0)
    expect(texW).toEqual(32)
    expect(texH).toEqual(31)
    expect(xOffset).toEqual(1175)
    expect(yOffset).toEqual(1535)
    expect(width).toEqual(8088)
    expect(height).toEqual(7764)
    expect(advanceWidth).toEqual(14616)
    // replaceGlyph.data is a buffer. It's raw rgba image data. use sharp and store it as a png to ./tmp.png
    // const { data } = replaceGlyph
    // const png = sharp(data, { raw: { width: replaceGlyph.texW, height: replaceGlyph.texH, channels: 4 } })
    // await png.toFile('./tmp.png')
  }

  // CLEANUP
  db.close()
  if (fs.existsSync(out)) fs.unlinkSync(out)
  if (fs.existsSync(`${out}-shm`)) fs.unlinkSync(`${out}-shm`)
  if (fs.existsSync(`${out}-wal`)) fs.unlinkSync(`${out}-wal`)
})

test('processing a single icon into SQL', async (): Promise<void> => {
  const name = 'single'
  const out = './tmp-process-single-sdf.sqlite'
  await generateGlyphs({
    name,
    processOptions: {
      svgFolder: './test/features/svgs/single'
    },
    convertOptions: {
      convertType: 'mtsdf'
    },
    storeOptions: {
      storeType: 'SQL',
      out,
      multi: true
    }
  })

  const db = new Database(out, { readonly: true })
  db.exec(SCHEMA)

  const metadata = getMetadata(db, name)
  if (metadata === undefined) throw new Error('metadata is undefined')

  const { extent, size, maxHeight, range, defaultAdvance, iconMap, colors, substitutes } = metadata

  expect(extent).toEqual(8192)
  expect(size).toEqual(32)
  expect(maxHeight).toEqual(35)
  expect(range).toEqual(6)
  expect(defaultAdvance).toEqual(0)
  expect(substitutes).toEqual([])
  expect(colors).toEqual([
    [19, 156, 241, 255],
    [255, 255, 255, 255]
  ])

  expect('airfield' in iconMap).toBeTruthy()

  const airfield = iconMap.airfield
  expect(airfield).toEqual([
    { glyphID: 1, colorID: 0 },
    { glyphID: 2, colorID: 1 }
  ])

  // CLEANUP
  db.close()
  if (fs.existsSync(out)) fs.unlinkSync(out)
  if (fs.existsSync(`${out}-shm`)) fs.unlinkSync(`${out}-shm`)
  if (fs.existsSync(`${out}-wal`)) fs.unlinkSync(`${out}-wal`)
})

test('processing an icon set into SQL', async (): Promise<void> => {
  const name = 'streets'
  const out = './tmp-process-streets-sdf.sqlite'
  await generateGlyphs({
    name,
    processOptions: {
      svgFolder: './test/features/svgs/streets-mini'
    },
    convertOptions: {
      convertType: 'mtsdf'
    },
    storeOptions: {
      storeType: 'SQL',
      out,
      multi: true
    }
  })

  const db = new Database(out, { readonly: true })
  db.exec(SCHEMA)

  const metadata = getMetadata(db, name)
  if (metadata === undefined) throw new Error('metadata is undefined')

  const { extent, size, maxHeight, range, defaultAdvance, iconMap, colors, substitutes } = metadata

  expect(extent).toEqual(8192)
  expect(size).toEqual(32)
  expect(maxHeight).toEqual(39)
  expect(range).toEqual(6)
  expect(defaultAdvance).toEqual(0)
  expect(substitutes).toEqual([])
  expect(colors).toEqual([
    [19, 156, 241, 255],
    [255, 255, 255, 255],
    [94, 151, 236, 255],
    [83, 179, 196, 255],
    [86, 187, 249, 255],
    [104, 176, 83, 255]
  ])

  expect('airfield' in iconMap).toBeTruthy()
  expect('airport' in iconMap).toBeTruthy()
  expect('alcohol-shop' in iconMap).toBeTruthy()
  expect('amusement-park' in iconMap).toBeTruthy()
  expect('apparel' in iconMap).toBeTruthy()
  expect('aquarium' in iconMap).toBeTruthy()
  expect('transport-bus' in iconMap).toBeTruthy()
  expect('transport-light-rail' in iconMap).toBeTruthy()
  expect('zoo' in iconMap).toBeTruthy()

  const zoo = iconMap.zoo
  expect(zoo).toEqual([
    { glyphID: 1, colorID: 5 },
    { glyphID: 11, colorID: 1 },
    { glyphID: 12, colorID: 1 },
    { glyphID: 13, colorID: 1 },
    { glyphID: 14, colorID: 1 },
    { glyphID: 15, colorID: 1 }
  ])

  const id = '1'
  const glyph = parseGlyph(db, id, name)
  const { code, unicode, texW, texH, xOffset, yOffset, width, height, advanceWidth } = glyph
  expect(code).toEqual('1')
  expect(unicode).toEqual(0)
  expect(texW).toEqual(28)
  expect(texH).toEqual(35)
  expect(xOffset).toEqual(1423)
  expect(yOffset).toEqual(1355)
  expect(width).toEqual(7159)
  expect(height).toEqual(8879)
  expect(advanceWidth).toEqual(0)
  // const png = await sharp(`./test/features/glyphs/zoo-${id}.png`).toBuffer()

  // CLEANUP
  db.close()
  if (fs.existsSync(out)) fs.unlinkSync(out)
  if (fs.existsSync(`${out}-shm`)) fs.unlinkSync(`${out}-shm`)
  if (fs.existsSync(`${out}-wal`)) fs.unlinkSync(`${out}-wal`)
})
