// @ts-expect-error - import from native module (it exists)
import msdfNative from '../build/Release/msdf-native'

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
  type: 'sdf' | 'msdf' | 'mtsdf'
) => MSDFResponse
export type buildSVGGlyphSpec = (
  svgPath: string,
  size: number,
  range: number,
  pathIndex: number,
  type: 'sdf' | 'msdf' | 'mtsdf'
) => MSDFResponse

export const buildFontGlyph = msdfNative.buildFontGlyph as buildFontGlyphSpec
export const buildSVGGlyph = msdfNative.buildSVGGlyph as buildSVGGlyphSpec
