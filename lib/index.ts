import { convertGlyphsToSDF } from './convert'
import { processFont } from './process'
import { serializeFont } from './storage'

import type { Options as FontOptions, FontGlyphMap } from './process/font'
import type { Options as SDFOptions } from './convert/sdf'
import type { Options as SQLiteOptions } from './storage/sql'

export * from './convert'
export * from './process'
export * from './storage'
export * from './binding'
export * from './substitutionTable'

export interface Options {
  name: string
  processOptions: FontOptions
  convertOptions: SDFOptions
  storeOptions: SQLiteOptions
}

export async function generateGlyphs (options: Options): Promise<void> {
  const { name, processOptions, convertOptions, storeOptions } = options
  let fontGlyphMap: FontGlyphMap | undefined
  // 1) process data whether it be a font, image, or svg
  if ('fontPaths' in processOptions) fontGlyphMap = await processFont(name, processOptions)
  // 2) convert glyphs to sdf, image, or vector as needed
  if ('convertType' in convertOptions && fontGlyphMap !== undefined) convertGlyphsToSDF(fontGlyphMap, convertOptions)
  // 3) store glyphs
  if ('storeType' in storeOptions && storeOptions.storeType === 'SQL') {
    if (fontGlyphMap !== undefined) serializeFont(name, fontGlyphMap, storeOptions)
  }
  console.log('\ndone')
}
