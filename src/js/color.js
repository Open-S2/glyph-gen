function parseColor (input) {
  if (input[0] === '#') return parseHex(input) // hex encoding
  else return parseString(input)
}

function parseHex (input) {
  input = input.substr(1)
  // shorthand notation
  if (input.length % 3 === 0) {
    if (input.length === 3) {
      input = input.split('')
      input = input[0] + input[0] + input[1] + input[1] + input[2] + input[2]
    }
    const u = parseInt(input, 16)
    const r = u >> 16
    const g = (u >> 8) & 0xFF
    const b = u & 0xFF
    return [r, g, b, 255]
  } else if (input.length % 4 === 0) {
    if (input.length === 4) {
      input = input.split('')
      input = input[0] + input[0] + input[1] + input[1] + input[2] + input[2] + input[3] + input[3]
    }
    const u = parseInt(input, 16)
    const r = (u >> 24) & 0xFF
    const g = (u >> 16) & 0xFF
    const b = (u >> 8) & 0xFF
    const a = Math.round(Math.round((u & 0xFF) / 0xFF * 100) / 100 * 255)
    return [r, g, b, a]
  }
}

function parseString (input) {
  // seperate type and values
  let [type, values] = input.split('(')
  // cleanup values
  values = values.split(')')[0]
  // parse numbers
  values = values.split(',').map(Number)
  // if no alpha type present, add alpha number
  if (type.length === 3) {
    values.push(1)
  } else {
    // remove extra character for Color class
    type = type.slice(0, -1)
  }
  values = values.map(Math.round)
  return values
}

exports.parseColor = parseColor
