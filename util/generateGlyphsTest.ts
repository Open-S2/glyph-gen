import { generateGlyphs } from '../lib'

generateGlyphs({
  name: 'Roboto',
  processOptions: {
    fontPaths: ['./test/features/fonts/Roboto/Roboto-Medium.ttf'],
    extent: 8192,
    range: 6,
    size: 32
  },
  convertOptions: {
    convertType: 'mtsdf'
  },
  storeOptions: {
    storeType: 'SQL',
    out: './tmp-process-roboto-sdf.sqlite',
    multi: true
  }
})
  .catch((err): void => { console.log(err) })
