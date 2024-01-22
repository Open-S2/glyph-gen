import fs from 'fs'
import { load } from 'opentype.js'
// import fs from 'fs'
import { inspect } from 'util'

// https://github.com/search?q=repo%3Aharfbuzz%2Fharfbuzz%20tibet&type=code

/**
 * 1 => Single - [Replace one glyph with one glyph](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#SS)
 * 2 => Multiple - [Replace one glyph with more than one glyph](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#MS)
 * 3 => Alternate - [Replace one glyph with one of many glyphs](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#AS)
 * 4 => Ligature - [Replace multiple glyphs with one glyph](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#LGS)
 * 5 => Context - [Replace one or more glyphs in context](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#CS)
 * 6 => Chaining Context - [Replace one or more glyphs in chained context](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#CC)
 * 7 => Extension Substitution - [Extension mechanism for other substitutions](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#ES)
 * 8 => Reverse Chaining Context Single - [Replace single glyph in reverse chaining context](https://learn.microsoft.com/en-us/typography/opentype/spec/gsub#RCCS)
 *
 * 1 - useful for replacing CJK horizontal with vertical
 * 2 - joining two characters together like fi to ﬁ
 * 3 - never truly necessary
 * 4 - very important. Replace multiple characters with a single character
 */
export type LookupType =
    1 |
    2 |
    3 |
    4 |
    5 |
    6 |
    7 |
    8

// const font = await load(`./openFonts/Noto/NotoSans${LANGUAGE}-Regular.ttf`)
// fs.writeFileSync(`./lookups${LANGUAGE}.json`, JSON.stringify(font.tables.gsub.lookups, null, 2))

async function test (): Promise<void> {
  const font = await load('./openFonts/Noto/NotoSansSinhala/hinted/ttf/NotoSansSinhala-Regular.ttf')
  // // @ts-expect-error - ignore
  // const glyphs = font.glyphs.glyphs
  // for (const glyph of Object.values(glyphs)) {
  //   // // @ts-expect-error - ignore (40 / 0F63)
  //   // if (glyph.unicode === 3539 || glyph.unicodes?.includes(3539)) console.log(glyph)
  //   // // @ts-expect-error - ignore (1092)
  //   // if (glyph.name.includes('uni0F630F97')) console.log(glyph)
  // }
  // fs.writeFileSync('./lookupsSinhala.json', JSON.stringify(font.tables.gsub.lookups, null, 2))
  for (const lookup of font.tables.gsub.lookups) {
    if (lookup.lookupType === 4) {
      // console.log(lookup, lookup.subtables)
      for (let { coverage, ligatureSets } of lookup.subtables) {
        if (coverage.format === 2) coverage = convertCoverage2ToCoverage1(coverage)
        const glyphs = coverage.glyphs
        for (let i = 0; i < glyphs.length; i++) {
          const glyph = glyphs[i]
          const ligatureSet = ligatureSets[i]
          let hasNum = false
          for (const set of ligatureSet) {
            if (set.components.includes(59)) hasNum = true
            if (set.ligGlyph === 59) hasNum = true
          }
          if (
            glyph === 59 || // &&
            hasNum
          ) {
            console.log(glyph, inspect(ligatureSet, { showHidden: false, depth: null, colors: true }))
            console.log()
          }
        }
        // iterate all ligatureSets and see if one has "8205"
        // for (const ligatureSet of ligatureSets) {
        //   // for (const set of ligatureSet) {
        //   for (let i = 0; i < ligatureSet.length; i++) {
        //     const set = ligatureSet[i]
        //     const glyph = glyphs[i]
        //     if (
        //       false
        //       // glyph === 59 // &&
        //       // set.components.includes(65)
        //     ) {
        //       // const indexGlyph = coverage.glyphs.indexOf(59)
        //       console.log(glyph, inspect(set, { showHidden: false, depth: null, colors: true }))
        //       console.log()
        //     }
        //   }
        // }
      }
    }
    if (lookup.lookupType === 1) {
      console.log(inspect(lookup, { showHidden: false, depth: null, colors: true }))
    }
  }
}

// ශ්‍රී
// 8205 is the zero-width joiner
// ['3521', '3530', '8205', '3515', '3539'] unicodes
// [    59,     65,    641,     56,     70] ids

// // 59 + 65 + 641 + 56 + 70 => 891
// 59 + 65 => 221
// 56 + 70 => 346
// 65 + 641 + 56 => 129

// 59 + 56 + 70

// 300

//
//
//
//
//
//
//
//
//
//

// {"lookupType":1,"lookupFlag":0,"subtables":[{"substFormat":2,"coverage":{"format":2,"ranges":[{"start":1327,"end":1327,"index":0},{"start":1331,"end":1331,"index":1},{"start":1355,"end":1401,"index":2}]},"substitute":[1421,1432,1437,1439,1441,1443,1459,1473,1487,1489,1499,1509,1519,1529,1541,1553,1563,1575,1577,1589,1605,1615,1631,1633,1645,1659,1675,1689,1691,1705,1715,1725,1735,1737,1739,1751,1761,1763,1765,1767,1777,1795,1807,1817,1833,1835,1837,1847,1857]}]}
// 1355 (start at 2)
// ['3939', '3991']

// ID   - UNICODE DECIMAL - UNICODE HEX
// 40   - 3939            - 0F63
// 1365 - 3991            - 0F97

// index: 983, 40 + 1365 => 983
// name: 'uni0F630F97',

// { format: 1, glyphs: [ 40 ] } [
//   [ { ligGlyph: 983, components: [ 1519 ] } ]
// ]

// So the GSUP claims 40 + 1519 => 983
// But the actual glyph is 40 + 1365 => 983
// So we need to find the 1365-1519 connection

//
//
//
//
//
//
//
//

// OLD PROBLEM:
// {
//   type: 4,
//   fullComponents: [ 43, 1451 ],
//   substitute: '3942.3984.4017',
//   substituteIndex: 1092,
//   components: [ 3942, 3984, 4017 ],
//   code: [ 4, 3, 3942, 3984, 4017 ],
//   codeString: '4.3.3942.3984.4017'
// },

// ACTUAL WORKING PROBLEM IN DECIMAL UNICODES: ['3942', '3984', '4017']

// WORKING BACKWARDS
// STEP 1: 0F66+0F90+0FB1 is glyph ID 1092
// LOOKUP 4 contains a match of 43 + 1451 => 1092 (43 ID is 0F66 UNICODE)/(1451 ID is 0F90+0FB1.2 UNICODE)
// LOOKUP 4 has another match of 1358 + 1390 => 1451 (1358 ID is 0F90 UNICODE)/(1451 ID is 0FB1.2 UNICODE)

// IDS 43 and 1358 look the same

// ID   - UNICODE DECIMAL - UNICODE HEX - VISUAL
// 43   - 3942            - 0F66        - ས
// 1358 - 3984            - 0F90        - ཐ
// 1390 - 4017            - 0FB1        - ྱ
// 1092 - 3942.3984.4017 (merged glyphs)

// PROBLEM: 1451 is NOT a unicode, so when lookup 1358 + 1390 => 1451 happens, it doesn't check for 3942.3984

// SOLUTION:
//    3984.4017 exists because they are merging two unicodes
//    While new mappings have been found, keep adding to the unicodes array the joined codepoints

// coverage: {
//   format: 2,
//   ranges: [
//     { start: 1327, end: 1327, index: 0 },
//     { start: 1358, end: 1360, index: 1 },
//     { start: 1362, end: 1369, index: 4 },
//     { start: 1371, end: 1374, index: 12 },
//     { start: 1376, end: 1379, index: 16 },
//     { start: 1381, end: 1384, index: 20 },
//     { start: 1387, end: 1388, index: 24 },
//     { start: 1392, end: 1396, index: 26 },
//     { start: 1399, end: 1401, index: 31 }
//   ]
// } : ligatureSets [
//   [
//     { ligGlyph: 1429, components: [ 1391 ] },
//     { ligGlyph: 1423, components: [ 1331 ] },
//     { ligGlyph: 1425, components: [ 1386 ] },
//     { ligGlyph: 1427, components: [ 1390 ] }
//   ],
//   [
//     { ligGlyph: 1457, components: [ 1391, 1331 ] },
//     { ligGlyph: 1449, components: [ 1386, 1331 ] },
//     { ligGlyph: 1453, components: [ 1390, 1331 ] },
//     { ligGlyph: 1455, components: [ 1391 ] },
//     { ligGlyph: 1445, components: [ 1331 ] },
//     { ligGlyph: 1447, components: [ 1386 ] },
//     { ligGlyph: 1451, components: [ 1390 ] }
//   ],
//   [
//     { ligGlyph: 1471, components: [ 1391, 1331 ] },
//     { ligGlyph: 1467, components: [ 1390, 1331 ] },
//     { ligGlyph: 1469, components: [ 1391 ] },
//     { ligGlyph: 1461, components: [ 1331 ] },
//     { ligGlyph: 1463, components: [ 1386 ] },
//     { ligGlyph: 1465, components: [ 1390 ] }
//   ],
//   ...
// ]

// coverage.glyphs map one-to-one with ligatureSets
// so a glyph value will be a number.
// a ligatureSet: { ligGlyph: number, components: number[] }
// glyph is the starting value. + components = ligGlyph
// TL;DR => coverage.glyphs[x] + ...ligatureSets[x].components = ligatureSets[x].ligGlyph
// NOTE: All values are indexes, so we have to remap them to actual unicodes
// store the first example: 11+1324 = 30 as '11.1324' but convert the 11 and 1324 to unicode
// { format: 1, glyphs: [ 11, 12, 13, 1363, 1364, 1365 ] } [
//   [ { ligGlyph: 30, components: [ 1324 ] } ],
//   [ { ligGlyph: 31, components: [ 1324 ] } ],
//   [
//     { ligGlyph: 33, components: [ 1324, 1396 ] },
//     { ligGlyph: 32, components: [ 1324 ] }
//   ],
//   [ { ligGlyph: 1382, components: [ 1324 ] } ],
//   [ { ligGlyph: 1383, components: [ 1324 ] } ],
//   [
//     { ligGlyph: 1385, components: [ 1324, 1396 ] },
//     { ligGlyph: 1384, components: [ 1324 ] }
//   ]
// ]
// { format: 1, glyphs: [ 43 ] } [ [ { ligGlyph: 1110, components: [Array] } ] ] [ 1545 ]
// { format: 1, glyphs: [ 123 ] } [ [ { ligGlyph: 850, components: [Array] } ] ] [ 1479, 1432 ]
void test()
  .catch((err) => { console.log(err) })
// fs.writeFileSync('./lookupsRoboto.json', JSON.stringify(font.tables.gsub.lookups, null, 2))

// uni 0F4A 0F90 0F71
// ids   15 1443 1421

// {
//     "lookupType": 4,
//     "lookupFlag": 0,
//     "subtables": [
//       {
//         "substFormat": 1,
//         "coverage": {
//           "format": 1,
//           "glyphs": [
//             15 // IF THE FIRST CHAR IS 15
//           ]
//         },
//         "ligatureSets": [
//           [
//             {
//               "ligGlyph": 325, // REPLACE WITH 325 IF:
//               "components": [ // IT IS FOLLOWED BY 1443 AND 1421
//                 1443,
//                 1421
//               ]
//             }
//           ]
//         ]
//       }
//     ]
//   },

// [
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 6,
//       lookupFlag: 0,
//       subtables: [ [Object], [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 1,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 2,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },

//     {
//       lookupType: 4,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 2,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 6,
//       lookupFlag: 0,
//       subtables: [ [Object], [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 4,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 4,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 5,
//       lookupFlag: 0,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 6,
//       lookupFlag: 256,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },
//     {
//       lookupType: 5,
//       lookupFlag: 8,
//       subtables: [ [Object] ],
//       markFilteringSet: undefined
//     },

// {
//     "lookupType": 4,
//     "lookupFlag": 512,
//     "subtables": [
//       {
//         "substFormat": 1,
//         "coverage": {
//           "format": 1,
//           "glyphs": [ IF THE FIRST CHAR IS 209 or 360
//             209,
//             360
//           ]
//         },
//         "ligatureSets": [
//           [ // 209
//             {
//               "ligGlyph": 412,
//               "components": [
//                 378
//               ]
//             }
//           ],
//           [ // 360
//             {
//               "ligGlyph": 411,
//               "components": [
//                 378
//               ]
//             }
//           ]
//         ]
//       }
//     ]
//   },

// {
//   lookupType: 1,
//   lookupFlag: 0,
//   subtables: [
//     {
//       substFormat: 1,
//       coverage: { format: 1, glyphs: [ 123 ] },
//       deltaGlyphId: 16
//     }
//   ],
//   markFilteringSet: undefined
// }

// {
//   lookupType: 1,
//   lookupFlag: 0,
//   subtables: [
//     {
//       substFormat: 2,
//       coverage: { format: 2, ranges: [ { start: 6, end: 54, index: 0 } ] },
//       substitute: [
//          57,  59,  61,  63,  65,  67,  69,  71,  73,  75,
//          77,  79,  81,  83,  85,  87,  89,  91,  93,  95,
//          97,  99, 101, 103, 105, 107, 109, 111, 113, 115,
//         117, 119, 121, 123, 125, 127, 129, 131, 133, 135,
//         137, 139, 141, 143, 145, 147, 149, 151, 153
//       ]
//     }
//   ],
//   markFilteringSet: undefined
// }

function convertCoverage2ToCoverage1 (input: any): { format: 1, glyphs: number[] } {
  const glyphs: number[] = []
  for (const { start, end } of input.ranges) {
    for (let i = start; i <= end; i++) glyphs.push(i)
  }
  return {
    format: 1,
    glyphs
  }
}
