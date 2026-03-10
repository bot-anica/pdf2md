# Improvement Brief for `pdf-to-md`

## Implemented Change Summary

| Area               | Before                                                              | Changed in this branch                                                                               | Effect on the original problem                                                  |
| ------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Runtime stack      | Node.js + TypeScript + `commander` + `pdfjs-dist`                   | Same runtime stack; no new runtime dependencies added                                                | Kept upgrade risk low while improving safety and maintainability                |
| Test stack         | No automated tests                                                  | Added a package-level test workflow using Node's built-in `node:test` runner with `tsx` loading TypeScript | Closed the immediate "no safety net" gap without increasing dependency surface  |
| CLI safety         | Could overwrite files, had no `--stdout`, accepted risky path flows | Added overwrite protection, `--stdout`, `.pdf` validation, `--force`, and file-size checks before conversion | Reduced accidental data loss and made scripted usage safer                      |
| Parser hardening   | `pdfjs-dist` used with minimal explicit safety settings             | Added centralized parser defaults, page-count limits, file-size limits, and safer PDF.js options     | Reduced exposure to large or malformed PDFs and made parser behavior explicit   |
| Pipeline structure | Options and warnings were implicit and scattered                    | Added typed config, typed errors, typed warnings, and a structured conversion result                 | Made behavior easier to reason about, test, and extend                          |
| Output diagnostics | Deep modules printed warnings directly                              | Warnings now flow back through the result model and are formatted at the CLI boundary                | Improved separation of concerns and makes future machine-readable output easier |

## Tech Stack Changes And Impact

### Runtime stack stayed intentionally stable

The external runtime stack did not change in a major way. The tool still runs on Node.js, is written in TypeScript, uses `commander` for CLI parsing, and uses `pdfjs-dist` for PDF extraction.

This matters because the original brief did not identify the language or primary libraries as the main problem. The bigger issues were unsafe defaults, implicit behavior, and lack of testing. By keeping the runtime stack stable, the change improves the tool without adding migration cost or introducing new library risk.

### The main stack change was in development and verification

Before this change, the project had no automated test layer at all. The branch now adds a test command that uses Node's built-in `node:test` runner together with the existing `tsx` setup so TypeScript tests can run without adding a new framework first.

The effect on the original problem is immediate: the repository now has a minimal regression net for config normalization, CLI safety rules, and conversion limits. This directly addresses the brief's concern that the project could not be improved safely because behavior was not under test.

### The internal application stack became more explicit

The codebase now includes a small set of internal infrastructure modules:

- `src/config.ts` for typed conversion defaults
- `src/errors.ts` for typed operational errors
- `src/warnings.ts` for structured warnings
- `src/cli-support.ts` for CLI path and limit validation

This is a meaningful stack change even though it does not add third-party packages. Before, key behavior lived as ad hoc logic inside the CLI and parser. After the change, configuration and operational rules are explicit modules. The effect is that safety behavior is easier to audit, easier to test, and less likely to drift when new features are added.

### PDF.js is now used with clearer security posture

Before this change, the PDF parser path relied on `pdfjs-dist` with very little explicit hardening. After the change, the parser is called through centralized config with safer defaults such as disabling system fonts by default, disabling eval support, stopping at errors, disabling font-face loading, and rejecting documents that exceed configured page or file-size limits.

This directly improves the biggest risk called out in the brief: parsing untrusted PDFs without clear resource or safety boundaries. The change does not eliminate all parser risk, but it converts the parser from a permissive prototype integration into a more deliberate trust boundary.

### The overall effect is higher safety without stack sprawl

The most important impact is that the repository is no longer relying only on "same stack, better intentions." It now has a modest but real platform for safe iteration: explicit config, explicit warnings, safer CLI behavior, safer parser defaults, and baseline automated tests.

That solves a meaningful part of the original problem because the earlier version was difficult to change confidently. The new version is still lightweight, but it is no longer purely prototype-shaped.





**-- IMRPOVEMENTS FROM CODEX XHIGH:**

## 1. Purpose of This Document

This document is a technical brief for upgrading `pdf-to-md` from a quick prototype into a safer, more maintainable, and more accurate CLI tool. It is written so that an engineer or another LLM can pick up the work with minimal extra context.

Primary goals:

- Make the tool safer to run on local machines and safer to use on untrusted PDFs.
- Improve architectural clarity so future changes are cheaper and less error-prone.
- Improve extraction quality and Markdown correctness.
- Add enough tests and guardrails that changes can be made confidently.

This is not a rewrite brief. The recommended approach is to keep the current Node.js + TypeScript stack and improve it incrementally.

## Status Snapshot

The current branch has completed an initial implementation slice from Phase 1 and Phase 2. The summary table above describes what changed already. The remaining sections below should be read as the next work queue after this baseline.

## 2. Project Summary

Current project behavior:

- Accepts a local PDF path.
- Uses `pdfjs-dist` to extract text items and font metadata.
- Uses simple heuristics to infer headings, lists, code blocks, and inline formatting.
- Renders the result to GitHub-flavored Markdown.
- Writes a `.md` file to disk or to stdout.

Current runtime scope:

- Local CLI only.
- No server.
- No database.
- No outbound API calls.

This is a good starting point for a lightweight utility, but the code currently looks like a first-pass prototype rather than a hardened tool.

## 3. Current Tech Stack

### Runtime and language

- Node.js
- TypeScript
- CommonJS build output in `dist/`

### Direct dependencies

- `commander`
    - Used for CLI argument parsing.
    - Good choice for a simple CLI and does not need replacement right now.
- `pdfjs-dist`
    - Used to parse PDFs and extract text/font information.
    - This is the most security-sensitive dependency because it processes untrusted binary input.

### Development dependencies

- `tsx`
    - Used to run TypeScript directly during development and tests.
- `typescript`
    - Compiler.
- `@types/node`
    - Node.js typings.
- Node built-in `node:test`
    - Now used as the initial automated test runner through the package test script.
    - Chosen to add baseline coverage without adding a new dependency yet.

### Missing but recommended additions

- `vitest`
    - Still a reasonable future upgrade if richer snapshots, fixtures, or test ergonomics are needed.
    - It is no longer required just to establish a basic test baseline.
- `eslint` with `@typescript-eslint`
    - To catch unused code, unsafe patterns, and drift in code quality.
- GitHub Actions CI
    - To run build and tests automatically on push and PR.

Optional additions:

- `prettier`
    - Only if the team wants strict formatting automation.
- `c8` or Vitest coverage
    - If coverage tracking is desired.

## 4. Current Architecture

Current file-level architecture:

- `src/cli.ts`
    - CLI entrypoint.
    - Resolves input/output paths and validates safe CLI usage.
    - Reads file from disk.
    - Calls conversion function and formats warnings.
    - Writes Markdown to disk or stdout.
- `src/cli-support.ts`
    - Shared CLI validation helpers for paths, limits, and numeric options.
- `src/config.ts`
    - Centralized typed conversion defaults and option normalization.
- `src/converter.ts`
    - Pipeline coordinator.
    - Calls parser, font analysis, block classification, and renderer.
    - Returns structured result data with warnings and stats.
- `src/parser/pdf-parser.ts`
    - Converts PDF bytes into text items with coordinates and font flags.
    - Applies explicit PDF.js safety-related settings and page limits.
    - This is the main trust boundary.
- `src/classifier/font-analyzer.ts`
    - Finds the body font size and heading sizes.
- `src/classifier/block-classifier.ts`
    - Groups text into lines and classifies line/block types.
- `src/renderer/markdown-renderer.ts`
    - Converts content blocks into Markdown text.
- `src/errors.ts`
    - Typed operational errors for CLI and parser limit failures.
- `src/warnings.ts`
    - Structured warning types and CLI formatting helpers.

Current pipeline:

`CLI input -> path/size validation -> validated config -> parse PDF -> extract text items -> infer structure -> render Markdown -> structured result -> file or stdout`

This is still small and readable, but the main remaining concerns are now narrower:

- Classification heuristics are still hard-coded.
- Markdown rendering is still string-based and mostly unescaped.
- Resource controls are present, but still limited to simple file-size and page-count guardrails.
- Test coverage now exists, but it is only a baseline and not yet fixture-heavy.

## 5. Key Issues That Need Improvement

The items below are the original gap statements that motivated the work. Where this branch already changed the situation, a status note is included so the remaining work is clear.

### 5.1 Safety and security issues

#### A. No resource limits for untrusted PDFs

Original problem:

- The entire input file is read into memory at once.
- Every page is parsed without page-count or size limits.
- There is no time budget, memory budget, or early-stop mechanism.

Status after this branch:

- Partially addressed.
- File-size checks and max-page checks now exist.
- The file is still fully read into memory, and there is still no time-budget enforcement.

Why this matters:

- A large or malicious PDF can cause CPU spikes, memory pressure, or very slow execution.
- This is the main operational risk in the current codebase.

What to do:

- Validate input file size before reading.
- Add optional maximum page count.
- Add optional fail-fast behavior for malformed PDFs.
- Surface warnings when limits are hit.

#### B. Markdown output is mostly unsanitized

Original problem:

- Extracted text is emitted directly into Markdown.
- Raw HTML, Markdown syntax, and malformed content are preserved.

Why this matters:

- The tool itself does not execute that content.
- However, downstream Markdown renderers may treat the output differently.
- This can produce confusing, broken, or unsafe output in some renderers.

What to do:

- Add an output safety mode.
- Provide at least two modes:
    - `preserve` for maximum fidelity
    - `escape` for safer Markdown output
- Escape raw HTML and markdown-significant characters where appropriate.
- Keep code block contents literal, but ensure fence escaping is robust.

#### C. Output path can accidentally overwrite the input

Original problem:

- If the input file does not end in `.pdf`, the default output path may equal the input path.

Status after this branch:

- Largely addressed for CLI usage.
- The CLI now rejects non-`.pdf` inputs by default, refuses overwrite without `--force`, and supports `--stdout`.

Why this matters:

- This can destroy the original file contents.

What to do:

- Require `.pdf` input by default, or at least warn.
- Refuse to overwrite the input path unless `--force` is provided.
- Add `--stdout` support to reduce accidental file writes.

#### D. Parser hardening is weak

Original problem:

- `pdfjs-dist` is used directly with minimal configuration.
- `useSystemFonts: true` broadens host interaction and reproducibility concerns.
- Security-sensitive settings are not explicitly documented or justified.

Status after this branch:

- Partially addressed.
- Parser settings are now explicit and use safer defaults.
- Additional rationale, tests, and deeper resource controls are still worth adding.

Why this matters:

- PDF parsing is the most dangerous part of the project.
- Even if there is no current exploit in the pinned version, this layer deserves hardening.

What to do:

- Review and explicitly set parsing options.
- Default to safer settings where possible.
- Document why each parser option is enabled.

### 5.2 Architecture and maintainability issues

#### E. Pipeline configuration is implicit and scattered

Original problem:

- Heuristics and parser behavior are embedded directly in implementation files.
- There is no shared config object with defaults, validation, and documentation.

Status after this branch:

- Partially addressed.
- A central typed config module now exists for conversion and parser behavior.
- Heuristic thresholds are still not fully modeled as config.

Why this matters:

- Behavior changes are hard to reason about.
- Feature work will increase duplication.

What to do:

- Introduce a central config module.
- Define typed defaults.
- Pass config explicitly through the pipeline.

#### F. Heuristics are hard-coded and not test-driven

Original problem:

- Heading thresholds, list patterns, spacing logic, and code detection rules are all embedded in code.
- No fixture tests prove that the current heuristics work on realistic PDFs.

Why this matters:

- Any future change can silently degrade output quality.

What to do:

- Move heuristics into named constants or strategy modules.
- Create fixture PDFs and expected Markdown outputs.
- Add regression tests before making major logic changes.

#### G. Rendering logic is fragile

Original problem:

- Markdown is produced via direct string concatenation.
- Inline formatting and spacing are easy to break.
- Fence handling is simplistic.

Why this matters:

- Small changes can introduce malformed Markdown.
- This is likely where many user-visible bugs will appear.

What to do:

- Create dedicated escaping helpers.
- Create dedicated render helpers for paragraph, heading, list, and code nodes.
- Consider a small internal Markdown AST if the renderer grows more complex.

#### H. Mutability and data flow are too loose

Original problem:

- Blocks are mutated in place when language override is applied.
- Warnings are printed directly instead of being modeled.

Status after this branch:

- Partially addressed.
- Warnings are now structured, and forced language is applied through immutable block mapping.
- Further cleanup is still possible if the internal model grows.

Why this matters:

- Hidden state changes make debugging harder.
- Structured outputs become harder to support later.

What to do:

- Prefer immutable transformations.
- Return structured results such as:
    - `markdown`
    - `warnings`
    - `stats`

### 5.3 Product and developer experience issues

#### I. No automated tests

Original problem:

- There are no unit tests.
- There are no integration tests.
- There are no fixture-based output snapshots.

Status after this branch:

- Partially addressed.
- A baseline automated test layer now exists for config, CLI safety, and conversion limits.
- Integration fixtures and output snapshots are still missing.

Why this matters:

- The project cannot be improved safely without tests.
- This is the single biggest maintainability gap after PDF parsing safety.

What to do:

- Add test infrastructure before large feature work.

#### J. No linting or CI

Original problem:

- Dead code and unused variables can slip in unnoticed.
- There is no quality gate in pull requests.

Why this matters:

- Prototype quality persists longer than it should.

What to do:

- Add linting and CI early.

#### K. CLI ergonomics are basic

Original problem:

- No `--stdout`
- No `--force`
- No `--safe-output-mode`
- No limits or diagnostics options

Status after this branch:

- Partially addressed.
- `--stdout`, `--force`, `--max-pages`, and `--max-file-size-mb` now exist.
- Safe-output mode and richer diagnostics options are still pending.

Why this matters:

- The tool is harder to compose in scripts.
- Safe usage depends too much on user caution.

What to do:

- Expand CLI options in a measured, documented way.

## 6. Recommended Improvement Strategy

Do not rewrite the project in another language yet.

Reasons:

- The codebase is small.
- The current TypeScript stack is adequate for this problem.
- The biggest gaps are safety, testing, and architecture, not language choice.
- `pdfjs-dist` is already integrated and is a reasonable parser to keep for a v2.

Recommended strategy:

1. Add tests and safety guardrails first.
2. Refactor the architecture second.
3. Improve extraction quality third.
4. Improve packaging and release process last.

## 7. Target Architecture

Recommended target structure:

- `src/cli.ts`
    - Parse CLI arguments and call a high-level app service.
- `src/config.ts`
    - Centralized default config and validation.
- `src/app/convert.ts`
    - High-level orchestration returning structured results.
- `src/parser/pdf-parser.ts`
    - PDF parsing only.
- `src/parser/types.ts`
    - Raw parser types.
- `src/model/blocks.ts`
    - Internal normalized block types.
- `src/classifier/*`
    - Pure heuristics only.
- `src/renderer/*`
    - Markdown rendering helpers and escaping.
- `src/errors.ts`
    - Typed error classes.
- `src/warnings.ts`
    - Warning codes and messages.
- `test/unit/*`
    - Unit tests.
- `test/fixtures/*`
    - Sample PDFs and expected outputs.
- `test/integration/*`
    - End-to-end CLI tests.

Target data flow:

`CLI input -> validated config -> parser -> normalized model -> classifier -> renderer -> structured result -> file or stdout`

Target return type:

```ts
interface ConvertResult {
  markdown: string;
  warnings: string[];
  stats: {
    pages: number;
    textItems: number;
    blocks: number;
  };
}
```

This gives future consumers a cleaner interface than returning raw Markdown only.

## 8. Recommended Phased Roadmap

### Phase 1: Safety hardening and baseline tests

Priority: highest

Goal:

- Reduce avoidable local risk.
- Create a test baseline before logic changes.

Implementation steps:

1. Add `vitest`.
2. Add unit tests for:

   - font analysis
   - line grouping
   - list detection
   - language detection
3. Add fixture-based integration tests with a small set of PDFs.
4. Add input validation in the CLI:

   - verify input exists
   - verify file extension or add explicit override
   - reject output path equal to input path unless forced
5. Add `--stdout`.
6. Add `--force` or `--overwrite`.
7. Add safe parser defaults and document them.
8. Add size/page guardrails with clear errors.

Suggested file changes:

- `package.json`
- `src/cli.ts`
- `src/parser/pdf-parser.ts`
- new `test/` directory

Acceptance criteria:

- Running the CLI cannot overwrite the input file by accident.
- Test suite exists and passes.
- At least 3 fixture PDFs are covered.
- README is updated with new safe usage examples.

### Phase 2: Centralized configuration and structured results

Priority: high

Goal:

- Make behavior explicit and extensible.

Implementation steps:

1. Create `src/config.ts` with a typed config interface.
2. Move heuristic thresholds into named config fields.
3. Change conversion pipeline to accept validated config instead of ad hoc options.
4. Change conversion result to a structured object.
5. Add warning collection instead of direct `console.warn` from low-level modules.

Suggested config fields:

- `pageBreaks`
- `forcedLanguage`
- `safeOutputMode`
- `maxPages`
- `maxFileSizeBytes`
- `useSystemFonts`
- `headingMaxLength`
- `lineMergeThresholdMultiplier`
- `paragraphGapMultiplier`
- `codeGapMultiplier`

Suggested file changes:

- `src/converter.ts`
- `src/cli.ts`
- `src/parser/pdf-parser.ts`
- `src/classifier/font-analyzer.ts`
- `src/classifier/block-classifier.ts`
- `src/renderer/markdown-renderer.ts`
- new `src/config.ts`

Acceptance criteria:

- No hidden behavior depends on untracked constants buried inside functions.
- All pipeline options flow from one config object.
- Warnings are returned, not printed by deep modules.

### Phase 3: Renderer hardening and Markdown correctness

Priority: high

Goal:

- Make Markdown output more predictable and safer.

Implementation steps:

1. Add a renderer utility module for escaping text.
2. Define rules for:

   - paragraph text
   - heading text
   - list items
   - code block fences
   - inline code
3. Add a safe mode that escapes raw HTML and special Markdown syntax.
4. Add tests for:

   - backticks inside text
   - headings containing `#`
   - list markers inside normal paragraphs
   - code blocks that already contain triple backticks
   - raw HTML in source text

Possible implementation detail:

- Keep a string renderer, but create a clear render contract around escaping.
- Only move to a Markdown AST if string-based rendering becomes too hard to reason about.

Suggested file changes:

- `src/renderer/markdown-renderer.ts`
- new `src/renderer/escape.ts`
- tests for renderer behavior

Acceptance criteria:

- Output is valid Markdown for covered edge cases.
- Safe mode and preserve mode both exist and are tested.

### Phase 4: Classification quality improvements

Priority: medium

Goal:

- Improve actual conversion quality without turning the code into a hard-to-maintain heuristic mess.

Implementation steps:

1. Improve line assembly:

   - handle spacing between separate text items more intelligently
   - reduce false merges caused by loose Y thresholds
1. Improve code block detection:

   - do not rely only on “all monospace”
   - consider indentation, alignment, and neighboring lines
1. Improve heading detection:

   - combine size, style, and isolation heuristics
   - avoid promoting large body text to headings
1. Improve list detection:

   - support continuation lines
   - preserve nesting indentation
1. Improve paragraph joining:

   - better handling of hyphenation and wrapped lines

Suggested file changes:

- `src/classifier/block-classifier.ts`
- `src/classifier/font-analyzer.ts`
- possibly new modules under `src/classifier/`

Acceptance criteria:

- Fixture quality improves measurably on at least 5 representative PDFs.
- New heuristics are covered by regression tests.

### Phase 5: Packaging, linting, and release quality

Priority: medium

Goal:

- Make the project easier to trust and maintain.

Implementation steps:

1. Add ESLint.
2. Add CI for:

   - build
   - test
   - lint
3. Add `engines.node` to `package.json`.
4. Add release notes or a simple changelog process.
5. Add CONTRIBUTING guidance describing fixture-based testing.

Suggested file changes:

- `package.json`
- new `.github/workflows/ci.yml`
- new ESLint config
- `README.md`
- optional `CONTRIBUTING.md`

Acceptance criteria:

- Pull requests fail if build, lint, or tests fail.
- Node version requirements are explicit.

## 9. Concrete File-Level Work Packets

These are suitable as separate subcontracting tasks.

### Work Packet 1: Safe CLI behavior

Scope:

- Prevent accidental file overwrite.
- Add `--stdout`.
- Add `--force`.

Files:

- `src/cli.ts`
- `README.md`
- tests

Definition of done:

- Input file is never overwritten by default.
- CLI help text documents new flags.
- Tests cover new behavior.

### Work Packet 2: Parser hardening

Scope:

- Review `pdfjs-dist` invocation.
- Add explicit parse options.
- Add file/page limits.

Files:

- `src/parser/pdf-parser.ts`
- `src/converter.ts`
- config module
- tests

Definition of done:

- Parser options are explicit and documented.
- Limits are enforced and test-covered.

### Work Packet 3: Structured config and result model

Scope:

- Centralize options.
- Return warnings and stats.

Files:

- `src/config.ts`
- `src/converter.ts`
- `src/cli.ts`
- tests

Definition of done:

- Conversion logic is driven by a typed config object.
- The CLI formats warnings cleanly.

### Work Packet 4: Markdown safety modes

Scope:

- Add `preserve` and `escape` output modes.
- Improve fence and inline escaping.

Files:

- `src/renderer/markdown-renderer.ts`
- new renderer helpers
- tests

Definition of done:

- Raw HTML and tricky Markdown cases are covered by tests.

### Work Packet 5: Heuristic quality upgrade

Scope:

- Improve classification logic without breaking prior behavior.

Files:

- `src/classifier/*`
- fixtures
- tests

Definition of done:

- Output quality improves on agreed fixtures.
- No regressions on existing fixtures.

### Work Packet 6: Tooling and CI

Scope:

- Add linting and CI.

Files:

- `package.json`
- lint config
- `.github/workflows/ci.yml`

Definition of done:

- Repository has a standard quality gate for future changes.

## 10. Suggested Test Plan

### Unit tests

Add unit tests for:

- font size histogram and heading map generation
- subset font prefix stripping
- monospace detection
- line grouping behavior
- list pattern handling
- language detection
- Markdown escaping helpers

### Integration tests

Use small fixture PDFs and expected `.md` outputs for:

- simple article/document
- document with headings and bullet lists
- code-heavy document
- scanned PDF with no text
- malformed or edge-case PDF

### CLI tests

Test:

- missing input file
- `--output`
- `--stdout`
- overwrite rejection
- `--force`
- page break mode
- forced language mode

## 11. Recommended Development Principles

These should be followed during improvement work:

- Keep parser code isolated from rendering code.
- Prefer pure functions where practical.
- Prefer explicit config over magic constants.
- Avoid adding many dependencies without strong justification.
- Add tests before changing heuristics in risky areas.
- Make safety defaults strict and opt out only via explicit flags.
- Preserve backwards compatibility where cheap, but prefer safe behavior over silent convenience.

## 12. What Not to Do

- Do not rewrite the project into a totally different architecture before tests exist.
- Do not replace `pdfjs-dist` immediately unless a specific parsing or security need justifies it.
- Do not add AI-based extraction as a first step.
- Do not pile on many CLI flags before the config model exists.
- Do not optimize performance before safety and correctness are under test.

## 13. Recommended Order of Execution for an LLM Contractor

If subcontracting this to an LLM, use this order:

1. Add test harness and fixtures.
2. Implement safe CLI behavior.
3. Introduce centralized config.
4. Harden parser settings and resource limits.
5. Add Markdown safety modes and renderer tests.
6. Refactor classifier heuristics with fixtures as regression checks.
7. Add linting and CI.

Each task should require:

- code changes
- tests
- README updates if behavior changes
- a short explanation of tradeoffs

## 14. Example LLM Task Prompt Template

Use a prompt like this for each work packet:

```text
You are modifying the `pdf-to-md` repository.

Task:
- Implement [WORK PACKET NAME].

Constraints:
- Keep changes scoped to this task only.
- Add or update tests for all behavior changes.
- Preserve existing behavior unless the brief explicitly asks for a safer default.
- Do not introduce unnecessary dependencies.

Required output:
- Code changes
- Tests
- README updates if needed
- Short summary of what changed and any open questions
```

## 15. Definition of Success

The project should be considered meaningfully improved when:

- It is safer to run on local machines.
- It is harder to misuse accidentally.
- It has enough automated coverage to support refactoring.
- The conversion pipeline is configurable and easier to reason about.
- Markdown output is more predictable and safer.
- The repository looks like a maintained tool rather than a one-shot prototype.