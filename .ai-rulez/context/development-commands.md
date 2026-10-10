---
type: Concept
title: Development Commands
x-ai-rulez:
  kind: context
  id: development-commands
---

# Development Commands

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

The repository uses `prek` for git hooks. Install hooks with:

```bash
prek install
prek install --hook-type commit-msg
```
