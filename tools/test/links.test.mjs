import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { extractLinks, slugifyHeading, collectHeadingSlugs, checkLinksInFile } from '../lib/links.mjs';
import { makeTempDir, removeDir, writeFiles } from './helpers.mjs';

const targets = (md) => extractLinks(md).map((l) => l.target);

describe('extractLinks', () => {
  it('finds inline links and images', () => {
    assert.deepEqual(targets('See [a](one.md) and ![pic](img/two.png).'), ['one.md', 'img/two.png']);
  });

  it('ignores link titles and handles <angle brackets>', () => {
    assert.deepEqual(targets('[a](one.md "Title") [b](<my file.md>)'), ['one.md', 'my file.md']);
  });

  it('finds reference definitions and HTML attributes', () => {
    const md = '[ref]: docs/ref.md\n\n<img src="pics/a.png"> <a href="page.html">x</a>';
    assert.deepEqual([...targets(md)].sort(), ['docs/ref.md', 'page.html', 'pics/a.png']);
  });

  it('handles parentheses inside a link target', () => {
    assert.deepEqual(targets('[x](file_(1).md)'), ['file_(1).md']);
  });

  it('ignores code blocks, inline code and HTML comments', () => {
    const md = [
      '```',
      '[a](in-fence.md)',
      '```',
      'Text `[b](inline-code.md)` more',
      '<!-- [c](comment.md) -->',
      '[real](real.md)',
    ].join('\n');
    assert.deepEqual(targets(md), ['real.md']);
  });

  it('reports correct line numbers', () => {
    const md = 'line one\n\n[a](x.md)\n```\n[b](y.md)\n```\n[c](z.md)';
    assert.deepEqual(extractLinks(md).map((l) => l.line), [3, 7]);
  });

  it('keeps anchors and external links in the result', () => {
    assert.deepEqual(targets('[a](#top) [b](https://example.com)'), ['#top', 'https://example.com']);
  });
});

describe('heading anchors', () => {
  it('creates GitHub-style slugs', () => {
    assert.equal(slugifyHeading('Step 2: Set up `npm`!'), 'step-2-set-up-npm');
    assert.equal(slugifyHeading('Hello, World'), 'hello-world');
    assert.equal(slugifyHeading('[Link text](http://x.y) here'), 'link-text-here');
  });

  it('numbers duplicate headings', () => {
    const slugs = collectHeadingSlugs('# Intro\n## Intro\n## Intro\n');
    assert.deepEqual([...slugs], ['intro', 'intro-1', 'intro-2']);
  });

  it('ignores "headings" inside code blocks', () => {
    assert.deepEqual([...collectHeadingSlugs('```\n# not a heading\n```\n# Real\n')], ['real']);
  });
});

describe('checkLinksInFile', () => {
  let root;
  let skill;
  const check = (file, opts = {}) => checkLinksInFile(path.join(skill, file), { boundary: skill, caseRoot: skill, ...opts });
  const codes = (r) => r.issues.map((i) => i.code);

  before(() => {
    root = makeTempDir('vyson-links-');
    skill = path.join(root, 'skill');
    writeFiles(skill, {
      'SKILL.md': '# Main\n\n## Part One\n',
      'Guide.md': '# Guide\n\n## Details\n',
      'references/a.md': '# A\n',
      'references/with space.md': '# Space\n',
      'assets/pic.png': 'x',
    });
    writeFiles(root, { 'outside.md': '# Outside\n' });
  });
  after(() => removeDir(root));

  it('accepts links to existing files, folders and encoded names', () => {
    writeFiles(skill, {
      'ok.md': '[a](references/a.md) [dir](references/) [sp](references/with%20space.md) [img](assets/pic.png) [web](https://x.y) [mail](mailto:a@b.c)',
    });
    const r = check('ok.md');
    assert.deepEqual(r.issues, []);
    assert.equal(r.linkCount, 4);
  });

  it('reports a missing file (VL001) with the line number', () => {
    writeFiles(skill, { 'missing.md': 'text\n[x](references/nope.md)\n' });
    const r = check('missing.md');
    assert.deepEqual(codes(r), ['VL001']);
    assert.equal(r.issues[0].line, 2);
  });

  it('reports wrong capital letters (VL002) on every operating system', () => {
    writeFiles(skill, { 'case.md': '[g](guide.md)' });
    assert.deepEqual(codes(check('case.md')), ['VL002']);
    assert.match(check('case.md').issues[0].message, /Guide\.md/);
  });

  it('reports wrong capital letters in a folder name', () => {
    writeFiles(skill, { 'case2.md': '[a](References/a.md)' });
    assert.deepEqual(codes(check('case2.md')), ['VL002']);
  });

  it('reports links that leave the skill folder (VL003)', () => {
    writeFiles(skill, { 'escape.md': '[o](../outside.md)' });
    assert.deepEqual(codes(check('escape.md')), ['VL003']);
  });

  it('allows links outside the folder when no boundary is set', () => {
    const r = checkLinksInFile(path.join(skill, 'escape.md'), { caseRoot: root });
    assert.deepEqual(r.issues, []);
  });

  it('checks #anchors in the same file and in other files (VL004 is a warning)', () => {
    writeFiles(skill, {
      'anchors.md': '# Top\n\n[self ok](#top) [self bad](#nope) [other ok](SKILL.md#part-one) [other bad](SKILL.md#nope)\n',
    });
    const r = check('anchors.md');
    assert.deepEqual(codes(r), ['VL004', 'VL004']);
    assert.ok(r.issues.every((i) => i.severity === 'warning'));
  });

  it('warns about links that start with "/" (VL005)', () => {
    writeFiles(skill, { 'abs.md': '[a](/docs/a.md)' });
    assert.deepEqual(codes(check('abs.md')), ['VL005']);
  });

  it('ignores broken links inside code blocks', () => {
    writeFiles(skill, { 'code.md': '```\n[x](missing.md)\n```\n' });
    assert.deepEqual(check('code.md').issues, []);
  });
});
