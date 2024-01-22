// @flow
const { buildFont } = require('../../lib/index.js')

buildFont({
  name: 'RobotoRegular',
  outPath: './buildTestOut/Roboto',
  fontPaths: ['./openFonts/Roboto/Roboto-Regular.ttf'],
  extent: 8_192,
  size: 28,
  range: 6
})
