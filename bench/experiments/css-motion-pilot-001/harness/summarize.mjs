#!/usr/bin/env node
// summarize.mjs: turn one or more measure.mjs result files into a short side-by-side table.
// Usage: node summarize.mjs <label>=<result.json> [<label>=<result.json> ...]
// Works with result files from harness version 2 and 3. Rows that need version 3 data show "n/a" for version 2 files.

import fs from 'node:fs';

const inputs = process.argv.slice(2).map((a) => {
  const [label, file] = a.split('=');
  return { label, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
});
if (inputs.length === 0) { console.error('Usage: node summarize.mjs label=result.json ...'); process.exit(2); }

const get = (obj, pathStr) => pathStr.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);
const fmt = (v) => (v === undefined ? 'n/a (v2)' : Array.isArray(v) ? (v.length ? `${v.length}: ${v.slice(0, 3).join('; ')}` : '0') : typeof v === 'object' ? JSON.stringify(v) : String(v));

const ROWS = [
  ['STATIC CODE', null],
  ['HTML / CSS / JS bytes', (d) => `${d.static.bytes.html} / ${d.static.bytes.css} / ${d.static.bytes.js}`],
  ['code lines (html+css+js)', 'static.codeLines'],
  ['transition: all', 'static.transitionAll'],
  ['!important', 'static.importantDeclarations'],
  ['will-change', 'static.willChangeDeclarations'],
  ['@keyframes blocks', 'static.keyframesBlocks'],
  ['reduced-motion mentions (no-pref / reduce)', (d) => `${d.static.reducedMotionMentions} (${d.static.reducedMotionNoPreferenceBlocks} / ${d.static.reducedMotionReduceBlocks})`],
  ['(hover: hover) media queries', 'static.hoverMediaQueries'],
  ['IntersectionObserver uses', 'static.intersectionObserverUses'],
  ['scroll event listeners', 'static.scrollEventListeners'],
  ['requestAnimationFrame uses', 'static.requestAnimationFrameUses'],
  ['external references / animation-library mentions', (d) => `${d.static.externalReferences} / ${d.static.animationLibraryMentions}`],
  ['skill motion-lint (not independent)', (d) => (d.skillLint ? `${d.skillLint.errors} errors, ${d.skillLint.warnings} warnings ${d.skillLint.codes ? d.skillLint.codes.slice(0, 4).join(',') : ''}` : 'not run')],
  ['ANIMATION BEHAVIOUR (motion allowed)', null],
  ['hero entrance: elements animated in first screen', 'motionAllowed.behaviour.heroEntranceElements'],
  ['scroll reveal: elements animated below first screen', 'motionAllowed.behaviour.scrollRevealElements'],
  ['hover feedback, LEGACY rough sample (v2 measure; do not read as amount of hover feedback)', 'motionAllowed.behaviour.hoverFeedbackElements'],
  ['hover rules (v3): selectors / elements tested / changed on real hover / animated', (d) => { const h = d.hoverRules; return h ? `${h.hoverSelectors} / ${h.tested} / ${h.changedVisibly} / ${h.animated}` : undefined; }],
  ['hover rules (v3): hover-movement rules the browser did NOT apply', (d) => (d.hoverRules ? (d.hoverRules.declaredMovementNotApplied.length ? d.hoverRules.declaredMovementNotApplied : 0) : undefined)],
  ['accordion (v3): controls / panels open after opening two (1 = one at a time)', (d) => { const a = d.accordion; return a ? `${a.controlsFound} / ${a.openAfterOpeningSecond ?? 'n/a'}` : undefined; }],
  ['FAQ toggle found / opens by mouse / animated open', (d) => `${get(d, 'motionAllowed.behaviour.faq.toggleFound')} / ${get(d, 'motionAllowed.behaviour.faq.toggledByMouse')} / ${get(d, 'motionAllowed.behaviour.faq.animatedOpen')}`],
  ['distinct animations (css anim / css trans / web anim)', (d) => { const a = d.motionAllowed.animations; return `${a.totalDistinct} (${a.cssAnimations} / ${a.cssTransitions} / ${a.webAnimations})`; }],
  ['compositor-only / layout / paint-or-other', (d) => { const a = d.motionAllowed.animations; return `${a.compositorOnly} / ${a.layout} / ${a.paintOrOther}`; }],
  ['layout properties animated', 'motionAllowed.animations.layoutProperties'],
  ['other (paint) properties animated', 'motionAllowed.animations.otherProperties'],
  ['infinite animations / longest finite (ms)', (d) => `${d.motionAllowed.animations.infiniteAnimations} / ${d.motionAllowed.animations.longestFiniteMs}`],
  ['console errors', 'motionAllowed.consoleErrors'],
  ['requests (external) / bytes', (d) => `${d.motionAllowed.network.requests} (${d.motionAllowed.network.externalRequests}) / ${d.motionAllowed.network.transferredBytes}`],
  ['REDUCED MOTION (prefers-reduced-motion: reduce)', null],
  ['movement animations still present (>1ms)', 'reducedMotion.spatialMovementAnimations'],
  ['all distinct animations still present', 'reducedMotion.animations.totalDistinct'],
  ['infinite animations running at end', 'reducedMotion.runningAtEnd.infinite'],
  ['scroll-behavior', 'reducedMotion.scrollBehavior'],
  ['text hidden after scrolling through', 'reducedMotion.hiddenTextAfterScrollThrough'],
  ['SCRIPTS DISABLED', null],
  ['text hidden with scripts off (v2 measure: transparent text only)', 'scriptsDisabled.hiddenTextElements'],
  ['scripts off (v3): unreadable text elements, desktop / phone', (d) => { const s = d.scriptsDisabled.v3; return s ? `${s.unreadableTextElementsDesktop} / ${s.unreadableTextElementsPhone}` : undefined; }],
  ['scripts off (v3): controls whose panel cannot be seen, desktop', 'scriptsDisabled.v3.unreachablePanelsDesktop'],
  ['scripts off (v3): controls whose panel cannot be seen, phone', 'scriptsDisabled.v3.unreachablePanelsPhone'],
  ['RESPONSIVE', null],
  ['viewport meta', 'responsive.viewportMeta'],
  ['widths with horizontal scroll', 'responsive.widthsWithHorizontalScroll'],
  ['touch targets <24px / <44px at 390px', (d) => { const w = d.responsive.widths.find((x) => x.width === 390); return w ? `${w.smallerThan24px} / ${w.smallerThan44px} of ${w.interactiveCount}` : 'n/a'; }],
  ['controls under 44px at 390px, by name (v3)', (d) => { const w = d.responsive.widths.find((x) => x.width === 390); return w && w.smallerThan44List ? w.smallerThan44List : undefined; }],
  ['smallest text px at 390', (d) => { const w = d.responsive.widths.find((x) => x.width === 390); return w ? w.smallestTextPx : 'n/a'; }],
  ['ACCESSIBILITY', null],
  ['axe violations desktop (rules; nodes by impact)', (d) => { const a = d.accessibility.desktop1280; return a ? `${a.violationRules} rules; ${JSON.stringify(a.violatingNodesByImpact)}` : 'axe not run'; }],
  ['axe rule ids desktop', (d) => (d.accessibility.desktop1280 ? d.accessibility.desktop1280.violations.map((v) => `${v.id}(${v.nodes})`) : 'n/a')],
  ['axe violations phone (rules; nodes by impact)', (d) => { const a = d.accessibility.phone390; return a ? `${a.violationRules} rules; ${JSON.stringify(a.violatingNodesByImpact)}` : 'axe not run'; }],
  ['lang / title / h1 count / heading skips', (d) => { const s = d.accessibility.structure; return `${s.htmlLang} / ${Boolean(s.title)} / ${s.h1Count} / ${s.headingLevelSkips}`; }],
  ['landmarks header/nav/main/footer', (d) => { const l = d.accessibility.structure.landmarks; return `${l.header}/${l.nav}/${l.main}/${l.footer}`; }],
  ['aria-expanded controls / with valid aria-controls / details', (d) => { const s = d.accessibility.structure; return `${s.ariaExpandedControls} / ${s.ariaExpandedWithValidAriaControls} / ${s.detailsElements}`; }],
  ['tab stops / without outline or shadow / focused but not visible', (d) => { const k = d.accessibility.keyboard; return `${k.tabStops} / ${k.stopsWithoutOutlineOrShadow} / ${k.stopsFocusedButNotVisible}`; }],
  ['first tab stop', 'accessibility.keyboard.firstStop'],
  ['FAQ toggle works with Enter key', (d) => `${get(d, 'accessibility.keyboardToggle.toggleFound')} / ${get(d, 'accessibility.keyboardToggle.changedByEnterKey')}`],
  ['PERFORMANCE (median of runs, this PC only)', null],
  ['desktop: mean / p95 / max frame ms', (d) => { const m = d.performanceDesktop.median; return `${m.meanFrameMs} / ${m.p95FrameMs} / ${m.maxFrameMs}`; }],
  ['desktop: layouts / style recalcs while scrolling', (d) => { const m = d.performanceDesktop.median; return `${m.layoutCountDuringScroll} / ${m.styleRecalcCountDuringScroll}`; }],
  ['desktop: script ms / task ms / layout shift', (d) => { const m = d.performanceDesktop.median; return `${m.scriptMs} / ${m.taskMs} / ${m.layoutShiftScore}`; }],
  ['phone 4x CPU: mean / p95 / max frame ms', (d) => { const m = d.performancePhoneCpu4x.median; return `${m.meanFrameMs} / ${m.p95FrameMs} / ${m.maxFrameMs}`; }],
  ['phone 4x CPU: frames >33ms / long tasks', (d) => { const m = d.performancePhoneCpu4x.median; return `${m.framesOver33ms} / ${m.longTasks}`; }],
  ['phone 4x CPU: layouts / style recalcs', (d) => { const m = d.performancePhoneCpu4x.median; return `${m.layoutCountDuringScroll} / ${m.styleRecalcCountDuringScroll}`; }],
];

const labelWidth = 62;
console.log(['measure'.padEnd(labelWidth), ...inputs.map((i) => i.label)].join(' | '));
for (const [label, source] of ROWS) {
  if (source === null) { console.log(`\n## ${label}`); continue; }
  const cells = inputs.map((i) => {
    try { return fmt(typeof source === 'function' ? source(i.data) : get(i.data, source)); } catch (e) { return `(${e.message.slice(0, 30)})`; }
  });
  console.log([label.padEnd(labelWidth), ...cells].join(' | '));
}
