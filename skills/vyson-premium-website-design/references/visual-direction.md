# Visual direction

A premium site is the result of decisions that were made on purpose and then kept. A generic site is the result of defaults. This file helps you make the decisions before any CSS is written.

Contents: the direction note, the direction types, how to pick a signature move, the signs of a generic template, how to adapt a direction to an existing brand.

## The direction note

Write this note (8 to 12 lines) before you build. Keep it in the project: in the "Design" section of `VYSON-NOTES.md` (or in the project's own `DESIGN.md` if it already has one), or in your reply if the user wants no new files. Fill in every line. If a line is a guess, label it a guess.

| Line | What to write | Example |
|---|---|---|
| Audience | Who visits, on what device, in what mood | "Couples planning a house, mostly on phones in the evening" |
| Job of the page | The one action that counts as success | "Book a 30-minute call" |
| Three words it should feel like | Concrete feelings, not "modern" or "clean" | "Quiet, exact, warm" |
| Three words it must not feel like | The look to avoid | "Corporate, flashy, cold" |
| Direction type | One of the types below, or a mix of two at most | "Editorial" |
| Signature move | One memorable, repeatable device (see below) | "Large serif headings and thin architectural line drawings" |
| Type | Heading and body font stacks, and the one rule that joins them | "Serif headings, sans body, never mixed inside one line" |
| Colour | Background, text, one accent, and what the accent is used for | "Warm off-white, near-black, one terracotta used only for actions" |
| Layout stance | Symmetric, asymmetric, dense, airy, rigid grid or loose | "Asymmetric 12-column grid, wide margins" |
| Imagery | Photos, illustration, drawing, type only, product | "Line drawings, no stock photos" |
| Content available | What real text and images exist, and what is missing | "Real project names; no photos yet" |

If the request is open-ended, choose every line yourself, write the note and build from it. Do not wait for a yes; the note goes in your report, where the user can ask for a change. If the user already has a brand, take the note from the brand and only fill the lines it leaves open.

## Direction types

These are starting points, not templates. Pick one, then change at least two things about it so the result is specific to this client. The cues are VYSON design defaults, not measured results.

| Type | Feels | Typography | Colour | Layout | Imagery | Details |
|---|---|---|---|---|---|---|
| **Editorial** | Calm, literate, confident | Large serif display, restrained sans for small text, generous leading | Warm neutrals, one earthy accent | Asymmetric grid, big margins, numbered sections | Few large images, drawings, captions | Hairline rules, small caps labels, tabular numbers |
| **Technical and precise** | Exact, trustworthy, modern | Neutral sans for text, monospace for data and labels | Cool greys, one saturated accent | Strict grid, visible structure, dense but orderly | Diagrams, product screens, schematic drawings | Fine borders, consistent 4px or 8px rhythm, aligned numbers |
| **Warm and crafted** | Human, tactile, local | Soft serif or humanist sans, slightly larger body text | Cream, clay, deep green or ink | Generous spacing, rounded or hand-drawn shapes, overlapping layers | Real photos of real work, hands, materials | Texture used sparingly, handwritten touches only where honest |
| **Bold and graphic** | Loud, young, confident | Very large condensed or heavy display, tight leading | High contrast pairs, one or two saturated blocks | Oversized type, blocks of flat colour, cropping | Cut-outs, flat shapes, strong crops | Thick rules, big numerals, strong hover states |
| **Quiet luxury** | Rare, patient, expensive | Light or medium serif, wide letter spacing in small labels | Near-black or deep neutral, one metallic or muted accent | Lots of empty space, centred or very asymmetric, few elements | A few perfect images, no clutter | Almost no ornament, perfect alignment, small precise labels |
| **Playful modern** | Friendly, quick, approachable | Rounded sans or soft grotesque, large friendly headings | Several bright colours with one lead colour | Tilted or overlapping cards, big shapes | Illustration, stickers, product shots | Rounded corners used consistently, simple icons drawn in one style |

Rules for using a type:

- **Pick one.** Mixing editorial headings with playful rounded cards with technical monospace labels looks unplanned.
- **Let the audience beat taste.** A clinic and a record label need different answers, even when the agent likes one more.
- **Stay inside what the content supports.** Quiet luxury with no good images turns into an empty page. Use "editorial" with drawings or type instead.

## The signature move

A signature move is one device that appears several times and makes the site recognisable with the logo covered. It should cost little to build and be easy to repeat. Examples:

- A fixed drawing style (thin outlines in the accent colour) used for every illustration.
- A numbering system (01, 02, 03) in the display font that organises sections and projects.
- A single oversized word or numeral used as a graphic at the start of each section.
- A consistent crop shape for every image, such as tall arches or strict squares.
- A rule that every section starts with a short label, a hairline and a headline in the same arrangement.
- One recurring accent shape, such as a solid circle or a bar, used only to point at the main action or the key fact.

Choose one. Use it at least three times on the page, in the same way each time. Do not add a second device to "make it richer".

## Signs of a generic template

Search your own draft for these. Each one is acceptable once, with a reason. Several together is the generic look.

- A centred hero with a gradient blob or soft glow behind it, a two-line headline, a pill button and a screenshot below.
- Three equal cards in a row, each with an icon in a tinted circle, a bold title and two lines of text.
- Every section centred, every heading the same size, every section the same height.
- The same large corner radius and the same soft shadow on every box.
- A purple-to-blue gradient, or any gradient used because nothing else was decided.
- A default system or "web safe" font on every element, with no size contrast.
- Emoji or a random icon pack used as decoration.
- Stock photos of people shaking hands, laptops on desks or abstract office buildings.
- A row of five grey logos that the client does not have.
- Testimonials with no names, or made-up statistics.
- Headings such as "Why choose us" and "Our services" with no content that is specific to the business.
- Filler text, or "Lorem ipsum".

To get away from the look without adding noise: decide the signature move, make one section clearly dominant, vary the section layouts, remove one decoration for every one you add, and write real copy.

## Working with an existing brand

- Reuse its colours, fonts and logo exactly. Do not "improve" a brand without being asked.
- If the brand is weak or incomplete (a logo and one colour), build the direction note around what is there and say which parts you chose.
- If a style guide and the user's request disagree, follow the style guide and mention the conflict.
- Do not copy a competitor's or another site's layout or wording. Describe what you like in your own words and build something new.

## When you are really blocked

Do not ask about taste. Work the answers out from the project and the request, and write your assumptions in the direction note. Ask one short question only when the work cannot start without the answer, for example:

1. There is no project folder and nothing in the request says what the site is for.
2. The request names a brand to follow but the brand files cannot be found.

Everything else (the one action on the page, the direction type, the colours) you decide, label as an assumption and keep going. If the user gave links to sites they like, use them to understand taste only. Do not copy them.
