import fs from 'fs'
import { describe, it, expect } from 'vitest'
import { buildFontGlyph } from '../dist'

describe('buildFontGlyph tests', async (): Promise<void> => {
  it('SDF test', async (): Promise<void> => {
    const sdf = buildFontGlyph(
      './test/features/fonts/Roboto/Roboto-Medium.ttf',
      0x41, // A
      32,
      6,
      'sdf'
    )
    const sdfu8 = new Uint8Array(sdf.data)
    // grab image to compare
    const sdfImageBuffer = fs.readFileSync('./test/features/glyphs/sdf.raw')
    const sdfImageu8 = new Uint8Array(sdfImageBuffer)
    // compare
    expect(sdfu8).toEqual(sdfImageu8)
  })
  it('PSDF test', async (): Promise<void> => {
    const psdf = buildFontGlyph(
      './test/features/fonts/Roboto/Roboto-Medium.ttf',
      0x41, // A
      32,
      6,
      'psdf'
    )
    const psdfu8 = new Uint8Array(psdf.data)
    // grab image to compare
    const psdfImageBuffer = fs.readFileSync('./test/features/glyphs/psdf.raw')
    const psdfImageu8 = new Uint8Array(psdfImageBuffer)
    // compare
    expect(psdfu8).toEqual(psdfImageu8)
  })
  it('MSDF test', async (): Promise<void> => {
    const msdf = buildFontGlyph(
      './test/features/fonts/Roboto/Roboto-Medium.ttf',
      0x41, // A
      32,
      6,
      'msdf'
    )
    const msdfu8 = new Uint8Array(msdf.data)
    // grab image to compare
    const msdfImageBuffer = fs.readFileSync('./test/features/glyphs/msdf.raw')
    const msdfImageu8 = new Uint8Array(msdfImageBuffer)
    // compare
    expect(msdfu8).toEqual(msdfImageu8)
  })
  it('MTSDF test', async (): Promise<void> => {
    const mtsdf = buildFontGlyph(
      './test/features/fonts/Roboto/Roboto-Medium.ttf',
      0x41, // A
      32,
      6,
      'mtsdf'
    )
    const mtsdfu8 = new Uint8Array(mtsdf.data)
    // grab image to compare
    const mtsdfImageBuffer = fs.readFileSync('./test/features/glyphs/mtsdf.raw')
    const mtsdfImageu8 = new Uint8Array(mtsdfImageBuffer)
    // compare
    expect(mtsdfu8).toEqual(mtsdfImageu8)
  })
})
