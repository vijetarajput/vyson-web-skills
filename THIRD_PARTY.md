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

## Assets (fonts, images, 3D models, icons)

Every asset used in an example must have its license and source recorded next to it (for example in a `CREDITS.md` file in that example folder). Do not assume that "free to download" means "free to redistribute". Read the actual license of each asset.
