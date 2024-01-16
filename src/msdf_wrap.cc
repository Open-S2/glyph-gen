#include <napi.h>
#include <string>
#include <cstring>

#include "msdfgen.h"
#include "msdfgen-ext.h"

using namespace msdfgen;
using namespace Napi;

// https://github.com/Chlumsky/msdfgen

/**
 *
 *
 *
 * BUILD FONT GLYPH
 *
 *
 *
**/

Napi::Object buildFontGlyph(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  // create object
  Napi::Object obj = Napi::Object::New(env);
  // check input
  if (info.Length() != 5) {
    Napi::Error::New(env, "Expected eight arguments (fontPath, code, size, range, type)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[0].IsString()) {
    Napi::Error::New(env, "Expected the first argument to be a string (fontPath)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[1].IsNumber()) {
    Napi::Error::New(env, "Expected the second argument to be a number (utf code)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[2].IsNumber()) {
    Napi::Error::New(env, "Expected the second argument to be a number (size)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[3].IsNumber()) {
    Napi::Error::New(env, "Expected the fifth argument to be a number (range)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[4].IsString()) {
    Napi::Error::New(env, "Expected the ninth argument to be a string (type)")
        .ThrowAsJavaScriptException();
    return obj;
  }

  // https://github.com/Chlumsky/msdfgen/issues/119
  std::string font_path = info[0].As<Napi::String>().Utf8Value();
  int code = info[1].As<Napi::Number>().Int32Value();
  float size = info[2].As<Napi::Number>().FloatValue();
  float range = info[3].As<Napi::Number>().FloatValue();
  std::string type = info[4].As<Napi::String>().Utf8Value();

  char font_path_arr[font_path.size() + 1];
  strcpy(font_path_arr, font_path.c_str());

  // https://github.com/Chlumsky/msdfgen/issues/117

  GlyphIndex glyphIndex;
  unicode_t unicode = (unsigned int) code;
  double advance = 0;

  FreetypeHandle *ft = initializeFreetype();
  if (ft) {
    FontHandle *font = loadFont(ft, font_path_arr);
    FontMetrics font_metrics;
    if (font) {
      getFontMetrics(font_metrics, font);

      Shape shape;
      getGlyphIndex(glyphIndex, font, unicode);
      if (loadGlyph(shape, font, glyphIndex, &advance)) {
        shape.normalize();
        if (resolveShapeGeometry(shape)) {
          edgeColoringByDistance(shape, 3., 0.);
          // grab data
          int shape_size = shape.contours.size();
          float lineHeight = font_metrics.lineHeight;
          float emSize = font_metrics.emSize;
          // build scale
          float scale = size / emSize;
          // update range by scale
          range = 0.5 * range / scale;
          // prep data
          // Shape::Bounds actual_bounds = shape.getBounds(0);
          Shape::Bounds bounds = shape.getBounds(range);
          // Calculate width & height
          int glyph_width = ceil(scale * (bounds.r - bounds.l));
          int glyph_height = ceil(scale * (bounds.t - bounds.b));
          // store the msdf in a byte array
          byte *data;

          int length, width, height;

          // depending upon type, build
          if (strcmp(type.c_str(), "mtsdf") == 0) {
            Bitmap<float, 4> mtsdf(glyph_width, glyph_height);
            generateMTSDF(mtsdf, shape, range * 2., scale, Vector2(-bounds.l, -bounds.b));
            width = mtsdf.width();
            height = mtsdf.height();
            length = 4 * width * height;
            data = new byte[length];
            for (int y = 0; y < height; y++) {
              for (int x = 0; x < width; x++) {
                size_t idx = (width * y + x) << 2;
                data[idx] = pixelFloatToByte(mtsdf(x, y)[0]);
                data[idx + 1] = pixelFloatToByte(mtsdf(x, y)[1]);
                data[idx + 2] = pixelFloatToByte(mtsdf(x, y)[2]);
                data[idx + 3] = pixelFloatToByte(mtsdf(x, y)[3]);
              }
            }
          } else if (strcmp(type.c_str(), "msdf") == 0) {
            Bitmap<float, 3> msdf(glyph_width, glyph_height);
            generateMSDF(msdf, shape, range * 2., scale, Vector2(-bounds.l, -bounds.b));
            width = msdf.width();
            height = msdf.height();
            length = 4 * width * height;
            data = new byte[length];
            for (int y = 0; y < height; y++) {
              for (int x = 0; x < width; x++) {
                size_t idx = (width * y + x) << 2;
                data[idx] = pixelFloatToByte(msdf(x, y)[0]);
                data[idx + 1] = pixelFloatToByte(msdf(x, y)[1]);
                data[idx + 2] = pixelFloatToByte(msdf(x, y)[2]);
                data[idx + 3] = 255;
              }
            }
          } else if (strcmp(type.c_str(), "psdf") == 0) {
            Bitmap<float, 1> psdf(glyph_width, glyph_height);
            generatePseudoSDF(psdf, shape, range * 2., scale, Vector2(-bounds.l, -bounds.b));
            width = psdf.width();
            height = psdf.height();
            length = 4 * width * height;
            data = new byte[length];
            for (int y = 0; y < height; y++) {
              for (int x = 0; x < width; x++) {
                size_t idx = (width * y + x) << 2;
                auto pixel = pixelFloatToByte(psdf(x, y)[0]);
                data[idx] = pixel;
                data[idx + 1] = pixel;
                data[idx + 2] = pixel;
                data[idx + 3] = 255;
              }
            }
          } else {
            // sdf
            Bitmap<float, 1> msdf(glyph_width, glyph_height);
            generateSDF(msdf, shape, range * 2., scale, Vector2(-bounds.l, -bounds.b));
            width = msdf.width();
            height = msdf.height();
            length = 4 * width * height;
            data = new byte[length];
            for (int y = 0; y < height; y++) {
              for (int x = 0; x < width; x++) {
                size_t idx = (width * y + x) << 2;
                auto pixel = pixelFloatToByte(msdf(x, y)[0]);
                data[idx] = pixel;
                data[idx + 1] = pixel;
                data[idx + 2] = pixel;
                data[idx + 3] = 255;
              }
            }
          }

          obj.Set(Napi::String::New(env, "data"), Napi::ArrayBuffer::New(env, data, length, [](Env /*env*/, void* finalizeData) {
            free(finalizeData);
          }));
          obj.Set(Napi::String::New(env, "width"), Napi::Number::New(env, width));
          obj.Set(Napi::String::New(env, "height"), Napi::Number::New(env, height));
          obj.Set(Napi::String::New(env, "shapeSize"), Napi::Number::New(env, shape_size));
          obj.Set(Napi::String::New(env, "lineHeight"), Napi::Number::New(env, scale * lineHeight));
          obj.Set(Napi::String::New(env, "emSize"), Napi::Number::New(env, scale * emSize));
          // bounds
          obj.Set(Napi::String::New(env, "r"), Napi::Number::New(env, scale * bounds.r));
          obj.Set(Napi::String::New(env, "l"), Napi::Number::New(env, scale * bounds.l));
          obj.Set(Napi::String::New(env, "t"), Napi::Number::New(env, scale * bounds.t));
          obj.Set(Napi::String::New(env, "b"), Napi::Number::New(env, scale * bounds.b));
          // advance
          obj.Set(Napi::String::New(env, "advance"), Napi::Number::New(env, advance));
        }
      }
      destroyFont(font);
    }
    deinitializeFreetype(ft);
  }

  // obj.Set(Napi::String::New(env, "res"), Napi::Number::New(env, 1));

  return obj;
}

/**
 *
 *
 *
 * BUILD SVG GLYPH
 *
 *
 *
**/

Napi::Object buildSVGGlyph(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  // create object
  Napi::Object obj = Napi::Object::New(env);
  // check input
  if (info.Length() != 5) {
    Napi::Error::New(env, "Expected eight arguments (iconPath, size, range, path_index, useAlpha)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[0].IsString()) {
    Napi::Error::New(env, "Expected the first argument to be a string (iconPath)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[1].IsNumber()) {
    Napi::Error::New(env, "Expected the second argument to be a number (size)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[2].IsNumber()) {
    Napi::Error::New(env, "Expected the fifth argument to be a number (range)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[3].IsNumber()) {
    Napi::Error::New(env, "Expected the fifth argument to be a number (path_index)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[4].IsBoolean()) {
    Napi::Error::New(env, "Expected the ninth argument to be a number (useAlpha)")
        .ThrowAsJavaScriptException();
    return obj;
  }

  // https://github.com/Chlumsky/msdfgen/issues/119
  std::string svg_path = info[0].As<Napi::String>().Utf8Value();
  float size = info[1].As<Napi::Number>().FloatValue();
  float range = info[2].As<Napi::Number>().FloatValue();
  int path_index = info[3].As<Napi::Number>().Int32Value();
  bool use_alpha = info[4].As<Napi::Boolean>().Value();

  char svg_path_arr[svg_path.size() + 1];
  strcpy(svg_path_arr, svg_path.c_str());

  // https://github.com/Chlumsky/msdfgen/issues/117

  Shape shape;
  Vector2 dimensions;
  if (loadSvgShape(shape, svg_path_arr, path_index, &dimensions)) {
    shape.normalize();
    if (resolveShapeGeometry(shape)) {
      edgeColoringByDistance(shape, 3., 0.);
      // grab data
      int shape_size = shape.contours.size();
      float emSize = dimensions.y;
      // build scale
      float scale = size / emSize;
      // update range by scale
      range = 0.5 * range / scale;
      // prep data
      // Shape::Bounds actual_bounds = shape.getBounds(0);
      Shape::Bounds bounds = shape.getBounds(range);
      // Calculate width & height
      int glyph_width = ceil(scale * (bounds.r - bounds.l));
      int glyph_height = ceil(scale * (bounds.t - bounds.b));
      // store the msdf in a byte array
      byte *data;

      int length, width, height;

      // depending upon type, build
      if (use_alpha) {
        Bitmap<float, 4> msdf(glyph_width, glyph_height);
        generateMTSDF(msdf, shape, range * 2., scale, Vector2(-bounds.l, -bounds.b));
        width = msdf.width();
        height = msdf.height();
        length = 4 * width * height;
        data = new byte[length];
        for (int y = 0; y < height; y++) {
          for (int x = 0; x < width; x++) {
            size_t idx = (width * y + x) << 2;
            data[idx] = pixelFloatToByte(msdf(x, y)[0]);
            data[idx + 1] = pixelFloatToByte(msdf(x, y)[1]);
            data[idx + 2] = pixelFloatToByte(msdf(x, y)[2]);
            data[idx + 3] = pixelFloatToByte(msdf(x, y)[3]);
          }
        }
      } else {
        Bitmap<float, 3> msdf(glyph_width, glyph_height);
        generateMSDF(msdf, shape, range * 2., scale, Vector2(-bounds.l, -bounds.b));
        width = msdf.width();
        height = msdf.height();
        length = 3 * width * height;
        data = new byte[length];
        for (int y = 0; y < height; y++) {
          for (int x = 0; x < width; x++) {
            size_t idx = (width * 3) * y + (x * 3);
            data[idx] = pixelFloatToByte(msdf(x, y)[0]);
            data[idx + 1] = pixelFloatToByte(msdf(x, y)[1]);
            data[idx + 2] = pixelFloatToByte(msdf(x, y)[2]);
            // data[idx + 3] = 255;
          }
        }
      }

      obj.Set(Napi::String::New(env, "data"), Napi::ArrayBuffer::New(env, data, length, [](Env /*env*/, void* finalizeData) {
        free(finalizeData);
      }));
      obj.Set(Napi::String::New(env, "width"), Napi::Number::New(env, width));
      obj.Set(Napi::String::New(env, "height"), Napi::Number::New(env, height));
      obj.Set(Napi::String::New(env, "shapeSize"), Napi::Number::New(env, shape_size));
      obj.Set(Napi::String::New(env, "emSize"), Napi::Number::New(env, scale * emSize));
      // bounds
      obj.Set(Napi::String::New(env, "r"), Napi::Number::New(env, scale * bounds.r));
      obj.Set(Napi::String::New(env, "l"), Napi::Number::New(env, scale * bounds.l));
      obj.Set(Napi::String::New(env, "t"), Napi::Number::New(env, scale * bounds.t));
      obj.Set(Napi::String::New(env, "b"), Napi::Number::New(env, scale * bounds.b));
      // advance
      double advance = 0;
      obj.Set(Napi::String::New(env, "advance"), Napi::Number::New(env, advance));
    }
  }

  return obj;
}

// loadSvgShape(Shape &output, const char *filename, int pathIndex = 0, Vector2 *dimensions = NULL)

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "buildFontGlyph"),
              Napi::Function::New(env, buildFontGlyph));
  exports.Set(Napi::String::New(env, "buildSVGGlyph"),
              Napi::Function::New(env, buildSVGGlyph));
  return exports;
}

NODE_API_MODULE(addon, Init)

// bin/gn gen out/skia-mac --args='cc="clang" cxx="clang++"
//   is_official_build=true is_debug=false skia_use_system_libjpeg_turbo=false
//   skia_use_system_harfbuzz=false skia_use_system_libwebp=false
//   skia_use_system_icu=false skia_use_freetype=true
//   skia_use_system_freetype2=true skia_use_dng_sdk=false
//   skia_enable_gpu=false skia_use_system_libpng=false extra_cflags_cc=["-frtti"]
//   skia_enable_fontmgr_empty=false skia_enable_fontmgr_custom_empty=true skia_enable_skparagraph=true'

// bin/gn gen out/skia-mac --args='cc="clang" cxx="clang++"
//   is_official_build=true is_debug=false skia_use_system_libjpeg_turbo=false
//   skia_use_system_harfbuzz=false skia_use_system_libwebp=false
//   skia_use_system_icu=false skia_use_freetype=true
//   skia_use_system_freetype2=true skia_use_dng_sdk=false
//   skia_enable_gpu=false skia_use_system_libpng=false extra_cflags_cc=["-frtti"] extra_cflags=["-I/usr/local/opt/freetype/include/freetype2"]
//   skia_enable_fontmgr_empty=false skia_enable_fontmgr_custom_empty=true skia_enable_skparagraph=true'
