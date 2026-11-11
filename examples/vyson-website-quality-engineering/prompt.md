# Prompt used for this example

This is the request this example answers, written to match the two site folders. It was **not** given to a separate agent in a clean test. The flawed site (`site-before/`) was written on purpose, with known problems, by an AI agent (Claude, working in Cursor) in the same session that wrote the skill, and the fixed site (`site-after/`) was written by the same agent. The prompt describes the task rather than recording a test run. To try the skill yourself, install it and give your agent this request on `site-before/`.

```text
Pinewick Bakery is a made-up bakery with a small website in the folder
site-before. We want to publish it.

Use the vyson-website-quality-engineering skill. Check the site before launch,
fix what you find without changing the wording or the look of the page more than
the fixes need, and tell me honestly whether it is ready.

Run the static audit and the browser check before and after the fixes. Put the
fixed site in a new folder called site-after. Keep what the tools tested apart
from what they did not test.
```

## What a good result looks like

These are the checks from the skill's acceptance list that apply to this request.

- Both tools run on the folder, before and after, and their last `RESULT` lines are quoted unchanged.
- Every error is fixed. Every warning is fixed or explained.
- The report keeps the static audit, the browser test and the manual checks in separate lists.
- The report names what was not tested: a real phone, other browsers, a screen reader, field data, and any page that the browser check did not open.
- The report does not call the site "accessible", "fast" or "mobile-friendly".
- Copy and design are changed only where a fix needs it. Every change is listed.
- The fixed site passes both tools with 0 errors and 0 warnings.
