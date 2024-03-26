import fs from 'fs'
import sharp from 'sharp'
import { stdout as log } from 'single-line-log'

import type { ImageGlyph, ImageGlyphMap } from './'

export interface ImageOptions {
  /** path to the font files; Glyphs will be stored in order of the font order provided */
  imageFolder: string
  /** extent of the font; Recommend 8_192 */
  extent?: number
  /** Size of the glyph image by height; Recommend 32 to start */
  size?: number
  /** range of the buffer around the glyph; recommend 6 */
  range?: number
}

export async function processImages (
  name: string,
  {
    imageFolder,
    extent = 8_192,
    size = 32,
    range = 6
  }: ImageOptions,
  consoleLog = false
): Promise<ImageGlyphMap> {
  // create an msdf object
  const fontGlyphMap: ImageGlyphMap = {
    type: 'image',
    name,
    glyphSet: new Set<string>(),
    glyphs: [],
    defaultAdvance: -1,
    extent,
    range,
    size,
    maxHeight: 0
  }

  await parseImages(imageFolder, fontGlyphMap, consoleLog)

  return fontGlyphMap
}

const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff']
const fileType = (file: string): string => file.split('.').pop() ?? ''

/** Grab all the images and group them by colors and glyphs */
async function parseImages (
  filePath: string,
  imageGlyphMap: ImageGlyphMap,
  consoleLog: boolean
): Promise<void> {
  if (consoleLog) log(`parsing ${filePath}`)
  const images = fs.readdirSync(filePath).filter(f => imageTypes.includes(fileType(f)))
  if (images.length === 0) throw new Error(`Loading images from ${filePath} has failed`)

  const length = images.length
  let count = 1

  // build glyphs for the images
  for (const image of images) {
    const name = image.split('.').shift() ?? image
    const pathName = `${filePath}/${image}`
    if (consoleLog) log(`${name} [${count} / ${length}]`)
    // store the "glyph"
    const glyphID = imageGlyphMap.glyphs.length
    imageGlyphMap.glyphs.push(await buildGlyph(pathName, glyphID))

    count++
  }
}

async function buildGlyph (file: string, code: number): Promise<ImageGlyph> {
  return {
    type: 'image',
    code,
    file,
    id: String(code),
    // used by Fonts:
    bbox: { x1: 0, x2: 0, y1: 0, y2: 0 },
    dead: false,
    advanceWidth: 0,
    leftSideBearing: 0,
    // these are filled in later if using SDF
    width: -1,
    height: -1,
    texWidth: -1,
    texHeight: -1,
    xOffset: -1,
    yOffset: -1,
    length: -1,
    // Stored later regardless of store type
    imageBuffer: await sharp(file).toBuffer(),
    glyphBuffer: Buffer.alloc(0)
  }
}
