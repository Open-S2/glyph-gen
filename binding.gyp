{
    'targets': [
        {
            'target_name': 'msdf-native',
            'defines': ['MSDFGEN_USE_SKIA'],
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
                'src/msdf_wrap.cc',
                'src/ext/import-font.cpp',
                'src/ext/import-svg.cpp',
                'src/ext/resolve-shape-geometry.cpp',
                'src/ext/tinyxml2.cpp'
            ],
            'include_dirs': [
                "<!@(node -p \"require('node-addon-api').include\")",
                "<(module_root_dir)/./src/freetype2/include",
                "<(module_root_dir)/./src/freetype2/include/freetype",
                "<(module_root_dir)/./src/freetype2/include/freetype/config",
                "<(module_root_dir)/./src/freetype2/include/freetype/internal",
                "<(module_root_dir)/./src/freetype2/include/freetype/internal/services",
                "<(module_root_dir)/./src/core",
                "<(module_root_dir)/./src/core-bak",
                "<(module_root_dir)/./src/ext",
                "<(module_root_dir)/./src/include",
                "<(module_root_dir)/./src/skia",
                "<(module_root_dir)/./src/skia/include",
                "<(module_root_dir)/./src/skia/include/atlastext",
                "<(module_root_dir)/./src/skia/include/c",
                "<(module_root_dir)/./src/skia/include/codec",
                "<(module_root_dir)/./src/skia/include/config",
                "<(module_root_dir)/./src/skia/include/core",
                "<(module_root_dir)/./src/skia/include/docs",
                "<(module_root_dir)/./src/skia/include/effects",
                "<(module_root_dir)/./src/skia/include/encode",
                "<(module_root_dir)/./src/skia/include/gpu",
                "<(module_root_dir)/./src/skia/include/pathops",
                "<(module_root_dir)/./src/skia/include/ports",
                "<(module_root_dir)/./src/skia/include/private",
                "<(module_root_dir)/./src/skia/include/svg",
                "<(module_root_dir)/./src/skia/include/utils"
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
