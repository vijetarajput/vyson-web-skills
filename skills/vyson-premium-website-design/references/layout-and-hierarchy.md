# Layout, composition and hierarchy

Hierarchy answers one question: what should the eye see first, second and third? Layout is how you make that true on every screen size. The numbers here are VYSON design defaults, not measured results.

Contents: the hierarchy test, the page structure, section patterns, grid and alignment, whitespace, the hero, calls to action, long pages.

## The hierarchy test

Before building, and again when finished, do the squint test on a screenshot: blur your eyes (or reduce the screenshot to a thumbnail) and answer:

1. What is the first thing you notice? It must be the main headline or the key visual.
2. What is second? It should be the main action.
3. Can you still see where sections begin and end?

If the answer to 1 is a decoration, a badge or the navigation, the page has a hierarchy problem.

Hierarchy is made with **contrast in size, weight, colour, space and position**. Use two or three of these at a time. Do not use all five on the same element.

| Level | Role | Typical treatment |
|---|---|---|
| 1 | Page headline, key visual | Largest type, most space around it, strongest contrast |
| 2 | Primary action | Solid accent fill, clear label, the only filled button in view |
| 3 | Section headings | Clearly smaller than level 1, same family, consistent |
| 4 | Body text | Comfortable size and line length, normal contrast |
| 5 | Meta text and labels | Smaller, muted but still readable (4.5:1 contrast) |

Limits that keep the hierarchy honest:

- One level-1 element per screen.
- One primary button per view. Everything else is quiet (outline or text link).
- At most three text sizes in a single section, apart from numerals used as graphics.

## Page structure

A good marketing page is short enough that each section has a job. Write the job of each section in one line, in the plan. If you cannot, remove the section.

A common order that works for most single-page sites. Change it to suit the content:

1. **Header.** Brand, 3 to 5 navigation links, one action.
2. **Hero.** What this is, who it is for and the next step.
3. **Proof or work.** Real projects, real results, real names. This is the most persuasive part of most sites.
4. **How it works or approach.** Three to five steps, in plain words.
5. **Offer details or pricing**, if the visitor needs to decide.
6. **Voices.** One or two real quotes with names, or leave the section out.
7. **Final call to action.** One sentence, one action.
8. **Footer.** Contact, legal links, small print.

Do not add sections to reach a length. A complete one-page site can have five sections.

## Section patterns

Vary the arrangement from section to section, so the page has rhythm. Use at most five different patterns on one page, and reuse them rather than inventing new ones.

| Pattern | Use for | Notes |
|---|---|---|
| **Split** (text one side, visual other side) | Hero, feature explanation | Make the columns unequal (for example 7 and 5 of 12) |
| **Index list** (number, title, detail, meta in aligned columns) | Projects, services, team | Works at any length, scans fast, no images needed |
| **Stepped** (numbered stages) | Process | Vertical on phones, horizontal on wide screens |
| **Statement** (one large sentence, little else) | Values, a key claim | Needs space. Use once or twice |
| **Gallery** (images with captions) | Visual work | Fix one aspect ratio so edges align |
| **Contrast band** (dark or tinted full-width section) | Break the rhythm, bring the final call to action | Use once or twice, not in every second section |

Avoid the equal three-card row as the default answer. Use it only when there really are three equal things, and give the cards some difference (one has a number, one a different layout) only when that is honest.

## Grid and alignment

- Build on a simple grid: 12 columns on wide screens, 4 on phones. Do not try to match columns to the pixel; the point is shared edges.
- Pick two or three alignment lines (left edge of the container, the start of the second column, the right edge) and put every element on one of them.
- Left-align body text. Centre only short items: a headline of one or two lines, a single button, a short statement.
- Align the first baselines of neighbouring columns. A heading in the left column and a paragraph in the right column should start on the same line.
- Use the container width token for everything, and let a few full-width elements (a band, an image) break out on purpose.
- Limit paragraph width to about 65 characters (`max-width: 65ch`). Headlines can be wider.

## Whitespace

Space is what makes a page look expensive. Cramped pages look cheap, and spread-out pages look unfinished, so decide the spacing on purpose.

- Use one spacing scale (the starter file has one) and nothing else. No arbitrary `13px`.
- Rule of proximity: space inside a group is smaller than space between groups. A label belongs closer to its heading than to the previous section.
- Give sections generous vertical space on desktop (the starter uses between 4rem and 9rem) and about half of it on phones.
- When the page looks flat, add space between sections before you add decoration.
- When the page looks empty, make the main element larger or remove an element. Do not fill the gap with a new section.

## The hero

The hero is where a visitor decides whether to keep reading. Check it against this list:

- The headline says what the site or business is, or what the visitor gets, in plain words. It is not a slogan that could belong to anyone.
- One supporting sentence, at most two lines.
- One primary action, and optionally one quiet secondary link.
- A visual that belongs to the brand (a drawing, a product, a photo of the real thing). If none exists, use type as the visual.
- The first screen works with no scrolling on a phone: the headline and the action are visible without scrolling at 390 by 844.
- Nothing important is under the sticky header.
- The page does not need a script, a video or an image to read correctly.

## Calls to action

- Use the verb of the real action: "Book a call", "See the projects", "Get the price list". Avoid "Learn more" and "Submit".
- The same action uses the same words everywhere on the page.
- Repeat the primary action after the proof section and at the end. Do not put it in every section.
- Keep the final call to action plain: a short sentence and one button on a clean background.

## Long pages and multi-page sites

- Give each page one h1 and one clear job.
- Keep navigation consistent. Mark the current page with a clear style and `aria-current="page"`.
- Put the footer content people look for (contact, address, legal) in the same place on every page.
- If a page is long, add a short "on this page" link list near the top rather than a sticky decoration.
