import { readFileSync } from 'fs'
import Parser from 'fast-xml-parser'
import parseSVG from 'svg-path-parser'
import { parseColor } from './color'

export interface SVG {
  g: SVG
  path: Path | Path[]
}

export interface Color { r: number, g: number, b: number, a: number }

export interface Path {
  d: string
  fill: string
  opacity?: string
  style?: string
  [key: string]: string | undefined
}

export interface ParsedPath {
  index: number
  path: string
  elements: any
  color: Color
}

export function getSVGData (inputFile: string): ParsedPath[] {
  const data = readFileSync(inputFile, 'utf8')
  const parsedSVG = Parser.parse(data, { parseAttributeValue: true, ignoreAttributes: false, attributeNamePrefix: '' })
  const { svg } = parsedSVG
  const res: Array<ParsedPath | undefined> = []

  const indexTracker = { index: 0 }
  parseFeatures(svg, res, indexTracker)

  return res.filter(f => f !== undefined) as ParsedPath[]
}

export function parseFeatures (
  svg: SVG,
  res: Array<ParsedPath | undefined>,
  indexTracker: { index: number }
): void {
  for (const key in svg) {
    if (key === 'path') {
      const svgPaths = svg[key]
      if (svgPaths !== undefined) { // multiple element objects
        if (Array.isArray(svgPaths)) {
          for (const element of svgPaths) res.push(parsePath(element, indexTracker))
        } else {
          res.push(parsePath(svgPaths, indexTracker))
        }
      }
    } else if (key === 'g') {
      parseFeatures(svg[key], res, indexTracker)
    }
  }
}

export function parsePath (path: Path, indexTracker: { index: number }): ParsedPath | undefined {
  if (path.style !== undefined) injectStyle(path, path.style)
  if (path.fill === undefined) return
  const color = parseColor(path.fill)
  if (color === undefined) return
  if (path.opacity !== undefined) color[3] = Math.round(+path.opacity * 255)
  const [r, g, b, a] = color

  const { d } = path
  // @ts-expect-error - svg-path-parser is not typed
  const parsedPath = parseSVG(d)
  if (parsedPath === undefined) return

  // take d and remove all spaces, tabs, newlines, etc. using expressions
  const dClean = d.replace(/\s/g, '')

  return {
    index: indexTracker.index++,
    path: dClean,
    elements: parsedPath,
    color: { r, g, b, a }
  }
}

function injectStyle (obj: Path, style: string): void {
  const styles = style.split(';')
  for (const s of styles) {
    if (s.length > 0) {
      const [key, value] = s.split(':')
      obj[key] = value.replace(/\s/g, '')
    }
  }
}
