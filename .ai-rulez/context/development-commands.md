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

Linting and formatting run through `poly`:

```bash
poly lint .
poly fmt --check .
poly fmt --fix .
```

poly runs in CI via the shared reusable validate workflow.
