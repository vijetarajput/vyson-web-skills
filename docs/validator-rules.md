# Validator rules

Every problem reported by the VYSON validator has a **code**. This page explains all of them. A test (`tools/test/repo.test.mjs`) fails if a rule exists in the code but is missing here, so this page stays complete.

**Severity**

- **error**: the skill is invalid or will break somewhere. The validator exits with failure and the pull request cannot be merged.
- **warning**: probably a mistake, or a habit we want to avoid. It does not fail the check, unless you run with `--strict`.

**Code prefixes**

| Prefix | Meaning | When it runs |
|---|---|---|
| `VS` | Agent Skills **S**pecification rules | Always |
| `VL` | Markdown **L**ink rules | Always |
| `VP` | VYSON **P**roject rules | Only with `--profile project` (the default) |

How to run the validator is explained in [tools/README.md](../tools/README.md).

## Specification rules (VS)

Source of truth: <https://agentskills.io/specification>.

| Code | Severity | Problem | How to fix |
|---|---|---|---|
| VS001 | error | SKILL.md is missing | Create a file named exactly SKILL.md (capital letters) inside the skill folder. |
| VS002 | error | SKILL.md has the wrong capitalisation | Rename the file to exactly SKILL.md. Windows ignores capital letters, but Linux, macOS and GitHub do not. |
| VS003 | error | SKILL.md has no header | The very first line must be three dashes (---), followed by name and description lines, then another --- line. |
| VS004 | error | SKILL.md header is not closed | Add a line containing only three dashes (---) after the header fields. |
| VS005 | error | SKILL.md header cannot be read | Fix the header formatting. If a value contains a colon followed by a space, wrap the whole value in double quotes. |
| VS010 | error | name is missing | Add a line such as: name: vyson-example |
| VS011 | error | name is empty or not text | Give name a value made of lowercase letters, numbers and hyphens. |
| VS012 | error | name is too long | Shorten name to 64 characters or fewer. |
| VS013 | error | name has invalid characters | Use only lowercase letters, numbers and hyphens. No capitals, spaces or underscores. |
| VS014 | error | name starts or ends with a hyphen | Remove the hyphen at the start or end of name. |
| VS015 | error | name contains two hyphens in a row | Replace "--" with a single hyphen. |
| VS016 | error | name does not match the folder name | Rename the folder or change name so both are exactly the same. |
| VS020 | error | description is missing | Add a description line that says what the skill does and when to use it. |
| VS021 | error | description is empty or not text | Write one or two sentences describing what the skill does and when to use it. |
| VS022 | error | description is too long | Shorten description to 1024 characters or fewer. Move detail into the body or references/. |
| VS023 | warning | description does not say when to use the skill | Add words like "Use when ..." so the AI agent knows when to pick this skill. |
| VS024 | warning | description is very short | Add more detail: what the skill does, and words a user might say to trigger it. |
| VS030 | error | license is invalid | license must be short text, such as: license: MIT |
| VS031 | error | compatibility is invalid | compatibility must be text of 1 to 500 characters. Remove it if the skill has no special requirements. |
| VS032 | error | metadata is not a list of key: value pairs | Write metadata as indented key: value lines under "metadata:". |
| VS033 | error | a metadata value is not simple text | Every metadata value must be plain text. Do not nest lists or groups inside metadata. |
| VS034 | warning | a metadata value may be read as a number or true/false | Put the value in quotes, for example version: "1.0", so it stays text. |
| VS035 | error | allowed-tools is invalid | allowed-tools must be one line of text with tool names separated by spaces. |
| VS036 | warning | unknown header field | This field is not part of the Agent Skills specification. Some agents add their own fields, but they may not work everywhere. Remove it unless you need it. |
| VS040 | error | SKILL.md has no instructions | Write the instructions for the agent below the header. |
| VS041 | error | SKILL.md is longer than 500 lines | Move detailed material into files in references/ and link to them from SKILL.md. |
| VS042 | warning | SKILL.md is probably longer than 5000 tokens | Shorten the instructions or move detail into references/. This is an estimate (about 4 characters per token). |
| VS050 | warning | scripts/, references/ or assets/ folder is empty | Add files to the folder or remove it. |
| VS051 | warning | reference file links to another reference file | Link every detail file directly from SKILL.md. Long chains of references are hard for agents to follow. |
| VS052 | warning | text may tell the agent to download instructions from the internet | Skills must not fetch their rules at run time. Put the content inside the skill instead. |

Notes:

- The specification says the 500-line and 5000-token limits are *recommendations*. The validator makes 500 lines an **error** because our `CONTRIBUTING.md` requires it. The token check is only an estimate, so it is a warning.
- The specification says `metadata` values are text. In the header format, an unquoted `1.0` or `true` is read as a number or a yes/no value by many readers, which is why VS034 asks you to use quotes.
- VS023 is a simple word check (it looks for "when", "use", "used" or "using"). It cannot judge whether the description is *good*. A human reviewer still has to do that.
- VS036 is only a warning because some agents add their own header fields (for example Claude Code). They are not part of the open standard, so they may be ignored elsewhere.
- VS052 is a **heuristic**: it looks for words like fetch, download, curl or wget within a few lines of a web address, and ignores lines containing "do not", "never" and similar. It can produce false alarms, and it can miss cleverly worded instructions. It supports a rule in `AGENTS.md`, it does not enforce it.

## Link rules (VL)

| Code | Severity | Problem | How to fix |
|---|---|---|---|
| VL001 | error | link points to a file that does not exist | Fix the path or create the file. Paths are relative to the Markdown file that contains the link. |
| VL002 | error | link has the wrong capitalisation | Match the capital letters of the real file name. It works on Windows but breaks on GitHub, Linux and macOS. |
| VL003 | error | link leaves the skill folder | A skill is installed on its own, so it can only link to files inside its own folder. Copy what you need into the skill. |
| VL004 | warning | link points to a heading that was not found | Check the heading text. The #anchor must match the heading as GitHub would shorten it. |
| VL005 | warning | link starts with "/" | Use a relative path such as ../docs/file.md. Paths starting with "/" do not work in installed skills. |

Notes:

- Web links (`https://...`) and `mailto:` links are **not** checked. The validator works offline.
- Links inside code blocks and inline code are ignored, so documentation can show example links.
- VL003 only applies when checking skills. The repository-wide link checker (`npm run check:links`) allows links anywhere inside the repository.

## VYSON project rules (VP)

These come from [CONTRIBUTING.md](../CONTRIBUTING.md) and [decisions.md](decisions.md).

| Code | Severity | Problem | How to fix |
|---|---|---|---|
| VP001 | error | skill name must start with "vyson-" | Rename the skill so it starts with vyson- and then lowercase words joined by hyphens, for example vyson-css-motion. |
| VP002 | error | metadata "vyson-pillar" is missing or invalid | Add under metadata: vyson-pillar: "design" (or motion, 3d, frontend, quality). |
| VP003 | error | metadata "vyson-version" is missing or invalid | Add under metadata: vyson-version: "0.1.0" (three numbers separated by dots, in quotes). |
| VP010 | error | example is missing | Add examples/<skill-name>/prompt.md with the exact request given to the AI agent. |
| VP011 | error | eval file is missing | Add evals/<skill-name>/evals.json. Start from templates/evals.template.json. |
| VP012 | error | eval file is not valid JSON | Fix the JSON syntax (commas, quotes and brackets). |
| VP013 | error | eval file has the wrong structure | Compare it with templates/evals.template.json. |
| VP014 | error | eval file has no case where the skill should NOT activate | Add a case with "should_activate": false, so we can catch skills that trigger too often. |
| VP020 | error | motion or 3D skill is missing part of the safety contract | Describe the performance budget, reduced-motion behavior (prefers-reduced-motion) and the mobile fallback in SKILL.md or references/. |

Notes:

- The five pillars are: `design`, `motion`, `3d`, `frontend`, `quality`.
- VP020 applies to skills whose `vyson-pillar` is `motion` or `3d`. It checks that the words "budget", "reduced motion" (or `prefers-reduced-motion`) and "mobile" appear somewhere in `SKILL.md` or the skill's Markdown files. This proves the topics are **mentioned**. It cannot prove the advice is good, so reviewers still read it.
- The structure of `evals.json` is defined by [templates/evals.template.json](../templates/evals.template.json).
