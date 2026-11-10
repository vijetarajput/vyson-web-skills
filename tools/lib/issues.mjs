// Rule catalog for the VYSON validator.
//
// Every problem the validator can report has a code, a default severity and a
// plain-English "how to fix" hint. Keeping them in ONE place means the error
// messages, the documentation (docs/validator-rules.md) and the tests can never
// drift apart: a test checks that every code here is documented.
//
// Code prefixes:
//   VS = Agent Skills SPEC rules (apply to any skill)
//   VL = Markdown LINK rules
//   VP = VYSON PROJECT rules (only apply with --profile project)

export const RULES = {
  // --- Spec: files and header -------------------------------------------------
  VS001: { severity: 'error', title: 'SKILL.md is missing', fix: 'Create a file named exactly SKILL.md (capital letters) inside the skill folder.' },
  VS002: { severity: 'error', title: 'SKILL.md has the wrong capitalisation', fix: 'Rename the file to exactly SKILL.md. Windows ignores capital letters, but Linux, macOS and GitHub do not.' },
  VS003: { severity: 'error', title: 'SKILL.md has no header', fix: 'The very first line must be three dashes (---), followed by name and description lines, then another --- line.' },
  VS004: { severity: 'error', title: 'SKILL.md header is not closed', fix: 'Add a line containing only three dashes (---) after the header fields.' },
  VS005: { severity: 'error', title: 'SKILL.md header cannot be read', fix: 'Fix the header formatting. If a value contains a colon followed by a space, wrap the whole value in double quotes.' },

  // --- Spec: name -------------------------------------------------------------
  VS010: { severity: 'error', title: 'name is missing', fix: 'Add a line such as: name: vyson-example' },
  VS011: { severity: 'error', title: 'name is empty or not text', fix: 'Give name a value made of lowercase letters, numbers and hyphens.' },
  VS012: { severity: 'error', title: 'name is too long', fix: 'Shorten name to 64 characters or fewer.' },
  VS013: { severity: 'error', title: 'name has invalid characters', fix: 'Use only lowercase letters, numbers and hyphens. No capitals, spaces or underscores.' },
  VS014: { severity: 'error', title: 'name starts or ends with a hyphen', fix: 'Remove the hyphen at the start or end of name.' },
  VS015: { severity: 'error', title: 'name contains two hyphens in a row', fix: 'Replace "--" with a single hyphen.' },
  VS016: { severity: 'error', title: 'name does not match the folder name', fix: 'Rename the folder or change name so both are exactly the same.' },

  // --- Spec: description ------------------------------------------------------
  VS020: { severity: 'error', title: 'description is missing', fix: 'Add a description line that says what the skill does and when to use it.' },
  VS021: { severity: 'error', title: 'description is empty or not text', fix: 'Write one or two sentences describing what the skill does and when to use it.' },
  VS022: { severity: 'error', title: 'description is too long', fix: 'Shorten description to 1024 characters or fewer. Move detail into the body or references/.' },
  VS023: { severity: 'warning', title: 'description does not say when to use the skill', fix: 'Add words like "Use when ..." so the AI agent knows when to pick this skill.' },
  VS024: { severity: 'warning', title: 'description is very short', fix: 'Add more detail: what the skill does, and words a user might say to trigger it.' },

  // --- Spec: optional header fields -------------------------------------------
  VS030: { severity: 'error', title: 'license is invalid', fix: 'license must be short text, such as: license: MIT' },
  VS031: { severity: 'error', title: 'compatibility is invalid', fix: 'compatibility must be text of 1 to 500 characters. Remove it if the skill has no special requirements.' },
  VS032: { severity: 'error', title: 'metadata is not a list of key: value pairs', fix: 'Write metadata as indented key: value lines under "metadata:".' },
  VS033: { severity: 'error', title: 'a metadata value is not simple text', fix: 'Every metadata value must be plain text. Do not nest lists or groups inside metadata.' },
  VS034: { severity: 'warning', title: 'a metadata value may be read as a number or true/false', fix: 'Put the value in quotes, for example version: "1.0", so it stays text.' },
  VS035: { severity: 'error', title: 'allowed-tools is invalid', fix: 'allowed-tools must be one line of text with tool names separated by spaces.' },
  VS036: { severity: 'warning', title: 'unknown header field', fix: 'This field is not part of the Agent Skills specification. Some agents add their own fields, but they may not work everywhere. Remove it unless you need it.' },

  // --- Spec: body and structure -----------------------------------------------
  VS040: { severity: 'error', title: 'SKILL.md has no instructions', fix: 'Write the instructions for the agent below the header.' },
  VS041: { severity: 'error', title: 'SKILL.md is longer than 500 lines', fix: 'Move detailed material into files in references/ and link to them from SKILL.md.' },
  VS042: { severity: 'warning', title: 'SKILL.md is probably longer than 5000 tokens', fix: 'Shorten the instructions or move detail into references/. This is an estimate (about 4 characters per token).' },
  VS050: { severity: 'warning', title: 'scripts/, references/ or assets/ folder is empty', fix: 'Add files to the folder or remove it.' },
  VS051: { severity: 'warning', title: 'reference file links to another reference file', fix: 'Link every detail file directly from SKILL.md. Long chains of references are hard for agents to follow.' },
  VS052: { severity: 'warning', title: 'text may tell the agent to download instructions from the internet', fix: 'Skills must not fetch their rules at run time. Put the content inside the skill instead.' },

  // --- Links ------------------------------------------------------------------
  VL001: { severity: 'error', title: 'link points to a file that does not exist', fix: 'Fix the path or create the file. Paths are relative to the Markdown file that contains the link.' },
  VL002: { severity: 'error', title: 'link has the wrong capitalisation', fix: 'Match the capital letters of the real file name. It works on Windows but breaks on GitHub, Linux and macOS.' },
  VL003: { severity: 'error', title: 'link leaves the skill folder', fix: 'A skill is installed on its own, so it can only link to files inside its own folder. Copy what you need into the skill.' },
  VL004: { severity: 'warning', title: 'link points to a heading that was not found', fix: 'Check the heading text. The #anchor must match the heading as GitHub would shorten it.' },
  VL005: { severity: 'warning', title: 'link starts with "/"', fix: 'Use a relative path such as ../docs/file.md. Paths starting with "/" do not work in installed skills.' },

  // --- VYSON project rules (profile: project) ---------------------------------
  VP001: { severity: 'error', title: 'skill name must start with "vyson-"', fix: 'Rename the skill so it starts with vyson- and then lowercase words joined by hyphens, for example vyson-css-motion.' },
  VP002: { severity: 'error', title: 'metadata "vyson-pillar" is missing or invalid', fix: 'Add under metadata: vyson-pillar: "design" (or motion, 3d, frontend, quality).' },
  VP003: { severity: 'error', title: 'metadata "vyson-version" is missing or invalid', fix: 'Add under metadata: vyson-version: "0.1.0" (three numbers separated by dots, in quotes).' },
  VP010: { severity: 'error', title: 'example is missing', fix: 'Add examples/<skill-name>/prompt.md with the exact request given to the AI agent.' },
  VP011: { severity: 'error', title: 'eval file is missing', fix: 'Add evals/<skill-name>/evals.json. Start from templates/evals.template.json.' },
  VP012: { severity: 'error', title: 'eval file is not valid JSON', fix: 'Fix the JSON syntax (commas, quotes and brackets).' },
  VP013: { severity: 'error', title: 'eval file has the wrong structure', fix: 'Compare it with templates/evals.template.json.' },
  VP014: { severity: 'error', title: 'eval file has no case where the skill should NOT activate', fix: 'Add a case with "should_activate": false, so we can catch skills that trigger too often.' },
  VP020: { severity: 'error', title: 'motion or 3D skill is missing part of the safety contract', fix: 'Describe the performance budget, reduced-motion behavior (prefers-reduced-motion) and the mobile fallback in SKILL.md or references/.' },
};

/** Every rule code, sorted. Used by the documentation test. */
export const RULE_CODES = Object.keys(RULES).sort();

/**
 * Create one issue object.
 * @param {string} code      A key of RULES, for example "VS013".
 * @param {string} message   Specific description of what is wrong in this case.
 * @param {{file?: string, line?: number}} [where]
 */
export function issue(code, message, where = {}) {
  const rule = RULES[code];
  if (!rule) throw new Error(`Unknown rule code: ${code}`);
  return {
    code,
    severity: rule.severity,
    title: rule.title,
    message,
    fix: rule.fix,
    file: where.file ?? null,
    line: where.line ?? null,
  };
}
