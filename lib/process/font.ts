import { load } from 'opentype.js'
import { stdout as log } from 'single-line-log'

import type {
  BBOX,
  CoverageFormat1,
  CoverageFormat2,

  FontGlyphMap,
  GlyphBase,
  Lookup,
  Substitute
} from './'
import type { Font, Glyph as OpenTypeGlyph } from 'opentype.js'

export type GeneratedOpenTypeGlyph = OpenTypeGlyph & {
  substitute?: number[]
  parent?: number
}

export type GlyphData = Record<string, GeneratedOpenTypeGlyph>

export interface FontGlyph {
  index: number
  unicodes: number[]
  advanceWidth: number
  leftSideBearing: number
  getBoundingBox: () => BBOX
}

export interface FontOptions {
  /** path to the font files; Glyphs will be stored in order of the font order provided */
  fontPaths: string[]
  /** extent of the font; Recommend 8_192 */
  extent?: number
  /** Size of the glyph image by height; Recommend 32 to start */
  size?: number
  /** range of the buffer around the glyph; recommend 6 */
  range?: number
}

export async function processFont (
  name: string,
  {
    fontPaths,
    extent = 8192,
    range = 6,
    size = 32
  }: FontOptions,
  consoleLog = false
): Promise<FontGlyphMap> {
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
    await parseFont(path, fontGlyphMap, consoleLog)
  }

  return fontGlyphMap
}

/** Grab all the unicodes and substitutions */
async function parseFont (
  path: string,
  fontGlyphMap: FontGlyphMap,
  consoleLog: boolean
): Promise<void> {
  if (consoleLog) log(`parsing ${path}`)
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
      const hasCode: boolean = fontGlyphMap.glyphSet.has(code)
      if (
        !isNaN(unicode) &&
        unicode >= 0 &&
        unicode <= 65535 &&
        !hasCode
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
  file: string,
  mul: number
): void {
  const isUnicode = 'unicode' in input
  const id = isUnicode ? String(input.unicode) : input.id
  const { round, abs } = Math
  const { advanceWidth, leftSideBearing } = glyph
  const bbox = glyph.getBoundingBox()
  const base: GlyphBase = {
    id,
    file,
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
    imageBuffer: Buffer.alloc(0),
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
                const indexValue: number = index
                let currentIndexOffset = 0
                // glyph is the starting value. + components = ligGlyph
                for (let glyph = start; glyph <= end; glyph++) {
                  for (const { ligGlyph, components } of ligatureSets[indexValue + currentIndexOffset]) {
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
            const deltaGlyphId: number = subTable.deltaGlyphId
            for (const parent of coverage.glyphs) {
              const parentNum: number = parent
              const child = parentNum + deltaGlyphId
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

  // build the substitute glyphs
  for (const { substitute, substituteIndex } of substitutes) {
    const glyph = glyphs[substituteIndex] as FontGlyph
    const hasSub: boolean = fontGlyphMap.glyphSet.has(substitute)
    if (!hasSub) {
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
