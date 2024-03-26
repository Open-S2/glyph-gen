import { convertGlyphsToSDF } from './convert'
import { processFont, processSVG, processImages } from './process'
import { storeGlyphsToSQL } from './storage'

import type {
  FontOptions,
  SVGOptions,
  ImageOptions,
  GlyphMap
} from './process'
import type {
  SDFOptions
} from './convert'
import type {
  SQLiteOptions
} from './storage'

export * from './convert'
export * from './process'
export * from './storage'
export * from './binding'
export * from './substitutionTable'

export interface Options {
  /** Name of the resultant product */
  name: string
  /** Set true if you want to get a log of events. Defaults to false */
  log?: boolean
  /** Process options build and prep data of either font, svg, or an image */
  processOptions: FontOptions | SVGOptions | ImageOptions
  /** Convert options is not required if you're only using image data */
  convertOptions?: SDFOptions
  /** Store as an SQL DB, spritesheet image/json combo, or range table */
  storeOptions: SQLiteOptions
}

export async function generateGlyphs (options: Options): Promise<void> {
  const { name, processOptions, convertOptions, storeOptions, log } = options
  let glyphMap: GlyphMap | undefined
  // 1) process data whether it be a font, image, or svg
  if ('fontPaths' in processOptions) glyphMap = await processFont(name, processOptions, log)
  if ('svgFolder' in processOptions) glyphMap = processSVG(name, processOptions, log)
  if ('imageFolder' in processOptions) glyphMap = await processImages(name, processOptions, log)
  if (glyphMap === undefined) throw new Error('No glyphMap was created')
  // 2) convert glyphs to sdf, image, or vector as needed
  if (convertOptions !== undefined) {
    if ('convertType' in convertOptions) convertGlyphsToSDF(glyphMap, convertOptions, log)
  }
  // 3) store glyphs
  if (storeOptions.storeType === 'SQL') storeGlyphsToSQL(name, glyphMap, storeOptions, log)
  console.info('\ndone')
}
