# Install VYSON skills by prompt (no terminal)

This page is for people who build websites with an AI coding agent. You do **not** need to open a terminal, clone anything, install Node.js or copy folders. You paste one prompt, and the agent installs the skill and starts the work.

Developers who work on this repository: see [Developer install](#developer-install-separate-from-the-above) at the end.

## What you need

- Your website project open in an agent that can **run terminal commands** and **reach the internet**. The documented target agents are Cursor (Agent mode), Claude Code, Codex and Antigravity. None of them is a verified integration: no real agent has run this prompt yet. You do not run the commands yourself. The agent does.
- Nothing else. No Node.js, no `git`, no npm.

Your agent may ask you to approve a command or a file write. That is normal. Read what it asks and approve it.

## The install prompt

Paste this into a new agent chat in your website project. Change only the first sentence (see [Variations](#variations)).

```text
Install the VYSON skill vyson-premium-website-design from https://github.com/vijetarajput/vyson-web-skills into this project, then use it to improve my website.

Do the whole install yourself. I will not run commands, clone anything or install Node.js. Follow these steps in order:

1. Download https://raw.githubusercontent.com/vijetarajput/vyson-web-skills/main/skills-manifest.json with your terminal (curl, or PowerShell Invoke-WebRequest). Do not use a tool that turns pages into text: the files must stay byte-exact. The manifest lists every skill and, for each file, its path, size and sha256.
2. Keep only the skills I named ("all five" means every skill in the manifest). If I named one that is not in the manifest, stop, list the names that exist and install nothing.
3. Download each file of those skills from https://raw.githubusercontent.com/vijetarajput/vyson-web-skills/main/skills/<skill>/<path> into a temporary folder outside my project. Check each file's size and sha256 (ignore upper or lower case) against the manifest. If any file is missing or does not match, stop, say which file and install nothing. Do not run anything you downloaded.
4. Use this project's skills folder for the application you are running in (Cursor, Claude Code, Codex or Antigravity), not the name of the AI model: Cursor .cursor/skills, Claude Code .claude/skills, Codex .agents/skills, Antigravity .agents/skills. If you are another agent, stop and tell me where your documentation says project skills go. Create the folder if it is missing.
5. Copy each verified skill, with all its files (references, scripts, assets), to <folder>/<skill>/. Never overwrite: if that folder already exists and matches, leave it; if it exists and differs, leave it untouched, tell me, and ask whether to keep mine or replace it. Change nothing else in my project.
6. Check that every manifest file of each skill is now in place. Report briefly, per skill: installed, already installed, or not installed, with its path and file count. Do not say a skill is "loaded" unless it appears in your own skill list.
7. Open <folder>/<skill>/SKILL.md, follow it for my request in this same chat and start the work. Do not ask me to paste another prompt. If I named several skills, use them in the order the manifest lists them. If I only asked to install, stop after the report.

If you cannot download files or write into this project (for example network access is off), say exactly what failed and what I can do instead. Never say the install worked when it did not.
```

The prompt is about 2,400 characters. The same text is in the [README](../README.md#installation). A test keeps the two copies identical.

## Variations

Change the first sentence. Leave the numbered steps as they are.

| You want | First sentence |
|---|---|
| One skill, then work | `Install the VYSON skill vyson-css-motion from https://github.com/vijetarajput/vyson-web-skills into this project, then use it to add restrained motion to my website.` |
| Two skills | `Install the VYSON skills vyson-premium-website-design and vyson-css-motion from https://github.com/vijetarajput/vyson-web-skills into this project, then use them to improve my website.` |
| All five, install only | `Install all five VYSON skills from https://github.com/vijetarajput/vyson-web-skills into this project. Only install them.` |
| All five, then start the design step | `Install all five VYSON skills from https://github.com/vijetarajput/vyson-web-skills into this project, then use vyson-premium-website-design to improve my website.` |

Skill names:

| Skill | Name to type |
|---|---|
| Premium website design | `vyson-premium-website-design` |
| Frontend development | `vyson-frontend-development` |
| 3D and interactive web | `vyson-3d-interactive-web` |
| CSS motion (pilot) | `vyson-css-motion` |
| Website quality engineering | `vyson-website-quality-engineering` |

Only the skills you name are downloaded. To use a fixed version instead of the latest, replace `main` in the two web addresses with a commit name from the repository's history.

## After the install: the five prompts

This install prompt is a one-time setup step. It is **not** one of the five workflow prompts. For a whole site, install all five once, then use the five prompts in [five-prompts.md](five-prompts.md), in order, each in a new chat. They need no further setup, because the skills are already in your project. The skills share one hand-off file, `VYSON-NOTES.md`, as described there.

## What the agent does, in plain English

1. It downloads a short list (`skills-manifest.json`) of every skill file with its size and a fingerprint (sha256).
2. It downloads only the skills you named into a temporary folder, and checks every file against the list.
3. Only if every file matches does it copy the skill folders into your project. Nothing is written into your project before that.
4. It never overwrites a skill folder that differs from the official one. It tells you and asks.
5. It reports what it did, then opens the installed `SKILL.md` and starts your task in the same chat.

Step 5 reads the installed `SKILL.md` directly. That is deliberate: an agent may only list new skills when it starts, so the skill is used from the file in this chat, not from the agent's skill list.

## Where the files go

| Agent | Project folder | What VYSON has checked |
|---|---|---|
| Cursor | `.cursor/skills/<skill>/` | Folder from Cursor's docs. VYSON's copier writes there. The prompt has **not** been run by an agent against the published repository. |
| Claude Code | `.claude/skills/<skill>/` | Folder from Claude Code's docs. The prompt has **not** been run in Claude Code. |
| Codex | `.agents/skills/<skill>/` | Folder from OpenAI's docs. The prompt has **not** been run in Codex. |
| Antigravity | `.agents/skills/<skill>/` | Folder from Antigravity's docs. **Nothing** has been tested in Antigravity. |

Details and sources: [integrations/agents.md](../integrations/agents.md). Do not assume every agent reads `.agents/skills/`: Cursor and Claude Code use their own folders.

## What can go wrong

| What you see | What it means | What to do |
|---|---|---|
| The agent says it cannot download | No internet, or the agent's sandbox blocks the network. Codex's default sandbox has network access off, according to OpenAI's docs. | Allow network access for the session in the agent's own settings, then paste the prompt again. Or use the [manual fallback](#manual-fallback-no-commands-at-all). |
| The agent says a file does not match | The download was damaged, or you caught the repository mid-update. | Wait a few minutes and paste the prompt again. Nothing was installed, so nothing needs cleaning up. |
| The agent says a skill is not in the list | A typo in the skill name. | Use a name from the [table above](#variations). |
| The agent says a skill folder exists and differs | You (or an earlier install) already have a different copy there. | Choose "keep mine" or "replace it". Replacing is the agent doing it at your request. |
| The agent says it does not know where its skills go | It is not one of the four agents above. | Use the manual fallback. |
| The skill is not in the agent's skill list in a later chat | Agents often read the skill list at start. | Restart the agent. Cursor's docs say it discovers skills at start. Claude Code's docs say to run `/reload-skills` if `.claude/skills` did not exist when the session began. |

The agent must say plainly when something failed. If it says "installed" without listing paths and file counts, ask it to show the report from step 6.

## Manual fallback (no commands at all)

Use this if your agent cannot download files or write into the project.

1. Open https://github.com/vijetarajput/vyson-web-skills in your browser.
2. Click the green **Code** button, then **Download ZIP**. Unzip it.
3. In the unzipped folder, open `skills`. Copy the folders you want (for example `vyson-premium-website-design`) into your project's skills folder from the table above. Create that folder if it does not exist. File Explorer or Finder is enough.
4. Ask your agent: `Open the installed vyson-premium-website-design/SKILL.md in this project and follow it to improve my website.`

A manual copy is not checked by anyone. If a folder with the same name is already there, do not copy over it unless you mean to.

## Safety

- **Only data is downloaded.** The prompt tells the agent not to run anything it downloaded. The skills do contain small checker scripts (`.mjs` files); they sit unused until a skill or you run them.
- **The check proves the download is complete and undamaged. It does not prove the repository is trustworthy.** The list of fingerprints and the files come from the same place. Read what you install, as you would any code.
- **No telemetry.** The prompt contacts `raw.githubusercontent.com` and nothing else.
- **Your files are protected.** Nothing is overwritten, and nothing outside the skills folder is changed.
- **Project-level only.** The prompt installs into your project, not your home folder.

## What has and has not been tested

| Checked | Result |
|---|---|
| The reference installer (`tools/install-skills.mjs` with `--from-github`) downloads, verifies and installs from a local test server that mimics GitHub: single skill, all five, every agent folder, repeat installs, existing files, bad names, missing or damaged files | Automated tests in this repository pass (see [tools/README.md](../tools/README.md)) |
| The same download-and-check steps in Windows PowerShell (`Invoke-WebRequest` and `Get-FileHash`) against the same kind of local server | Worked once for one skill (9 files) |
| The manifest's sizes and sha256 against the files that GitHub serves today at `raw.githubusercontent.com/.../main/skills/...` (this also confirms the web address layout the prompt uses) | Checked once with PowerShell on 12 November 2026: all 53 skill files matched. The manifest file itself is not on GitHub yet, so downloading it was not tested. |
| The install prompt run by a real agent against the published GitHub repository | **Not tested.** The manifest has to be pushed to GitHub first. |
| Cursor, Claude Code, Codex, Antigravity following the prompt | **Not tested.** No agent has run it. |
| Skill listed in an agent's catalog after install | **Not verified** for any agent |

## Developer install (separate from the above)

If you work on this repository, or want the copier and its tests, use a clone. This needs Node.js 22 or newer and a terminal.

```powershell
git clone https://github.com/vijetarajput/vyson-web-skills.git
cd vyson-web-skills
node tools/install-skills.mjs --to path\to\your\website --agent cursor
node tools/install-skills.mjs --from-github --to path\to\your\website --agent cursor --skill vyson-css-motion
```

`--agent` takes `cursor`, `claude-code`, `codex` or `antigravity`. The first command copies from your clone. The second does the same download-and-verify steps as the prompt. After you change anything under `skills/`, run `npm run build:manifest` and commit the new `skills-manifest.json`. `npm run check` fails if it is out of date. See [tools/README.md](../tools/README.md).
