# Choosing 3D, and choosing how

## Does 3D earn its place?

Write the job of the scene in one line, in the visitor's terms. Good jobs:

- "Lets a buyer inspect the product from every side."
- "Shows how the parts of the device fit together."
- "Lets the visitor try three finishes and see them lit."
- "Gives a data story a place to explore, such as a globe of locations."

Weak jobs, which usually mean the answer is "no":

- "Makes the hero look modern."
- "Shows we are a technical company."
- A slowly rotating shape behind the headline that carries no information.

Then run this test. If you can answer yes to any line, offer that cheaper option first.

| Question | If yes, use |
|---|---|
| Does one good photo or rendered image show it? | A still image (with `width`, `height`, `alt`) |
| Do three or four angles show it? | A short image set the visitor can click through |
| Is it a fixed motion that does not need the visitor's control? | A short video or an animated image, muted, with controls and a poster |
| Is it a flat effect (depth, tilt, parallax)? | CSS (see the `vyson-css-motion` skill if installed) |
| Is it a simple chart, particle field or drawing? | A 2D canvas or SVG |

If none apply, 3D is justified. Say in the report what job it does and what the alternative would have been.

## The approach table

Pick the lightest row that does the job.

| Need | Approach | Cost | Notes |
|---|---|---|---|
| A flat card with a bit of depth | CSS transforms | Very low | Motion belongs to the CSS motion skill |
| Particles, charts, a drawing | 2D canvas (`getContext('2d')`) | Low | Cap the pixel ratio, pause off screen |
| One simple shape, a gradient or shader plane | Plain WebGL (no library) | Low to medium | About 150 lines for a lit, rotating shape. See the example in this repository |
| Models, materials, lighting, shadows, loaders | Three.js | Medium to high | Large library. Pin the version, import only what you use, mind the bundle size |
| The project is already React and the scene is part of the UI | React Three Fiber | Medium to high | Only if React is already there. It still needs every rule in this skill |
| Heavy product configurators, games, physics | Out of scope | | Say it needs a dedicated plan and testing on real devices |

Rules of thumb:

- Do not add a library to draw one cube.
- Do not use two rendering libraries on one page.
- One canvas and one WebGL context per page where possible. Browsers limit the number of live contexts, and the oldest ones get lost.
- Prefer the approach the project already uses.

## Libraries

Name the library, its licence and the exact version you install. Check the licence from the official source (the package's repository or npm page) before recommending it, and re-check before each release. Three.js and React Three Fiber are MIT licensed (read on 10 November 2026). Their versions change quickly and their APIs move between versions, so pin the version in `package.json` and read that version's documentation, not memory.

Do not install a package the user did not agree to. If the project has no package manager, a plain WebGL scene needs none.

## Models, textures and other assets

- **Format.** Use binary glTF (`.glb`). It is one file, widely supported, and small. Avoid `.obj` and `.fbx` for the web.
- **Where from.** Only use a model you made, one the user supplied, or one whose licence you have read and can redistribute. "Free to download" is not "free to use": read the licence and record the source, author and licence in `CREDITS.md`. Models under non-commercial or no-derivatives terms must not go into a commercial site.
- **Size.** See the budget in the performance reference. Reduce triangles and texture sizes before shipping. A model should be a few thousand to a few tens of thousands of triangles, not a million.
- **Textures.** Keep them at or under 2048 pixels on the longest side (1024 for the lighter version), use the compressed or modern formats your tooling supports, and never ship a 4096 texture "just in case".
- **Environment maps (HDR).** They are heavy. Use a small one, or build the lighting from two or three lights.
- **Local files only.** Keep every model, texture and script in the project. Do not load them from a CDN or a model-hosting site at run time.

## Loading

- Load the scene after the first paint, and only when the canvas is near the viewport (`IntersectionObserver`). The page's text and fallback image come first.
- Show the fallback until the scene is ready, then swap. Show a short message if loading fails.
- For a heavy model, offer a button ("Load the 3D view") on slow connections or when the browser asks to save data.
- Prefer one request for the model over many. Do not block the first paint on the library or the model.
