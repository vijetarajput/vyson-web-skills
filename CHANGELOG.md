# Changelog

All notable changes to this project are recorded here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/) while in pre-1.0 development.

## [Unreleased]

### Added
- Project foundation: README, contribution guide, code of conduct, security policy, roadmap.
- Folder structure for skills, examples, evals, benchmarks, integrations, docs, templates and tools.
- Third-party license manifest (`THIRD_PARTY.md`).
- Skill template and eval-file template.
- GitHub issue forms, pull request template and code owners file.
- Record of approved project decisions (`docs/decisions.md`).
- Skill validator (`tools/validate-skills.mjs`) following the Agent Skills specification, with VYSON project rules, plain-English error reports, `--strict` and `--json` modes.
- Repository-wide Markdown link checker (`tools/check-links.mjs`), including exact-capitalisation checks.
- Automated tests with valid and intentionally invalid example skills (`tools/test/`), and a rule reference (`docs/validator-rules.md`).
- `package.json` with `npm run check` and related scripts (no dependencies).
