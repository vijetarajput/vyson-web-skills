# Performance and search basics

Read this in step 4. It tells you what you may measure, what you may claim, and what to fix first.

## Core Web Vitals: the published thresholds

Google publishes "good" thresholds for three field metrics. They are judged at the 75th percentile of real page loads, separately for phones and desktops (source: web.dev, "Web Vitals", page last updated 31 October 2024, read on 11 November 2026).

| Metric | What it measures | Good |
|---|---|---|
| Largest Contentful Paint (LCP) | How long until the biggest visible element appears | 2.5 seconds or less |
| Interaction to Next Paint (INP) | How slowly the page responds to taps, clicks and keys | 200 milliseconds or less |
| Cumulative Layout Shift (CLS) | How much the layout jumps while loading | 0.1 or less |

Re-check these values at web.dev before you quote them in a report; Google can change them.

## Lab versus field

- **Field data** comes from real visitors (for example the Chrome User Experience Report, or a monitoring tool the site already has). It is what the thresholds are for. A new site has none.
- **Lab data** is one test run in a controlled setup (Lighthouse, DevTools, `browser-check.mjs`). It helps find causes and compare before and after. It is **not** field data and does not "pass Core Web Vitals".
- INP needs real interaction, so a lab tool cannot report it. Lighthouse reports Total Blocking Time as a rough stand-in. Say "proxy".
- `browser-check.mjs` prints layout shift and LCP from one unthrottled run on the computer you used. Report them as "lab, one run, <computer>", and never write "LCP passes".

Say what you did: "Lab check on <computer>, headless Chrome <version>, no throttling, one run: layout shift 0.000, LCP 48 ms. No field data."

## What usually matters, in order

1. **Images.** The largest cause of heavy pages. Right size for the screen, modern format when the project's tools allow it, `width` and `height` set, `loading="lazy"` for images below the first screen (not for the main image above the fold).
2. **Fonts.** Few files, self-hosted, only the weights used (and licences recorded). A web font from another website adds a request to a third party.
3. **Scripts.** Fewer and smaller. `defer` or `type="module"` on scripts in the head. Remove unused libraries. Long tasks (over 50 ms) in scripts hurt responsiveness.
4. **CSS.** Ship what the page uses. A large framework stylesheet for a small page is a common waste.
5. **Layout shift.** Reserve space for images, embeds, ads and content that loads late (`aspect-ratio`, `min-height`). Do not insert content above what the visitor is reading.
6. **Third parties.** Analytics, chat widgets, fonts and embeds each add weight, a privacy question and an uptime risk. List them; keep the ones with a reason.
7. **Server settings.** Compression (Brotli or gzip), caching headers and HTTPS depend on the host and are invisible to `site-audit.mjs` (it measures sizes on disk, before compression). Check them with the host's documentation or a network panel and say if you did not.

`site-audit.mjs` flags files over the VYSON default limits (images 500 KB, scripts 300 KB, stylesheets 150 KB, pages 100 KB, a page and its files over 2 MB) as warnings QA025 and QA026. These are rules of thumb for small sites, not Google's numbers. A site can pass them and still be slow, or fail them and be fine.

## Lighthouse (optional)

Lighthouse is open source under the Apache-2.0 licence (see THIRD_PARTY.md). If the user has Chrome, it is in DevTools under the Lighthouse tab. It can also run from the command line, which needs installing it, so ask first.

- Run on a built, served page, in a private window with extensions off, because extensions change scores.
- Run several times; scores vary. Report the range and the setup (mobile or desktop, throttling on or off).
- A Lighthouse score is a lab score for one page. Do not quote it as proof of real-world speed or accessibility.
- Read the "Opportunities" and "Diagnostics", not just the number. Fix causes you understand.

## Search basics

These help a page be found and shared properly. None of them guarantees a ranking.

| Item | What to check | Rule |
|---|---|---|
| Title | Short, specific, unique per page | QA007, QA008 |
| Description | One or two plain sentences per page | QA009 |
| Headings | One `h1`, in order | QA010, QA011 |
| `noindex` | Not left over from staging on pages that should appear in search | QA018 |
| Link previews | `og:title` and `og:description`, plus an image if you have one | QA020 |
| Icon | A favicon so tabs and bookmarks look right | QA019 |
| Language | `lang` on the `html` tag | QA005 |
| Links | Real addresses, descriptive link text | QA001, QA017 |
| `robots.txt` and sitemap | If the site wants them: a `robots.txt` that does not block the whole site by accident, and a `sitemap.xml` listing the real pages | manual |
| Canonical address | One address per page; `www` and non-`www` agree | manual (host setting) |
| Structured data | Only if it matches visible content; never invent reviews or prices | manual |

Do not add keyword lists, hidden text or invented content. Do not promise "SEO results". Report what is in place.

## Privacy and third parties

- `site-audit.mjs` lists links and files loaded from other websites (QA022, QA023). `browser-check.mjs` lists every other host the page actually talked to while loading (BC014).
- For each host, the report should say what it is for and whether it is needed. Remove the rest.
- A cookie or consent banner is a legal question that depends on the visitors and the tools used. This skill does not give legal advice; say that the user should check requirements for their region if the site sets cookies or runs analytics.

## What to write in the report

Good: "Static audit: largest image 310 KB, no warnings about size. Lab, one run on <computer>: no layout shift measured, LCP element appeared in 48 ms with no throttling. No field data, so Core Web Vitals are unknown. Compression and cache headers were not checked."

Bad: "The site loads in under a second and passes Core Web Vitals."
