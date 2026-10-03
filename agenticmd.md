Create the following files exactly as specified below, then zip the whole
thing (CLAUDE.md at the root, plus a claude-notes/ folder containing the
rest, plus .claude/settings.json) into a single .zip file and give me the
path to it. (If told to set up inside a repo instead, create the files in
the repo root and skip the zip.)

ALSO, in the target repo, append these lines to .gitignore (create it if
missing) so the setup stays local-only and is NEVER tracked or pushed:

    # Claude Code local files (never track)
    CLAUDE.md
    claude-notes/
    .claude/

===== FILE: CLAUDE.md =====

# Project Memory

This file is auto-loaded by Claude Code (CLI and VS Code extension) at the
start of every session. It pulls in the working files below via @imports —
do not delete these lines.

@claude-notes/rules.md
@claude-notes/mistakes.md
@claude-notes/context.md
@claude-notes/se-principles.md
@claude-notes/PRD.md
@claude-notes/architecture.md
@claude-notes/phases.md
@claude-notes/design.md
@claude-notes/memory.md

## Session protocol

1. On start: read `claude-notes/rules.md` first, then `claude-notes/mistakes.md`
   (past mistakes — do not repeat them), then `claude-notes/PRD.md` (project
   requirements — check code and design decisions against these), then
   `claude-notes/architecture.md` (repo file structure and tech stack), then
   `claude-notes/phases.md` (what phase/task the project is on), then
   `claude-notes/design.md` (frontend design requirements), then the latest
   entries in `claude-notes/context.md` (completed phases.md tasks) and
   `claude-notes/memory.md` (session conversation history) for where the
   project and the conversation left off. Create a new dated section in
   `memory.md` for this session now, per the template inside that file.
2. During work: follow `claude-notes/se-principles.md` for all code you write
   or review, and `claude-notes/PRD.md` for what the project must actually do.
   Log meaningful decisions, discoveries, and discussion points to the
   current session's section in `claude-notes/memory.md` as they happen,
   not just at the end.
3. On completing a task defined in `claude-notes/phases.md` (whether done
   directly or discovered already done via a teammate's `git pull`): append
   an entry to `claude-notes/context.md` (see template inside that file).
   `claude-notes/context.md` is scoped to task/phase completions only —
   general discussion goes in `memory.md`, not here. If you made and caught
   a mistake worth remembering, append it to `claude-notes/mistakes.md`.
4. Keep `claude-notes/architecture.md` in sync with the real repo: update it
   immediately after creating, deleting, or renaming any file/directory
   (manually or via `git pull`), and check it against the repo state after
   every `git pull` regardless of what else that pull touched.
5. On every `git pull`: check the incoming commit messages and diffs
   against the open tasks in `claude-notes/phases.md`. If a pulled commit
   completes a task, log it to `claude-notes/context.md` per its "on pull"
   instructions. Never edit `claude-notes/phases.md` itself to reflect
   progress — it is fixed and only changes on explicit instruction.
6. Writing code: always invoke the `ponytail:ponytail` skill (Skill tool)
   before writing, editing, refactoring, or reviewing any code. This is the
   default for all code work, whether or not the prompt mentions it, and is
   backed by the hooks in `.claude/settings.json`. Skip it for non-code work
   (notes, docs, Q&A).
7. Never run `git commit` or `git push`. Stage changes if asked, but leave
   committing to the user's own GitHub-authenticated environment — see
   `claude-notes/rules.md`.

===== FILE: .claude/settings.json =====

{
"hooks": {
"SessionStart": [
{
"hooks": [
{
"type": "command",
"command": "echo 'MANDATORY DEFAULT: for ANY task that writes, edits, refactors, fixes or reviews code, first invoke the ponytail:ponytail skill via the Skill tool (full intensity), before touching code. This applies regardless of what the prompt says.'"
},
{
"type": "command",
"command": "echo 'SESSION START: before anything else, read CLAUDE.md and every file it links or @imports under claude-notes/ with the Read tool, in the order given by its Session protocol, then follow that protocol including creating the new dated section in claude-notes/memory.md.'"
}
]
}
],
"UserPromptSubmit": [
{
"hooks": [
{
"type": "command",
"command": "echo 'REMINDER: if this turn involves writing or changing code, invoke the ponytail:ponytail skill first (Skill tool). Default mode for all code work in this repo.'"
}
]
}
]
}
}

(The echo text MUST stay wrapped in single quotes: unquoted parentheses like
"(Skill tool)" break the shell, the hook exits non-zero, and every prompt is
blocked. Avoid single quotes/apostrophes inside the text. Hooks only inject text; Claude must still call the skill. Requires the
ponytail plugin to be installed. Restart the session after creating this.)

===== FILE: claude-notes/rules.md =====

# Rules

Standing rules for Claude Code on this project. These override convenience or
speed whenever they conflict.

## Git & commits

- **Never commit using Claude.** Claude may `git add`, `git diff`, `git status`,
  and prepare a suggested commit message — but the actual `git commit` and
  `git push` are always run by the person, from their own GitHub-authenticated
  environment.
- Do not create branches, open PRs, or merge anything on the user's behalf
  without being asked in that session.

- **Claude setup files are local-only.** `CLAUDE.md`, `claude-notes/` and
  `.claude/` must always be listed in `.gitignore` and never be tracked,
  staged, committed, or pushed. Never `git add -f` them. If they show up as
  tracked or untracked-and-unignored in `git status`, fix `.gitignore` (and
  `git rm --cached` if already tracked, asking first) before anything else.

## Code writing (ponytail)

- Always invoke the `ponytail:ponytail` skill before writing, editing,
  refactoring, or reviewing any code (default intensity: full). It is the
  default for all code work, enforced by hooks in `.claude/settings.json`
  (SessionStart and UserPromptSubmit), so it applies even if a prompt never
  mentions it. Skip it only for non-coding work.
- Ponytail's minimal bias must not drop anything the spec or
  `claude-notes/PRD.md` requires; the PRD wins over brevity.

## Logging discipline

- Follow the `context.md` logging rule: append a dated entry to
  `claude-notes/context.md` whenever a task defined in `claude-notes/phases.md`
  is completed — whether done directly in this session or discovered already
  done via a teammate's `git pull`. This is how future sessions avoid
  re-deriving context from scratch (and burning tokens re-reading the whole
  codebase).
- Follow the `memory.md` logging rule: at the start of every session, create a
  new dated section in `claude-notes/memory.md`, and update it throughout the
  session with meaningful decisions, discoveries, and discussion — this is the
  running conversation log, distinct from `context.md`'s task-completion scope.
- If Claude makes a mistake during a session — a bug it introduced, a bad
  assumption, a wrong approach that had to be reverted — log it in
  `claude-notes/mistakes.md` before the session ends, so it is not repeated.

## Engineering standard

- All code Claude writes or reviews should follow `claude-notes/se-principles.md`.
  When a suggestion in that file would conflict with an explicit instruction
  from the user in the moment, the user's instruction wins — but Claude should
  say so out loud rather than silently deviating.

## Scope

- Ask before touching CI/CD config, infra-as-code, or anything under
  `.github/workflows/`.
- Ask before installing new dependencies; prefer what's already in the
  lockfile/manifest.

===== FILE: claude-notes/mistakes.md =====

# Mistakes Log

Append-only log of mistakes Claude has made on this project, so they are never
repeated. Read this file at the start of every session before writing code.

## How to log a mistake

When you (Claude) catch yourself having made a mistake — introduced a bug,
made a wrong assumption, used an approach that had to be reverted, missed an
edge case that broke something — add an entry using this template, newest
entries at the top:

```
## YYYY-MM-DD — <short title>
**What happened:** <1-2 sentences on the mistake and its symptom>
**Root cause:** <why it happened>
**Fix:** <what resolved it>
**Rule going forward:** <the concrete thing to do differently next time>
```

Keep entries short — a few lines each. If a "rule going forward" turns out to
be a general principle rather than something project-specific, promote it into
`rules.md` instead of leaving it buried here.

---

<!-- New entries go below this line, newest first. -->

===== FILE: claude-notes/context.md =====

# Session & Feature Context Log

Append-only log, newest entries at the top. The point of this file is to let
a future session get oriented by reading a few short entries instead of
re-scanning the whole codebase — keep entries dense, not exhaustive.

This file is scoped to **task/phase completion only** — it records the
final outcome once a task defined in `claude-notes/phases.md` is actually
done, whether completed directly in this session or discovered already
done via a teammate's `git pull`. It is not a running conversation log —
that's what `claude-notes/memory.md` is for. Do not append an entry here
just because a discussion happened or a decision was made; wait until a
phases.md task is actually complete.

`claude-notes/phases.md` itself is fixed and must not be edited to reflect
progress — this file is where progress lives instead.

## How to log

**When you (Claude) complete a task from `claude-notes/phases.md` in this
session:** append an entry using the template below, identifying which
phase/task it closes.

**On every `git pull`:** check the incoming commit messages and diffs
against the open tasks in `claude-notes/phases.md`. If a pulled commit (or
set of commits) completes a task, append an entry here — phase/task
number, what the teammate's commit(s) actually did, and how (derived from
the diff, not just the commit message) — even though you didn't do the
work yourself.

Template:

```
## YYYY-MM-DD — <feature / session title>
**Phase/Task:** <phases.md phase # and task #, if this entry closes one — omit if N/A>
**Goal:** <what this session/feature set out to do>
**Changed:** <files/modules touched, in a phrase each — not a diff>
**Key decisions:** <any non-obvious choice and why, e.g. "used queue over
  cron because retries needed backoff">
**Open items / follow-ups:** <anything left unfinished or intentionally
  deferred>
```

Guidelines:

- One entry per completed task from `phases.md` (whether done directly or
  discovered via a teammate's pull) — not per session, not per commit.
- Skip anything derivable from reading the code itself (directory layout,
  dependency list) — only log things a future session can't easily re-derive.
- If an entry references a mistake that was made and fixed, don't duplicate
  the detail here — just note it happened and point to the dated entry in
  `mistakes.md`.

---

<!-- New entries go below this line, newest first. -->

===== FILE: claude-notes/memory.md =====

# Session Memory Log

Append-only log of conversations between the user and Claude in this repo,
one section per session. This is separate from `claude-notes/context.md`:
this file is the running record of _what was discussed_ — decisions made,
things discovered, questions raised, direction given — regardless of
whether a `phases.md` task was completed. `context.md` only gets an entry
once a phases.md task is actually done; this file gets updated continuously
throughout a session whenever something worth remembering happens.

## How to log

**At the start of a new session:** create a new dated section below using
the template, even if nothing has happened yet — it gets filled in as the
session progresses.

**During the session:** append a bullet to the current session's section
whenever something meaningful happens — a decision that will affect future
work, a discovery (a bug, a discrepancy, a fact about the codebase or
data), a direction/preference the user states, or any other exchange worth
a future session knowing about. Don't wait until the end of the session to
write it all at once — update as you go, in the moment it happens.

Template for a new session section:

```
## YYYY-MM-DD — Session N
- <short entries, newest last, one per meaningful exchange>
```

Guidelines:

- This is a conversation log, not a changelog — record what was discussed
  and decided, not just what files changed (that's `context.md`'s job when
  it rises to a completed phases.md task).
- Keep entries terse — a sentence or two each, enough for a future session
  to reconstruct why something is the way it is without re-reading the
  full transcript.
- Don't duplicate content that belongs in a more specific file — a genuine
  mistake-and-fix goes in `mistakes.md`, a completed phases.md task goes in
  `context.md`, a standing preference goes in memory (see the auto-memory
  system if this repo has one configured) — this file is for everything
  else: the shape of the conversation itself.
- New sessions go at the bottom, chronological (unlike `context.md` and
  `mistakes.md`, which are newest-first) — this file reads like a diary.

---

<!-- New session sections go below this line, oldest first. -->

===== FILE: claude-notes/se-principles.md =====

# Software Engineering Principles

A comprehensive reference for Claude to follow when designing, building, and reviewing any software project.

---

## 1. Core Design Principles

### SOLID

- **Single Responsibility Principle (SRP)** — Every class, module, or function should have one reason to change. If it does more than one thing, split it.
- **Open/Closed Principle (OCP)** — Software entities should be open for extension, closed for modification. Add behavior without altering existing code.
- **Liskov Substitution Principle (LSP)** — Subtypes must be substitutable for their base types without altering correctness.
- **Interface Segregation Principle (ISP)** — No client should depend on methods it doesn't use. Prefer small, focused interfaces over fat ones.
- **Dependency Inversion Principle (DIP)** — Depend on abstractions, not concretions. High-level modules should not depend on low-level modules.

### DRY, KISS, YAGNI

- **DRY (Don't Repeat Yourself)** — Every piece of knowledge must have a single, unambiguous representation in the system. Duplication is a maintenance liability.
- **KISS (Keep It Simple, Stupid)** — Prefer the simplest solution that works. Complexity is the enemy of reliability.
- **YAGNI (You Aren't Gonna Need It)** — Don't build features or abstractions until they are actually required. Speculative generality wastes time and creates tech debt.

### Separation of Concerns

- Divide the system into distinct sections, each addressing a separate concern (UI, business logic, data access, etc.).
- Changes in one layer should not cascade unnecessarily into others.

### Law of Demeter (Principle of Least Knowledge)

- A module should only talk to its immediate collaborators. Avoid long chains like `a.getB().getC().doSomething()`.

---

## 2. Code Quality

### Readability First

- Code is read far more often than it is written. Optimize for the next person reading it (which may be you in 6 months).
- Use descriptive, intention-revealing names for variables, functions, and classes.
- Avoid abbreviations unless they are universally understood in the domain.

### Small, Focused Units

- Functions should do one thing and do it well.
- Aim for functions under ~20–30 lines; if longer, consider extracting logic.
- Classes should be cohesive — all methods should relate to the same concept.

### Avoid Magic Numbers & Strings

- Replace raw literals with named constants or enums that communicate intent.

### Consistent Conventions

- Follow the language/framework's idiomatic style (PEP 8 for Python, Airbnb/Standard for JS, etc.).
- Enforce consistency with linters and formatters (ESLint, Prettier, Black, etc.).

### Comments

- Write comments to explain **why**, not **what**. The code itself should communicate what.
- Outdated comments are worse than no comments — keep them accurate or delete them.
- Prefer self-documenting code over excessive commenting.

---

## 3. Architecture & Structure

### Layered Architecture

- Separate concerns into clear layers: Presentation → Business Logic → Data Access.
- Dependencies should flow inward (outer layers depend on inner, not the reverse).

### Modular Design

- Build discrete, independently understandable modules with well-defined public APIs.
- Minimize coupling between modules; maximize cohesion within them.

### Dependency Management

- Prefer dependency injection over hard-coded dependencies to improve testability and flexibility.
- Keep the dependency graph acyclic.

### Configuration over Hardcoding

- Externalize configuration (environment variables, config files). Never hardcode secrets, URLs, or environment-specific values.

### Fail Fast

- Validate inputs and assumptions early. Surface errors as close to their source as possible.
- Use assertions, guard clauses, and input validation at boundaries.

---

## 4. Testing

### Test Pyramid

- Write many **unit tests** (fast, isolated, cheap).
- Write fewer **integration tests** (test component interactions).
- Write even fewer **end-to-end tests** (test full flows; slow and brittle if over-relied upon).

### Test Behavior, Not Implementation

- Tests should verify observable outcomes, not internal details. This allows refactoring without breaking tests.

### AAA Pattern

- Structure tests as: **Arrange** (set up), **Act** (execute), **Assert** (verify).

### Test Coverage

- Aim for meaningful coverage of critical paths, edge cases, and error conditions — not just a coverage percentage.
- 100% coverage with poor assertions is worse than 70% coverage with strong assertions.

### Tests as Documentation

- Test names should read as specifications: `should_return_empty_list_when_no_items_match`.

---

## 5. Error Handling

- **Never silently swallow errors.** Log or propagate every exception.
- Distinguish between recoverable errors (return error values / Result types) and unrecoverable ones (crash loudly).
- Provide meaningful error messages that help diagnose the problem.
- Use typed/domain-specific exceptions rather than generic ones.
- Handle errors at the appropriate layer — don't let data-layer exceptions leak into the UI.

---

## 6. Performance

- **Measure before optimizing.** Profile first; don't guess where bottlenecks are.
- Prefer algorithmic improvements (O(n) → O(log n)) over micro-optimizations.
- Cache expensive computations, but invalidate caches correctly.
- Be mindful of N+1 query problems in database access.
- Lazy-load resources when eagerly loading is unnecessary.
- Premature optimization is the root of much evil — optimize when there is a measured need.

---

## 7. Security

- **Principle of Least Privilege** — grant only the permissions actually needed.
- **Never trust user input.** Validate and sanitize all external data.
- Parameterize all database queries to prevent SQL injection.
- Encode output correctly to prevent XSS.
- Store passwords using strong adaptive hashing (bcrypt, Argon2) — never plaintext.
- Keep secrets out of source control (use environment variables or secret managers).
- Keep dependencies up to date; audit for known vulnerabilities.
- Use HTTPS everywhere; never transmit sensitive data over plain HTTP.
- Apply defense in depth — multiple layers of security, not a single perimeter.

---

## 8. Version Control

- **Commit small and often.** Each commit should represent one logical change.
- Write clear commit messages: subject line summarizing _what_, body explaining _why_.
- Use feature branches; keep `main`/`master` always deployable.
- Review code before merging (pull requests / code review).
- Never commit secrets, credentials, or large binary files.
- Tag releases meaningfully (semantic versioning: `MAJOR.MINOR.PATCH`).

---

## 9. Documentation

- Every project should have a `README.md` covering: purpose, prerequisites, setup, usage, and contribution guide.
- Document public APIs (functions, classes, endpoints) with clear descriptions, parameters, and return values.
- Keep documentation in sync with the code — stale docs are harmful.
- Architecture Decision Records (ADRs) are valuable for capturing _why_ major decisions were made.

---

## 10. Refactoring

- Refactor continuously — don't let tech debt accumulate until it's unmanageable.
- Always have tests in place before refactoring (tests are your safety net).
- Change structure in one commit, behavior in another — never both at once.
- Follow the boy scout rule: **leave the code cleaner than you found it.**

---

## 11. Concurrency & Reliability

- Prefer immutability where possible — it eliminates whole classes of concurrency bugs.
- Make operations idempotent where practical (especially in distributed systems).
- Design for failure: assume networks fail, services go down, disks fill up.
- Use timeouts, retries with exponential backoff, and circuit breakers for external calls.
- Log enough to debug production issues without exposing sensitive data.

---

## 12. API Design

- Be consistent — use the same naming conventions, error formats, and pagination patterns throughout.
- Design APIs to be intuitive: principle of least surprise.
- Version your APIs from day one (`/v1/`, `Accept: application/vnd.api+json; version=2`).
- Use HTTP semantics correctly (GET is safe and idempotent, POST is not, etc.).
- Return meaningful status codes and structured error responses.
- Document with OpenAPI/Swagger or equivalent.

---

## 13. Observability

- **Logging** — structured logs with consistent fields (timestamp, level, correlation ID).
- **Metrics** — instrument key business and system metrics (latency, error rate, throughput).
- **Tracing** — distributed traces for multi-service flows.
- An unmonitored system in production is a ticking time bomb.

---

## 14. Deployment & DevOps

- Automate builds, tests, and deployments (CI/CD pipelines).
- Every merge to main should trigger automated testing.
- Infrastructure as Code — version control your infrastructure (Terraform, Pulumi, CloudFormation).
- Use feature flags to decouple deployment from release.
- Blue/green or canary deployments reduce risk of bad releases.
- Have a tested rollback plan for every deployment.

---

## Quick Reference Checklist

Before submitting any code, verify:

- [ ] Does each function/class have a single, clear responsibility?
- [ ] Is there any duplicated logic that should be extracted?
- [ ] Are all inputs validated and errors handled?
- [ ] Are there unit tests covering the happy path and edge cases?
- [ ] Are there any hardcoded secrets, URLs, or magic values?
- [ ] Are names descriptive and consistent with the codebase?
- [ ] Is the code as simple as it can be while still meeting requirements?
- [ ] Is the public API documented?
- [ ] Would a teammate understand this code without asking you questions?

---

_These principles are guidelines, not rigid laws. Context matters. Use good judgment, and when in doubt, optimize for clarity and maintainability._

===== FILE: claude-notes/PRD.md =====

# PRD — <Project Name> Project Requirements

Requirements for this project, derived from <name your source spec
document(s) here — e.g. a proposal doc, a client brief, a design doc>.
This is a rule list to check code/design against — not an implementation
guide.

This file is a standalone reference. It is not auto-updated from session
logs or memory — if a requirement here needs to change, that will be
stated explicitly, or Claude should flag the discrepancy and suggest an
update rather than editing it unprompted.

## Goal

<One or two sentences: what this project does and for whom, stated as
plainly as possible.>

## <Domain> rules

<e.g. "Data rules" / "Input rules" — whatever the project's core input or
domain-object constraints are. Each bullet should be a hard, testable
rule ("must", "never", exact numbers/thresholds), not a description of
how to build it.>

- TBD.

## <Domain> rules

<e.g. "Processing rules" / "Business logic rules" — the core
transformation/behavior constraints.>

- TBD.

## <Domain> rules

<e.g. "Model rules" / "System rules" — architecture-level constraints
that are requirements, not implementation choices (e.g. "must support N
concurrent users," "must use algorithm X," "must be reproducible given
the same input").>

- TBD.

## Evaluation targets

<Concrete, measurable success criteria — the numbers that define "done"
or "good enough." e.g. performance targets, accuracy targets, SLAs.>

- TBD.

## <Other domain> rules

<Add as many of these sections as the project needs — e.g.
"Explainability rules," "Dashboard rules," "Security rules," "Compliance
rules." Delete any that don't apply.>

- TBD.

===== FILE: claude-notes/phases.md =====

# Phases — <N>-Week Implementation Roadmap

Condensed from <name your source project-plan document(s) here>. Team:
<N> owners (<A/B/C or names>), one phase per week, each phase has one
hard prerequisite (the previous phase's deliverable) and closes with a
defined deliverable. Cross-checked against `claude-notes/PRD.md` — phase/
task structure, ownership, and week numbering follow the source plan
as-is.

Once filled in, this file is fixed and should not be edited to reflect
ongoing progress — task/phase completions are logged in
`claude-notes/context.md` instead (per its own rules, including checking
teammates' `git pull`s against these tasks). Only edit this file directly
on explicit instruction (e.g. the plan itself changed).

## Timeline

| Wk  | Phase | Focus   | Deliverable   |
| --- | ----- | ------- | ------------- |
| 1   | 1     | <Focus> | <Deliverable> |
| 2   | 2     | <Focus> | <Deliverable> |
| ... | ...   | ...     | ...           |

## Phase 1 — <Focus> (Week 1)

Prerequisite: none.

- **Task 1 (<Owner>):** <description>.
- **Task 2 (<Owner>):** <description>.
- **Task 3 (<Owner>):** <description>.

## Phase 2 — <Focus> (Week 2)

Prerequisite: <previous phase's deliverable>.

- **Task 1 (<Owner>):** <description>.
- **Task 2 (<Owner>):** <description>.
- **Task 3 (<Owner>):** <description>.

<Repeat one "## Phase N — <Focus> (Week N)" section per phase in the
timeline table above, with a Prerequisite line and Task bullets for each
owner, until every phase in the project plan is represented.>

===== FILE: claude-notes/architecture.md =====

# Architecture — Repo Structure & Tech Stack

This file must be kept current: update it whenever a file is created or
removed, and after every `git pull` if it introduces files/directories not
already reflected here. Do not let this drift — it is read at the start of
every session as the map of what exists.

## Tech stack

- **Language / runtime:** TBD
- **Database:** TBD
- **Core libraries:** TBD (list by purpose — data, models, testing, etc.)
- **Testing:** TBD
- **Env management:** TBD

## Repo structure

```
<project-name>/
├── CLAUDE.md
└── claude-notes/
    ├── rules.md
    ├── mistakes.md
    ├── context.md
    ├── se-principles.md
    ├── PRD.md
    ├── architecture.md              # this file
    ├── phases.md
    ├── design.md
    └── memory.md
```

<Fill in the rest of the tree as the project's real structure takes
shape — one line per file/directory with a short purpose comment, not a
full docstring.>

## Maintenance rule

- After creating, deleting, or renaming any file/directory in this repo —
  whether done manually (by Claude or the user) or brought in via a
  `git pull` — update the tree above in that same session, before moving
  on to other work. A rename is both a removal and an addition; update
  both sides of it in the tree, don't leave the old name lingering.
- After every `git pull`, diff the new state against this file even if no
  other work is planned that session; if files/directories appeared, were
  removed, or were renamed and aren't reflected here, update this file
  before continuing.
- Keep entries as one-line purpose annotations, not full docstrings —
  this is a map, not documentation.

===== FILE: claude-notes/design.md =====

# Design — Frontend Requirements

Placeholder. This file will hold the design requirements for this
project's frontend, if it has one. Not yet filled in; sections below are
the generic shape to fill as decisions are made.

## Purpose & audience

- Who uses this UI, and for what decision or task.
- TBD.

## Views / screens

- Enumerate each required view/screen and what it must show.
- If the required views are already specified in `claude-notes/PRD.md`,
  this section should restate them as concrete layout/design decisions
  once made, not duplicate the requirement list.
- TBD.

## Visual design system

- Color palette, typography, spacing scale, component library (if any).
- Light/dark mode support: yes/no.
- TBD.

## Interaction patterns

- Navigation model, state changes, loading/error/empty states.
- Real-time vs. on-demand data refresh behavior.
- TBD.

## Accessibility

- Target conformance level (e.g. WCAG 2.1 AA), keyboard navigation,
  screen-reader support.
- TBD.

## Tech constraints

- Framework/library choices and why.
- Any environment constraints that affect the frontend.
- TBD.

## Open questions

- Track undecided design questions here until resolved, rather than
  guessing silently.

===== END OF FILES =====

After writing all of the above files, zip CLAUDE.md, .claude/settings.json
and the entire claude-notes/ folder into a single .zip file (e.g. claude-notes-starter-kit.zip)
and tell me the exact path where it was saved.
