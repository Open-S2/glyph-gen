const { buildIcons } = require('../lib/index.js')

buildIcons({
  inputFolder: './icons/tesla',
  // outPath: './builtGlyphsV2/tesla',
  outPath: './builtGlyphsTmp/tesla',
  outName: 'tesla',
  extent: 8_192,
  size: 42,
  range: 6
})
