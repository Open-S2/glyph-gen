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
  if (info.Length() != 6) {
    Napi::Error::New(env, "Expected six arguments (fontPath, code, size, range, type, codeIsIndex)")
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
    Napi::Error::New(env, "Expected the third argument to be a number (size)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[3].IsNumber()) {
    Napi::Error::New(env, "Expected the fourth argument to be a number (range)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[4].IsString()) {
    Napi::Error::New(env, "Expected the fifth argument to be a string (type)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[5].IsBoolean()) {
    Napi::Error::New(env, "Expected the sixth argument to be a number (codeIsIndex)")
        .ThrowAsJavaScriptException();
    return obj;
  }

  // https://github.com/Chlumsky/msdfgen/issues/119
  std::string font_path = info[0].As<Napi::String>().Utf8Value();
  int code = info[1].As<Napi::Number>().Int32Value();
  float size = info[2].As<Napi::Number>().FloatValue();
  float range = info[3].As<Napi::Number>().FloatValue();
  std::string type = info[4].As<Napi::String>().Utf8Value();
  bool code_is_index = info[5].As<Napi::Boolean>().Value();

  char font_path_arr[font_path.size() + 1];
  strcpy(font_path_arr, font_path.c_str());

  // https://github.com/Chlumsky/msdfgen/issues/117

  GlyphIndex glyphIndex;
  double advance = 0;

  FreetypeHandle *ft = initializeFreetype();
  if (ft) {
    FontHandle *font = loadFont(ft, font_path_arr);
    FontMetrics font_metrics;
    if (font) {
      getFontMetrics(font_metrics, font);

      Shape shape;
      // if code is index, directly setup, otherwise find index from unicode value
      if (code_is_index) glyphIndex = GlyphIndex(code);
      else getGlyphIndex(glyphIndex, font, (unicode_t) code);
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
    Napi::Error::New(env, "Expected five arguments (iconPath, size, range, path_index, type)")
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
    Napi::Error::New(env, "Expected the third argument to be a number (range)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[3].IsNumber()) {
    Napi::Error::New(env, "Expected the fourth argument to be a number (path_index)")
        .ThrowAsJavaScriptException();
    return obj;
  }
  if (!info[4].IsString()) {
    Napi::Error::New(env, "Expected the fifth argument to be a string (type)")
        .ThrowAsJavaScriptException();
    return obj;
  }

  // https://github.com/Chlumsky/msdfgen/issues/119
  std::string svg_path = info[0].As<Napi::String>().Utf8Value();
  float size = info[1].As<Napi::Number>().FloatValue();
  float range = info[2].As<Napi::Number>().FloatValue();
  int path_index = info[3].As<Napi::Number>().Int32Value();
  std::string type = info[4].As<Napi::String>().Utf8Value();

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

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "buildFontGlyph"),
              Napi::Function::New(env, buildFontGlyph));
  exports.Set(Napi::String::New(env, "buildSVGGlyph"),
              Napi::Function::New(env, buildSVGGlyph));
  return exports;
}

NODE_API_MODULE(addon, Init)
