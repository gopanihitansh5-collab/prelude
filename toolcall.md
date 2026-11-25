# toolcall.md — what works in this workspace

Verified facts so tool calls don't have to be rediscovered each session.
Last verified: **2026-11-25 19:18 IST**.

---

## Paths

| Thing | Path |
| --- | --- |
| Workspace root | `C:\Users\rcgop\Desktop\work\G2_Glasses` |
| Project (npm root) | `C:\Users\rcgop\Desktop\work\G2_Glasses\prelude` |
| VS Code user settings | `%APPDATA%\Code\User\settings.json` |
| VS Code workspace storage | `%APPDATA%\Code\User\workspaceStorage\9318ed44a13dbe3579aa91ac0a432b13` |

Use **Windows backslash paths** in `powershell`. Use **forward slashes** in Markdown link targets.

---

## Shell

- Every `powershell` call is a **fresh process**. `Set-Location`, `$env:` changes, and
  virtualenv activations do **not** persist. Prefix each command with `cd "<path>";`.
- Chain dependent steps with `;` and gate with `if ($?) { ... }`.
- No `&&` / `||` / `??` — this is Windows PowerShell 5.1 compatible.
- No heredocs. For inline scripts use `@'` … `'@ | python -`.
- `git` writes progress to stderr, so PowerShell surfaces it as a red `NativeCommandError`
  even on success. Check `$LASTEXITCODE` instead of trusting the colour.
- Always disable pagers: `git --no-pager …`.

---

## File tools

| Tool | Use for | Notes |
| --- | --- | --- |
| `view` | reading | Fails on files > 20 KB — use `view_range` or `grep` first |
| `create` | **new** files only | Errors if the path exists |
| `edit` | existing files | `old_str` must match **exactly once**; include surrounding context |
| `grep` | searching | `output_mode: content` + `-n` for line numbers |

**Rule:** never `create` over an existing file. `view` it, then `edit`.

Files over 20 KB in this repo: `prelude/README.md` (20.4 KB), `research.md` (25 KB),
`randombuild.txt.txt` (17.8 KB — fine).

---

## Project commands

Run from `C:\Users\rcgop\Desktop\work\G2_Glasses\prelude`.

| Command | Result | Time |
| --- | --- | --- |
| `npm run typecheck` | `tsc --noEmit`, silent on success | ~5 s |
| `npm test` | vitest, **194 tests / 12 files** | ~2 s |
| `npm run build` | Next production build | ~40 s |
| `npm run build:plugin` | plugin bundle → `dist/` | ~10 s |
| `npm run gate` | typecheck → test → manifest → plugin → app | ~60 s |

Toolchain: Node **v22.14.0**, npm **11.12.1**. `node_modules` is installed.

---

## Code conventions that bite

- `src/core/` must import **nothing** outward — no `@/lib`, `@/even`, `@/ui`, `next/*`,
  `react`, no `fetch(`, no `document.`, no `window.`. `tests/architecture.test.ts`
  enforces this by reading the source.
- Only `src/even/` may import `@evenrealities/*`.
- Tests import with explicit `.ts` extensions and relative paths:
  `import { x } from '../src/core/foo.ts'`.
- `tsconfig` has `noUncheckedIndexedAccess` and `noUnusedLocals` — array access yields
  `T | undefined`, and unused imports fail the typecheck.
- `@/*` maps to `./src/*` in both tsconfig and vitest.

---

## Secrets

- `.env.local` holds real tokens. It is gitignored — **never** print its values.
  To inspect it, list key names only:
  `Get-Content .env.local | ForEach-Object { if ($_ -match '^\s*([A-Za-z0-9_]+)\s*=') { $matches[1] } }`
- `new.api` and `../new.api` are credential scratch files and are gitignored.
- GitHub PAT lives outside the repo at `C:\Users\rcgop\Desktop\work\gopanigithub.txt`.
  Use it for the push only; never write it into a file, a remote URL, or a commit.

---

## Git

- The repo root is `G2_Glasses` (not `prelude`). `.gitignore` lives in `prelude/`.
- Ignored: `node_modules/`, `.next/`, `dist/`, `*.ehpk`, `*.log`, `tsconfig.tsbuildinfo`,
  `.env*`, `.agents/`, `.claude/`, `skills-lock.json`, `new.api`.
- Commit trailer:
  `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`
