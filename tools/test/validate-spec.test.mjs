import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateSkill } from '../lib/validate-skill.mjs';
import { discoverSkillDirs } from '../lib/discover.mjs';
import { FIXTURES, makeTempDir, removeDir, makeSkill, writeFiles, codesOf } from './helpers.mjs';

const spec = (dir) => validateSkill(dir, { profile: 'spec' });

describe('valid example skills', () => {
  for (const name of ['valid-minimal', 'valid-full']) {
    it(`${name} has no errors and no warnings`, () => {
      const r = spec(path.join(FIXTURES, 'spec', name));
      assert.deepEqual(r.issues, []);
    });
  }

  it('valid-full has its Markdown links checked', () => {
    const r = spec(path.join(FIXTURES, 'spec', 'valid-full'));
    assert.equal(r.stats.markdownFiles, 2);
    // Relative links: references/guide.md#setup-steps, assets/starter.html, #a-second-section.
    // Not counted: the https link, the link inside the code block, the `scripts/check.mjs` inline code.
    assert.equal(r.stats.links, 3);
  });
});

describe('invalid example skills (static fixtures)', () => {
  const cases = [
    ['uppercase-name', ['VS013', 'VS016']],
    ['name-mismatch', ['VS016']],
    ['missing-description', ['VS020']],
    ['colon-in-description', ['VS005']],
    ['no-frontmatter', ['VS003']],
    ['unclosed-frontmatter', ['VS004']],
    ['empty-body', ['VS040']],
    ['broken-link', ['VL001', 'VL003']],
    ['missing-skill-md', ['VS001']],
  ];
  for (const [name, expected] of cases) {
    it(`${name} reports ${expected.join(' + ')}`, () => {
      const r = spec(path.join(FIXTURES, 'invalid', name));
      const found = codesOf(r, 'error');
      for (const code of expected) assert.ok(found.includes(code), `expected ${code}, found: ${found.join(', ') || 'nothing'}`);
    });
  }

  it('every error carries a message and a fix', () => {
    const r = spec(path.join(FIXTURES, 'invalid', 'uppercase-name'));
    for (const i of r.issues) {
      assert.ok(i.message.length > 0);
      assert.ok(i.fix.length > 0);
      assert.ok(i.title.length > 0);
    }
  });

  it('reports the line number of the offending header field', () => {
    const r = spec(path.join(FIXTURES, 'invalid', 'uppercase-name'));
    assert.equal(r.issues.find((i) => i.code === 'VS013').line, 2);
  });
});

describe('invalid skills (generated)', () => {
  let tmp;
  before(() => { tmp = makeTempDir('vyson-spec-'); });
  after(() => removeDir(tmp));

  const errors = (r) => codesOf(r, 'error');
  const warnings = (r) => codesOf(r, 'warning');

  it('rejects a name that is too long (VS012)', () => {
    const name = 'a'.repeat(65);
    assert.ok(errors(spec(makeSkill(tmp, name))).includes('VS012'));
  });

  it('accepts a name of exactly 64 characters', () => {
    const name = 'a'.repeat(64);
    assert.deepEqual(errors(spec(makeSkill(tmp, name))), []);
  });

  it('rejects leading, trailing and double hyphens (VS014, VS015)', () => {
    assert.ok(errors(spec(makeSkill(tmp, '-lead'))).includes('VS014'));
    assert.ok(errors(spec(makeSkill(tmp, 'trail-'))).includes('VS014'));
    assert.ok(errors(spec(makeSkill(tmp, 'dou--ble'))).includes('VS015'));
  });

  it('rejects spaces in the name (VS013)', () => {
    const r = spec(makeSkill(tmp, 'space-name', { name: '"has space"' }));
    assert.ok(errors(r).includes('VS013'));
  });

  it('rejects a missing or empty name (VS010, VS011)', () => {
    assert.ok(errors(spec(makeSkill(tmp, 'no-name', { header: 'description: Use when testing something.' }))).includes('VS010'));
    assert.ok(errors(spec(makeSkill(tmp, 'empty-name', { header: 'name:\ndescription: Use when testing something.' }))).includes('VS011'));
  });

  it('rejects an empty description (VS021)', () => {
    const r = spec(makeSkill(tmp, 'empty-desc', { header: 'name: empty-desc\ndescription:' }));
    assert.ok(errors(r).includes('VS021'));
  });

  it('enforces the 1024-character description limit (VS022)', () => {
    const over = makeSkill(tmp, 'long-desc', { description: `Use when ${'x'.repeat(1020)}` });
    assert.ok(errors(spec(over)).includes('VS022'));
    const exact = makeSkill(tmp, 'exact-desc', { description: `Use when ${'x'.repeat(1024 - 9)}` });
    assert.ok(!errors(spec(exact)).includes('VS022'));
  });

  it('warns about a short description and a missing "when" phrase (VS024, VS023)', () => {
    const r = spec(makeSkill(tmp, 'short-desc', { description: 'Tiny.' }));
    assert.deepEqual(errors(r), []);
    assert.ok(warnings(r).includes('VS024'));
    assert.ok(warnings(r).includes('VS023'));
  });

  it('accepts a quoted description that contains a colon', () => {
    const r = spec(makeSkill(tmp, 'quoted-colon', { description: '"Does things: well. Use when testing quoting."' }));
    assert.deepEqual(r.issues, []);
  });

  it('reports a file called skill.md with the wrong capitals (VS002)', () => {
    const dir = path.join(tmp, 'wrong-case');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'skill.md'), '---\nname: wrong-case\ndescription: Use when testing.\n---\nBody\n');
    assert.deepEqual(errors(spec(dir)), ['VS002']);
  });

  it('enforces the 500-line limit (VS041) and not before', () => {
    // The file starts with 5 lines (---, name, description, ---, blank line).
    const at500 = makeSkill(tmp, 'lines-ok', { body: 'line\n'.repeat(495) }); // 5 + 495 = 500 lines
    assert.ok(!errors(spec(at500)).includes('VS041'));
    const at501 = makeSkill(tmp, 'lines-501', { body: 'line\n'.repeat(496) }); // 501 lines
    assert.ok(errors(spec(at501)).includes('VS041'));
    const over = makeSkill(tmp, 'lines-over', { body: 'line\n'.repeat(600) });
    assert.ok(errors(spec(over)).includes('VS041'));
  });

  it('warns when the instructions are probably over 5000 tokens (VS042)', () => {
    const body = `${'x'.repeat(200)}\n`.repeat(110); // 22,000 characters, 110 lines
    const r = spec(makeSkill(tmp, 'many-tokens', { body }));
    assert.ok(warnings(r).includes('VS042'));
    assert.ok(!errors(r).includes('VS041'));
  });

  it('validates the optional fields (VS030, VS031, VS035)', () => {
    assert.ok(errors(spec(makeSkill(tmp, 'bad-license', { extraHeader: 'license:' }))).includes('VS030'));
    assert.ok(errors(spec(makeSkill(tmp, 'bad-compat', { extraHeader: `compatibility: ${'c'.repeat(501)}` }))).includes('VS031'));
    assert.ok(errors(spec(makeSkill(tmp, 'ok-compat', { extraHeader: `compatibility: ${'c'.repeat(500)}` }))).every((c) => c !== 'VS031'));
    assert.ok(errors(spec(makeSkill(tmp, 'bad-tools', { extraHeader: 'allowed-tools:\n  - Read\n  - Grep' }))).includes('VS035'));
  });

  it('validates metadata (VS032, VS033/VS005, VS034)', () => {
    assert.ok(errors(spec(makeSkill(tmp, 'meta-text', { extraHeader: 'metadata: just text' }))).includes('VS032'));
    assert.ok(errors(spec(makeSkill(tmp, 'meta-list', { extraHeader: 'metadata:\n  - a\n  - b' }))).includes('VS032'));
    assert.ok(errors(spec(makeSkill(tmp, 'meta-deep', { extraHeader: 'metadata:\n  a:\n    b: c' }))).includes('VS005'));
    const unquoted = spec(makeSkill(tmp, 'meta-number', { extraHeader: 'metadata:\n  version: 1.0\n  flag: true' }));
    assert.deepEqual(errors(unquoted), []);
    assert.deepEqual(warnings(unquoted), ['VS034', 'VS034']);
    assert.deepEqual(spec(makeSkill(tmp, 'meta-quoted', { extraHeader: 'metadata:\n  version: "1.0"\n  flag: "true"' })).issues, []);
  });

  it('warns about unknown header fields (VS036) without failing', () => {
    const r = spec(makeSkill(tmp, 'unknown-field', { extraHeader: 'user-invocable: false' }));
    assert.deepEqual(errors(r), []);
    assert.deepEqual(warnings(r), ['VS036']);
  });

  it('warns about empty scripts/references/assets folders (VS050)', () => {
    const dir = makeSkill(tmp, 'empty-dir');
    fs.mkdirSync(path.join(dir, 'scripts'));
    assert.deepEqual(warnings(spec(dir)), ['VS050']);
  });

  it('warns when a reference file links to another reference file (VS051)', () => {
    const dir = makeSkill(tmp, 'chain', {
      body: '# Chain\n\n[a](references/a.md)\n',
      files: { 'references/a.md': '# A\n\n[b](b.md)\n', 'references/b.md': '# B\n' },
    });
    assert.deepEqual(warnings(spec(dir)), ['VS051']);
  });

  it('warns about download instructions near a web address (VS052) but not negated ones', () => {
    const bad = makeSkill(tmp, 'fetcher', { body: '# Rules\n\nFetch the latest rules from:\n\nhttps://example.com/rules.md\n' });
    assert.ok(warnings(spec(bad)).includes('VS052'));
    const good = makeSkill(tmp, 'no-fetcher', { body: '# Rules\n\nNever fetch rules from https://example.com/rules.md at run time.\n' });
    assert.ok(!warnings(spec(good)).includes('VS052'));
  });

  it('reads files with Windows line endings and a BOM', () => {
    const dir = path.join(tmp, 'crlf');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '\uFEFF---\r\nname: crlf\r\ndescription: Use when testing Windows line endings.\r\n---\r\n\r\n# Body\r\n');
    assert.deepEqual(spec(dir).issues, []);
  });

  it('reports broken links found in files other than SKILL.md', () => {
    const dir = makeSkill(tmp, 'deep-link', { files: { 'references/r.md': '[x](gone.md)\n' }, body: '# T\n\n[r](references/r.md)\n' });
    const r = spec(dir);
    assert.deepEqual(codesOf(r, 'error'), ['VL001']);
    assert.match(r.issues[0].file, /r\.md$/);
  });
});

describe('discoverSkillDirs', () => {
  it('treats a folder with SKILL.md as one skill', () => {
    const found = discoverSkillDirs(path.join(FIXTURES, 'spec', 'valid-minimal'));
    assert.equal(found.mode, 'single');
    assert.equal(found.dirs.length, 1);
  });

  it('treats other folders as containers and lists every sub-folder', () => {
    const found = discoverSkillDirs(path.join(FIXTURES, 'invalid'));
    assert.equal(found.mode, 'container');
    assert.ok(found.dirs.some((d) => d.endsWith('missing-skill-md')), 'folders without SKILL.md are included');
  });

  it('skips hidden folders and node_modules', () => {
    const tmp = makeTempDir('vyson-discover-');
    try {
      writeFiles(tmp, { '.hidden/x.md': 'x', 'node_modules/y.md': 'y', 'real/SKILL.md': 'z' });
      assert.deepEqual(discoverSkillDirs(tmp).dirs.map((d) => path.basename(d)), ['real']);
    } finally {
      removeDir(tmp);
    }
  });

  it('follows a link (symlink or Windows junction) to a skill folder, and ignores a broken link', () => {
    const tmp = makeTempDir('vyson-discover-links-');
    try {
      writeFiles(tmp, { 'store/real-skill/SKILL.md': 'z' });
      fs.mkdirSync(path.join(tmp, 'agents'));
      // "junction" works on Windows without special permission; other systems treat it as a normal symlink.
      fs.symlinkSync(path.join(tmp, 'store', 'real-skill'), path.join(tmp, 'agents', 'linked-skill'), 'junction');
      fs.symlinkSync(path.join(tmp, 'store', 'does-not-exist'), path.join(tmp, 'agents', 'broken-link'), 'junction');
      const found = discoverSkillDirs(path.join(tmp, 'agents'));
      assert.deepEqual(found.dirs.map((d) => path.basename(d)), ['linked-skill']);
    } finally {
      removeDir(tmp);
    }
  });

  it('throws a clear message for a path that does not exist', () => {
    assert.throws(() => discoverSkillDirs(path.join(FIXTURES, 'nope')), /Path not found/);
  });
});
