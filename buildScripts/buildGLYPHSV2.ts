import { generateGlyphs } from '../lib'
import fs from 'fs'

const NOTO_FONTS = JSON.parse(fs.readFileSync('./openFonts/noto-fonts.json', 'utf8'))

async function main (): Promise<void> {
  // ROBOTO Regular
  console.log('\nROBOTO REGULAR')
  await generateGlyphs({
    name: 'RobotoRegular',
    processOptions: {
      fontPaths: ['./test/features/fonts/Roboto/Roboto-Regular.ttf'],
      extent: 8192,
      range: 6,
      size: 32
    },
    convertOptions: {
      convertType: 'mtsdf'
    },
    storeOptions: {
      storeType: 'SQL',
      out: './GLYPHS_V2.sqlite',
      multi: true
    }
  }).catch((err): void => { console.log(err) })
  // ROBOTO Medium
  console.log('\nROBOTO MEDIUM')
  await generateGlyphs({
    name: 'RobotoMedium',
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
      out: './GLYPHS_V2.sqlite',
      multi: true
    }
  }).catch((err): void => { console.log(err) })
  // NOTO REGULAR
  console.log('\nNOTO REGULAR')
  await generateGlyphs({
    name: 'NotoRegular',
    processOptions: {
      fontPaths: NOTO_FONTS.regular,
      extent: 8192,
      range: 6,
      size: 32
    },
    convertOptions: {
      convertType: 'mtsdf'
    },
    storeOptions: {
      storeType: 'SQL',
      out: './GLYPHS_V2.sqlite',
      multi: true
    }
  }).catch((err): void => { console.log(err) })
  // NOTO MEDIUM
  console.log('\nNOTO MEDIUM')
  await generateGlyphs({
    name: 'NotoMedium',
    processOptions: {
      fontPaths: NOTO_FONTS.medium,
      extent: 8192,
      range: 6,
      size: 32
    },
    convertOptions: {
      convertType: 'mtsdf'
    },
    storeOptions: {
      storeType: 'SQL',
      out: './GLYPHS_V2.sqlite',
      multi: true
    }
  }).catch((err): void => { console.log(err) })

  // // TESTING NOTO MEDIUM
  // console.log('\nNOTO MEDIUM')
  // await generateGlyphs({
  //   name: 'NotoMedium',
  //   processOptions: {
  //     fontPaths: ['./openFonts/Noto/NotoSerifTibetan/hinted/ttf/NotoSerifTibetan-Regular.ttf'],
  //     extent: 8192,
  //     range: 6,
  //     size: 32
  //   },
  //   convertOptions: {
  //     convertType: 'mtsdf'
  //   },
  //   storeOptions: {
  //     storeType: 'SQL',
  //     out: './GLYPHS_V2.sqlite',
  //     multi: true
  //   }
  // }).catch((err): void => { console.log(err) })
}

void main()
