#!/usr/bin/env python3
"""
Claude Code Prompt Analysis Tool

Extracts prompts from Claude Code session JSONL files and generates a
detailed Markdown report with classification, timing, and token usage.

Usage:
    python3 analyze.py [options]

See README.md for full documentation.
"""

import json
import os
import sys
import glob
import re
import subprocess
import argparse
import hashlib
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from collections import defaultdict, Counter
from pathlib import Path

# ── Filtering ──────────────────────────────────────────────────────────

SKIP_CONTENT = {
    'Tool loaded.', 'clear', 'y', 'Y', 'yes', 'Yes', 'no', 'No', 'n', 'N',
    'ok', 'OK', 'Ok', 'continue', 'Continue',
}

SKIP_PATTERNS = [
    re.compile(r'^\[Request interrupted'),
    re.compile(r'^<local-command-caveat>.*</local-command-caveat>\s*$', re.DOTALL),
]


is_substantive = lambda content: (
    bool(content and content.strip())
    and content.strip() not in SKIP_CONTENT
    and len(content.strip()) > 2
    and not any(p.match(content.strip()) for p in SKIP_PATTERNS)
)


# ── Classification ─────────────────────────────────────────────────────

CATEGORIES = ['VISION', 'FEAT', 'REFINE', 'BUG', 'CORR', 'ASK', 'PROC']

# Labels and descriptions used in the report
CATEGORY_INFO = {
    'VISION': {
        'label': 'Vision',
        'description': 'High-level design direction -- proposing how the system should be structured, '
                       'choosing technologies, patterns, or major design approaches.',
    },
    'FEAT': {
        'label': 'Feature',
        'description': 'Concrete functionality request -- asking for a specific behavior, UI element, '
                       'or content change to be implemented.',
    },
    'REFINE': {
        'label': 'Refinement',
        'description': 'Iterative adjustment -- fine-tuning something that already works but needs '
                       'polish. Tweaking sizes, positions, colors, wording.',
    },
    'BUG': {
        'label': 'Bug Report',
        'description': 'Something is broken -- reporting unexpected behavior, errors, or crashes '
                       'NOT caused by the AI\'s immediately preceding response.',
    },
    'CORR': {
        'label': 'Correction',
        'description': 'AI output was wrong -- telling the AI its previous response didn\'t work '
                       'or was unsatisfactory. The user tried the AI\'s suggestion and it failed.',
    },
    'ASK': {
        'label': 'Question',
        'description': 'Information request -- asking a question without requesting a code change.',
    },
    'PROC': {
        'label': 'Process',
        'description': 'Development workflow noise -- commits, pushes, CI, session continuations, '
                       '/clear, pasted output without commentary. Filtered from substantive counts.',
    },
}

CATEGORY_ORDER = ['VISION', 'FEAT', 'REFINE', 'BUG', 'CORR', 'ASK', 'PROC']

CLASSIFICATION_PROMPT = """\
You are classifying prompts that a developer sent to an AI coding assistant during a software project.

Classify each prompt into exactly ONE of these categories:

- **VISION**: High-level design direction — proposing how the system SHOULD be structured, \
choosing technologies, patterns, or major design approaches. The user is thinking about \
system organization, not asking for a specific feature. \
Examples: "let's use pnpm", "tiles should be class instances with identity", \
"the architecture is wrong, we should restructure X", "implement the following plan: [design doc]".

- **FEAT**: Concrete functionality request — asking for a specific behavior, UI element, \
or content change. The bulk of normal development work. \
Examples: "add a shuffle button", "the challenge button should only show when submit is not shown", \
"remove all games that have Alice as player", "implement dark mode".

- **REFINE**: Iterative adjustment — fine-tuning something that already works but needs polish. \
NOT broken, just not quite right yet. Tweaking sizes, positions, colors, wording. \
Examples: "letters: down and right a little", "the arrow should be bigger", "slightly smaller font", \
"the offset should be larger in the y axis".

- **BUG**: Something is broken — reporting unexpected behavior, errors, or crashes that are \
NOT caused by the AI's immediately preceding response. The user discovered a pre-existing problem. \
Examples: "I get 'loading game' and nothing happens", "takebackTiles does not work", \
"when I click X, I get error Y", pasting error output WITH a request to fix.

- **CORR**: AI output was wrong — the user tells the AI its previous response didn't work \
or was unsatisfactory. The key signal: the user JUST tried the AI's suggestion and is reporting back. \
Keywords: "still", "not right", "not satisfactory", "made it worse", "unchanged", "revert that", \
"that didn't work", "that broke". \
Examples: "still not right", "the letters are still too small", "this made it worse".

- **ASK**: Information request — asking a question without requesting a code change. \
Examples: "how can I get the player links?", "what do we need the gameCache for?", \
"why don't we have cascading delete constraints?".

- **PROC**: Development workflow noise — commits, pushes, formatting, CI observation, \
session continuations, /clear commands, "wait for ci", "commit and push", clipboard pastes of \
error output without commentary. NOT substantive development work.

Important rules:
- If a prompt mixes process noise with substance ("commit, then add feature X"), \
classify by the SUBSTANTIVE part (FEAT in this case), NOT as PROC.
- "This session is being continued from a previous conversation" → PROC
- Pasting error output without commentary or request → PROC
- Pasting error output WITH a request to fix → BUG
- "the architecture is wrong, we should restructure X" → VISION (proposing design change)
- "remove all games from the database that have Alice" → FEAT (performing a specific action)
- "letters need to be shifted up a little" → REFINE (polish, not broken)
- "the letters are still too small" after AI tried to fix → CORR (AI's fix didn't work)

Respond with a JSON array of category strings, one per prompt. \
Example: ["FEAT", "VISION", "PROC"]
Do not include any other text, just the JSON array."""


def call_api_with_retry(req_factory, max_retries=10):
    """Call the API, retrying on rate limits with exponential backoff.

    Args:
        req_factory: callable that returns a fresh urllib.request.Request
        max_retries: maximum number of retries

    Returns:
        parsed JSON response
    """
    for attempt in range(max_retries):
        req = req_factory()
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                retry_after = e.headers.get('retry-after')
                wait = int(retry_after) if retry_after else min(2 ** attempt, 60)
                print(f"  Rate limited, waiting {wait}s (attempt {attempt + 1}/{max_retries})...", file=sys.stderr)
                time.sleep(wait)
            else:
                raise
    raise RuntimeError(f"API call failed after {max_retries} retries")


def classify_prompts_llm(prompts, api_key, batch_size=30):
    """Classify prompts using Claude Haiku API with retry on rate limits."""
    classifications = {}
    batches = [prompts[i:i + batch_size] for i in range(0, len(prompts), batch_size)]

    for batch_idx, batch in enumerate(batches):
        print(f"  Classifying batch {batch_idx + 1}/{len(batches)} ({len(batch)} prompts)...", file=sys.stderr)

        prompt_lines = []
        for i, p in enumerate(batch):
            preview = p['content'][:300].replace('\n', ' ').strip()
            prompt_lines.append(f"{i + 1}. {preview}")

        user_content = f"Classify these {len(batch)} prompts:\n\n" + "\n\n".join(prompt_lines)
        request_body = json.dumps({
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": user_content}],
            "system": CLASSIFICATION_PROMPT,
        }).encode('utf-8')

        make_req = lambda body=request_body: urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=body,
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
            method="POST",
        )

        result = call_api_with_retry(make_req)

        text = ""
        for block in result.get("content", []):
            if block.get("type") == "text":
                text += block.get("text", "")

        match = re.search(r'\[.*\]', text, re.DOTALL)
        if not match:
            raise RuntimeError(f"Could not parse LLM response for batch {batch_idx + 1}: {text[:200]}")
        cats = json.loads(match.group())

        for i, p in enumerate(batch):
            p_hash = hashlib.md5(p['content'][:500].encode()).hexdigest()
            if i < len(cats) and cats[i] in CATEGORIES:
                classifications[p_hash] = cats[i]
            else:
                raise RuntimeError(
                    f"Invalid classification for prompt {i + 1} in batch {batch_idx + 1}: "
                    f"got {cats[i] if i < len(cats) else 'MISSING'}"
                )

    return classifications


def classify_prompt_heuristic(content):
    """Classify a prompt using keyword heuristics (fallback)."""
    cl = content.lower()

    # Correction - AI's previous output was wrong
    for p in ['still not', 'still wrong', 'still too', 'still the same', 'still broken',
              'made it worse', 'not satisfactory', 'not close enough', 'this made it worse',
              'that broke', 'still shows', 'still appears', 'still has', 'still displays',
              'unchanged', 'no change', 'no effect', 'no visible effect',
              'that\'s wrong', 'that is wrong', 'that did not', 'that didn\'t',
              'not right', 'not correct']:
        if p in cl:
            return 'CORR'

    # Process noise
    for p in ['commit and push', 'commit, push', 'push and observe', 'wait for ci',
              'this session is being continued', '<command-name>/clear',
              '<command-name>/rate', '<local-command-stdout>']:
        if p in cl:
            return 'PROC'

    # Questions
    if cl.strip().endswith('?'):
        return 'ASK'
    for p in ['how can i', 'how do i', 'how does', 'what is', 'what are',
              'what do we need', 'remind me how']:
        if cl.startswith(p):
            return 'ASK'

    # Vision - high-level design
    for p in ['implement the following plan', 'software architect', 'moderniz',
              'restructure', 'the architecture', 'refactor', 'should be class']:
        if p in cl:
            return 'VISION'

    # Bug reports
    for p in ['bug', 'broken', 'error', 'crash', 'cannot', 'can\'t',
              'does not work', 'doesn\'t work']:
        if p in cl:
            return 'BUG'

    # Refinement - tweaking working things
    for p in ['slightly', 'a little', 'a bit', 'move it', 'shift', 'bigger',
              'smaller', 'closer to', 'further', 'adjust']:
        if p in cl:
            return 'REFINE'

    return 'FEAT'


def load_classification_cache(cache_path):
    """Load cached classifications from disk."""
    if os.path.exists(cache_path):
        try:
            with open(cache_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {}


def save_classification_cache(cache_path, cache):
    """Save classifications cache to disk."""
    with open(cache_path, 'w') as f:
        json.dump(cache, f, indent=2)


def classify_all_prompts(prompts, api_key=None, cache_path=None):
    """Classify all prompts, using cache and LLM where available."""
    cache = load_classification_cache(cache_path) if cache_path else {}

    # Check which prompts need classification
    uncached = []
    for p in prompts:
        p_hash = hashlib.md5(p['content'][:500].encode()).hexdigest()
        if p_hash in cache:
            p['category'] = cache[p_hash]
        else:
            uncached.append(p)

    if uncached and api_key:
        print(f"Classifying {len(uncached)} prompts with LLM ({len(prompts) - len(uncached)} cached)...", file=sys.stderr)
        new_classifications = classify_prompts_llm(uncached, api_key)
        cache.update(new_classifications)
        for p in uncached:
            p_hash = hashlib.md5(p['content'][:500].encode()).hexdigest()
            p['category'] = cache[p_hash]
    elif uncached:
        if not api_key:
            print("Error: ANTHROPIC_API_KEY required for classification. Use --no-llm for heuristic fallback.", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"All {len(prompts)} prompts found in cache.", file=sys.stderr)

    if cache_path:
        save_classification_cache(cache_path, cache)


# ── Extraction ─────────────────────────────────────────────────────────

def extract_prompts(session_dir, project_dir=None, since=None, until=None):
    """Extract all substantive prompts from session JSONL files.

    Args:
        session_dir: Path to Claude Code session directory
        project_dir: Path to git project directory (for commit info)
        since: Only include prompts after this date (YYYY-MM-DD)
        until: Only include prompts before this date (YYYY-MM-DD)

    Returns:
        (prompts, total_sessions, commits)
    """
    since_dt = datetime.fromisoformat(f"{since}T00:00:00+00:00") if since else None
    until_dt = datetime.fromisoformat(f"{until}T23:59:59+00:00") if until else None

    all_prompts = []
    session_ids = set()

    for jsonl_file in sorted(glob.glob(os.path.join(session_dir, "*.jsonl"))):
        session_id = os.path.basename(jsonl_file).replace(".jsonl", "")
        session_ids.add(session_id)

        lines = []
        try:
            with open(jsonl_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            lines.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue
        except Exception:
            continue

        # Find external user message indices
        ext_user_indices = []
        for i, msg in enumerate(lines):
            if msg.get('type') != 'user' or msg.get('userType') != 'external':
                continue
            content = msg.get('message', {}).get('content', '')
            if isinstance(content, list):
                parts = []
                for b in content:
                    if isinstance(b, dict) and b.get('type') == 'text':
                        parts.append(b.get('text', ''))
                    elif isinstance(b, str):
                        parts.append(b)
                content = ' '.join(parts)
            ext_user_indices.append((i, msg, content.strip()))

        for idx, (line_idx, msg, content) in enumerate(ext_user_indices):
            if not is_substantive(content):
                continue

            ts_str = msg.get('timestamp', '')
            try:
                ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            except ValueError:
                continue

            if since_dt and ts < since_dt:
                continue
            if until_dt and ts > until_dt:
                continue

            uuid = msg.get('uuid', '')

            # Boundary: next external user message
            next_line_idx = ext_user_indices[idx + 1][0] if idx + 1 < len(ext_user_indices) else len(lines)

            # Tokens: first direct assistant response only
            total_input = 0
            total_output = 0
            model = None
            found_first = False

            for j in range(line_idx + 1, next_line_idx):
                m = lines[j]
                if m.get('type') == 'assistant' and m.get('parentUuid') == uuid:
                    usage = m.get('message', {}).get('usage', {})
                    total_input += usage.get('input_tokens', 0)
                    total_input += usage.get('cache_creation_input_tokens', 0)
                    total_input += usage.get('cache_read_input_tokens', 0)
                    total_output += usage.get('output_tokens', 0)
                    if not model:
                        model = m.get('message', {}).get('model', '')
                    found_first = True
                elif found_first and m.get('type') == 'assistant' and m.get('parentUuid') != uuid:
                    break

            # Duration: last assistant response in turn
            last_resp_ts = ts
            for j in range(line_idx + 1, next_line_idx):
                m = lines[j]
                if m.get('type') == 'assistant':
                    try:
                        resp_ts = datetime.fromisoformat(m.get('timestamp', '').replace('Z', '+00:00'))
                        if resp_ts > last_resp_ts:
                            last_resp_ts = resp_ts
                    except ValueError:
                        pass

            all_prompts.append({
                'timestamp': ts,
                'content': content,
                'session_id': session_id,
                'input_tokens': total_input,
                'output_tokens': total_output,
                'duration_s': (last_resp_ts - ts).total_seconds(),
                'model': model or 'unknown',
            })

    all_prompts.sort(key=lambda p: p['timestamp'])

    # Deduplicate (same timestamp + same content prefix)
    deduped = []
    for i, p in enumerate(all_prompts):
        if i > 0:
            prev = all_prompts[i - 1]
            if (abs((p['timestamp'] - prev['timestamp']).total_seconds()) < 1
                    and p['content'][:50] == prev['content'][:50]):
                continue
        deduped.append(p)

    # Git commits - derive date range from prompts if not specified
    commits = []
    if project_dir and deduped:
        git_since = since or deduped[0]['timestamp'].strftime('%Y-%m-%d')
        git_until = until or deduped[-1]['timestamp'].strftime('%Y-%m-%d')
        # Add one day to until for git's exclusive upper bound
        until_dt_git = datetime.fromisoformat(f"{git_until}T00:00:00") + timedelta(days=1)
        git_args = ['git', 'log', '--format=%H|%aI|%s',
                    '--since', git_since,
                    '--until', until_dt_git.strftime('%Y-%m-%d')]
        try:
            result = subprocess.run(git_args, capture_output=True, text=True, cwd=project_dir)
            for line in result.stdout.strip().split('\n'):
                if '|' in line:
                    parts = line.split('|', 2)
                    try:
                        cts = datetime.fromisoformat(parts[1])
                        if cts.tzinfo is None:
                            cts = cts.replace(tzinfo=timezone.utc)
                        commits.append({'hash': parts[0][:7], 'timestamp': cts, 'message': parts[2]})
                    except ValueError:
                        pass
        except Exception:
            pass

    return deduped, len(session_ids), commits


# ── Work Stretches ─────────────────────────────────────────────────────

def compute_stretches(prompts, commits, gap_minutes=30):
    if not prompts:
        return []

    stretches = []
    current = [prompts[0]]
    for p in prompts[1:]:
        if (p['timestamp'] - current[-1]['timestamp']).total_seconds() / 60 > gap_minutes:
            stretches.append(current)
            current = [p]
        else:
            current.append(p)
    stretches.append(current)

    result = []
    for stretch in stretches:
        start = stretch[0]['timestamp']
        end = stretch[-1]['timestamp']
        s_commits = []
        for c in commits:
            if start - timedelta(minutes=5) <= c['timestamp'] <= end + timedelta(minutes=30):
                s_commits.append(c)
                if c['timestamp'] > end:
                    end = c['timestamp']
        result.append({'prompts': stretch, 'start': start, 'end': end, 'commits': s_commits})
    return result


# ── Helpers ────────────────────────────────────────────────────────────

def fmt_dur(s):
    if s < 60:
        return f"{int(s)}s"
    m = s / 60
    if m < 60:
        return f"{int(m)} min"
    h, mins = int(m // 60), int(m % 60)
    return f"{h}h {mins}min" if mins else f"{h}h"


def detect_activities(prompts_in_stretch):
    keywords = {
        'tile rendering/positioning': ['tile', 'letter', 'font', 'size', 'position', 'align', 'value', 'subscript'],
        'drag & drop': ['drag', 'drop', 'dnd', 'dragging', 'dropping', 'shadow tile'],
        'board display': ['board', 'square', 'label', 'multiplier', 'grid'],
        'rack behavior': ['rack', 'shuffle', 'rearrang', 'slot'],
        'game logic': ['game', 'move', 'score', 'turn', 'pass', 'swap', 'challenge', 'validate'],
        'lobby/game list': ['lobby', 'game list', 'active games', 'waiting'],
        'data migration': ['migration', 'migrate', 'import', 'data.db', 'backfill'],
        'database/persistence': ['database', 'postgres', 'drizzle', 'persist', 'schema', 'query'],
        'authentication': ['auth', 'login', 'magic link', 'jwt', 'player link'],
        'chat': ['chat', 'message'],
        'move log': ['move log', 'history'],
        'keyboard input': ['keyboard', 'cursor', 'key press', 'arrow key'],
        'visual polish': ['color', 'style', 'css', 'design', 'background', 'woodgrain', 'responsive'],
        'deployment': ['deploy', 'ci', 'github actions', 'freebsd', 'rc.d', 'service'],
        'statistics': ['stats', 'statistic', 'comparison', 'direktvergleich', 'best word'],
        'i18n': ['i18n', 'translat', 'german', 'english', 'language'],
        'mobile': ['mobile', 'touch', 'viewport'],
        'notifications': ['reminder', 'notification', 'timeout'],
        'spectator mode': ['spectator', 'spectating'],
        'scoreboard': ['scoreboard', 'score board', 'player name'],
    }
    text = ' '.join(p['content'].lower() for p in prompts_in_stretch)
    scored = [(sum(1 for kw in kws if kw in text), name) for name, kws in keywords.items()]
    scored.sort(reverse=True)
    return [name for score, name in scored if score >= 1][:6]


# ── Report Generation ─────────────────────────────────────────────────

def generate_report(prompts, total_sessions, commits, title="Prompt Analysis Report"):
    # Separate PROC prompts
    process_prompts = [p for p in prompts if p.get('category') == 'PROC']
    substantive = [p for p in prompts if p.get('category') != 'PROC']

    stretches = compute_stretches(prompts, commits)  # Use all prompts for stretch timing
    total_session_s = sum((s['end'] - s['start']).total_seconds() for s in stretches)

    total_in = sum(p['input_tokens'] for p in substantive)
    total_out = sum(p['output_tokens'] for p in substantive)
    total_dur = sum(p['duration_s'] for p in substantive)

    cats = Counter(p['category'] for p in substantive)
    cat_in = defaultdict(int)
    cat_out = defaultdict(int)
    cat_durs = defaultdict(list)
    for p in substantive:
        c = p['category']
        cat_in[c] += p['input_tokens']
        cat_out[c] += p['output_tokens']
        cat_durs[c].append(p['duration_s'])

    daily = defaultdict(lambda: defaultdict(int))
    daily_in = defaultdict(int)
    daily_out = defaultdict(int)
    for p in substantive:
        d = p['timestamp'].strftime('%Y-%m-%d')
        daily[d][p['category']] += 1
        daily_in[d] += p['input_tokens']
        daily_out[d] += p['output_tokens']

    dates = sorted(set(p['timestamp'].strftime('%Y-%m-%d') for p in prompts))
    first_date, last_date = dates[0], dates[-1]

    models = Counter(p['model'] for p in prompts)
    primary_model = models.most_common(1)[0][0] if models else 'unknown'

    out = []
    out.append(f"# {title}\n")
    out.append("## Overview\n")
    out.append("| Metric | Value |")
    out.append("|---|---|")
    out.append(f"| Project period | {first_date} to {last_date} ({len(dates)} days) |")
    out.append(f"| Total session time | {fmt_dur(total_session_s)} (across {len(stretches)} work stretches) |")
    out.append(f"| Total sessions | {total_sessions} |")
    out.append(f"| Substantive prompts | {len(substantive)} |")
    out.append(f"| Process prompts (filtered) | {len(process_prompts)} |")
    out.append(f"| Git commits | {len(commits)} |")
    out.append(f"| Total input tokens | {total_in:,} (incl. cache) |")
    out.append(f"| Total output tokens | {total_out:,} |")
    out.append(f"| Total LLM response time | {fmt_dur(total_dur)} |")
    out.append(f"| Model | {primary_model} |")
    out.append("")

    # Category descriptions
    out.append("## Prompt Categories\n")
    sub_cats = [c for c in CATEGORY_ORDER if c != 'PROC']
    for c in CATEGORY_ORDER:
        info = CATEGORY_INFO[c]
        out.append(f"- **{info['label']} ({c}):** {info['description']}")
    out.append("")

    # Category breakdown
    out.append("## Prompt Category Breakdown\n")
    out.append("| Category | Count | % | Total In Tokens | Total Out Tokens | Avg Duration | Median Duration |")
    out.append("|---|---:|---:|---:|---:|---:|---:|")
    for c in sub_cats:
        if c not in cats:
            continue
        n = cats[c]
        ds = sorted(cat_durs[c])
        avg = sum(ds) / len(ds) if ds else 0
        med = ds[len(ds) // 2] if ds else 0
        out.append(f"| {CATEGORY_INFO[c]['label']} | {n} | {100 * n / len(substantive):.1f}% | {cat_in[c]:,} | {cat_out[c]:,} | {int(avg)}s | {int(med)}s |")
    out.append("")

    # Daily breakdown
    daily_cols = sub_cats
    header_labels = ' | '.join(CATEGORY_INFO[c]['label'] for c in daily_cols)
    out.append("## Daily Breakdown\n")
    out.append(f"| Date | {header_labels} | Total | Input Tokens | Output Tokens |")
    out.append("|---|" + "---:|" * (len(daily_cols) + 3))
    for d in sorted(daily.keys()):
        dd = daily[d]
        t = sum(dd.values())
        vals = ' | '.join(str(dd.get(c, 0)) for c in daily_cols)
        out.append(f"| {d} | {vals} | {t} | {daily_in[d]:,} | {daily_out[d]:,} |")
    out.append("")

    # Work stretches
    out.append("## Work Stretches\n")
    out.append("Work stretches are continuous periods of activity, separated by gaps of more than 30 minutes. End times are extended to include the last git commit within 30 minutes of the final prompt.\n")

    for i, s in enumerate(stretches):
        sp = s['prompts']
        sp_sub = [p for p in sp if p.get('category') != 'PROC']
        start_str = s['start'].strftime('%Y-%m-%d %H:%M')
        end_str = s['end'].strftime('%H:%M') if s['start'].date() == s['end'].date() else s['end'].strftime('%Y-%m-%d %H:%M')
        dur = fmt_dur((s['end'] - s['start']).total_seconds())
        sc = Counter(p['category'] for p in sp_sub)
        cat_parts = [f"{sc[c]} {c}" for c in CATEGORY_ORDER if c != 'PROC' and c in sc]
        n_process = len(sp) - len(sp_sub)

        out.append(f"### Stretch {i + 1}: {start_str} -- {end_str} ({dur}, {len(sp_sub)} prompts, {len(s['commits'])} commits)\n")
        prompt_type_str = ' | '.join(cat_parts)
        if n_process:
            prompt_type_str += f" | {n_process} PROC"
        out.append(f"**Prompt types:** {prompt_type_str}\n")
        acts = detect_activities(sp_sub)
        if acts:
            out.append(f"**Main activities:** {', '.join(acts)}\n")

        out.append("<details>")
        out.append(f"<summary>Show {len(sp)} prompts</summary>\n")
        for j, p in enumerate(sp):
            preview = p['content'][:300].replace('\n', ' ')
            suffix = ' [...]' if len(p['content']) > 300 else ''
            out.append(f"{j + 1}. **[{p['category']}]** {p['timestamp'].strftime('%Y-%m-%d %H:%M:%S')} -- {preview}{suffix}\n")
        out.append("</details>\n")

    # Key observations
    out.append("## Key Observations\n")
    feat_pct = 100 * cats.get('FEAT', 0) / len(substantive) if substantive else 0
    refine_pct = 100 * cats.get('REFINE', 0) / len(substantive) if substantive else 0
    corr_pct = 100 * (cats.get('BUG', 0) + cats.get('CORR', 0)) / len(substantive) if substantive else 0
    out.append(f"1. **Feature-dominant workflow:** {feat_pct:.0f}% of substantive prompts were feature requests, indicating rapid iterative development.")
    if cats.get('REFINE', 0):
        out.append(f"2. **Refinement effort:** {refine_pct:.0f}% of prompts were iterative polish (REFINE), showing significant time spent fine-tuning visual details.")
    out.append(f"3. **Correction overhead:** {corr_pct:.0f}% of prompts were bug reports or AI corrections (BUG + CORR), requiring the AI to revisit previous work.")
    out.append(f"4. **Intensive work pattern:** {len(substantive)} substantive prompts across {len(dates)} days averaging {len(substantive) // len(dates)} prompts/day.")
    out.append(f"5. **{len(commits)} commits** from {len(substantive)} prompts = ~{len(substantive) // max(len(commits), 1)} prompts per commit.")
    if process_prompts:
        out.append(f"6. **Process overhead:** {len(process_prompts)} prompts ({100 * len(process_prompts) / len(prompts):.0f}% of all) were development process noise (commits, pushes, CI, session management).")
    day1 = [p for p in substantive if p['timestamp'].strftime('%Y-%m-%d') == first_date]
    day1c = [c for c in commits if c['timestamp'].strftime('%Y-%m-%d') == first_date]
    out.append(f"7. **Day 1 ({first_date}):** {len(day1)} prompts, {len(day1c)} commits -- heaviest development day with initial setup and core features.")
    if 'CORR' in cats:
        out.append(f"8. **AI correction patterns:** {cats['CORR']} CORR prompts, often involving visual/CSS issues (tile sizing, font positioning, drag offsets) -- areas where LLMs typically struggle with pixel-perfect output.")
    out.append("")

    # Methodology
    out.append("## Methodology Notes\n")
    out.append("- **Classification** uses Claude Haiku via the Anthropic API. Each prompt is classified into one of 7 categories (see Prompt Categories above).")
    out.append("- Classifications are cached in `.prompt-classification-cache.json` to avoid redundant API calls.")
    out.append("- **Response duration** is wall-clock time from prompt to last assistant message, including tool execution.")
    out.append("- **Token counts** are from the first assistant API call per prompt, including prompt caching (cache creation + reads).")
    out.append("- **Work stretches** break on gaps > 30 minutes. Stretch end times are extended to include the last git commit within 30 minutes of the final prompt.")
    out.append("- **Total session time** is the sum of all work stretch durations (first prompt to last commit/prompt per stretch).")
    out.append("- **Filtered out:** Short confirmations, tool-loaded acknowledgements, and interrupted requests (pre-classification). PROC prompts are filtered from substantive counts but included in stretch timelines.")
    out.append("")

    # All prompts chronological
    out.append("## All Prompts (Chronological)\n")
    out.append("PROC prompts are included but marked; they are excluded from summary statistics.\n")
    prompt_num = 0
    for p in prompts:
        prompt_num += 1
        out.append(f"### {prompt_num}. [{p['category']}] {p['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}\n")
        out.append(f"**Tokens:** {p['input_tokens']:,} in / {p['output_tokens']:,} out | **Duration:** {int(p['duration_s'])}s\n")
        preview = p['content'][:500].replace('\n', ' ')
        out.append(f"> {preview}\n")

    return '\n'.join(out)


# ── CLI ────────────────────────────────────────────────────────────────

def resolve_session_dir(project_path):
    """Resolve the Claude Code session directory for a given project path."""
    abs_path = os.path.abspath(project_path)
    folder_name = abs_path.replace('/', '-')
    session_dir = os.path.expanduser(f"~/.claude/projects/{folder_name}")
    if os.path.isdir(session_dir):
        return session_dir
    return None


def main():
    parser = argparse.ArgumentParser(
        description='Analyze Claude Code session prompts and generate a report.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Analyze the current project (uses ANTHROPIC_API_KEY for LLM classification)
  python3 analyze.py

  # Analyze a specific project
  python3 analyze.py --project /path/to/project

  # Filter by date range
  python3 analyze.py --since 2026-03-04 --until 2026-03-06

  # Save to file
  python3 analyze.py -o report.md

  # Force heuristic classification (skip LLM)
  python3 analyze.py --no-llm

  # Clear classification cache and re-classify
  python3 analyze.py --no-cache
        """
    )
    parser.add_argument('--project', '-p', default='.', help='Path to the git project directory (default: current directory)')
    parser.add_argument('--session-dir', '-s', help='Path to Claude Code session directory (auto-detected if not provided)')
    parser.add_argument('--since', help='Only include prompts after this date (YYYY-MM-DD)')
    parser.add_argument('--until', help='Only include prompts before this date (YYYY-MM-DD)')
    parser.add_argument('--output', '-o', help='Output file path (default: stdout)')
    parser.add_argument('--title', '-t', default='Prompt Analysis Report', help='Report title')
    parser.add_argument('--no-llm', action='store_true', help='Use heuristic classification only (skip LLM)')
    parser.add_argument('--no-cache', action='store_true', help='Ignore classification cache and re-classify all prompts')

    args = parser.parse_args()

    project_dir = os.path.abspath(args.project)
    if not os.path.isdir(project_dir):
        print(f"Error: project directory not found: {project_dir}", file=sys.stderr)
        sys.exit(1)

    session_dir = args.session_dir
    if not session_dir:
        session_dir = resolve_session_dir(project_dir)
        if not session_dir:
            print(f"Error: could not find Claude Code session directory for {project_dir}", file=sys.stderr)
            print(f"Expected: ~/.claude/projects/{project_dir.replace('/', '-')}/", file=sys.stderr)
            sys.exit(1)

    if not os.path.isdir(session_dir):
        print(f"Error: session directory not found: {session_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Session directory: {session_dir}", file=sys.stderr)
    print(f"Project directory: {project_dir}", file=sys.stderr)

    prompts, total_sessions, commits = extract_prompts(
        session_dir, project_dir, since=args.since, until=args.until
    )

    if not prompts:
        print("No substantive prompts found.", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(prompts)} prompts across {total_sessions} sessions", file=sys.stderr)

    # Classification
    api_key = None
    if not args.no_llm:
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            key_file = os.path.expanduser('~/.anthropic-api-key')
            if os.path.exists(key_file):
                with open(key_file) as f:
                    api_key = f.read().strip()
        if api_key:
            print("Using Claude Haiku for classification.", file=sys.stderr)
        else:
            print("No API key found (checked ANTHROPIC_API_KEY env and ~/.anthropic-api-key).", file=sys.stderr)

    cache_path = os.path.join(project_dir, '.prompt-classification-cache.json')
    if args.no_cache and os.path.exists(cache_path):
        os.remove(cache_path)

    classify_all_prompts(prompts, api_key=api_key, cache_path=cache_path)

    substantive = [p for p in prompts if p.get('category') != 'PROC']
    print(f"Substantive: {len(substantive)}, Process: {len(prompts) - len(substantive)}", file=sys.stderr)

    report = generate_report(prompts, total_sessions, commits, title=args.title)

    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        print(f"Report written to {args.output}", file=sys.stderr)
    else:
        print(report)


if __name__ == '__main__':
    main()
