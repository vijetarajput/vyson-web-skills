# Security Policy

## Why this matters for a skills project

Skills are instructions and sometimes small scripts that AI coding agents follow on a developer's machine. Problems can include:

- A skill script that does something unsafe, such as deleting files, reading secrets, or making unexpected network calls.
- Instructions that could be abused for prompt injection (for example, telling an agent to trust content from a web page).
- Dependencies with known vulnerabilities or unclear licenses.

## Our safeguards

- Skills must not fetch their instructions from the internet at run time.
- No telemetry and no background hooks.
- Scripts must be small, readable, and documented. Reviewers check them before merging.
- Third-party libraries are listed in [THIRD_PARTY.md](THIRD_PARTY.md).

## Reporting a vulnerability

Please **do not** open a public issue for a security problem.

Use GitHub's private reporting: go to the repository's **Security** tab and choose **Report a vulnerability**.

> **TODO for the maintainer:** enable "Private vulnerability reporting" in the repository settings (Settings, then Code security) so this link works.

Please include what you found, which skill or file is affected, and steps to reproduce.

We aim to acknowledge reports within 7 days. This is a volunteer project, so this is a target, not a guarantee.

## Supported versions

The project is a v0.1 Beta that has not been published as a release. Only the latest version on the `main` branch is supported.
