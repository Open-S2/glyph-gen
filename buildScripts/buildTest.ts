import { buildFont } from "../lib"

const ROBOTO_FONT = ['./openFonts/Roboto/Roboto-Medium.ttf']

void buildFont({
  name: 'RobotoMedium',
  outPath: './builtGlyphsTmp/Roboto',
  fontPaths: ROBOTO_FONT,
  extent: 8_192,
  size: 32,
  range: 6
})
