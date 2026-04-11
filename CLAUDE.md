@recall-stack/primer.md

# Claude Code Configuration - RuFlo V3

## Behavioral Rules (Always Enforced)

- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (*.md) or README files unless explicitly requested
- NEVER save working files, text/mds, or tests to the root folder
- Never continuously check status after spawning a swarm — wait for results
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files

## Memory System Behavior (Don't Act Stateless)

This repo has multiple memory layers. USE them — do not claim you'll "forget things" when the infrastructure exists.

**Layers, in order of durability:**

1. **`docs/PROJECT_JOURNAL.md`** — append-only decision ledger, plain markdown, unbreakable fallback. Read top entries at session start for any non-trivial task.
2. **`mcp__claude-flow__memory_*`** tools — structured fact storage with HNSW semantic search. Namespace: `project-kunjia-autos`. Use for patterns, decisions, constraints, preferences.
3. **`recall-stack/primer.md`** — current-state summary, auto-loaded via `@recall-stack/primer.md` import at the top of this file. Keep under 100 lines. Rewrite after each task.
4. **`CLAUDE.md`** files (this one + `recall-stack/CLAUDE.md`) — permanent rules and behavioral contracts.

**Rules (apply every session):**

- BEFORE any non-trivial work: read the top 2-3 entries of `docs/PROJECT_JOURNAL.md` + the loaded primer.md
- AFTER any non-trivial decision: append a new `## YYYY-MM-DD — Topic` entry to `docs/PROJECT_JOURNAL.md` (newest first, reverse chronological)
- AFTER a task: rewrite `recall-stack/primer.md` with current state (active project, completed this session, exact next step, open blockers, key knowledge)
- FOR structured facts (architectural decisions, patterns, constraints, preferences): call `mcp__claude-flow__memory_store` with namespace `project-kunjia-autos` and meaningful tags
- FOR searching prior decisions: call `mcp__claude-flow__memory_search` before asking the user "did we decide X?"
- If a layer is unavailable, fall through to the next: MCP → journal → primer.md → CLAUDE.md

**Known broken layers (2026-04-11, fix deferred):**

- `@claude-flow/memory` npm package not installed → `auto-memory-hook.mjs` skips its import/sync. MCP `memory_*` tools still work independently (HNSW backend is sql.js-based, doesn't need the package).
- `.claude-flow/data/pending-insights.jsonl` writes garbage (`file:"unknown"`, `sessionId:null`) — hook stdin parsing is broken. Do not rely on it.
- `session.restore()` prints "No session to restore" even when session JSONs exist. Investigate in a separate focused pass.

## File Organization

- NEVER save to root folder — use the directories below
- Use `/src` for source code files
- Use `/tests` for test files
- Use `/docs` for documentation and markdown files
- Use `/config` for configuration files
- Use `/scripts` for utility scripts
- Use `/examples` for example code

## Project Architecture

- Follow Domain-Driven Design with bounded contexts
- Keep files under 500 lines
- Use typed interfaces for all public APIs
- Prefer TDD London School (mock-first) for new code
- Use event sourcing for state changes

## Frontend Design System

- **Read [`kun-auto-chatbot/docs/DESIGN.md`](kun-auto-chatbot/docs/DESIGN.md) before any UI work**
- Defines tokens, typography (Inter + Noto Sans TC), components, vehicle-card patterns
- Adapted from VoltAgent's BMW DESIGN.md, rebuilt around shadcn/ui + Tailwind v4 + oklch tokens
- **Tokens, not hex codes**: use `bg-primary`, `text-foreground`, never `bg-[#1c69d4]`
- **Single accent**: deep navy is the only chromatic color — never introduce a second hue
- **Always `tabular-nums`** on prices and mileage
- **10px radius** on cards/buttons (softer than BMW's 0px — Taiwanese local-business warmth)
- If `DESIGN.md` and `client/src/index.css` disagree, `index.css` wins — update the doc
- Ensure input validation at system boundaries

### Project Config

- **Topology**: hierarchical-mesh
- **Max Agents**: 15
- **Memory**: hybrid
- **HNSW**: Enabled
- **Neural**: Enabled

## Build & Test

```bash
# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

- ALWAYS run tests after making code changes
- ALWAYS verify build succeeds before committing

## Security Rules

- NEVER hardcode API keys, secrets, or credentials in source files
- NEVER commit .env files or any file containing secrets
- Always validate user input at system boundaries
- Always sanitize file paths to prevent directory traversal
- Run `npx @claude-flow/cli@latest security scan` after security-related changes

## Concurrency: 1 MESSAGE = ALL RELATED OPERATIONS

- All operations MUST be concurrent/parallel in a single message
- Use Claude Code's Task tool for spawning agents, not just MCP
- ALWAYS batch ALL todos in ONE TodoWrite call (5-10+ minimum)
- ALWAYS spawn ALL agents in ONE message with full instructions via Task tool
- ALWAYS batch ALL file reads/writes/edits in ONE message
- ALWAYS batch ALL Bash commands in ONE message

## Swarm Orchestration

- MUST initialize the swarm using CLI tools when starting complex tasks
- MUST spawn concurrent agents using Claude Code's Task tool
- Never use CLI tools alone for execution — Task tool agents do the actual work
- MUST call CLI tools AND Task tool in ONE message for complex work

### 3-Tier Model Routing (ADR-026)

| Tier | Handler | Latency | Cost | Use Cases |
|------|---------|---------|------|-----------|
| **1** | Agent Booster (WASM) | <1ms | $0 | Simple transforms (var→const, add types) — Skip LLM |
| **2** | Haiku | ~500ms | $0.0002 | Simple tasks, low complexity (<30%) |
| **3** | Sonnet/Opus | 2-5s | $0.003-0.015 | Complex reasoning, architecture, security (>30%) |

- Always check for `[AGENT_BOOSTER_AVAILABLE]` or `[TASK_MODEL_RECOMMENDATION]` before spawning agents
- Use Edit tool directly when `[AGENT_BOOSTER_AVAILABLE]`

## Swarm Configuration & Anti-Drift

- ALWAYS use hierarchical topology for coding swarms
- Keep maxAgents at 6-8 for tight coordination
- Use specialized strategy for clear role boundaries
- Use `raft` consensus for hive-mind (leader maintains authoritative state)
- Run frequent checkpoints via `post-task` hooks
- Keep shared memory namespace for all agents

```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized
```

## Swarm Execution Rules

- ALWAYS use `run_in_background: true` for all agent Task calls
- ALWAYS put ALL agent Task calls in ONE message for parallel execution
- After spawning, STOP — do NOT add more tool calls or check status
- Never poll TaskOutput or check swarm status — trust agents to return
- When agent results arrive, review ALL results before proceeding

## V3 CLI Commands

### Core Commands

| Command | Subcommands | Description |
|---------|-------------|-------------|
| `init` | 4 | Project initialization |
| `agent` | 8 | Agent lifecycle management |
| `swarm` | 6 | Multi-agent swarm coordination |
| `memory` | 11 | AgentDB memory with HNSW search |
| `task` | 6 | Task creation and lifecycle |
| `session` | 7 | Session state management |
| `hooks` | 17 | Self-learning hooks + 12 workers |
| `hive-mind` | 6 | Byzantine fault-tolerant consensus |

### Quick CLI Examples

```bash
npx @claude-flow/cli@latest init --wizard
npx @claude-flow/cli@latest agent spawn -t coder --name my-coder
npx @claude-flow/cli@latest swarm init --v3-mode
npx @claude-flow/cli@latest memory search --query "authentication patterns"
npx @claude-flow/cli@latest doctor --fix
```

## Available Agents (60+ Types)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Specialized
`security-architect`, `security-auditor`, `memory-specialist`, `performance-engineer`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`

### GitHub & Repository
`pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`

## Memory Commands Reference

```bash
# Store (REQUIRED: --key, --value; OPTIONAL: --namespace, --ttl, --tags)
npx @claude-flow/cli@latest memory store --key "pattern-auth" --value "JWT with refresh" --namespace patterns

# Search (REQUIRED: --query; OPTIONAL: --namespace, --limit, --threshold)
npx @claude-flow/cli@latest memory search --query "authentication patterns"

# List (OPTIONAL: --namespace, --limit)
npx @claude-flow/cli@latest memory list --namespace patterns --limit 10

# Retrieve (REQUIRED: --key; OPTIONAL: --namespace)
npx @claude-flow/cli@latest memory retrieve --key "pattern-auth" --namespace patterns
```

## Quick Setup

```bash
claude mcp add claude-flow -- npx -y @claude-flow/cli@latest
npx @claude-flow/cli@latest daemon start
npx @claude-flow/cli@latest doctor --fix
```

## Claude Code vs CLI Tools

- Claude Code's Task tool handles ALL execution: agents, file ops, code generation, git
- CLI tools handle coordination via Bash: swarm init, memory, hooks, routing
- NEVER use CLI tools as a substitute for Task tool agents

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
