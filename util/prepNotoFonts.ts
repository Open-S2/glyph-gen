import fs from 'fs'

const NOTO_PATH = './openFonts/Noto'
const NOTO_PATH_CJK = './openFonts/NotoCJK/Sans/OTF'
const CJK_FOLDERS = [
  'Japanese',
  'Korean',
  'SimplifiedChinese',
  'TraditionalChinese',
  'TraditionalChineseHK'
]

const FILTER_KEYWORDS = [
  'Condensed',
  'ExtraCondensed',
  'SemiCondensed',
  'UI',
  'Unjoined',
  '.DS_Store',
  'LICENSE'
]

const FILTER_FONTS = [
  'NotoFangsongKSSRotated',
  'NotoFangsongKSSVertical',
  'NotoKufiArabic',
  'NotoLoopedThai',
  'NotoMusic'
]

// interface NotoFonts {
//   light: string[]
//   regular: string[]
//   medium: string[]
//   bold: string[]
//   italic: string[]
//   boldItalic: string[]
//   [key: string]: string[]
// }

type Type = 'light' | 'regular' | 'medium' | 'bold' | 'italic' | 'boldItalic'

const NOTO_FONTS: Record<string, string[]> = {
  light: [],
  regular: [],
  medium: [],
  bold: [],
  italic: [],
  bolditalic: []
}

// 1) start with all that include "NotoSans"
// 2) do any with "NotoSerif" that wasn't already included with sans
// 3) do any with that do NOT have "NotoSans" or "NotoSerif" in the name
// 4) include CJK fonts

const files = fs.readdirSync(NOTO_PATH)
// NOTO SANS
for (const file of files) {
  if (FILTER_FONTS.includes(file)) continue
  if (FILTER_KEYWORDS.some(keyword => file.includes(keyword))) continue
  if (file.includes('NotoSans')) {
    for (const type of Object.keys(NOTO_FONTS)) {
      pullInFont(`${NOTO_PATH}/${file}/hinted/ttf`, type as Type, NOTO_FONTS[type])
    }
  }
}
// NOTO SERIF
for (const file of files) {
  if (FILTER_FONTS.includes(file)) continue
  if (FILTER_KEYWORDS.some(keyword => file.includes(keyword))) continue
  if (file.includes('NotoSerif')) {
    for (const type of Object.keys(NOTO_FONTS)) {
      pullInFont(`${NOTO_PATH}/${file}/hinted/ttf`, type as Type, NOTO_FONTS[type])
    }
  }
}
// OTHER
for (const file of files) {
  if (FILTER_FONTS.includes(file)) continue
  if (FILTER_KEYWORDS.some(keyword => file.includes(keyword))) continue
  if (!file.includes('NotoSans') && !file.includes('NotoSerif')) {
    for (const type of Object.keys(NOTO_FONTS)) {
      pullInFont(`${NOTO_PATH}/${file}/hinted/ttf`, type as Type, NOTO_FONTS[type])
    }
  }
}

// sort fonts so that if type is 'bold' then it might have some regular fonts in it; put them last
for (const type of Object.keys(NOTO_FONTS)) {
  if (type === 'regular') continue
  NOTO_FONTS[type].sort((a, b) => {
    if (a.includes('Regular')) return 1
    if (b.includes('Regular')) return -1
    return 0
  })
}

// CJK
for (const file of CJK_FOLDERS) {
  for (const type of Object.keys(NOTO_FONTS)) {
    pullInFont(`${NOTO_PATH_CJK}/${file}`, type as Type, NOTO_FONTS[type])
  }
}

function pullInFont (folder: string, type: Type, store: string[]): void {
  const fonts = fs.readdirSync(folder)
  let found = fonts.find(font => {
    if (FILTER_KEYWORDS.some(keyword => font.includes(keyword))) return false
    if (font.toLocaleLowerCase().includes(`-${type}`)) return true
    return false
  })
  if (found === undefined) {
    found = fonts.find(font => {
      if (FILTER_KEYWORDS.some(keyword => font.includes(keyword))) return false
      if (font.toLocaleLowerCase().includes('-regular')) return true
      return false
    })
  }
  if (found !== undefined) store.push(`${folder}/${found}`)
}

fs.writeFileSync('./openFonts/noto-fonts.json', JSON.stringify(NOTO_FONTS, null, 2))
