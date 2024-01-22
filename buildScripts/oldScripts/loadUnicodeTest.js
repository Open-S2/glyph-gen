const fs = require('fs')
const sharp = require('sharp')
const Database = require('better-sqlite3')
const schema = fs.readFileSync(__dirname + '../lib/schema.sql', 'utf8')

// const db = new Database('buildTestOut/Roboto/RobotoRegular.font', { readonly: true })
const db = new Database('./builtGlyphsV2/Noto/NotoSansRegular.font', { readonly: true })
// const db = new Database('./builtGlyphsV2/Noto/NotoSansEthiopic.font', { readonly: true })
db.exec(schema)

const getUnicode = db.prepare('SELECT data FROM glyph WHERE code = @code')
// const res = getUnicode.get({ code: '#'.charCodeAt(0) })
const res = getUnicode.get({ code: 4620 })
console.log(res)
// grab full buffer
const fullBuffer = res.data
// grab the image buffer
const sliceBuffer = fullBuffer.slice(14)
// get image dimensions
const width = fullBuffer.readUInt8(6)
const height = fullBuffer.readUInt8(7)

sharp(sliceBuffer, {
  raw: {
    width,
    height,
    channels: 4
  }
})
  .toFile('testImage.webp')
  .then(() => {
    db.close()
  })
