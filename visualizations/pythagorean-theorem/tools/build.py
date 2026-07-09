#!/usr/bin/env python3
"""Build the self-contained index.html.

Steps (run from this folder's parent, i.e. visualizations/pythagorean-theorem):
  1. python3 tools/optimize_obj.py model/pythagorean-345.obj /tmp/model-compact.obj
  2. npm i three@0.160.0 esbuild && npx esbuild src/app.js --bundle --minify --format=iife --outfile=/tmp/bundle.js
  3. python3 tools/build.py /tmp/model-compact.obj /tmp/bundle.js

The result embeds the 3D model and the entire Three.js bundle inline, so
index.html works offline, opened directly from disk — no server, no CDN.
"""
import sys

obj_path, js_path = sys.argv[1], sys.argv[2]
tpl = open('index.template.html').read()
obj = open(obj_path).read()
js = open(js_path).read()
assert '</script' not in obj.lower() and '</script' not in js.lower()
out = tpl.replace('__OBJ_DATA__', obj).replace('__BUNDLE_JS__', js)
open('index.html', 'w').write(out)
print('index.html written:', len(out), 'bytes')
