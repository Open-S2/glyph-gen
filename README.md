# msdf-gpu [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][downloads-url] [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[travis-image]: https://travis-ci.org/open-s2/msdf-gpu.svg?branch=master
[travis-url]: https://travis-ci.org/open-s2/msdf-gpu
[npm-image]: https://img.shields.io/npm/v/msdf-gpu.svg
[npm-url]: https://npmjs.org/package/msdf-gpu
[downloads-image]: https://img.shields.io/npm/dm/msdf-gpu.svg
[downloads-url]: https://www.npmjs.com/package/msdf-gpu

## About

**Render MSDF bitmaps with vector like quality**

### Getting started

#### Create font set

```js
const { buildFont } = require('msdf-gpu')

buildFont({
  name: 'RobotoRegular',
  outPath: './buildTestOut/Roboto',
  fontPaths: ['./openFonts/Roboto/Roboto-Regular.ttf'], // First font takes priority for glyphs. Every added font will be used for glyphs that the previous fonts don't have.
  extent: 8_192, // must be power of 2, 8192 is a good default, but 4096 is a good compromise
  size: 22, // standard vertical size of font in pixels
  range: 6 // SDF range in pixels, larger = more detailed but more blurry
})
```

#### Create icon set

```js
const { buildIcons } = require('msdf-gpu')

buildIcons({
  inputFolder: './icons/streets', // folder with icons made up of SVGs (ONLY 'fill' paths, no strokes or shapes)
  outPath: './buildTestOut/Streets',
  outName: 'streets',
  extent: 8_192, // must be power of 2, 8192 is a good default, but 4096 is a good compromise
  size: 42, // standard vertical size of font in pixels. Larger size is better for icons.
  range: 6 // SDF range in pixels, larger = more detailed but more blurry
})

```

## Install The appropriate tools

### Submodules

```sh
# Add missing submodules
git submodule update --init --recursive
```

### FreeType

```sh
cd src/freetype2
./configure
# make build directory
mkdir build
cd build
# generate build files
cmake ..
# build
make
```

### Skia

```sh
# help guide: https://skia.org/docs/user/build/
cd src/skia
python3 tools/git-sync-deps
# If you are building for Apple Silicon (M1 and newer) instead, add a gn arg to set target_cpu="arm64"
# Options:
# MacOS: target_os="mac" target_cpu="arm64"
# Ubuntu/Linux: target_os="linux" target_cpu="x64"
# example script:
./bin/gn gen out/Release --args='
    is_official_build=true
    target_cpu="arm64"
    extra_cflags=[ "-fPIC", "-I/usr/local/include/freetype2" ]
    extra_cflags_cc=["-frtti"]
    skia_enable_tools=true skia_enable_skshaper=true
    skia_use_icu=false skia_use_sfntly=false skia_use_piex=true
    skia_enable_skottie=true skia_use_freetype=true skia_use_harfbuzz=false
    skia_use_system_expat=false skia_use_system_libjpeg_turbo=false skia_use_system_libpng=false skia_use_system_libwebp=false skia_use_system_zlib=false
    skia_enable_gpu=true'
# If some header files are missing, install the corresponding dependencies:
tools/install_dependencies.sh
# Once you have generated your build files, run Ninja to compile and link Skia:
ninja -C out/Release skia
```

## Special Language Support

This module is not designed to handle RTL bidirectional or glyph shaping. To add support for these features, you will need to use a library like [TODO ADD RTL MODULE]()

[x] [Standard (Latin, Cyrillic, Greek, etc.)](https://learn.microsoft.com/en-us/typography/script-development/standard)
[x] [Arabic](https://learn.microsoft.com/en-us/typography/script-development/arabic)
[ ] [Buginese](https://learn.microsoft.com/en-us/typography/script-development/buginese)
[ ] [Hangul](https://learn.microsoft.com/en-us/typography/script-development/hangul)
[x] [Hebrew](https://learn.microsoft.com/en-us/typography/script-development/hebrew)
[ ] [Indic: Bengali](https://learn.microsoft.com/en-us/typography/script-development/bengali)
[ ] [Indic: Devanagari](https://learn.microsoft.com/en-us/typography/script-development/devanagari)
[ ] [Indic: Gujarati](https://learn.microsoft.com/en-us/typography/script-development/gujarati)
[ ] [Indic: Gurmukhi](https://learn.microsoft.com/en-us/typography/script-development/gurmukhi)
[ ] [Indic: Kannada](https://learn.microsoft.com/en-us/typography/script-development/kannada)
[ ] [Indic: Malayalam](https://learn.microsoft.com/en-us/typography/script-development/malayalam)
[ ] [Indic: Odia](https://learn.microsoft.com/en-us/typography/script-development/odia)
[ ] [Indic: Tamil](https://learn.microsoft.com/en-us/typography/script-development/tamil)
[ ] [Indic: Telugu](https://learn.microsoft.com/en-us/typography/script-development/telugu)
[ ] [Javanese](https://learn.microsoft.com/en-us/typography/script-development/javanese)
[ ] [Khmer](https://learn.microsoft.com/en-us/typography/script-development/khmer)
[ ] [Lao](https://learn.microsoft.com/en-us/typography/script-development/lao)
[ ] [Myanmar](https://learn.microsoft.com/en-us/typography/script-development/myanmar)
[ ] [Sinhala](https://learn.microsoft.com/en-us/typography/script-development/sinhala)
[ ] [Syric](https://learn.microsoft.com/en-us/typography/script-development/syriac)
[ ] [Thaana](https://learn.microsoft.com/en-us/typography/script-development/thaana)
[ ] [Thai](https://learn.microsoft.com/en-us/typography/script-development/thai)
[ ] [Tibetan](https://learn.microsoft.com/en-us/typography/script-development/tibetan)

## Conceptual Fixes

[ ] Switch CJK to vertical substitutions
