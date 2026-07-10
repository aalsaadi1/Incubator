# Praxo — Student Campus

The student-facing entry point of Praxo: one dashboard that shows where the
student is, what's next, and the classes they're enrolled in. Each class is
taught by a 3D professor floating mid-stage — **drag** a professor to look
around, **click** them (or their class card) to walk into the learning
environment. No extra buttons: the avatars *are* the navigation.

Everything in this folder is plain HTML + JavaScript — **no build step, no
server code** — so it can be dropped straight onto any static host or embedded
in a landing page.

## Try it

```bash
# from the repo root
cd praxo
python3 -m http.server 8000
# open http://localhost:8000
```

(A local server is needed because the pages load 3D models with `fetch`;
opening `index.html` via `file://` won't load the models.)

## Structure

| Path | What it is |
|------|------------|
| `index.html` | **The dashboard.** Two floating professors, class list, student level / Praxo points, "Up next" quests. |
| `courses/math/index.html` | Math Explorer — the Pythagorean-theorem 3D learning environment (fully self-contained). |
| `courses/heart/index.html` | HEMO — the blood-flow / circulation 3D learning environment. |
| `courses/heart/heart.obj` | The 3D heart model used by HEMO. |
| `assets/models/professor-math.glb` | Prof. Elias Stone (Math Explorer avatar). |
| `assets/models/professor-heart.glb` | Prof. Amara Bell (HEMO avatar). |
| `assets/vendor/three-bundle.min.js` | Three.js + GLTF/OBJ loaders + OrbitControls, bundled as one ES module. |

## How progress works

Each course saves its own progress to `localStorage`
(`mathExplorerProgress`, `hemo-progress`). The dashboard reads both keys and
aggregates them into the student's level, Praxo points, per-class progress
bars, and the "Up next" quest list — so it always reflects real activity, with
no backend required. When the whole folder is served from one domain the
dashboard and the courses share that storage automatically.

## Using it on a landing page

- **Link to it**: host this folder anywhere static (GitHub Pages, Netlify,
  Vercel static, S3…) and link `praxo/index.html` from the landing page.
- **Embed it**: `<iframe src="/praxo/index.html" style="width:100%;height:100vh;border:0"></iframe>`
- GitHub Pages: enable Pages on this repo and the dashboard is at
  `https://<user>.github.io/<repo>/praxo/`.

## Adding a class

1. Drop the new environment in `courses/<name>/index.html`.
2. Export the professor avatar as a `.glb` into `assets/models/`
   (FBX from Rodin/Hyper3D converts with `fbx2gltf`, then shrink with
   `gltf-transform optimize --texture-compress webp --texture-size 1024`).
3. Add one entry to the `CLASSES` array at the top of `index.html`'s script —
   title, professor name, accent colour, model path, and `href`. The avatar,
   nameplate, class card, and quest row all render from that single entry.
