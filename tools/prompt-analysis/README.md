# Claude Code Prompt Analysis Tool

Extracts prompts from Claude Code session history and generates a detailed Markdown report with prompt classification, timing, token usage, and work stretch analysis.

## Requirements

- Python 3.9+
- No external dependencies (stdlib only)
- Git (for commit information)

## Usage

```bash
# Analyze the current project (run from project root)
python3 tools/prompt-analysis/analyze.py

# Analyze a specific project
python3 tools/prompt-analysis/analyze.py --project /path/to/project

# Filter by date range
python3 tools/prompt-analysis/analyze.py --since 2026-03-04 --until 2026-03-06

# Save to file
python3 tools/prompt-analysis/analyze.py -o PROMPT_ANALYSIS_REPORT.md

# Custom report title
python3 tools/prompt-analysis/analyze.py --title "Sprint 1 Analysis" -o report.md

# Specify session directory manually
python3 tools/prompt-analysis/analyze.py --session-dir ~/.claude/projects/-Users-me-myproject/
```

## Options

| Flag | Description |
|---|---|
| `--project`, `-p` | Path to the git project directory (default: `.`) |
| `--session-dir`, `-s` | Claude Code session directory (auto-detected from project path) |
| `--since` | Only include prompts after this date (YYYY-MM-DD) |
| `--until` | Only include prompts before this date (YYYY-MM-DD) |
| `--output`, `-o` | Output file path (default: stdout) |
| `--title`, `-t` | Report title (default: "Prompt Analysis Report") |

## How it works

### Session discovery

Claude Code stores session history in `~/.claude/projects/<folder-name>/` where `<folder-name>` is the absolute project path with `/` replaced by `-`. Each `.jsonl` file is one session containing all messages (user prompts, assistant responses, tool calls).

### Prompt extraction

1. Reads all `.jsonl` session files for the project
2. Filters to external user messages only (excludes tool results, permission prompts)
3. Removes non-substantive messages (confirmations, "Tool loaded.", etc.)
4. Deduplicates messages with identical timestamps

### Token counting

Tokens are extracted from the **first assistant API response** to each user prompt (the direct reply with `parentUuid` matching the user message). This includes:
- `input_tokens` (prompt tokens)
- `cache_creation_input_tokens` (new cache entries)
- `cache_read_input_tokens` (cache hits)

### Duration

Wall-clock time from the user prompt to the last assistant message before the next user prompt. This includes tool execution time, not just LLM inference.

### Classification

Prompts are classified using keyword heuristics into five categories:

| Category | Keywords/Patterns |
|---|---|
| **ARCH** (Architectural) | project structure, build system, database, deployment, CI/CD, migration |
| **FEAT** (Feature) | default category for new functionality, UI elements, game mechanics |
| **FIX** (Correctional) | bugs, errors, "doesn't work", "too small/large" |
| **LLM-ERR** (LLM Error) | "still not", "made it worse", "not satisfactory", "unchanged" |
| **ASK** (Clarifying) | questions ending in `?`, "how can I", "what is" |

### Work stretches

Continuous periods of activity separated by gaps > 30 minutes. Stretch end times extend to include the last git commit within 30 minutes of the final prompt.

## Report sections

1. **Overview** -- summary metrics (prompts, sessions, tokens, time)
2. **Category Breakdown** -- prompt counts and token usage by category
3. **Daily Breakdown** -- per-day statistics
4. **Work Stretches** -- activity periods with prompt lists (collapsed)
5. **Key Observations** -- auto-generated insights
6. **Methodology Notes** -- how metrics were computed
7. **All Prompts (Chronological)** -- every prompt with tokens/duration
