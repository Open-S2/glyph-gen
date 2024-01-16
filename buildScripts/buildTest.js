const { buildFont } = require("../dist")

const ROBOTO_FONT = ['./openFonts/Roboto/Roboto-Medium.ttf']

void buildFont({
  name: 'RobotoMedium',
  outPath: './builtGlyphsTmp',
  fontPaths: ROBOTO_FONT,
  extent: 8_192,
  size: 32,
  range: 6
})
