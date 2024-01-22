import type { SubstituteParsed, LigatureSubstituteParsed } from './process/font'

export interface LigatureTree extends Record<number, LigatureTree> {
  /** unicode substitute if it ends here */
  substitute?: string
}

export class SubstitutionTable {
  ligatures: LigatureTree = {}
  constructor (substitutes: SubstituteParsed[]) {
    // build trees
    this.#buildTrees(substitutes)
  }

  static FromData (data: DataView): SubstitutionTable {
    return new SubstitutionTable(decompose(data))
  }

  /** Convert a string to an array of glyphLookupCodes */
  parseString (str: string): string[] {
    const strUnicodes = [...str].map((char) => String(char.charCodeAt(0)))

    this.#parseLigatures(strUnicodes)

    return strUnicodes
  }

  #parseLigatures (strUnicodes: string[]): void {
    // iterate through the unicodes and follow the tree, if we find a substitute,
    // replace the unicodes with the substitute, but don't stop diving down the tree until we don't find
    // a substitute. This is because we want to find the longest ligature match possible.
    for (let i = 0; i < strUnicodes.length; i++) {
      const unicode = Number(strUnicodes[i])
      let tree = this.ligatures
      let j = i
      while (tree[unicode] !== undefined) {
        tree = tree[unicode]
        if (tree.substitute !== undefined) {
          strUnicodes.splice(i, j - i + 1, tree.substitute)
          break
        }
        j++
        tree = tree[unicode]
      }
    }
  }

  #buildTrees (substitutes: SubstituteParsed[]): void {
    for (const substitute of substitutes) {
      if (substitute.type === 4) this.#buildLigature(substitute)
    }
  }

  #buildLigature (substitute: LigatureSubstituteParsed): void {
    const { components, substitute: sub } = substitute
    let tree = this.ligatures
    for (const component of components) {
      if (tree[component] === undefined) tree[component] = {}
      tree = tree[component]
    }
    tree.substitute = sub
  }
}

// SUBSTITUTE TYPE 4 ENCODING:
// 0: substitute type (writeUInt8) [4]
// 1: component count (writeUInt8)
// 2+: [repeating] component unicodes (writeUInt16LE)
export function decompose (data: DataView): SubstituteParsed[] {
  const substitutes: SubstituteParsed[] = []

  let i = 0
  while (i < data.byteLength) {
    const type = data.getUint8(i)
    if (type === 4) {
      // LIGATURE TYPE
      const count = data.getUint8(i + 1)
      const components = []
      for (let j = 0; j < count; j++) {
        components.push(data.getUint16(i + 2 + j * 2, true))
      }
      substitutes.push({
        type,
        substitute: components.join('.'),
        components
      })
      i += 2 + count * 2
    } else {
      throw new Error(`Unknown substitute type: ${type}`)
    }
  }

  return substitutes
}
