# Plan: controlled three-repeat Cursor experiment for `vyson-css-motion`

**Status: PLAN ONLY. NOT STARTED. It must not start until the maintainer approves it** (see "Decisions needed before starting"). Nothing here has been run, and nothing in this file is a result.

This plan answers the problems found in the [pilot experiment](css-motion-pilot-001/README.md), which had one run per condition and could not isolate the skill.

## 1. The question, and what this can and cannot answer

**Question:** when Cursor is given a normal website-animation request, does having `vyson-css-motion` installed change what the agent produces, as measured by the same automated checks and a blind human review?

**It can show:** whether the differences seen in the pilot appear again, in a cleaner setup, in 3 out of 3 runs, or whether they were run-to-run variation.

**It cannot show:** that the skill works for other briefs, other models, other agents, or real phones. Three runs per condition is still a small sample. The result will be "evidence worth a bigger test" or "no consistent difference", never "proven".

## 2. Design

| Item | Choice |
|---|---|
| Conditions | **A** without the skill. **B** with the skill. |
| Repeats | **3 per condition = 6 builds.** |
| Task | The same Harborline Architects brief as the pilot (one page, 6 cards, 4 steps, 4 FAQ items, motion, phone support). Reusing it makes the pilot comparable. A second, different brief is an optional extension (12 builds). |
| Prompt | **Identical text in both conditions, and it does not mention the skill at all.** Whether the skill is found and used must come from Cursor's own discovery. |
| Model and mode | One model, chosen in the Cursor model picker and the same for all 6 builds; Agent mode; no attachments; no web search. Recorded with a screenshot before every run. |
| Order | Random, drawn **before** the first run and saved, so order cannot favour a condition. **Draw 1** (seed 38883445, plain shuffle of A1 to B3): A2, A3, A1, B3, B1, B2. It is **superseded** and kept unchanged in the experiment records: it put all three without-skill runs before all three with-skill runs, so any change over time would have favoured one condition. The maintainer therefore added a rule **after Draw 1 was observed and before Draw 2 was made**: exactly three A and three B, with no more than two consecutive runs of the same condition. **Draw 2** (current, made once): A2, B2, A1, B1, B3, A3, from seed 78944671, chosen uniformly among the 14 valid condition sequences (ABABBA), then labels shuffled within each condition, using a saved, reproducible script (`draw-2-script.ps1`). Both prompt files remain frozen with their approved SHA-256 hashes (main prompt `c33118db...da3164`, follow-up `72d5ac7c...df2c60`). The full records, hashes and log are in the experiment folder, not in this repository. |
| Sessions | A new chat for every build. No earlier chat is continued. |
| Human reviewer | The maintainer, blind, using the sheet from the pilot (outputs shuffled and relabelled S1 to S6). |
| AI reviewer | Optional extra: one fresh evaluator session per output with the same rubric. Never a substitute for the human review. |

## 3. Two separate clean workspaces

Cursor's sub-agents inherit this repository's `AGENTS.md`, so **no sub-agent is used for the builds**. Each build is a normal chat in a normal Cursor window whose workspace is a folder outside this repository.

| Workspace | Folder (example, outside the repo) | Contents at the start of every run |
|---|---|---|
| **W-without** | `<experiments folder>\css-motion-repeat\W-without\` | Empty. No `AGENTS.md`, no `.cursor`, `.agents`, `.claude` folder, no rules, no skills. |
| **W-with** | `<experiments folder>\css-motion-repeat\W-with\` | Empty, except for the installed skill (section 4). No `AGENTS.md`, no rules. |

`<experiments folder>` is any folder on the test PC that is **not inside this repository**.

Rules for the workspaces:
1. Each is opened with File, Open Folder in **its own Cursor window**. This repository is **not** open in either window.
2. After each run, the output folder is copied to the results area and the workspace is **emptied back to its start state**, so a later repeat can never see an earlier output. The start state is checked (file listing and hash of the skill files) before the next run.
3. Cursor settings that apply everywhere (User Rules, "include third-party skills", global skill folders such as `%USERPROFILE%\.cursor\skills`, `%USERPROFILE%\.agents\skills`, `%USERPROFILE%\.claude\skills`) are inspected first. Anything found is either switched off or recorded, and it is the same for both windows.
4. Cursor's own built-in skills are visible in both windows. That is the same for both, and the list is recorded.

## 4. Skill discovery must be verified independently

An agent saying "I can see the skill" is **not** evidence. These checks come from outside the build chats.

**Check 1: file placement (not enough alone).** In W-with, install the skill with the same method a user would, and compare every file with the repository copy by SHA-256 (all must match). W-without must contain no skill folders at all.

**Check 2: canary probe (before any counted run).**
1. Make a throwaway skill `vyson-probe-canary`, outside the repository, whose only content is a random phrase generated for this test (for example 12 random letters) that exists nowhere else.
2. Install it into W-with by the **same method and folder** that will be used for the real skill. Do not install it in W-without.
3. In a fresh chat in each window, ask without naming any path: "Use your available skills. What phrase does the skill called vyson-probe-canary contain? Answer NONE if you do not have such a skill."
4. **Pass:** W-with returns the exact phrase and W-without answers NONE. A random phrase cannot be guessed, so a correct answer shows the file was found. A wrong or missing answer in W-with means the folder is not discovered by Cursor.
5. If W-with fails, try the other folder (for example `.cursor/skills` versus `.agents/skills`), repeat, and record which one Cursor reads. This also settles the open question in [`integrations/README.md`](../../integrations/README.md).
6. Remove the canary, install the real skill, and repeat check 1.

**Check 3: evidence of use in every counted B run.** The maintainer saves the chat's visible tool calls (a screenshot or an export) showing the agent opening the skill's `SKILL.md`. Record: used, not used, or unclear. Fingerprints in the output (`vy-` classes, `--vy-` tokens, `js-panels`) are a **secondary** sign only, because an agent can write similar code without the skill.

**Check 4: no leakage into A.** The output of every A run is searched for those fingerprints, and the chat tool calls are checked for any read of a skill file.

**Skill not activated:** if the skill is installed but the agent does not use it in a B run, that run is **kept** and labelled "not activated". Results are then shown both "as assigned" (all 3 B runs) and "as treated" (only runs where it was used). Nothing is dropped silently, because "the agent often ignores the skill" is itself a finding.

## 5. What will be measured

All with the same script on all 6 outputs, run on the same PC: the pilot harness at version 3 or later ([`harness/`](css-motion-pilot-001/harness/README.md)), with its known gaps listed beside the results.

**Decided before any run (primary measures, each shown per run, not combined):**
1. Automated accessibility violations (axe-core): rules and elements.
2. Reduced motion: movement animations still running, text left hidden.
3. Animated layout and paint properties, and endless animations.
4. Scripts switched off: unreadable text elements and controls whose panel cannot be seen.
5. Tap targets at 390px: how many controls are under 24px and under 44px, listed by name.
6. Accordion: panels open after opening two in a row (1 means one at a time).
7. Hover rules that declare movement the browser does not apply.
8. Skill activated: yes, no or unclear (B runs).

**Secondary:** performance counts (frame times did not separate the pilot outputs, so they are reported only as "no problem seen"), page weight, code lines.

**Subjective (kept apart from the measured lists):** the maintainer's blind scores on the pilot's six criteria, and the optional AI reviews.

**The skill's own checker** (`motion-lint.mjs`) is reported only as "compliance with the skill's own rules". It is **not** independent evidence.

## 6. How results will be reported

- The table shows all 6 raw values per measure, with the median and the range (smallest to largest) for each condition. No hidden composite score, no p-values (three runs is too few).
- A measure is called **consistent** only when every B run is better than every A run (the ranges do not overlap). That means "worth a larger test", not "proven".
- Results that go against the skill are reported at the same size as results that favour it.
- The original pilot findings stay unchanged. This experiment gets its own report folder.
- No claim of effectiveness, and no claim about other models, briefs or agents, will be made from these data.

## 7. Procedure

| Step | Who | What |
|---|---|---|
| 1 | Assistant | Create the two folders, the canary skill, the prompt file (store its SHA-256), the random order, the per-run checklist and the results folders. Nothing is run. |
| 2 | Maintainer | Review the plan and the answers in section 10. Approve, or ask for changes. |
| 3 | Maintainer, assistant | Settings inspection (section 3, point 3) and the canary probe (section 4). **Stop if it fails.** |
| 4 | Maintainer | For each of the 6 runs in the saved order: open the window for that condition, check the start state, start a **new chat**, pick the model, paste the prompt, let it finish, save the evidence (model screenshot, tool-call log). |
| 5 | Assistant | After each run: copy the output out, measure it, search for fingerprints, empty the workspace, record the start-state check. |
| 6 | Maintainer | Blind human review of S1 to S6 (about 10 minutes per site, the pilot's sheet). |
| 7 | Assistant | Optional blind AI review, then the report, with measured and subjective results in separate sections, and the scrubbed public files. |

Rough effort, a guess and not a measurement: preparation about an hour, each build about 5 to 15 minutes of waiting, each measurement about 5 minutes, human review about an hour.

## 8. When a run is invalid, and what happens then

- A run is **invalid** only for a process fault: the wrong model, a continued chat, a non-empty start state, the agent editing outside its workspace, or a Cursor crash. The reason is written down, the run is redone once, and the invalid run stays in the log.
- A run with poor output is **not** invalid. It counts.
- If check 2 (canary) fails, **no run counts** until it passes.
- If the maintainer wants to change the prompt, the model or the measures after seeing any result, that starts a new experiment instead of changing this one.

## 9. Limits that remain even if everything goes to plan
- One brief, one model, one Cursor version (to be recorded from Help, About), one PC, headless Chrome, no real phone.
- Three runs per condition.
- A single human reviewer, and AI reviewers that cannot run the pages.
- The B workspace contains a skill folder, so a reviewer who looks at the code can often guess the condition (the blind is imperfect).
- Skill discovery is verified for the folder that is tested, on this machine and this Cursor version only. Other agents (Claude Code, Codex) and other Windows setups remain untested.

## 10. Decisions needed before starting
1. **Model:** which model should every build use?
2. **Brief:** the Harborline brief only (6 builds), or add a second brief (12 builds)?
3. **Who drives the chats:** the maintainer by hand (needed for a clean workspace in Cursor), or also a headless Claude Code replication? That uses a Claude account and needs approval of its own; `claude.exe` is installed but not on the PATH (see [`integrations/README.md`](../../integrations/README.md)).
4. **Location:** which folder, outside the repository, should hold the two workspaces and the results?
5. **Human review:** will the maintainer score all six outputs blind?
6. **Cursor settings:** may User Rules and extra skill sources be switched off for the duration, or should they only be recorded?
7. **Publication:** results, including unfavourable ones, will be scrubbed of personal paths and published in the repository. Agreed?
