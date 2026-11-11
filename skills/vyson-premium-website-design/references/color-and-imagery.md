# Colour and imagery

Colour and pictures carry the mood. Both go wrong the same way: too many choices and no rule. The numbers here are VYSON design defaults, not measured results, except the contrast ratios, which come from WCAG 2.2.

Contents: building a colour system, contrast, using the accent, dark mode, imagery choices, image files and licences, text on images.

## Build a colour system from roles

Do not choose "a nice palette". Choose roles, then one value per role. The starter file has these:

| Role | Token | Rule |
|---|---|---|
| Background | `--vd-bg` | The page. Usually a tinted neutral rather than pure white. |
| Surface | `--vd-surface` | Panels and cards, slightly different from the background. |
| Text | `--vd-text` | Near-black or near-white, tinted toward the palette. Pure `#000` on pure `#fff` is harsh. |
| Muted text | `--vd-muted` | Secondary information. It must still reach 4.5:1. |
| Line | `--vd-line` | Hairlines and borders. Decorative only. |
| Accent | `--vd-accent` | One colour that means "act" or "look here". |
| Accent contrast | `--vd-accent-contrast` | Text on the accent. |
| Link | `--vd-link` | Link colour on the background. |
| Focus | `--vd-focus` | Focus ring. Needs 3:1 against the page. |

Method:

1. Pick the **neutral family** first: a warm, cool or neutral grey scale. It is most of the page, so it sets the mood.
2. Pick **one accent**. Use it for the primary button, links, key numerals and the focus of one image. If accent colour appears everywhere, it means nothing.
3. Add a **second accent only if** the content needs two kinds of signals (for example success and warning), and keep it out of decoration.
4. Tint neutrals slightly toward the accent's hue, so the page feels like one palette.
5. Write the values into the tokens and use only tokens in the CSS. No stray hex values in components.

A rough proportion that works for many sites: about 70 to 80 percent neutral, 15 to 25 percent a second neutral or dark band, and under 10 percent accent. Treat it as a starting guess.

## Contrast

These are the requirements of WCAG 2.2 level AA:

| What | Minimum contrast |
|---|---|
| Normal text (SC 1.4.3) | 4.5:1 |
| Large text: at least 24px, or 18.66px and bold (SC 1.4.3) | 3:1 |
| Interactive component borders, icons and focus indicators that are needed to understand the control (SC 1.4.11) | 3:1 against the colours next to them |

Practical rules:

- Check every text colour on every background it sits on, including the muted text, link text and text on the accent.
- Run `scripts/design-lint.mjs`. It checks the token pairs in the starter file (DL015). It does **not** check text on images, gradients or colours outside those tokens, so check those by hand with a contrast tool.
- Do not rely on colour alone to show state (an error, a selected tab, a link). Add an icon, text, an underline or a border.
- Disabled controls and purely decorative text are exempt from the ratio, but do not make them unreadable.

## The accent in use

- One primary action per view gets the solid accent fill.
- A link in running text gets the link colour and an underline.
- Use accent in a graphic only when it points at the main thing: a number, a highlighted word, one shape.
- Hover states change the colour of the same element. They do not introduce a new colour.

## Dark mode

Add it only when the user asks or the audience needs it. If you add it:

1. Redefine the **same roles** inside `@media (prefers-color-scheme: dark)`, and set `color-scheme: light dark` on `:root`.
2. Do not just invert. Dark backgrounds need slightly lighter, less saturated accents and a softer white for text.
3. Run the contrast check again. `design-lint.mjs` checks theme blocks that redefine the tokens.
4. Check images, shadows and borders in the dark theme as well. Shadows are nearly invisible on dark backgrounds, so use borders or lighter surfaces for depth.

## Imagery: decide before you pick

Choose the imagery type in the direction note, then keep it consistent. Options:

| Type | Good when | Watch out for |
|---|---|---|
| Real photographs of real work or people | The business has them | Inconsistent lighting and crops. Edit them to one look. |
| Product shots | Selling objects | Clean backgrounds, consistent angle and size |
| Illustration or line drawing | No photography exists, or the brand is distinctive | One style, one stroke weight, one palette |
| Generated shapes and patterns (CSS or SVG) | You need graphics at no licence cost | Keep them purposeful. Do not use a random blob for decoration. |
| Type only | The words are strong | Needs excellent type and space |

Stock photography is the most common reason a site looks generic. If there are no real images, prefer a drawn or typographic solution over a stock photo, and mark clearly where real photos should go.

## Image files and licences

- Do not hotlink images from other websites. Store the files in the project.
- Every image, icon and illustration has a recorded licence and source in a credits file. If you cannot verify the licence, do not use the file.
- Do not use an AI image generator's output as a "photograph of a real person, product or place". If generated imagery is used, label it as such in the credits.
- Use modern formats where available (`webp` or `avif`), with a fallback if the project must support old browsers. Keep each image only as large as it is displayed (times two for sharp screens).
- Always write `width` and `height` attributes (the real pixel size) and keep `height: auto` in CSS, so the layout does not jump while images load.
- Add `loading="lazy"` to images below the first screen. Do not lazy-load the main hero image.
- Use `alt` text that says what the image shows in context. Use `alt=""` for decoration. Never write "image of".
- Use a fixed `aspect-ratio` and `object-fit: cover` so a gallery has even edges.
- Inline SVG is good for logos and drawings. Give it a `<title>` and `role="img"` when it carries meaning, and `aria-hidden="true"` when it is decoration.

## Text on images

- Put text on a plain area of the image, or on a solid or gradient panel behind it. Never rely on the picture for contrast.
- Check the contrast at the lightest part of the image behind the text. If it cannot be controlled, put the text beside the image.
- Do not put text inside an image file when it is real content. Screen readers, translation and search cannot read it.
