import { processFont } from '../lib'
import { inspect } from 'util'

async function test (): Promise<void> {
  const data = await processFont('Roboto', {
    fontPaths: ['./test/features/fonts/Roboto/Roboto-Medium.ttf'],
    extent: 8192,
    range: 6,
    size: 32
  }).catch((err): void => { console.log(err) })
  if (data === undefined) return

  console.log(inspect(data.glyphs.filter(d => d.type === 'unicode')[0], { showHidden: false, depth: null, colors: true }))
}

void test()
