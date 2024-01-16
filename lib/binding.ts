// @ts-expect-error - import from native module (it exists)
import msdfNative from '../build/Release/msdf-native'

export type Type = 'sdf' | 'psdf' | 'msdf' | 'mtsdf'

export type EmptyObject = Record<string, never>

export interface MSDFResponse {
  data: ArrayBuffer
  width: number
  height: number
  shapeSize: number
  emSize: number
  r: number
  l: number
  t: number
  b: number
  advance: number
}
export type buildFontGlyphSpec = (
  fontPath: string,
  code: number,
  size: number,
  range: number,
  type: Type,
  codeIsIndex: boolean
) => MSDFResponse | EmptyObject
export type buildSVGGlyphSpec = (
  svgPath: string,
  size: number,
  range: number,
  pathIndex: number,
  type: Type
) => MSDFResponse | EmptyObject

export const buildFontGlyph = msdfNative.buildFontGlyph as buildFontGlyphSpec
export const buildSVGGlyph = msdfNative.buildSVGGlyph as buildSVGGlyphSpec
