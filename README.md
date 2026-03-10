# pdf-to-md

CLI tool that converts PDF files to GitHub-flavored Markdown. Detects code blocks via monospace font analysis, headers via font size, and preserves bold/italic formatting — all programmatically without AI.

## Features

- **Code block detection** — identifies monospace fonts and wraps content in fenced code blocks with auto-detected language
- **Heading detection** — maps font sizes to `#`/`##`/`###` levels via character-count histogram
- **Inline formatting** — preserves **bold**, *italic*, and `inline code`
- **List detection** — recognizes bullet (`-`, `*`, `•`) and numbered (`1.`, `2)`) lists
- **Indentation preservation** — maintains code indentation using X-coordinate analysis
- **Scanned PDF warning** — detects empty text content and warns (OCR not supported)

## Installation

```bash
pnpm install
pnpm run build
```

## Usage

```bash
# Basic conversion (outputs input.md next to the PDF)
pnpm dev input.pdf

# Custom output path
pnpm dev input.pdf -o output.md

# Stream Markdown to stdout for shell pipelines
pnpm dev input.pdf --stdout

# Replace an existing output file intentionally
pnpm dev input.pdf -o output.md --force

# Insert horizontal rules between pages
pnpm dev input.pdf --page-breaks

# Force language for all code blocks
pnpm dev input.pdf --language python

# Fail fast on unexpectedly large files or documents
pnpm dev input.pdf --max-file-size-mb 10 --max-pages 50
```

After building, you can also run directly:

```bash
node bin/pdf-to-md.js input.pdf -o output.md
```

## How It Works

```
PDF buffer → pdfjs-dist parse → text items with font metadata
  → Font analysis (body size, heading map, monospace detection)
  → Block classification (heading / code / paragraph / list)
  → Markdown rendering → .md output
```

1. **PDF parsing** — extracts text items with position, font size, font family, bold/italic flags
2. **Font analysis** — builds a character-count histogram to find body font size; sizes above body become heading levels; monospace fonts are collected into a set
3. **Block classification** — groups items into lines by Y-coordinate proximity, then classifies each line as heading, code, list, or paragraph; consecutive lines of the same type merge into blocks
4. **Markdown rendering** — converts blocks to GFM with fenced code blocks, heading prefixes, inline formatting, and language auto-detection

## Language Auto-Detection

Code blocks are tagged with a language based on content heuristics:

| Pattern | Language |
|---|---|
| `#include` | `c` |
| `def` / `print()` | `python` |
| `System.out.print` | `java` |
| `function` / `const` | `javascript` |
| `fn` + `let mut` | `rust` |
| `func` + `fmt.Print` | `go` |
| `SELECT...FROM` | `sql` |
| HTML tags | `html` |
| `$` / `sudo` / `apt` | `bash` |

Override with `--language <lang>` to force a specific language on all code blocks.

## Limitations

- Single-column layout only (multi-column detection not supported)
- Scanned/image-based PDFs are not supported (no OCR)
- Language detection is heuristic-based and may not cover all languages

## Safety Defaults

- Rejects inputs without a `.pdf` extension unless `--allow-non-pdf` is provided
- Refuses to overwrite the input file or an existing output file unless `--force` is provided
- Supports `--stdout` to avoid accidental file writes in scripted workflows
- Enforces default file-size and page-count limits, configurable with `--max-file-size-mb` and `--max-pages`
