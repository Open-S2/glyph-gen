import { describe, it, expect } from 'vitest'
import { buildFontGlyph } from '../lib/binding'

describe('buildFontGlyph tests', () => {
  it('SDF test', () => {
    const sdf = buildFontGlyph(
      './test/features/fonts/Roboto/Roboto-Medium.ttf',
      0x41,
      32,
      6,
      'sdf'
    )
    console.log(sdf)
  })
})
