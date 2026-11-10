// Reads the "header" (YAML front matter) at the top of a SKILL.md file.
//
// A SKILL.md starts like this:
//
//   ---
//   name: vyson-example
//   description: What it does and when to use it.
//   metadata:
//     vyson-pillar: "motion"
//   ---
//   (instructions in Markdown)
//
// Why a small custom reader instead of a YAML library?
//   * The validator has ZERO dependencies, so there is nothing to install.
//   * Skill headers only need a small, simple subset of YAML.
//   * Anything outside that subset is reported as a clear error instead of being
//     guessed. That is what we want: a header that only OUR reader understands
//     could break in another AI agent's reader.
//
// Supported: "key: value" lines; plain, 'single quoted' and "double quoted"
// text; text wrapped over several indented lines; block text using | or >;
// one level of nested "key: value" lines (for metadata); simple "- item" lists.
// Not supported (reported as errors): tabs for indentation, [flow, lists],
// {flow: maps}, duplicate keys, and nesting deeper than one level.

/**
 * Split SKILL.md text into header lines and body lines.
 * @returns {{ status: 'missing' | 'unclosed' | 'ok', headerLines?: string[], bodyLines?: string[], headerStartLine?: number, bodyStartLine?: number }}
 */
export function splitFrontmatter(text) {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  if (lines[0].trimEnd() !== '---') return { status: 'missing' };
  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trimEnd() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return { status: 'unclosed' };
  return {
    status: 'ok',
    headerLines: lines.slice(1, end),
    bodyLines: lines.slice(end + 1),
    headerStartLine: 2, // line number (1-based) of the first header line
    bodyStartLine: end + 2,
  };
}

const KEY_LINE = /^([A-Za-z0-9_][A-Za-z0-9_.-]*):(?:[ \t]+(.*))?$/;

function indentOf(line) {
  return line.length - line.trimStart().length;
}

function isBlankOrComment(line) {
  return /^\s*(#.*)?$/.test(line);
}

/** Parse the text of a double-quoted YAML string (without the surrounding quotes). */
function unescapeDouble(s) {
  return s.replace(/\\(["\\/nrt0]|u[0-9a-fA-F]{4})/g, (_, c) => {
    switch (c[0]) {
      case 'n': return '\n';
      case 'r': return '\r';
      case 't': return '\t';
      case '0': return '\0';
      case 'u': return String.fromCharCode(parseInt(c.slice(1), 16));
      default: return c; // " \ /
    }
  });
}

/**
 * Parse ONE value written on a single logical line.
 * @returns {{ value: string, plain: boolean, error?: string }}
 */
export function parseScalarText(raw) {
  const text = raw.trim();
  if (text === '') return { value: '', plain: true };

  if (text[0] === '"') {
    // Find the closing quote, skipping escaped characters.
    let i = 1;
    while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
    if (i >= text.length) return { value: text, plain: false, error: 'A double-quoted value is missing its closing quote (").' };
    const rest = text.slice(i + 1).trim();
    if (rest !== '' && !rest.startsWith('#')) return { value: text, plain: false, error: 'There is extra text after the closing quote.' };
    return { value: unescapeDouble(text.slice(1, i)), plain: false };
  }

  if (text[0] === "'") {
    let i = 1;
    while (i < text.length) {
      if (text[i] === "'") {
        if (text[i + 1] === "'") { i += 2; continue; }
        break;
      }
      i += 1;
    }
    if (i >= text.length) return { value: text, plain: false, error: "A single-quoted value is missing its closing quote (')." };
    const rest = text.slice(i + 1).trim();
    if (rest !== '' && !rest.startsWith('#')) return { value: text, plain: false, error: 'There is extra text after the closing quote.' };
    return { value: text.slice(1, i).replace(/''/g, "'"), plain: false };
  }

  if (text[0] === '[' || text[0] === '{') {
    return { value: text, plain: false, error: 'Values written like [a, b] or {a: b} are not supported. Use plain text, or put the value in quotes.' };
  }
  if (/^[@`%*&!|>]/.test(text) && !/^[|>][+-]?\d*$/.test(text)) {
    return { value: text, plain: false, error: `A value that starts with "${text[0]}" must be wrapped in quotes.` };
  }

  // Plain text. " #" starts a comment. ": " inside plain text is invalid YAML.
  const noComment = text.replace(/\s+#.*$/, '').trimEnd();
  if (/:(\s|$)/.test(noComment)) {
    return { value: noComment, plain: true, error: 'This value contains ": " (a colon followed by a space). Wrap the whole value in double quotes.' };
  }
  return { value: noComment, plain: true };
}

/** Fold the lines of a block scalar (| or >). */
function blockScalar(indicator, lines) {
  const content = lines.filter((l) => l.trim() !== '');
  if (content.length === 0) return '';
  const base = Math.min(...content.map(indentOf));
  const stripped = lines.map((l) => (l.trim() === '' ? '' : l.slice(base)));
  let out;
  if (indicator.startsWith('|')) {
    out = stripped.join('\n');
  } else {
    // Folded: neighbouring non-empty lines are joined with a space; a blank line is a line break.
    out = '';
    let previousBlank = false;
    stripped.forEach((l, i) => {
      if (l === '') { out += '\n'; previousBlank = true; return; }
      if (i > 0 && !previousBlank && out !== '') out += ' ';
      out += l;
      previousBlank = false;
    });
  }
  return out.replace(/\s+$/, '');
}

/**
 * Parse header lines into a plain object.
 *
 * @param {string[]} headerLines
 * @param {number} firstLineNo  line number (1-based) of headerLines[0] in the file
 * @returns {{
 *   data: Record<string, any>,
 *   lineOf: Record<string, number>,      // key path ("metadata.version") -> line number
 *   plain: Set<string>,                   // key paths whose value was unquoted plain text
 *   errors: { line: number, message: string }[]
 * }}
 */
export function parseHeader(headerLines, firstLineNo = 2) {
  const data = {};
  const lineOf = {};
  const plain = new Set();
  const errors = [];
  const err = (line, message) => errors.push({ line, message });

  let i = 0;
  while (i < headerLines.length) {
    const line = headerLines[i];
    const lineNo = firstLineNo + i;

    if (isBlankOrComment(line)) { i += 1; continue; }
    if (/^\s*\t/.test(line) || /^ *\t/.test(line)) {
      err(lineNo, 'Tabs cannot be used to indent the header. Use spaces.');
      i += 1;
      continue;
    }
    if (indentOf(line) > 0) {
      err(lineNo, 'Unexpected indentation. Indented lines must belong to the field above them.');
      i += 1;
      continue;
    }

    const m = KEY_LINE.exec(line.trimEnd());
    if (!m) {
      err(lineNo, 'Expected a line like "name: value".');
      i += 1;
      continue;
    }
    const key = m[1];
    const rawValue = (m[2] ?? '').trim();

    if (Object.prototype.hasOwnProperty.call(data, key)) {
      err(lineNo, `The field "${key}" appears more than once.`);
    }
    lineOf[key] = lineNo;

    // Collect the lines that belong to this key (indented, or blank).
    let j = i + 1;
    const block = [];
    while (j < headerLines.length && (headerLines[j].trim() === '' || indentOf(headerLines[j]) > 0)) {
      block.push(headerLines[j]);
      j += 1;
    }
    while (block.length && block[block.length - 1].trim() === '') block.pop();
    const meaningful = block.filter((l) => !isBlankOrComment(l));
    const valueNoComment = rawValue.replace(/^#.*$/, '').trim();

    if (/^[|>][+-]?\d*$/.test(valueNoComment.replace(/\s+#.*$/, ''))) {
      // Block scalar: | or >
      data[key] = blockScalar(valueNoComment, block);
    } else if (valueNoComment === '') {
      // Nothing after the colon: nested map, list, wrapped text, or empty.
      if (meaningful.length === 0) {
        data[key] = '';
      } else if (/^\s*-(\s|$)/.test(meaningful[0])) {
        const items = [];
        meaningful.forEach((l) => {
          const lm = /^\s*-(?:\s+(.*))?$/.exec(l);
          if (!lm) { err(lineOf[key], `The list under "${key}" has a line that is not a "- item".`); return; }
          items.push(parseScalarText(lm[1] ?? '').value);
        });
        data[key] = items;
      } else if (KEY_LINE.test(meaningful[0].trim())) {
        const baseIndent = indentOf(meaningful[0]);
        const nested = {};
        block.forEach((l, idx) => {
          if (isBlankOrComment(l)) return;
          const nestedLineNo = lineNo + 1 + idx;
          if (/\t/.test(l.slice(0, indentOf(l) + 1))) { err(nestedLineNo, 'Tabs cannot be used to indent the header. Use spaces.'); return; }
          if (indentOf(l) !== baseIndent) { err(nestedLineNo, 'Nested fields must all be indented by the same amount, and only one level deep.'); return; }
          const nm = KEY_LINE.exec(l.trim());
          if (!nm) { err(nestedLineNo, 'Expected a line like "key: value".'); return; }
          const nestedKey = nm[1];
          if (Object.prototype.hasOwnProperty.call(nested, nestedKey)) err(nestedLineNo, `The field "${key}.${nestedKey}" appears more than once.`);
          const parsed = parseScalarText(nm[2] ?? '');
          if (parsed.error) err(nestedLineNo, parsed.error);
          nested[nestedKey] = parsed.value;
          lineOf[`${key}.${nestedKey}`] = nestedLineNo;
          if (parsed.plain) plain.add(`${key}.${nestedKey}`);
        });
        data[key] = nested;
      } else {
        // Plain text wrapped over several lines: lines are joined with spaces.
        const joined = meaningful.map((l) => l.trim()).join(' ');
        const parsed = parseScalarText(joined);
        if (parsed.error) err(lineNo, parsed.error);
        data[key] = parsed.value;
        if (parsed.plain) plain.add(key);
      }
    } else {
      // A value on the same line, possibly wrapped onto more lines.
      const wrapped = meaningful.map((l) => l.trim());
      const full = wrapped.length ? [valueNoComment, ...wrapped].join(' ') : valueNoComment;
      const parsed = parseScalarText(full);
      if (parsed.error) err(lineNo, parsed.error);
      data[key] = parsed.value;
      if (parsed.plain) plain.add(key);
    }

    i = j;
  }

  return { data, lineOf, plain, errors };
}
