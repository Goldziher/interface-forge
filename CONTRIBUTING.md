# Contributing guidelines

This package is open to contributions. To contribute, please follow these steps:

1. Fork the upstream repository into a personal account and clone it.
2. Run `pnpm install`.
3. Make your changes - please make sure to add tests if needed.
4. Push your branch to your fork.
5. Create a pull request with an explanation of your changes. Please link to any pertinent issue.

## AI governance

Install [mise](https://mise.jdx.dev), then run `mise run setup` to install the pinned toolchain, the
dependencies and the governance hooks (`mise run governance:hooks:install` reinstalls the hooks alone).
ai-rulez always runs at its latest release through `npx -y ai-rulez@latest`.

Edit `.ai-rulez/` sources, then run `mise run governance:generate` and `npx -y ai-rulez@latest lock`.
Verify generated freshness with `mise run governance:check`.
