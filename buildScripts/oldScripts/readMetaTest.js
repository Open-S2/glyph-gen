const fs = require('fs')
const Database = require('better-sqlite3')
const schema = fs.readFileSync(__dirname + '/../lib/schema.sql', 'utf8')

// const db = new Database(__dirname + '/../builtGlyphsV2/Avenir/AvenirBlack.font', { readonly: true })
// const db = new Database(__dirname + '/../buildTestOut/Roboto/RobotoRegular.font', { readonly: true })
// const db = new Database(__dirname + '/../builtGlyphsV2/tesla/tesla.icon', { readonly: true })
const db = new Database(__dirname + '/../builtGlyphsV2/Noto/NotoSansEthiopic.font', { readonly: true })
// db.exec(schema)

const getMetadata = db.prepare('SELECT data FROM metadata WHERE name = @name')
const meta = getMetadata.get({ name: 'metadata' })
const metadata = meta.data
console.log('metadata size', metadata.byteLength)

const glyphs = metadata.slice(30)
const extent = metadata.readUInt16LE(0)
const size = metadata.readUInt16LE(2)
const maxHeight = metadata.readUInt16LE(4)
const range = metadata.readUInt16LE(6)
const defaultAdvance = metadata.readUInt16LE(8)
const glyphCount = metadata.readUInt16LE(10)

console.log('extent', extent)
console.log('size', size)
console.log('maxHeight', maxHeight)
console.log('range', range)
console.log('defaultAdvance', defaultAdvance)
console.log('glyphCount', glyphCount)

const codes = []
for (let i = 0; i < glyphCount; i++) {
  const code = glyphs.readUInt16LE(i * 2)
  codes.push(code)
}
console.log(codes)
// convert codes to unicode strings
const unicodes = codes.map(code => String.fromCharCode(code))
console.log(unicodes)

db.close()