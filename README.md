<div align="center">
  <img src="https://raw.githubusercontent.com/Goldziher/interface-forge/main/assets/logo.svg" alt="Interface-Forge Logo" width="120" height="120">
  
  # Interface-Forge

[![npm version](https://img.shields.io/npm/v/interface-forge.svg)](https://www.npmjs.com/package/interface-forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Downloads](https://img.shields.io/npm/dm/interface-forge.svg)](https://www.npmjs.com/package/interface-forge)

</div>

A TypeScript library for creating strongly typed mock data factories. Built on [Faker.js](https://fakerjs.dev/) with advanced composition patterns, database persistence, fixture caching, and optional [Zod](https://zod.dev/) schema integration.

## Support This Project

If you find interface-forge helpful, please consider sponsoring the development:

<a href="https://github.com/sponsors/Goldziher"><img src="https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github-sponsors" alt="Sponsor on GitHub" height="32"></a>

Your support helps maintain and improve this library for the community! 🚀

## Features

- **🔒 Type-Safe**: Full TypeScript support with compile-time validation
- **🚀 Zero Learning Curve**: Extends Faker.js - all Faker methods work out of the box
- **🔄 Advanced Composition**: Build complex object relationships with `compose()` and `extend()`
- **🗄️ Database Integration**: Built-in persistence with Mongoose, Prisma, TypeORM adapters
- **📁 Fixture Caching**: Cache generated data for consistent test scenarios
- **📐 Zod Integration**: Generate data directly from schemas with validation
- **🔗 Hooks & Transforms**: Pre/post-build data transformation and validation
- **🎲 Deterministic**: Seed generators for reproducible test data

📚 **[Complete Documentation](https://goldziher.github.io/interface-forge/)** | 📂 **[Examples](./examples)**

## Installation

```bash
# npm
npm install --save-dev interface-forge

# yarn
yarn add --dev interface-forge

# pnpm
pnpm add --save-dev interface-forge

# For Zod integration (optional)
npm install zod
```

## Quick Start

### Basic Factory

```typescript
import { Factory } from 'interface-forge';

interface User {
    id: string;
    name: string;
    email: string;
    age: number;
}

const userFactory = new Factory<User>((faker) => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    age: faker.number.int({ min: 18, max: 65 }),
}));

// Generate single object
const user = userFactory.build();

// Generate multiple objects
const users = userFactory.batch(5);

// Override properties
const admin = userFactory.build({ name: 'Admin User' });
```

### Zod Integration

```typescript
import { z } from 'zod/v4';
import { ZodFactory } from 'interface-forge/zod';

const userSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(2),
    email: z.string().email(),
    age: z.number().min(18).max(65),
});

const userFactory = new ZodFactory(userSchema);
const user = userFactory.build(); // Automatically validates against schema
```

### Database Persistence

```typescript
import { MongooseAdapter } from './adapters/mongoose';

const userFactory = new Factory<User>(factoryFn).withAdapter(
    new MongooseAdapter(UserModel),
);

// Create and save to database
const user = await userFactory.create();
const users = await userFactory.createMany(10);
```

### Advanced Composition

```typescript
const enhancedUserFactory = userFactory.compose<EnhancedUser>({
    profile: profileFactory, // Use another factory
    posts: postFactory.batch(3), // Generate related data
    isActive: true, // Static values
});
```

## Core Features

### Factory Methods

- `build()` / `buildAsync()` - Generate single objects
- `batch()` / `batchAsync()` - Generate multiple objects
- `extend()` - Create factory variations
- `compose()` - Combine multiple factories
- `create()` / `createMany()` - Database persistence

### Hooks & Validation

- `beforeBuild()` - Transform data before generation
- `afterBuild()` - Transform data after generation
- Full async support for external API calls

### Fixture Caching

- Cache generated data for consistent tests
- Signature validation for factory changes
- Node.js only (browser fallback available)

### Utility Generators

- `CycleGenerator` - Predictable value cycling
- `SampleGenerator` - Random sampling without repeats

## Documentation

📚 **[Complete Documentation](https://goldziher.github.io/interface-forge/)**

- [Getting Started](https://goldziher.github.io/interface-forge/docs/getting-started/installation)
- [Core Concepts](https://goldziher.github.io/interface-forge/docs/core/factory-basics)
- [Zod Integration](https://goldziher.github.io/interface-forge/docs/schema/zod-integration)
- [Advanced Features](https://goldziher.github.io/interface-forge/docs/advanced/persistence)
- [API Reference](https://goldziher.github.io/interface-forge/docs/api)

## Examples

All examples are available in the [`./examples`](./examples) directory:

| Feature              | Example                                                               |
| -------------------- | --------------------------------------------------------------------- |
| Basic Usage          | [`01-basic-usage.ts`](./examples/01-basic-usage.ts)                   |
| Factory Composition  | [`02-advanced-composition.ts`](./examples/02-advanced-composition.ts) |
| Testing Integration  | [`03-testing-examples.ts`](./examples/03-testing-examples.ts)         |
| Zod Schemas          | [`07-zod-basic.ts`](./examples/07-zod-basic.ts)                       |
| Database Persistence | [`adapters/`](./examples/adapters/)                                   |

## Contributing

We welcome contributions! Please read our [contributing guidelines](CONTRIBUTING.md).

## License

MIT License - see [LICENSE](LICENSE) for details.
