---
type: Concept
title: Development Commands
x-ai-rulez:
  kind: context
  id: development-commands
---

## Development Commands

Use pnpm from the repository root.

```bash
pnpm install
pnpm build
pnpm test
pnpm test:coverage
pnpm test src/index.spec.ts
pnpm lint
pnpm typecheck
pnpm format
pnpm clean
pnpm docs:build
```

mise pins the toolchain and runs the repository tasks (`mise tasks` lists them). `mise run validate` runs the
CI-equivalent checks. The repository uses `poly` for git hooks. Install hooks with:

```bash
mise run governance:hooks:install
```
