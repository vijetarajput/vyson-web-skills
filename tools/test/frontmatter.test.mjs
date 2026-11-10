import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitFrontmatter, parseHeader, parseScalarText } from '../lib/frontmatter.mjs';

const parse = (text) => {
  const split = splitFrontmatter(`---\n${text}\n---\nbody`);
  assert.equal(split.status, 'ok');
  return parseHeader(split.headerLines, split.headerStartLine);
};

describe('splitFrontmatter', () => {
  it('splits header and body and reports line numbers', () => {
    const r = splitFrontmatter('---\nname: a\n---\n\n# Title\n');
    assert.equal(r.status, 'ok');
    assert.deepEqual(r.headerLines, ['name: a']);
    assert.equal(r.headerStartLine, 2);
    assert.equal(r.bodyStartLine, 4);
    assert.equal(r.bodyLines.join('\n').trim(), '# Title');
  });

  it('reports a missing header', () => {
    assert.equal(splitFrontmatter('# Title\n').status, 'missing');
    assert.equal(splitFrontmatter('').status, 'missing');
  });

  it('reports an unclosed header', () => {
    assert.equal(splitFrontmatter('---\nname: a\n# Title\n').status, 'unclosed');
  });

  it('accepts Windows line endings and a BOM', () => {
    const r = splitFrontmatter('\uFEFF---\r\nname: a\r\n---\r\nbody\r\n');
    assert.equal(r.status, 'ok');
    assert.deepEqual(r.headerLines, ['name: a']);
  });
});

describe('parseScalarText', () => {
  it('reads plain, single-quoted and double-quoted text', () => {
    assert.equal(parseScalarText('hello world').value, 'hello world');
    assert.equal(parseScalarText("'it''s fine'").value, "it's fine");
    assert.equal(parseScalarText('"say \\"hi\\": ok"').value, 'say "hi": ok');
  });

  it('marks plain and quoted values differently', () => {
    assert.equal(parseScalarText('1.0').plain, true);
    assert.equal(parseScalarText('"1.0"').plain, false);
  });

  it('removes comments from plain text but not from quoted text', () => {
    assert.equal(parseScalarText('value # comment').value, 'value');
    assert.equal(parseScalarText('"value # kept"').value, 'value # kept');
  });

  it('rejects ": " inside plain text', () => {
    assert.match(parseScalarText('a: b').error, /colon/);
  });

  it('rejects a missing closing quote and text after a quote', () => {
    assert.match(parseScalarText('"open').error, /closing quote/);
    assert.match(parseScalarText('"x" y').error, /extra text/);
  });

  it('rejects flow lists, flow maps and reserved starting characters', () => {
    assert.ok(parseScalarText('[a, b]').error);
    assert.ok(parseScalarText('{a: b}').error);
    assert.ok(parseScalarText('@user').error);
    assert.ok(parseScalarText('`code`').error);
  });
});

describe('parseHeader', () => {
  it('reads simple fields and their line numbers', () => {
    const r = parse('name: demo\ndescription: Does things. Use when needed.');
    assert.deepEqual(r.data, { name: 'demo', description: 'Does things. Use when needed.' });
    assert.equal(r.lineOf.name, 2);
    assert.equal(r.lineOf.description, 3);
    assert.deepEqual(r.errors, []);
  });

  it('reads folded block text (>)', () => {
    const r = parse('description: >\n  first line\n  second line\nname: x');
    assert.equal(r.data.description, 'first line second line');
    assert.equal(r.data.name, 'x');
    assert.deepEqual(r.errors, []);
  });

  it('reads literal block text (|)', () => {
    const r = parse('description: |\n  first\n  second');
    assert.equal(r.data.description, 'first\nsecond');
  });

  it('joins plain text wrapped over several lines', () => {
    const r = parse('description: first part\n  second part\nname: x');
    assert.equal(r.data.description, 'first part second part');
  });

  it('reads one level of nested fields (metadata)', () => {
    const r = parse('name: x\nmetadata:\n  author: me\n  version: "1.0"\n  count: 3');
    assert.deepEqual(r.data.metadata, { author: 'me', version: '1.0', count: '3' });
    assert.ok(r.plain.has('metadata.count'));
    assert.ok(!r.plain.has('metadata.version'));
    assert.equal(r.lineOf['metadata.version'], 5);
    assert.deepEqual(r.errors, []);
  });

  it('reads a simple list', () => {
    const r = parse('allowed-tools:\n  - Read\n  - Grep');
    assert.deepEqual(r.data['allowed-tools'], ['Read', 'Grep']);
  });

  it('ignores blank lines and comments', () => {
    const r = parse('# a comment\n\nname: x\n\n# another\ndescription: y');
    assert.deepEqual(r.data, { name: 'x', description: 'y' });
    assert.deepEqual(r.errors, []);
  });

  it('treats an empty value as empty text', () => {
    assert.equal(parse('license:').data.license, '');
  });

  it('reports duplicate fields', () => {
    const r = parse('name: a\nname: b');
    assert.match(r.errors[0].message, /more than once/);
    assert.equal(r.errors[0].line, 3);
  });

  it('reports tab indentation', () => {
    const r = parse('metadata:\n\tauthor: me');
    assert.ok(r.errors.some((e) => /Tabs/.test(e.message)));
  });

  it('reports nesting that is deeper than one level', () => {
    const r = parse('metadata:\n  a:\n    b: c');
    assert.ok(r.errors.length > 0);
  });

  it('reports lines that are not "key: value"', () => {
    const r = parse('name x');
    assert.match(r.errors[0].message, /Expected a line like/);
  });

  it('reports a colon inside an unquoted value, with the right line number', () => {
    const r = parse('name: x\ndescription: Note: this breaks');
    assert.equal(r.errors.length, 1);
    assert.equal(r.errors[0].line, 3);
  });
});
