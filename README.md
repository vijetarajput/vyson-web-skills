# VYSON Web Skills

**Turn Your Website Vision into Reality.**

An open-source AI web development toolkit for building premium, responsive, animated, and production-ready websites with AI coding agents.

> **Status: pre-alpha (v0.1 in progress).** The project structure and contribution rules are in place. The first skills are not published yet, so there is nothing to install today. See the [roadmap](ROADMAP.md).

## What this is

VYSON Web Skills is a collection of **Agent Skills**: folders of instructions that teach AI coding agents (such as Cursor, Claude Code and Codex) how to do specific web development jobs well. Skills follow the open [Agent Skills specification](https://agentskills.io/specification).

We are not building a pile of prompts. Each skill is meant to be practical, original, tested, and backed by an example.

## The five pillars

| Pillar | Focus |
|---|---|
| **Premium design** | Luxury, SaaS, agency, interior and architecture, real estate, and high-converting landing pages |
| **Animation and motion** | Native CSS, GSAP, Lenis, scroll-based animation, cinematic transitions |
| **3D and interactive web** | Three.js, WebGL, 3D objects, interactive product experiences |
| **Frontend development** | React, Next.js, responsive layouts, reusable components, design systems |
| **Website quality** | Accessibility, SEO, performance, responsive testing, website audits |

## Principles

- **Evidence over claims.** We will publish how skills are tested and what the results are, including weak results. Nothing is claimed that we have not measured. See [`bench/`](bench/).
- **Safe motion and 3D.** Animation and 3D skills must state their performance budget and their reduced-motion and mobile fallbacks.
- **Original work.** Skills and examples are written from scratch. We do not copy or rebrand other projects. See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Trust by default.** No telemetry, no background hooks, and no instructions fetched from the internet at run time.
- **Licenses are checked.** Every library a skill recommends is listed in [THIRD_PARTY.md](THIRD_PARTY.md) with its license.

## Installation (planned for v0.1)

The first release is planned to install with the open `skills` installer (requires Node.js 22.20 or newer):

```bash
npx skills add vijetarajput/vyson-web-skills
```

This has not been tested against this repository yet, because no skills exist yet. A manual-copy guide for each supported agent will also be provided. First officially tested agents: **Cursor, Claude Code, and Codex**.

## Repository layout

| Folder | Purpose |
|---|---|
| [`skills/`](skills/) | The product: one folder per skill |
| [`examples/`](examples/) | Small demo websites showing what each skill produces |
| [`evals/`](evals/) | Per-skill behavior tests |
| [`bench/`](bench/) | VYSON Bench: with-and-without-skills comparison across AI agents |
| [`integrations/`](integrations/) | Install guides for each AI agent |
| [`docs/`](docs/) | Documentation and project decisions |
| [`templates/`](templates/) | Starting point for new skills |
| [`tools/`](tools/) | Small checking scripts (coming in Day 2) |

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) first. To report a security problem, see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Third-party libraries mentioned by skills keep their own licenses. See [THIRD_PARTY.md](THIRD_PARTY.md).
