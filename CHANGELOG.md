# Changelog

All notable user-facing changes to this project are documented here.

## [Unreleased]

## [2.8.0] - 2026-11-06

### Added

- Added named factory presets: `factory.preset(name, values)` for registration and `presets` in `build()` / `batch()` / `buildAsync()` / `batchAsync()` / `createMany()` options, applied in order (later presets win, explicit kwargs win over presets).
- Added core constraint helpers with factory-local uniqueness: `Constraints` with `unique()`, `min()`, `max()`, `between()`, `pattern()`, and `custom()`, plus `ConstraintError` carrying `field`, `constraint`, and `attempts`.
- Added the optional `interface-forge/graphql` entry point (`createGraphQLFactories` + `GraphQLFactory`) generating factories from SDL or `GraphQLSchema` input for object and input object types, with built-in scalars, enums, lists, non-null wrappers, custom scalar generator mapping and max-depth handling; `graphql` is an optional peer dependency.
- Added the `FactoryOutput<F>` export for deriving the instance type from a factory, and improved `extend()` typing so extension functions can return only added fields (`Factory<T & Added>`).
- Documented and tested async lazy values: `use(async () => ...)` resolves through `buildAsync()`/`batchAsync()` and sync `build()` fails with a clear `ConfigurationError`.

### Changed

- Minimum supported versions raised: Node.js 22.

## [2.7.0] - 2026-05-28

### Added

- Added `interface-forge/json-schema` with `JsonSchemaFactory` for optional AJV-backed JSON Schema data generation and validation.
- Added JSON Schema support for object, primitive, array, nested object, `enum`, `const`, common string/number/array constraints, selected formats, and shallow local `$defs`/`definitions` references.
- Added `factory.sequence.increment()`, `factory.sequence.template()`, and `factory.sequence.date()` helpers for stateful sequence values in factory schemas.
- Added `IncrementSequenceGenerator`, `TemplateSequenceGenerator`, and `DateSequenceGenerator` exports for direct generator usage.

### Documentation

- Added JSON Schema integration documentation and installation guidance.
- Updated generator documentation to cover `factory.sequence` and direct generator usage.

## [2.6.7] - 2026-05-28

### Fixed

- Exported `BaseGenerator`, `CycleGenerator`, and `SampleGenerator` from the root `interface-forge` entrypoint so the documented imports work.

### Changed

- Modernized project tooling around `prek`, `gitfluff`, `oxlint`, `oxfmt`, ai-rulez v4, and pnpm 11.
- Consolidated documentation dependencies into the root pnpm workspace lockfile.

## [2.6.6] - 2025-12-14

### Fixed

- Adjusted the npm trusted publishing workflow to restore npm registry configuration, update npm before publishing, and publish without a user token.

## [2.6.5] - 2025-12-14

### Fixed

- Adjusted the npm trusted publishing workflow to avoid `NODE_AUTH_TOKEN` conflicts during provenance publishing.

## [2.6.4] - 2025-12-14

### Changed

- Added the npm publish workflow using trusted publishing and provenance.
- Updated the Vite config to use the Vitest config entrypoint.

## [2.6.3] - 2025-11-03

### Changed

- Raised the Node.js engine requirement to Node 20 or newer.
- Moved docs, build, and test packages out of production dependencies.
- Refreshed the development dependency stack, including Faker 10, Vitest 4, Docusaurus 3.9, and React 19.2.

### Documentation

- Added GitHub Sponsors links to the README and documentation.

## [2.6.2] - 2025-08-27

### Changed

- Refreshed dependencies, including Faker 10, TypeScript 5.9, Zod 4.1, Vite 7.1, and React 19.1 for docs.
- Updated GitHub Actions dependencies through Dependabot.

## [2.6.1] - 2025-07-10

### Fixed

- Relaxed the optional Zod peer dependency to `>=3.0.0`, improving compatibility for Zod v3 and v4 consumers.

## [2.6.0] - 2025-07-10

### Added

- Passed `kwargs` overrides into factory functions as a third argument across `build`, `buildAsync`, `batch`, `batchAsync`, `extend`, `compose`, and partial factories.
- Added context-aware override examples.

### Fixed

- Improved browser compatibility for fixture functionality.

### Documentation

- Migrated and reorganized documentation around Docusaurus.

## [2.5.0] - 2025-06-23

### Added

- Reintroduced fixture generation through `build()` and `buildAsync()` options.
- Added `generateFixture`, `fixtures`, `FixtureConfiguration`, fixture metadata, configurable fixture paths, and signature validation.
- Added fixture support for `ZodFactory`, including schema-aware fixture signatures.

### Fixed

- Added `FixtureError` and `FixtureValidationError` exports for fixture read/write and validation failures.
- Improved generic typing in factory composition and extension paths.

### Documentation

- Added fixture generation documentation with basic usage, configuration, custom paths, validation, and Zod examples.

## [2.4.1] - 2025-06-17

### Added

- Added partial factory support through `Factory.partial()`.
- Added type-level tests for partial factory behavior.

### Fixed

- Fixed a type regression from `2.4.0`.
- Improved conditional return typing for partial factories.

## [2.4.0] - 2025-06-17

### Added

- Added async batch support.
- Added adapter examples for Mongoose, Prisma, and TypeORM.

### Changed

- Improved factory depth control and centralized the default max depth constant.
- Refined persistence adapter typing.
- Improved Zod nested deep merge behavior.
- Reorganized shared utilities.

## [2.3.1] - 2025-06-14

### Added

- Added Zod v3 compatibility.
- Expanded custom Zod type registration support.

### Documentation

- Updated README examples and generated assets for the Zod integration.

## [2.3.0] - 2025-06-13

### Added

- Added factory composition and extension APIs.
- Added before/after build hooks and async build support.
- Added recursion depth control.
- Added custom error classes.
- Added generator utilities.
- Added optional `interface-forge/zod` entrypoint for Zod schema integration.
- Added examples and generated API documentation.

## [2.2.1] - 2025-05-31

### Changed

- Maintenance release with version and dependency updates.

## [2.2.0] - 2025-05-25

### Changed

- Updated build, lint, and packaging tooling.
- Migrated to pnpm 10.
- Refreshed README content.

## [2.1.0] - 2025-01-20

### Changed

- Updated dependencies and type annotations.

## [2.0.1] - 2024-08-22

### Fixed

- Fixed publish, prepublish, dependency, pre-commit, and Husky configuration issues.

## [2.0.0] - 2024-07-06

### Changed

- Simplified the public API around `Factory` with `build`, `batch`, `use`, `iterate`, and `sample`.

### Removed

- Removed legacy `TypeFactory`, `FixtureFactory`, old helper utilities, fixture APIs, and the previous changelog.

## [1.6.1] - 2023-09-15

### Changed

- Migrated tests from Jest to Vitest.
- Added CodeQL and refreshed lint/dependency tooling.

## [1.5.1] - 2022-10-19

### Fixed

- Fixed release workflow issues and updated pnpm GitHub Actions usage.

## [1.5.0] - 2022-10-10

### Changed

- Migrated package management to pnpm.
- Upgraded `@tool-belt/type-predicates`.

## [1.4.7] - 2022-07-18

### Changed

- Updated dependencies and GitHub Actions.
- Added Dependabot configuration.

## [1.4.6] - 2022-05-02

### Fixed

- Fixed an incorrect documentation link.

### Documentation

- Added security policy documentation.

## [1.4.5] - 2021-12-06

### Changed

- Updated dependencies and project badges.

## [1.4.4] - 2021-09-08

### Fixed

- Fixed fixture comparisons involving `undefined`.

### Documentation

- Added contributor documentation.

## [1.4.3] - 2021-08-13

### Changed

- Updated type guard dependencies.

## [1.4.2] - 2021-08-08

### Changed

- Maintenance release.

## [1.4.1] - 2021-07-30

### Changed

- Refactored schema parsing, recursive validators, recursive merge logic, and fixture file handling.

## [1.4.0] - 2021-07-25

### Added

- Added derived schema values.
- Added the first Docusaurus documentation site.

## [1.3.5] - 2021-07-22

### Fixed

- Fixed fixture directory creation with `fs.mkdirSync`.

## [1.3.4] - 2021-07-21

### Added

- Added `__fixtures__` directory behavior for fixture files.

### Fixed

- Improved fixture path validation and documentation.

## [1.3.3] - 2021-07-19

### Fixed

- Reintroduced the default fixture path.

## [1.3.2] - 2021-07-19

### Fixed

- Fixed fixture filename validation and normalization.

## [1.3.1] - 2021-07-19

### Changed

- Simplified `FixtureFactory` construction by removing the file path constructor argument.

## [1.3.0] - 2021-07-19

### Added

- Added `FixtureFactory` and fixture generation methods.

## [1.2.2] - 2021-07-14

### Fixed

- Fixed async default counter behavior.

## [1.2.1] - 2021-07-12

### Changed

- Removed counter resets from batch methods.

## [1.2.0] - 2021-07-11

### Added

- Added synchronous generation APIs with `buildSync` and `batchSync`.
- Added `.sample()`.

### Changed

- Replaced `.bind()` with `.use()`.

## [1.1.6] - 2021-07-05

### Fixed

- Fixed an iteration error.

## [1.1.5] - 2021-07-05

### Changed

- Updated build options.

## [1.1.2] - 2021-06-14

### Fixed

- Fixed nested schema value resolution.

## [1.1.1] - 2021-06-12

### Fixed

- Fixed `isOfType` null handling.

## [1.1.0] - 2021-05-21

### Added

- Added required build arguments.

## [1.0.3] - 2021-05-20

### Changed

- Updated typings and dependencies.

## [1.0.2] - 2021-05-16

### Fixed

- Fixed iteration logic.

## [1.0.1] - 2021-05-16

### Documentation

- Updated README and package metadata.

## [1.0.0] - 2021-05-15

### Added

- Initial release of Interface Forge with core typed factory behavior.
