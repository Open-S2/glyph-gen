import { load } from 'opentype.js'
import { stdout as log } from 'single-line-log'

import type { Font, Glyph as OpenTypeGlyph } from 'opentype.js'

export type GeneratedOpenTypeGlyph = OpenTypeGlyph & {
  substitute?: number[]
  parent?: number
}

export type GlyphData = Record<string, GeneratedOpenTypeGlyph>

// Supports SDF, MSDF, and MTSDF

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
  /** path to the font file */
  path: string
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

export type Glyph = UnicodeGlyph | SubstitutionGlyph

export interface FontGlyph {
  index: number
  unicodes: number[]
  advanceWidth: number
  leftSideBearing: number
  getBoundingBox: () => BBOX
}

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

// {
//   lookupType: 1,
//   lookupFlag: 0,
//   subtables: [
//     {
//       substFormat: 1,
//       coverage: { format: 1, glyphs: [ 123 ] },
//       deltaGlyphId: 16
//     }
//   ],
//   markFilteringSet: undefined
// }

// {
//   lookupType: 1,
//   lookupFlag: 0,
//   subtables: [
//     {
//       substFormat: 2,
//       coverage: { format: 2, ranges: [ { start: 6, end: 54, index: 0 } ] },
//       substitute: [
//          57,  59,  61,  63,  65,  67,  69,  71,  73,  75,
//          77,  79,  81,  83,  85,  87,  89,  91,  93,  95,
//          97,  99, 101, 103, 105, 107, 109, 111, 113, 115,
//         117, 119, 121, 123, 125, 127, 129, 131, 133, 135,
//         137, 139, 141, 143, 145, 147, 149, 151, 153
//       ]
//     }
//   ],
//   markFilteringSet: undefined
// }

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

export interface FontGlyphMap {
  /** type added to differentiate from images and svgs */
  type: 'font'
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
  /** substitutes */
  substitutes: Substitute[]
}

export interface Options {
  /** path to the font files; Glyphs will be stored in order of the font order provided */
  fontPaths: string[]
  /** extent of the font; Recommend 8_192 */
  extent: number
  /** Size of the glyph image by height; Recommend 32 to start */
  size: number
  /** range of the buffer around the glyph; recommend 6 */
  range: number
}

export async function processFont (name: string, options: Options): Promise<FontGlyphMap> {
  const { fontPaths, extent, range, size } = options
  // create an msdf object
  const fontGlyphMap: FontGlyphMap = {
    type: 'font',
    name,
    glyphSet: new Set<string>(),
    glyphs: [],
    defaultAdvance: -1,
    extent,
    range,
    size,
    maxHeight: 0,
    substitutes: []
  }

  // parse all fonts, if glyph already is stored, then it isn't read again.
  // In other words, whichever font goes first gets precedence on the glyph used.
  for (const path of fontPaths) {
    await parseFont(path, fontGlyphMap)
  }

  return fontGlyphMap
}

/** Grab all the unicodes */
async function parseFont (path: string, fontGlyphMap: FontGlyphMap): Promise<void> {
  log(`parsing ${path}`)
  const { extent } = fontGlyphMap
  const font = await loadFont(path)
  if (font === undefined) throw new Error(`Loading font from ${path} has failed`)
  const { unitsPerEm } = font
  const mul = extent / unitsPerEm
  // @ts-expect-error - glyphSet is private
  const glyphs = font.glyphs.glyphs as GlyphSet

  // first pass - store all glpyhs that contain a unicode
  storeUnicodeGlyphs(glyphs, fontGlyphMap, path, mul)
  // second pass - store all substitutes
  buildSubstitutes(font, glyphs, fontGlyphMap, path, mul)
}

function storeUnicodeGlyphs (
  glyphs: GlyphData,
  fontGlyphMap: FontGlyphMap,
  path: string,
  mul: number
): void {
  for (const glyph of Object.values(glyphs)) {
    const { unicodes } = glyph
    for (const unicode of unicodes) {
      const code = String(unicode)
      if (
        !isNaN(unicode) &&
        unicode >= 0 &&
        unicode <= 65535 &&
        !fontGlyphMap.glyphSet.has(code)
      ) {
        storeGlyph({ unicode }, glyph as FontGlyph, fontGlyphMap, path, mul)
      }
    }
  }
}

function storeGlyph (
  input: { unicode: number } | { code: number, id: string },
  glyph: FontGlyph,
  fontGlyphMap: FontGlyphMap,
  path: string,
  mul: number
): void {
  const isUnicode = 'unicode' in input
  const id = isUnicode ? String(input.unicode) : input.id
  const { round, abs } = Math
  const { advanceWidth, leftSideBearing } = glyph
  const bbox = glyph.getBoundingBox()
  const base: GlyphBase = {
    id,
    path,
    dead: abs(bbox.x2 - bbox.x1) < 1 && abs(bbox.y2 - bbox.y1) < 1,
    bbox: {
      x1: round(bbox.x1 * mul),
      x2: round(bbox.x2 * mul),
      y1: round(bbox.y1 * mul),
      y2: round(bbox.y2 * mul)
    },
    advanceWidth: round(advanceWidth * mul),
    leftSideBearing,
    // these are filled in later if using SDF
    width: -1,
    height: -1,
    texWidth: -1,
    texHeight: -1,
    xOffset: -1,
    yOffset: -1,
    length: -1,
    // Stored later regardless of store type
    glyphBuffer: Buffer.alloc(0)
  }
  if (isUnicode) {
    fontGlyphMap.glyphs.push({
      ...base,
      type: 'unicode',
      unicode: input.unicode
    })
  } else {
    fontGlyphMap.glyphs.push({
      ...base,
      type: 'substitution',
      code: input.code
    })
  }
  fontGlyphMap.glyphSet.add(id)
  if (isUnicode && input.unicode === 32 && fontGlyphMap.defaultAdvance === -1) {
    fontGlyphMap.defaultAdvance = round(advanceWidth * mul)
  }
}

async function loadFont (path: string): Promise<Font | undefined> {
  return await new Promise((resolve, reject) => {
    load(path, (err, font) => {
      if (err != null) reject(err)
      resolve(font)
    })
  })
}

function buildSubstitutes (
  font: Font,
  glyphs: GlyphData,
  fontGlyphMap: FontGlyphMap,
  path: string,
  mul: number
): void {
  let substitutes: Substitute[] = []
  if (font?.tables?.gsub?.lookups === undefined) return
  let foundNew = false
  // keep looping until no new substitutes are found
  do {
    foundNew = false
    substitutes = []
    for (const lookup of font.tables.gsub.lookups as Lookup[]) {
      if (lookup.lookupType === 4) {
        for (const { substFormat, coverage, ligatureSets } of lookup.subtables) {
          if (substFormat === 1) {
            if (coverage.format === 1) {
              for (let i = 0; i < coverage.glyphs.length; i++) {
                const glyph = coverage.glyphs[i]
                for (const { ligGlyph, components } of ligatureSets[i]) {
                  // remap complete component set to unicodes
                  const fullComponents = [glyph, ...components]
                  const unicodeComponents = fullComponents.flatMap(code => {
                    const glyph = glyphs[code]
                    return glyph.unicode ?? glyph.substitute ?? glyph.parent
                  })
                  if (unicodeComponents.includes(undefined)) continue
                  if (unicodeComponents.some(c => c === undefined || c > 65535)) continue
                  // we found a new substitute so let's add to the list if necessary
                  const ligGlyphActual = glyphs[ligGlyph]
                  if (ligGlyphActual.substitute === undefined) {
                    foundNew = true
                    ligGlyphActual.substitute = unicodeComponents as number[]
                  }
                  substitutes.push({
                    type: 4,
                    fullComponents,
                    substitute: `${unicodeComponents.join('.')}`,
                    substituteIndex: ligGlyph,
                    // @ts-expect-error - undefined has already been filtered out
                    components: unicodeComponents,
                    // @ts-expect-error - undefined has already been filtered out
                    code: [4, unicodeComponents.length, ...unicodeComponents],
                    codeString: `4.${unicodeComponents.length}.${unicodeComponents.join('.')}`
                  })
                }
              }
            } else if (coverage.format === 2) {
              for (const { start, end, index } of coverage.ranges) {
                let currentIndexOffset = 0
                // glyph is the starting value. + components = ligGlyph
                for (let glyph = start; glyph <= end; glyph++) {
                  for (const { ligGlyph, components } of ligatureSets[index + currentIndexOffset]) {
                    // remap complete component set to unicodes
                    const fullComponents = [glyph, ...components]
                    const unicodeComponents = fullComponents.flatMap(code => {
                      const glyph = glyphs[code]
                      return glyph.unicode ?? glyph.substitute ?? glyph.parent
                    })
                    if (unicodeComponents.includes(undefined)) continue
                    if (unicodeComponents.some(c => c === undefined || c > 65535)) continue
                    // we found a new substitute so let's add to the list if necessary
                    const ligGlyphActual = glyphs[ligGlyph]
                    if (ligGlyphActual.substitute === undefined) {
                      foundNew = true
                      ligGlyphActual.substitute = unicodeComponents as number[]
                    }
                    substitutes.push({
                      type: 4,
                      fullComponents,
                      substitute: `${unicodeComponents.join('.')}`,
                      substituteIndex: ligGlyph,
                      // @ts-expect-error - undefined has already been filtered out
                      components: unicodeComponents,
                      // @ts-expect-error - undefined has already been filtered out
                      code: [4, unicodeComponents.length, ...unicodeComponents],
                      codeString: `4.${unicodeComponents.length}.${unicodeComponents.join('.')}`
                    })
                  }
                  currentIndexOffset++
                }
              }
            }
          }
        }
      } else if (lookup.lookupType === 1) {
        for (const subTable of lookup.subtables) {
          const { substFormat } = subTable
          let { coverage } = subTable
          coverage = coverage.format === 2 ? convertCoverage2ToCoverage1(coverage) : coverage
          if (substFormat === 1) {
            const { deltaGlyphId } = subTable
            for (const parent of coverage.glyphs) {
              const child = parent + deltaGlyphId
              const glyphChild = glyphs[child]
              const glyphParent = glyphs[parent]
              if (glyphChild === undefined || glyphParent === undefined) continue
              if (
                glyphChild.parent === undefined &&
                (glyphParent.unicode !== undefined || glyphParent.parent !== undefined)
              ) {
                foundNew = true
                glyphChild.parent = glyphParent.unicode ?? glyphParent.parent
              }
            }
          } else if (substFormat === 2) {
            for (let i = 0; i < coverage.glyphs.length; i++) {
              const parent = coverage.glyphs[i]
              const child = subTable.substitute[i]
              const glyphChild = glyphs[child]
              const glyphParent = glyphs[parent]
              if (glyphChild === undefined || glyphParent === undefined) continue
              if (
                glyphChild.parent === undefined &&
                (glyphParent.unicode !== undefined || glyphParent.parent !== undefined)
              ) {
                foundNew = true
                glyphChild.parent = glyphParent.unicode ?? glyphParent.parent
              }
            }
          }
        }
      }
    }
  } while (foundNew)

  // console.log(substitutes.length)
  // const hasTheRightOne = substitutes.filter(({ components }) => components[0] === 3942 && components[1] === 3984 && components[2] === 4017)
  // console.log(hasTheRightOne)
  // build the substitute glyphs
  for (const { substitute, substituteIndex } of substitutes) {
    const glyph = glyphs[substituteIndex] as FontGlyph
    if (!fontGlyphMap.glyphSet.has(substitute)) {
      storeGlyph({ code: substituteIndex, id: substitute }, glyph, fontGlyphMap, path, mul)
    }
  }

  // store the substitutes
  fontGlyphMap.substitutes.push(...substitutes)
}

function convertCoverage2ToCoverage1 (input: CoverageFormat2): CoverageFormat1 {
  const glyphs = []
  for (const { start, end } of input.ranges) {
    for (let i = start; i <= end; i++) glyphs.push(i)
  }
  return {
    format: 1,
    glyphs
  }
}
