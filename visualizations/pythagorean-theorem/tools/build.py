#!/usr/bin/env python3
"""Build the self-contained index.html.

Steps (run from this folder's parent, i.e. visualizations/pythagorean-theorem):
  1. npm i three esbuild
  2. npx esbuild src/app.js --bundle --minify --format=iife --outfile=/tmp/bundle.js
  3. python3 tools/build.py model/model-lod1.json /tmp/bundle.js

model/model-lod1.json is the pre-extracted model (geometry + baked textures)
pulled out of model/pythagorean-345-pbr.fbx. To regenerate it from the FBX,
bundle tools/extract-fbx.js the same way, serve the folder over HTTP, open it
in a browser, and save window.__result — it uses three's FBXLoader, which
needs a real browser for the embedded blob textures.

The result embeds the model and the entire Three.js bundle inline, so
index.html works offline, opened directly from disk — no server, no CDN.
"""
import sys

model_path, js_path = sys.argv[1], sys.argv[2]
tpl = open('index.template.html').read()
model = open(model_path).read()
js = open(js_path).read()
assert '</script' not in model.lower() and '</script' not in js.lower()
out = tpl.replace('__MODEL_JSON__', model).replace('__BUNDLE_JS__', js)
open('index.html', 'w').write(out)
print('index.html written:', len(out), 'bytes')
