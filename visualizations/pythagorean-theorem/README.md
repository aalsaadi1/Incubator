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
- **Test mode** — mixed question types (find the hypotenuse, find a missing
  leg, verify a right triangle, ladder word problems) with hints, streak
  tracking, and a worked explanation after every correct answer.
- **Adjustable triangle** — −/+ steppers on sides a and b (1–12) recompute
  c, the bars, and the square totals live, including non-integer hypotenuses
  (c = √13 ≈ 3.61) and perfect-triple callouts.
- **Six interactive lessons** — every sidebar topic opens a lesson card:
  - *Pythagorean Theorem*: squares-on-sides diagram + tap-to-load triples
  - *Right Angles*: drag an angle until it snaps to 90°
  - *Square Numbers*: grow an n×n cell grid
  - *Area Calculation*: resizable width × height rectangle
  - *Triangle Types*: classify acute/right/obtuse by comparing a²+b² to c²
  - *Proof Visuals*: step-through proof — 9 + 16 cells exactly fill the 25
  Each lesson ends with a check question; passing it marks the topic ✓.
- **Persistent progress** — XP, level, completed topics, quiz stats, and
  best streak are saved in localStorage; learning objectives tick green as
  the student masters them.

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
