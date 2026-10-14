---
type: Concept
title: Architecture
x-ai-rulez:
  kind: context
  id: architecture
---

## Architecture

Interface Forge is a TypeScript library for creating strongly typed mock data factories.

- `src/index.ts` contains the core `Factory` class and related types.
- `src/zod.ts` provides the optional `interface-forge/zod` entry point.
- `src/errors.ts` defines custom error types.
- `src/generators.ts` contains generator utilities such as `CycleGenerator` and `SampleGenerator`.
- `src/utils.ts` contains shared helpers and `Ref`.
- Tests live next to source files using the `.spec.ts` suffix.
- Examples in `examples/` demonstrate usage patterns and integration scenarios.

The build emits CommonJS, ES modules, and TypeScript declarations. Zod is an optional peer dependency.
