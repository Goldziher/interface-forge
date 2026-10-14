# Contributing guidelines

This package is open to contributions. To contribute, please follow these steps:

1. Fork the upstream repository into a personal account and clone it.
2. Run `pnpm install`.
3. Make your changes - please make sure to add tests if needed.
4. Push your branch to your fork.
5. Create a pull request with an explanation of your changes. Please link to any pertinent issue.

## AI governance

Install ai-rulez 5.3.0 and Poly, then run `poly hooks update` and `poly hooks install`.
Installing governance hooks requires Python 3.11 or newer. CI uses the reviewed
5.3.0 source revision `1dd46d774f156f3d170ecd1b702598b12d1eaf5b`.

Edit `.ai-rulez/` sources, then run `ai-rulez migrate okf --check`,
`ai-rulez validate --strict --no-local`, `ai-rulez lock --content-only`, and
`ai-rulez generate --no-local --strict-config`. Verify generated freshness with
`ai-rulez generate --no-local --strict-config --check` and `ai-rulez lock --check`.
