{
    'targets': [
        {
            'target_name': 'msdf-native',
            'sources': [
                'src/core/contour-combiners.cpp',
                'src/core/Contour.cpp',
                'src/core/edge-coloring.cpp',
                'src/core/edge-segments.cpp',
                'src/core/edge-selectors.cpp',
                'src/core/EdgeHolder.cpp',
                'src/core/equation-solver.cpp',
                'src/core/msdf-error-correction.cpp',
                'src/core/MSDFErrorCorrection.cpp',
                'src/core/msdfgen.cpp',
                'src/core/Projection.cpp',
                'src/core/rasterization.cpp',
                'src/core/render-sdf.cpp',
                'src/core/save-bmp.cpp',
                'src/core/save-tiff.cpp',
                'src/core/Scanline.cpp',
                'src/core/sdf-error-estimation.cpp',
                'src/core/shape-description.cpp',
                'src/core/Shape.cpp',
                'src/core/SignedDistance.cpp',
                'src/core/Vector2.cpp',
                'src/msdf_wrap.cc',
                'src/ext/import-font.cpp',
                'src/ext/import-svg.cpp',
                'src/ext/resolve-shape-geometry.cpp',
                'src/ext/tinyxml2.cpp'
            ],
            'include_dirs': [
                "<!@(node -p \"require('node-addon-api').include\")",
                "./src/freetype2/include",
                "./src/freetype2/include/freetype",
                "./src/freetype2/include/freetype/config",
                "./src/freetype2/include/freetype/internal",
                "./src/freetype2/include/freetype/internal/services",
                "./src/core",
                "./src/core-bak",
                "./src/ext",
                "./src/include",
                "./src/skia",
                "./src/skia/include",
                "./src/skia/include/atlastext",
                "./src/skia/include/c",
                "./src/skia/include/codec",
                "./src/skia/include/config",
                "./src/skia/include/core",
                "./src/skia/include/docs",
                "./src/skia/include/effects",
                "./src/skia/include/encode",
                "./src/skia/include/gpu",
                "./src/skia/include/pathops",
                "./src/skia/include/ports",
                "./src/skia/include/private",
                "./src/skia/include/svg",
                "./src/skia/include/utils"
            ],
            'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
            "libraries": [
                "<(module_root_dir)/./src/freetype2/build/libfreetype.a",
                "<(module_root_dir)/./src/skia/out/Release/libskia.a"
            ],
            "cflags!": [ "-fno-exceptions" ],
            "cflags_cc!": [ "-fno-exceptions" ],
            'xcode_settings': {
                'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
                'CLANG_CXX_LIBRARY': 'libc++',
                'MACOSX_DEPLOYMENT_TARGET': '14.0',
                'OTHER_CFLAGS': [ '-g', '-mmacosx-version-min=10.7', '-std=c++11', '-stdlib=libc++', '-O3', '-D__STDC_CONSTANT_MACROS', '-D_FILE_OFFSET_BITS=64', '-D_LARGEFILE_SOURCE', '-Wall' ],
                'OTHER_CPLUSPLUSFLAGS': [ '-g', '-mmacosx-version-min=10.7', '-std=c++17', '-stdlib=libc++', '-O3', '-D__STDC_CONSTANT_MACROS', '-D_FILE_OFFSET_BITS=64', '-D_LARGEFILE_SOURCE', '-Wall' ]
            },
            'msvs_settings': {
                'VCCLCompilerTool': { 'ExceptionHandling': 1 },
            }
        }
    ]
}
