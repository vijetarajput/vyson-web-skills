# Workflow, defaults and hand-off

How to run this skill in one pass without asking the user to approve small choices, and how to leave the project ready for the next VYSON skills.

Contents: the five phases, decisions you make alone, when you are really blocked, safeguards, where files go in each stack, the hand-off section, a worked example.

## The five phases

| Phase | What you do |
|---|---|
| Understand | Open the project: `package.json`, the main CSS, templates or pages, brand files, images, copy. Read `VYSON-NOTES.md` if it exists. Note the framework and keep it. |
| Plan internally | Fill in the direction note. List the sections and the job of each in one line. Do not publish this as a question; it goes in the report. |
| Implement | Tokens first, then semantic HTML, then the layout mobile first, then imagery and the details pass. |
| Verify | `design-lint.mjs`, then the page at 390 and 1440 wide if a browser is available. Fix, then re-run. |
| Present | The report from step 9 of `SKILL.md`, plus the hand-off section. |

## Decisions you make alone

Never ask the user about these. Choose, label the choice as an assumption in the direction note, and move on.

| Decision | Default rule |
|---|---|
| The one action of the page | The most direct commercial or contact step the content supports (book, buy, visit, contact). |
| Direction type | Match the audience first, taste second. Clinics, law, finance and B2B tools suit Technical and precise or Editorial. Food, craft and local services suit Warm and crafted. Studios and portfolios suit Editorial or Bold and graphic. Premium goods suit Quiet luxury. Youth, apps and events suit Playful modern. Change at least two things about the type you pick. |
| Signature move | One cheap, repeatable device from the direction reference, used at least three times. |
| Fonts | System stacks. A font file only if the project already ships one with a recorded licence. |
| Colour | The brand's colours if they exist. Otherwise one background, one text colour and one accent, checked for 4.5:1 contrast. |
| Sections | Header, hero, proof or work, how it works, details, final action, footer. Drop any section that has no job. A complete one-page site can have five. |
| Copy | Real, specific, in the brand's voice. For a made-up brand, plausible copy that is labelled as placeholder in the report. |
| Images | Drawings, SVG and type before photos. No stock-photo filler, no hotlinking. |
| Pages | The pages the project already has. For an empty project, one page with a working header and a footer, plus any pages the user named. |

## When you are really blocked

You are blocked only when the work cannot start: no project folder and no description of the site at all, or the user named a brand file that does not exist anywhere in the project. Ask one short question. In every other case, assume, build and report.

## Safeguards (these still apply)

- Do not commit, push, deploy or publish.
- Do not delete or replace files that hold the user's work. Edit in place; keep the diff small.
- Do not submit forms, call real endpoints, add analytics or add paid or tracking services.
- Do not add a dependency unless the job cannot be done without it. If you must, use the package's official listing to check that the licence is open, pin the version and list it in the report.
- Do not restyle parts the user did not ask about.

## Where files go in each stack

Use the project's own pattern. These are the usual places.

| Stack | Tokens and global CSS | Notes |
|---|---|---|
| Plain HTML | A `styles/` folder, linked in each page's `<head>` before page-specific CSS | Copy `assets/design-tokens.css` and edit the colours, fonts and radius |
| React with Vite | Import the CSS file once in `src/main.jsx` (or `main.tsx`) | Components keep their own CSS files or CSS modules and read the tokens |
| Next.js | App Router: import the global CSS in `app/layout.js`. Pages Router: import it in `pages/_app.js` | For a font file you hold a licence for, use `next/font/local`. Keep the tokens in the global file |
| Vue with Vite | Import in `src/main.js` | Scoped styles in single-file components read the same tokens |
| Nuxt | List the file under `css` in `nuxt.config` | Same tokens, same rules |
| Tailwind already in use | Map the tokens into the project's Tailwind theme and keep the class names | Do not add Tailwind to a project that does not use it |

Check the framework's current documentation for the exact file names of the installed version.

## The hand-off section

Everything the later steps need goes into one file at the project root, `VYSON-NOTES.md`. Create it if it is missing. Edit only your own section. Never delete another skill's section.

```markdown
## Design (vyson-premium-website-design)
- Direction: <type>, signature move: <move>, feels: <three words>
- Tokens file: <path>. Colours: <names>. Fonts: <stacks>.
- Pages and sections: <list, with the job of each>
- Hooks for later steps: <where behaviour is needed (forms, menus, dialogs), where a hero visual or a 3D area fits, which elements are meant to move>
- Placeholder text and made-up brand details to replace: <list>
- Not tested: <list>
```

If the user wants no extra files, put the same text in the report.

## Worked example

This is an invented walk-through of the method, not a record of a real run.

Request: "Make a site for a small ceramics studio. Use the studio's name, Fieldwork." The project has an empty `index.html`.

- Understand: nothing else in the project. The brand name is given, nothing more.
- Plan: audience is people buying handmade tableware on phones; the one action is "Visit the studio shop". Direction: Warm and crafted, with one change: a plain-paper background and ink-green text instead of cream and clay. Signature move: a thin line drawing of a vessel above each section heading, used four times. Sections: hero, three featured pieces, how it is made (steps), visit, footer.
- Implement: `styles/tokens.css` from the starter file with the new colours, `styles/site.css` for the layout, semantic `index.html`, four inline SVG vessel drawings.
- Verify: `design-lint.mjs` reports no FAIL lines, the page was opened at 390 and 1440, and the report says what was not tested (a real phone, Firefox, Safari).
- Present: the direction note, the files, the list of placeholder text (all piece names and prices), and the hand-off section.
