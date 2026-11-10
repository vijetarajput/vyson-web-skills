# Test fixtures

These folders are used by the validator tests. They are **not real skills**.

| Folder | Purpose |
|---|---|
| `spec/valid-minimal/` | The smallest skill that passes |
| `spec/valid-full/` | A skill using every optional header field, with references, scripts and assets |
| `invalid/uppercase-name/` | `name` contains capitals and an underscore |
| `invalid/name-mismatch/` | `name` differs from the folder name |
| `invalid/missing-description/` | The header has no `description` |
| `invalid/colon-in-description/` | An unquoted description contains `: ` (breaks strict YAML readers) |
| `invalid/no-frontmatter/` | SKILL.md has no `---` header |
| `invalid/unclosed-frontmatter/` | The header is never closed |
| `invalid/empty-body/` | The header is fine but there are no instructions |
| `invalid/broken-link/` | A Markdown link points to a missing file, and one leaves the skill folder |
| `invalid/missing-skill-md/` | A folder with no SKILL.md at all |

The link checker skips this whole folder on purpose, because it contains broken links by design.

Cases that need very long text (for example a 1100-character description) are generated while the tests run, so they are not stored here.
