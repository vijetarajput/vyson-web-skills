# Third-Party Libraries and Licenses

**No third-party library code is included in this repository.** One short piece of MIT-licensed text was adapted from another skill repository (see "Adapted material" below, with its notice).

This file lists libraries that VYSON skills are likely to recommend, so that license decisions are made before any skill depends on them. Licenses below were read from each package's npm listing (or the vendor's license page for GSAP) on **2026-11-10**. They must be re-verified before each release, because licenses and versions can change.

## Rules

- A skill may only recommend a library that is listed here.
- The license must be checked from an official source when the library is added.
- We recommend and teach libraries. We do not copy their source files into this repository.
- Text, code or assets from another repository may be adapted only if that repository has a licence file that permits it (MIT, Apache-2.0, BSD or ISC), the copyright notice and licence text are kept next to the adapted material, the adapted passage is marked in the file where it appears, and the change is recorded in "Adapted material" below. For Apache-2.0 the changes made must also be stated and any NOTICE file kept. A README that says "MIT" without a licence file is not enough. A repository with no licence file, or an unclear one, must not be copied at all; take the idea and write it independently. Everything not listed under "Adapted material" is original VYSON work under this repository's MIT licence.
- If a library is not MIT, Apache-2.0, BSD, ISC or similarly permissive, the "Notes" column must explain how we handle it.

## Libraries under consideration

| Library | License (as read on 2026-11-10) | Planned use | Notes |
|---|---|---|---|
| React | MIT | Frontend skills | |
| Vue | MIT | `vyson-frontend-development` (adapter and notes; Vue is not bundled) | Licence read on 2026-11-11 from the `LICENSE` file in https://github.com/vuejs/core ("Copyright (c) 2018-present, Yuxi (Evan) You and Vue contributors") and the npm listing for 3.5.45. The adapter was checked against 3.5.45 only. |
| Next.js | MIT | `vyson-nextjs-marketing-site` | |
| Tailwind CSS | MIT | Frontend skills | |
| Vite | MIT | Frontend skills (mentioned as an option only) | Licence read on 2026-11-11 from the `LICENSE` file in the official repository (https://github.com/vitejs/vite), "Copyright (c) 2019-present, VoidZero Inc. and Vite contributors". Not copied into this repository. |
| Three.js | MIT | 3D skills | Fast-moving versions: pin the version in examples |
| React Three Fiber | MIT | 3D skills (React path) | |
| drei (`@react-three/drei`) | MIT | 3D skills (React path) | |
| postprocessing | Zlib | 3D effects | Permissive |
| Motion (`motion`) | MIT | Motion skills | |
| Lenis | MIT | Smooth scroll | |
| **GSAP** | Webflow "Standard No Charge" license, **not open source** | `vyson-gsap-scroll` | Free for commercial use. Prohibited use: building tools that compete with Webflow's visual animation builder. GSAP's own FAQ states that AI tools generating GSAP code is allowed. We may teach and recommend it. We must **never copy GSAP files into this repository**. Skills must state the license and offer a native CSS alternative where possible. Source: https://gsap.com/standard-license/ |
| Lighthouse | Apache-2.0 | Optional tool named in `vyson-website-quality-engineering`; not bundled and not called by our scripts | Keep license notices if any code is copied |
| Playwright | Apache-2.0 | Optional tool named in `vyson-website-quality-engineering`; not bundled. Our `browser-check.mjs` does not use it: it drives an installed Chrome or Edge directly | |
| axe-core | MPL-2.0 | Optional tool named in `vyson-website-quality-engineering`; not bundled | Use as an unmodified dependency. Do not copy and modify its source into this repository without following MPL-2.0 terms. |
| Lighthouse CI (`@lhci/cli`) | Apache-2.0 | Optional | |

## Libraries we plan to avoid

| Library | License | Reason |
|---|---|---|
| pa11y | LGPL-3.0-only | Copyleft terms make bundling harder. Prefer axe-core. |

## Tools we recommend running (not copied)

These are programs we tell people to run. They are not libraries that a skill imports. **No source code from any of them is copied into this repository.** Their licence, behaviour and data collection belong to their own maintainers, not to VYSON Web Skills.

| Tool | Maintainer | Licence (as read on 2026-11-10) | Official source | Version tested | Intended use |
|---|---|---|---|---|---|
| Skills CLI (`skills`) | Vercel Labs | MIT | https://github.com/vercel-labs/skills | 1.7.6 | Installing VYSON Web Skills from GitHub with `npx skills@1.7.6 add vijetarajput/vyson-web-skills ...` (pinned to the tested version) |

**How the licence was checked (2026-11-10):** the `LICENSE` file in the official repository (main branch) is the MIT License, "Copyright (c) 2026 Vercel, Inc.". The repository's `package.json` and the npm listing for version 1.7.6 also say MIT. Only version 1.7.6 was tested. Re-verify the licence and the behaviour described below before each release, because they can change.

### Skills CLI telemetry

- **Telemetry is on by default.** The installer's own documentation says it collects anonymous usage data to help improve the tool, and states that no personal information is collected. That is the maintainers' statement. We have not audited it.
- **What the documentation says it may send:** repository and skill identifiers for repositories that GitHub confirms are public, and, for other kinds of source, possibly source and skill identifiers in install telemetry. Security-audit requests are limited to confirmed-public GitHub repositories. Because `vijetarajput/vyson-web-skills` is a public GitHub repository, installing it with telemetry on may send its name and the skill name, according to that documentation. We have not observed this ourselves.
- **How to switch it off:** according to the installer's documentation, setting `DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` disables both telemetry and security-audit requests. In PowerShell, for the current window only, either of these before running the installer: `$env:DISABLE_TELEMETRY = "1"` or `$env:DO_NOT_TRACK = "1"`. We set both in our tests but did not observe network traffic, so we have not independently confirmed the effect.
- **Who controls this:** these settings belong to the third-party installer. VYSON Web Skills adds no telemetry and no background hooks of its own.
- **Our own tests:** every install test in [integrations/README.md](integrations/README.md) was run with telemetry switched off, so we did not see what the installer sends.
- **Official documentation:** https://github.com/vercel-labs/skills/blob/main/docs/troubleshooting.md

## Reference repositories reviewed

VYSON does not aim to replace these projects. Listing them here is **not** an endorsement by them, a partnership with them or a verified integration: no VYSON skill has been tested together with any of them. Product and project names belong to their owners. Reviewed on 2026-11-11 from their public repositories. "Used" says what, if anything, was taken.

| Repository | Licence (verified how) | Used |
|---|---|---|
| https://github.com/MengTo/skills | MIT, `LICENSE` file ("Copyright (c) 2026 Meng To") | **Adapted:** the five-step "removal test" (reworded and shortened) in `vyson-premium-website-design`. Its other skills (prompt capture, game development, illustration, many styled web-design recipes) have different purposes and were not copied. |
| https://github.com/vercel-labs/agent-skills | The README says "MIT", but the repository has **no `LICENSE` file** and GitHub detects no licence. So nothing was copied. | **Nothing.** Its `react-best-practices` (React and Next.js performance), `web-design-guidelines` and `react-view-transitions` skills are complementary. Our frontend skill tells readers to use a dedicated pack for deep rules of that kind (it names none), and the README names this one as an example. Its `web-design-guidelines` skill fetches its rules from a URL at run time, which VYSON does not do (`AGENTS.md` rule 6). |
| https://github.com/shadcn-ui/ui | MIT, `LICENSE.md` ("Copyright (c) 2023 shadcn") | **Nothing.** It ships its own `shadcn` skill for its component registry. Its components need React and Tailwind, which VYSON does not require. |
| https://github.com/magicuidesign/magicui | MIT, `LICENSE.md` ("Copyright (c) Magic UI") | **Nothing.** It ships its own `magic-ui` skill and React and Tailwind components. VYSON's examples are plain HTML, CSS and JavaScript. |
| `aceternity/ui` (a path suggested as a reference) | **No repository with that name exists on GitHub** (the API returned "Not Found" on 2026-11-11). Community repositories that mention Aceternity UI have no licence file. | **Nothing.** Nothing was copied or paraphrased. Its component licence terms were not verified. |

Skills from these projects have not been tested together with VYSON skills. Whether they conflict is untested.

## Adapted material

| What | From | Where in this repository | Licence notice |
|---|---|---|---|
| The "removal test" (a five-step way to judge a reflex design choice), reworded and fitted to VYSON's checklist | `no-ai-design-slop` skill, https://github.com/MengTo/skills, MIT, Copyright (c) 2026 Meng To | `skills/vyson-premium-website-design/references/quality-checks.md` | Full MIT text in `skills/vyson-premium-website-design/NOTICE.md`, so it travels with the installed skill |

## Assets (fonts, images, 3D models, icons)

Every asset used in an example must have its license and source recorded next to it (for example in a `CREDITS.md` file in that example folder). Do not assume that "free to download" means "free to redistribute". Read the actual license of each asset.
