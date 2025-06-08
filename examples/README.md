# Interface-Forge Examples

This directory contains comprehensive examples demonstrating various features and use cases of Interface-Forge.

## Table of Contents

### [01. Basic Usage](./01-basic-usage.ts)

Learn the fundamentals of Interface-Forge:

- Creating simple factories
- Building single instances with `build()`
- Generating batches with `batch()`
- Overriding default values
- Using Faker methods directly

### [02. Advanced Composition](./02-advanced-composition.ts)

Explore factory composition techniques:

- Composing multiple factories together
- Creating complex object graphs
- Using `compose()` for factory composition
- Working with `iterate()` for progressive data
- Building relationships between entities

### [03. Testing Examples](./03-testing-examples.ts)

See how Interface-Forge integrates with testing frameworks:

- Unit test scenarios
- Integration test patterns
- Jest/Vitest test examples
- Storybook story data generation
- Snapshot testing approaches

### [04. Circular References](./04-circular-references.ts)

Handle complex data structures with circular dependencies:

- Using `use()` for lazy evaluation
- Managing bi-directional relationships
- Controlling recursion depth with `maxDepth`
- Building self-referential structures
- Creating graph-like data models

### [05. Advanced Patterns](./05-advanced-patterns.ts)

Advanced techniques for sophisticated scenarios:

- State-based factories
- Using `sample()` for controlled randomness
- Temporal data patterns
- Weighted distributions
- Deterministic data with seeds

### [06. Hooks and Validation](./06-hooks-and-validation.ts)

Learn how to use hooks for data transformation and validation:

- Using `beforeBuild()` and `afterBuild()` hooks
- Synchronous hooks with `build()`
- Asynchronous hooks with `buildAsync()`
- Data validation and transformation
- Conditional logic in hooks
- Error handling and business rules

### [07. JSON Schema Integration](./07-json-schema-integration.ts)

Automatically generate factories from JSON Schema definitions:

- Creating factories from JSON Schema objects
- Supporting all JSON Schema types and formats
- Enhanced schema composition with `allOf`, `anyOf`, `oneOf`
- Custom format generators for domain-specific data
- OpenAPI/Swagger schema compatibility
- Advanced `$ref` handling with recursion prevention
- Data validation against original schemas
- Performance benchmarking vs manual factories
- Integration with existing Factory features
- Batch generation with `batch()` for API compatibility
- Real-world API testing scenarios

**Note**: This example requires optional dependencies:

```bash
npm install ajv ajv-formats
```

## Running the Examples

To run any example:

```bash
# Install dependencies
npm install interface-forge

# For JSON Schema integration example (07), also install:
npm install ajv ajv-formats

# Run with TypeScript
npx tsx examples/01-basic-usage.ts

# Or compile and run
npx tsc examples/01-basic-usage.ts --outDir dist
node dist/01-basic-usage.js
```

### JSON Schema Integration Usage

The JSON Schema integration provides a powerful way to automatically generate factories:

```typescript
import { createFactoryFromJsonSchema } from 'interface-forge/json-schema';

// Create factory from schema
const UserFactory = await createFactoryFromJsonSchema(userSchema);

// Generate data
const user = UserFactory.build();
const users = UserFactory.batch(100); // JSON Schema API compatible
// Also available: UserFactory.batch(100) - legacy method

// Validate generated data
const validation = await validateGeneratedData(user, userSchema);
```

## Key Concepts

### Factory Creation

Every factory is created by instantiating the `Factory` class with a function that returns your data structure:

```typescript
const MyFactory = new Factory<MyType>((faker) => ({
    // Use faker methods to generate data
}));
```

### The Faker Parameter

Since `Factory` extends Faker, the parameter passed to your factory function is the factory instance itself, giving you access to all Faker.js methods plus Interface-Forge specific methods like `use()`, `sample()`, etc.

### Type Safety

All examples are written in TypeScript to demonstrate the full type safety benefits. The generated data will always match your defined interfaces.

## Contributing

Have an interesting use case or pattern? Feel free to contribute additional examples by submitting a pull request!
