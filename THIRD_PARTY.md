# Third-Party Libraries and Licenses

**No third-party code is included in this repository yet.**

This file lists libraries that VYSON skills are likely to recommend, so that license decisions are made before any skill depends on them. Licenses below were read from each package's npm listing (or the vendor's license page for GSAP) on **2026-11-10**. They must be re-verified before each release, because licenses and versions can change.

## Rules

- A skill may only recommend a library that is listed here.
- The license must be checked from an official source when the library is added.
- We recommend and teach libraries. We do not copy their source files into this repository.
- If a library is not MIT, Apache-2.0, BSD, ISC or similarly permissive, the "Notes" column must explain how we handle it.

## Libraries under consideration

| Library | License (as read on 2026-11-10) | Planned use | Notes |
|---|---|---|---|
| React | MIT | Frontend skills | |
| Next.js | MIT | `vyson-nextjs-marketing-site` | |
| Tailwind CSS | MIT | Frontend skills | |
| Three.js | MIT | 3D skills | Fast-moving versions: pin the version in examples |
| React Three Fiber | MIT | 3D skills (React path) | |
| drei (`@react-three/drei`) | MIT | 3D skills (React path) | |
| postprocessing | Zlib | 3D effects | Permissive |
| Motion (`motion`) | MIT | Motion skills | |
| Lenis | MIT | Smooth scroll | |
| **GSAP** | Webflow "Standard No Charge" license, **not open source** | `vyson-gsap-scroll` | Free for commercial use. Prohibited use: building tools that compete with Webflow's visual animation builder. GSAP's own FAQ states that AI tools generating GSAP code is allowed. We may teach and recommend it. We must **never copy GSAP files into this repository**. Skills must state the license and offer a native CSS alternative where possible. Source: https://gsap.com/standard-license/ |
| Lighthouse | Apache-2.0 | Audit script | Keep license notices if any code is copied |
| Playwright | Apache-2.0 | Screenshots, responsive checks | |
| axe-core | MPL-2.0 | Accessibility checks | Use as an unmodified dependency. Do not copy and modify its source into this repository without following MPL-2.0 terms. |
| Lighthouse CI (`@lhci/cli`) | Apache-2.0 | Optional | |

## Libraries we plan to avoid

| Library | License | Reason |
|---|---|---|
| pa11y | LGPL-3.0-only | Copyleft terms make bundling harder. Prefer axe-core. |

## Assets (fonts, images, 3D models, icons)

Every asset used in an example must have its license and source recorded next to it (for example in a `CREDITS.md` file in that example folder). Do not assume that "free to download" means "free to redistribute". Read the actual license of each asset.
