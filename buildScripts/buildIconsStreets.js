const { buildIcons } = require('../lib/index.js')

buildIcons({
  inputFolder: './icons/streets',
  // outPath: './builtGlyphsV2/streets',
  outPath: './builtGlyphsTmp/streets',
  outName: 'streets',
  extent: 8_192,
  size: 42,
  range: 6
})
