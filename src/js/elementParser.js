// @flow
const parseSVG = require('svg-path-parser')
const { parseColor } = require('./color.js')

function parsePath (path) {
  if (path.style) _injectStyle(path, path.style)
  if (!path.fill) return
  const color = parseColor(path.fill)
  if (!color) return
  if (path.opacity) color[3] = Math.round(+path.opacity * 255)
  const [r, g, b, a] = color

  const { d } = path
  const parsedPath = parseSVG(d)
  if (!parsedPath) return

  return {
    path: parsedPath,
    color: { r, g, b, a }
  }
}

function _injectStyle (obj, style) {
  const styles = style.split(';')
  for (const s of styles) {
    if (s.length) {
      const [key, value] = s.split(':')
      obj[key] = value.replace(/\s/g, '')
    }
  }
}

exports.parsePath = parsePath
