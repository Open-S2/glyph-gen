import type { Color } from 'util/elementParser'

export * from './font'
export * from './image'
export * from './svg'

export interface BBOX {
  /** x1 of the bounding box */
  x1: number
  /** x2 of the bounding box */
  x2: number
  /** y1 of the bounding box */
  y1: number
  /** y2 of the bounding box */
  y2: number
}

export interface GlyphBase {
  /** The ID for storage purposes */
  id: string
  /** path to the font file or svg/image glyph location */
  file: string
  /** if the glyph is dead, it is skipped */
  dead: boolean
  /** bounding box of the glyph */
  bbox: BBOX
  /** width of the glyph */
  width: number
  /** height of the glyph */
  height: number
  /** texture width of the glyph */
  texWidth: number
  /** texture height of the glyph */
  texHeight: number
  /** x offset of the glyph */
  xOffset: number
  /** y offset of the glyph */
  yOffset: number
  /** advance width of the glyph */
  advanceWidth: number
  /** length of the glyph */
  length: number
  /** left side bearing of the glyph */
  leftSideBearing: number
  /** image Buffer is without the metadata */
  imageBuffer: Buffer
  /** Build buffer data */
  glyphBuffer: Buffer
}

export interface UnicodeGlyph extends GlyphBase {
  type: 'unicode'
  unicode: number
}

export interface SubstitutionGlyph extends GlyphBase {
  type: 'substitution'
  code: number
}

export interface SVGGlyph extends GlyphBase {
  type: 'svg'
  code: number
  /** svg's have "path" properties with something like `d="M20.268,...`. We store the d property */
  path: string
  /** track the index at which we find this path in the specific SVG file */
  pathIndex: number
}

export interface ImageGlyph extends GlyphBase {
  type: 'image'
  code: number
}

export type Glyph = UnicodeGlyph | SubstitutionGlyph | SVGGlyph | ImageGlyph

export interface GlyphMapBase {
  /** type added to differentiate from images and svgs */
  type: 'font' | 'svg' | 'image'
  /** name of the project */
  name: string
  /** set of glyph unicodes */
  glyphSet: Set<string>
  /** array of glyphs */
  glyphs: Glyph[]
  /** default advance width */
  defaultAdvance: number
  /** extent of the font */
  extent: number
  /** size of the font */
  size: number
  /** max height of the font */
  maxHeight: number
  /** range of the font */
  range: number
}

export interface FontGlyphMap extends GlyphMapBase {
  /** type added to differentiate from images and svgs */
  type: 'font'
  /** substitutes. Only used by fonts */
  substitutes: Substitute[]
}

export interface PathID {
  glyphID: number
  colorID: number
}

export interface SVGGlyphMap extends GlyphMapBase {
  /** type added to differentiate from images and svgs */
  type: 'svg'
  /** Colors */
  colors: Color[]
  /** Icons: name => Path[] */
  paths: Map<string, PathID[]>
}

export interface ImageGlyphMap extends GlyphMapBase {
  /** type added to differentiate from images and svgs */
  type: 'image'
}

export type GlyphMap = FontGlyphMap | SVGGlyphMap | ImageGlyphMap

// SUBSTITUTE TYPE 4 ENCODING:
// 0: substitute type (writeUInt8) [4]
// 1: component count (writeUInt8)
// 2+: [repeating] component unicodes (writeUInt16LE)
export interface LigatureSubstitute {
  /** type of the substitute */
  type: 4
  /** id of the substitute ligature. Ex: (tibetan) '3909.3897.3929' */
  substitute: string
  /** index of the substitute ligature */
  substituteIndex: number
  /** unicodes of the components; Ex: [3909, 3897, 3929] */
  components: number[]
  /**
   * code represents the compression of the data for future storage.
   * Type 4 is: [substituteType, count, ...components]
   * Example: [4, 3, 3909, 3897, 3929]
   **/
  code: number[]
  /**
   * code string that joins code with '.' inbetween. used to filter duplicates
   * type.count.[...components].join('.')
   * Example: '4.3.3909.3897.3929'
   **/
  codeString: string
}
export interface LigatureSubstituteParsed {
  type: 4
  substitute: string
  components: number[]
}

export type Substitute = LigatureSubstitute
export type SubstituteParsed = LigatureSubstituteParsed

/**
 * 1 => Single - [Replace one glyph with one glyph](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#SS)
 * 2 => Multiple - [Replace one glyph with more than one glyph](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#MS)
 * 3 => Alternate - [Replace one glyph with one of many glyphs](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#AS)
 * 4 => Ligature - [Replace multiple glyphs with one glyph](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#LGS)
 * 5 => Context - [Replace one or more glyphs in context](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#CS)
 * 6 => Chaining Context - [Replace one or more glyphs in chained context](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#CC)
 * 7 => Extension Substitution - [Extension mechanism for other substitutions](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#ES)
 * 8 => Reverse Chaining Context Single - [Replace single glyph in reverse chaining context](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#RCCS)
 *
 * 1 - useful for replacing CJK horizontal with vertical
 * 2 - joining two characters together like fi to ﬁ
 * 3 - never truly necessary
 * 4 - very important. Replace multiple characters with a single character
 */
export type LookupType =
  1 |
  2 |
  3 |
  4 |
  5 |
  6 |
  7 |
  8

export interface CoverageFormat1 {
  format: 1
  glyphs: number[]
}

export interface CoverageFormat2 {
  format: 2
  ranges: Array<{
    start: number
    end: number
    index: number
  }>
}

export type Coverage = CoverageFormat1 | CoverageFormat2

export interface Lookup1SubTable1 {
  substFormat: 1
  coverage: Coverage
  deltaGlyphId: number
}

export interface Lookup1SubTable2 {
  substFormat: 2
  coverage: Coverage
  substitute: number[]
}

export interface Lookup1 {
  lookupType: 1
  subtables: Array<Lookup1SubTable1 | Lookup1SubTable2>
}

export interface Lookup4 {
  lookupType: 4
  subtables: Array<{
    substFormat: number
    coverage: Coverage
    ligatureSets: Array<Array<{
      ligGlyph: number
      components: number[]
    }>>
  }>
}

export type Lookup = Lookup1 | Lookup4
