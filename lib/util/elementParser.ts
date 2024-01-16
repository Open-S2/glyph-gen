import parseSVG from 'svg-path-parser'
import { parseColor } from './color'

export interface Color { r: number, g: number, b: number, a: number }

export interface Path {
  d: string
  fill: string
  opacity?: string
  style?: string
  [key: string]: string | undefined
}

export interface ParsedPath {
  path: string
  color: Color
}

export function parsePath (path: Path): ParsedPath | undefined {
  if (path.style !== undefined) injectStyle(path, path.style)
  if (path.fill === undefined) return
  const color = parseColor(path.fill)
  if (color === undefined) return
  if (path.opacity !== undefined) color[3] = Math.round(+path.opacity * 255)
  const [r, g, b, a] = color

  const { d } = path
  // @ts-expect-error - svg-path-parser is not typed
  const parsedPath = parseSVG(d) as string
  if (parsedPath === undefined) return

  return {
    path: parsedPath,
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
