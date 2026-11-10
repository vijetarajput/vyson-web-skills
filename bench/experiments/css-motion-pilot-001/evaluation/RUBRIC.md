# Blind review rubric

You are reviewing two versions of the same one-page website, called **A** and **B**. They were made from the same brief ("Harborline Architects", a made-up architecture studio). You do not know how they were made. Do not guess who or what made them; just review what you see.

## What you may look at
- `A\` and `B\` (the website source: HTML, CSS, JS).
- `shotsA\` and `shotsB\` (screenshots taken in a headless browser: desktop full page, desktop first screen right after load, desktop with reduced motion on, phone full page).

You cannot run the animation, so for motion judge from the code and the screenshots only, and say "from code" when you are inferring behaviour.

## The brief both sites were built from
One page, plain HTML/CSS/JS, no libraries. Sections: header with navigation, hero (headline, one sentence, one button), 6 project cards, 4 numbered steps, 4 FAQ items, contact footer. Tasteful motion that feels premium: hero entrance, scroll reveals, hover and press feedback, smooth FAQ open and close. Professional look. Works well on phones and desktop.

## Score each site 1 to 5 on each criterion (5 = excellent, 1 = poor)
1. **Visual quality**: layout, typography, spacing, colour, polish, how "premium" it feels.
2. **Animation design**: are the motions tasteful, purposeful and consistent? Is anything excessive, distracting or missing from the brief?
3. **Responsive design**: how well the layout and controls work on the phone screenshot, and what the CSS suggests for other widths.
4. **Accessibility**: semantics, keyboard use, focus styles, contrast you can judge, ARIA use, text alternatives.
5. **Reduced-motion support**: how well the site respects the user's reduced-motion setting, judged from the CSS/JS and the reduced-motion screenshot.
6. **Code quality**: readability, structure, naming, comments, absence of hacks, maintainability.

## Rules
- Give a one or two sentence reason for every score, quoting a file name and line or class name where possible.
- Note anything you could not judge.
- Do not give a "winner" unless the scores clearly show it; ties are fine.
- Do not read any folder other than the review folder you were given.

## Output format
A Markdown table of scores (criterion, A, B), then the reasons per criterion, then "Things I could not judge", then "Biggest problem in each site".
