const { load } = require('opentype.js')

load('./d5dd9f5d.ttf', (err, font) => {
  if (!err && font) {
    console.log(font)
  } else console.log('error', err)
})
