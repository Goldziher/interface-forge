---
type: Decision
title: Zod Integration
x-ai-rulez:
  kind: rule
  id: zod-integration
---

# Zod Integration

- Zod v4 is imported from `zod/v4`.
- Zod v4 internals use `_zod.def`; do not use v3 `_def` for v4 logic.
- Access core Zod v4 types from `zod/v4/core`.
- ZodFactory validates generated data with `schema.parse()` and handles promises/functions with custom handlers.
- When extending `Factory`, override public methods such as `build()` and `batch()` because private base methods cannot be overridden.
- `z.function()` and `z.promise()` schemas require custom type handlers.
- Recursive schemas should be designed with optional children or natural depth limits so max-depth behavior can produce valid output.
- Depth counting is zero-indexed and uses a `>=` comparison for limits.
