export function parseColor (input: string): number[] | undefined {
  if (input[0] === '#') return parseHex(input) // hex encoding
  else return parseString(input)
}

export function parseHex (input: string): number[] | undefined {
  input = input.substring(1)
  // shorthand notation
  if (input.length % 3 === 0) {
    if (input.length === 3) {
      const inputSplit = input.split('')
      input = inputSplit[0] + inputSplit[0] + inputSplit[1] + inputSplit[1] + inputSplit[2] + inputSplit[2]
    }
    const u = parseInt(input, 16)
    const r = u >> 16
    const g = (u >> 8) & 0xFF
    const b = u & 0xFF
    return [r, g, b, 255]
  } else if (input.length % 4 === 0) {
    if (input.length === 4) {
      const inputSplit = input.split('')
      input = inputSplit[0] + inputSplit[0] + inputSplit[1] + inputSplit[1] + inputSplit[2] + inputSplit[2] + inputSplit[3] + inputSplit[3]
    }
    const u = parseInt(input, 16)
    const r = (u >> 24) & 0xFF
    const g = (u >> 16) & 0xFF
    const b = (u >> 8) & 0xFF
    const a = Math.round(Math.round((u & 0xFF) / 0xFF * 100) / 100 * 255)
    return [r, g, b, a]
  }
}

export function parseString (input: string): number[] | undefined {
  // seperate type and values
  let [type, values] = input.split('(')
  // cleanup values
  values = values.split(')')[0]
  // parse numbers
  const numValues = values.split(',').map(Number)
  // if no alpha type present, add alpha number
  if (type.length === 3) {
    numValues.push(1)
  } else {
    // remove extra character for Color class
    type = type.slice(0, -1)
  }
  return numValues.map(Math.round)
}
