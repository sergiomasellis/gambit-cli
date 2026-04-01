# Repository Guidelines

Contributor notes for Gambit CLI—a Bun + TypeScript React CLI. Keep changes consistent, tested, and aligned with the architecture.

## Project Structure

Source in `src/` organized by feature:
- `agents/` - Agent definitions and runtime
- `app/` - Bootstrap and shell
- `conversation/` - Conversation state and runner
- `lib/` - Utilities
- `memory/` - Memory persistence
- `permissions/` - Permission system
- `repl/` - Interactive REPL
- `session/` - Session management
- `tasks/` - Background tasks
- `tools/` - Tool implementations
- `types/` - TypeScript definitions
- `ui/` - `@opentui/react` components
- `workboard/` - Workboard UI

Entry points: `src/index.tsx` (dev) and `src/gambit.tsx` (CLI binary). Configuration: `tsconfig.json`, `package.json`. Use `.env` for secrets (not committed).

## Build & Run

- `bun install` — install dependencies
- `bun run src/index.tsx` — start dev UI/CLI
- `bun run src/gambit.tsx` — run standalone CLI
- `bun test` — all tests; add a path to run one file
- `bun run tsc --noEmit` — type-check

## Coding Style

TypeScript strict mode. Conventions:
- 2-space indent; single quotes; trailing commas on multiline
- `camelCase` for variables/functions; `PascalCase` for components/types; `kebab-case` for files
- Imports: built-ins (`node:`), externals, then local (relative within `src/`)
- Prefer explicit type annotations on public APIs
- Prefer `async/await`; `try/catch` with clear errors
- Functional React components with hooks; use `@opentui/react`

## Testing

Bun test runner with co-located `.test.ts` files.
- Use `beforeEach`/`afterEach` for setup/teardown
- Cover unit logic and tool/permission integrations
- Run tests locally before pushing

## Commits & PRs

Follow Conventional Commits: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`
- Keep commits small and focused
- PRs include: clear description, linked issues (`Fixes #123`), screenshots for UI changes, and passing tests/type-check
- Small changes may merge directly; larger PRs need review

## Security Tips

- Never commit secrets; use `.env`
- Tools/agents must declare and honor minimal permissions
- Handle user data and network calls carefully; add tests when changing permission logic