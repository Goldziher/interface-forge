---
type: Decision
title: Interface Forge Patterns
x-ai-rulez:
  kind: rule
  id: interface-forge-patterns
---

## Interface Forge Patterns

- Add tests for new behavior in the corresponding `.spec.ts` file.
- Keep strict TypeScript compatibility and avoid `any` in production code.
- Use `@tool-belt/type-predicates` for safe runtime type checks when useful.
- Use separate entry points for optional features such as `interface-forge/zod`.
- Keep optional integrations as peer dependencies with `peerDependenciesMeta` marking them optional.
- Do not assume object key order in tests.
- Numeric enum generation must account for TypeScript reverse mappings.
- String and array generators must respect both minimum and maximum constraints.
- The universal default max depth is `DEFAULT_MAX_DEPTH` in `src/constants.ts`.
