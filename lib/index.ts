import fs from 'fs'

export * from './binding'

export type Type = 'font' | 'svg' | 'image'

export interface Data {
  /** type of data being imported */
  type: Type
  /** path to the file (font, svg file or folder, image file or folder) */
  path: string
}

export interface Options {
  /** name of the project */
  name: string
  /** path to the output file */
  out: string
  /** path to the font files; Glyphs will be stored in order of the font order provided */
  data: Data[]
  /** if the font already exists, allow to "overwrite" any existing data */
  overwrite?: boolean
  /** Used by (M)(T)SDF options. extent of the font; defaults to 8_192 */
  extent?: number
  /** Used by (M)(T)SDF and sprite options. Size of the glyph image by height; Defaults to 32 */
  size?: number
  /** Used by (M)(T)SDF options. Range of the buffer around the glyph; defaults to 6 */
  range?: number
}

export default async function build (options: Options): Promise<void> {
  // TODO: implement
}
