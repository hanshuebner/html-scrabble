# Prompt Classification System -- Analysis & Proposal

## Current LLM-based classification (Haiku)

After running Haiku on all 422 prompts, the distribution is:

| Category | Count | Notes |
|---|---:|---|
| FEAT | 104 | Feature requests |
| PROCESS | 134 | Dev noise (commits, session continuations, CLI commands) |
| FIX | 65 | Bug reports / issues |
| ASK | 58 | Questions |
| LLM-ERR | 31 | Correcting Claude's output |
| ARCH | 30 | Architectural decisions |

## Observations from manual review

### What works well
- **PROCESS** is now reliably catching session continuations, `/clear`, `/rate-limit-options`, commit/push requests, and pasted CLI output without commentary. This was the biggest improvement over pure heuristics.
- **LLM-ERR** is well-defined and consistently applied -- "still too small", "not satisfactory", "the letters are still not left aligned".
- **ARCH** correctly captures high-level design decisions like "the placement validation code should be shared between client and server" and "implement the following plan".

### What's ambiguous

1. **FIX vs LLM-ERR boundary**: When the user says "the rack should be centered under the board" -- is this a bug they discovered (FIX) or a correction of Claude's previous output (LLM-ERR)? Without conversational context, this is genuinely ambiguous. Haiku tends to classify these as FIX, which may over-count FIX and under-count LLM-ERR.

2. **FIX vs FEAT boundary**: "the letters on the board are too small" -- is this a bug report (FIX) or a feature refinement (FEAT)? When the user is iterating on visual appearance, these blur together. Haiku currently leans toward FIX for these, which inflates the FIX count.

3. **ASK is too broad**: Currently includes both genuine questions ("how can I import the game history?") and semi-rhetorical architectural questions ("why don't we have cascading delete constraints?") that are really requests for change. Also includes "chrome remote control should give you a screenshot to analyze" which is more of a directive.

4. **PROCESS may be over-capturing**: 134 of 422 (32%) seems high. Some prompts classified as PROCESS contain substantive requests wrapped in process noise, e.g. "commit, then implement X" should be FEAT, not PROCESS. The current prompt instructs Haiku to classify these as FEAT, but Haiku sometimes misses the substance.

## Proposed improved classification system

### Categories (7)

| Category | Code | Description | When to use |
|---|---|---|---|
| **Vision** | VISION | High-level design direction | User proposes how the system _should_ be structured, choosing technologies, patterns, or major design approaches. "Let's use pnpm", "tiles should be class instances", "implement the following plan". |
| **Feature** | FEAT | Concrete functionality request | User asks for a specific behavior, UI element, or content change. "Add a shuffle button", "the challenge button should only show when submit is not shown". |
| **Refinement** | REFINE | Iterative adjustment | User is fine-tuning something that already works but needs polish. "Letters: down and right a little", "the arrow should be bigger", "slightly smaller font size". Not broken, just not quite right yet. |
| **Bug Report** | BUG | Something is broken | User reports unexpected behavior, errors, or crashes that are NOT caused by the AI's previous response. "I get 'loading game' and nothing happens", "takebackTiles does not work". |
| **Correction** | CORR | AI's output was wrong | User tells the AI its previous response didn't work or was incorrect. "Still not right", "made it worse", "the letters are still not left aligned". The key signal is that the user tried the AI's suggestion and it failed. |
| **Question** | ASK | Information request | User asks a question without requesting a code change. "How can I get the player links?", "what do we need the gameCache for?". |
| **Process** | PROC | Development workflow noise | Commits, pushes, CI, session continuations, /clear, pasted output without commentary. If a prompt mixes process with substance ("commit, then add X"), classify by the substance. |

### Key differences from current system

1. **ARCH split into VISION + FEAT**: The current ARCH category mixes "let's restructure how tiles work" (vision) with "implement this specific plan" (really a large feature request). VISION captures the _thinking_ about design; the implementation is FEAT.

2. **FIX split into BUG + REFINE**: "The rack should be centered" is not a bug -- it's refinement of working functionality. Bugs are things that crash, error, or behave unexpectedly. This distinction matters for understanding how much time goes to fixing real problems vs. polish.

3. **LLM-ERR renamed to CORR**: More descriptive. The key signal is temporal: the user _already tried_ the AI's output and is reporting back. Without conversation history, this requires looking for phrases like "still", "not right", "revert", "that didn't work".

4. **PROCESS is stricter**: Mixed prompts ("commit, then do X") should be classified by their substantive content, not as PROCESS.

### Classification signals

For LLM-based classification, the prompt should emphasize these signals:

**VISION signals:** "should be", "let's", "we should", "propose", "plan", "architecture", "design", "restructure", "refactor to", "instead of X we should Y"

**FEAT signals:** "add", "implement", "make it", "change X to Y", "show/hide", "when X then Y", imperative verbs directing specific changes

**REFINE signals:** "slightly", "a little", "closer to", "bigger/smaller", "move X by", "adjust", "tweak", comparing to a reference, fine-tuning values

**BUG signals:** error messages, stack traces, "doesn't work", "I get [unexpected result]", "nothing happens", "crash", describing unexpected behavior

**CORR signals:** "still", "not right", "not satisfactory", "made it worse", "unchanged", "revert", "that didn't", reference to Claude's previous attempt

**ASK signals:** question marks, "how", "what", "why", "can we", "is it possible", seeking information without directing action

**PROC signals:** "commit", "push", "wait for ci", "/clear", session continuation headers, pasted terminal output with no request

### Context-aware improvement

The biggest accuracy gain would come from giving the classifier **conversational context** -- specifically, whether the previous prompt's response was accepted or rejected. This would disambiguate:
- REFINE vs CORR: "make the font bigger" after a successful change (REFINE) vs after a failed attempt (CORR)
- BUG vs CORR: "it doesn't work" about a pre-existing bug (BUG) vs about the AI's code (CORR)

This would require passing the previous prompt's category and a brief summary of the AI's response along with each prompt for classification.
