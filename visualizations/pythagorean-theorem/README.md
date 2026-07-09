# Math Explorer — Pythagorean Theorem

An interactive 3D learning environment for the Pythagorean theorem, built around
a 3:4:5 triangle model where each square is made of unit cubes (9 + 16 = 25).

## Run it

Open `index.html` in any browser — it is fully self-contained (the 3D model and
the Three.js engine are embedded inline), so it works offline with no server.

## Features

- **3D model viewer** — drag to rotate, scroll to zoom, gentle auto-rotation
  with a warm pulsing glow inside each square.
- **Explore mode** — free-orbit the model.
- **Practice mode** — steps through sides a, b, and c, pulsing the matching
  bar in the Theorem Details panel and explaining each square count.
- **Test mode** — quick-fire hypotenuse quizzes (3-4-5, 6-8-10, 5-12-13, 9-12-15);
  correct answers earn XP toward the next level, learning objectives tick green.

## Files

| Path | Purpose |
|------|---------|
| `index.html` | The final self-contained app (generated — don't edit by hand) |
| `index.template.html` | Page markup/styles with `__OBJ_DATA__` / `__BUNDLE_JS__` placeholders |
| `src/app.js` | Three.js scene + UI logic (bundled with esbuild) |
| `model/pythagorean-345.obj` | Original 3D model (Blender export) |
| `tools/optimize_obj.py` | Compacts the OBJ for inline embedding (v/f only, rounded coords) |
| `tools/build.py` | Injects the compact model + JS bundle into the template |

## Rebuild

```bash
cd visualizations/pythagorean-theorem
python3 tools/optimize_obj.py model/pythagorean-345.obj /tmp/model-compact.obj
npm i three@0.160.0 esbuild
npx esbuild src/app.js --bundle --minify --format=iife --outfile=/tmp/bundle.js
python3 tools/build.py /tmp/model-compact.obj /tmp/bundle.js
```
