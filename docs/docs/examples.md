---
sidebar_position: 5
---

# Examples

Working examples demonstrating Interface-Forge features. All examples are in the [repository examples folder](https://github.com/Goldziher/interface-forge/tree/main/examples).

## Quick Examples

### Basic Factory

```typescript
import { Factory } from 'interface-forge';

interface User {
    id: string;
    name: string;
    email: string;
}

const userFactory = new Factory<User>((faker) => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
}));

const user = userFactory.build();
const users = userFactory.batch(5);
```

### Zod Integration

```typescript
import { z } from 'zod/v4';
import { ZodFactory } from 'interface-forge/zod';

const userSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    age: z.number().min(18),
});

const userFactory = new ZodFactory(userSchema);
const user = userFactory.build();
```

## Repository Examples

| Example                                                                                                              | Description                                   |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [01. Basic Usage](https://github.com/Goldziher/interface-forge/blob/main/examples/01-basic-usage.ts)                 | Factory creation, builds, overrides           |
| [02. Composition](https://github.com/Goldziher/interface-forge/blob/main/examples/02-advanced-composition.ts)        | Factory composition, object relationships     |
| [03. Testing](https://github.com/Goldziher/interface-forge/blob/main/examples/03-testing-examples.ts)                | Jest/Vitest integration, test patterns        |
| [04. Circular References](https://github.com/Goldziher/interface-forge/blob/main/examples/04-circular-references.ts) | Handling recursive data structures            |
| [05. Advanced Patterns](https://github.com/Goldziher/interface-forge/blob/main/examples/05-advanced-patterns.ts)     | State-based factories, weighted distributions |
| [06. Hooks](https://github.com/Goldziher/interface-forge/blob/main/examples/06-hooks-and-validation.ts)              | beforeBuild/afterBuild hooks, validation      |
| [07. Zod Basic](https://github.com/Goldziher/interface-forge/blob/main/examples/07-zod-basic.ts)                     | Schema-based generation, validation           |
| [08. Zod Advanced](https://github.com/Goldziher/interface-forge/blob/main/examples/07-zod-integration.ts)            | Complex schemas, discriminated unions         |
| [09. Zod Testing](https://github.com/Goldziher/interface-forge/blob/main/examples/07-zod-testing.ts)                 | Test data from schemas                        |
| [10. Extensions](https://github.com/Goldziher/interface-forge/blob/main/examples/09-factory-extension.ts)            | Factory hierarchies, specialized variants     |
| [11. Generators](https://github.com/Goldziher/interface-forge/blob/main/examples/10-generators-comparison.ts)        | CycleGenerator, SampleGenerator patterns      |
| [12. Custom Handlers](https://github.com/Goldziher/interface-forge/blob/main/examples/11-zod-custom-handlers.ts)     | Custom Zod type handlers                      |

## Database Adapters

| Adapter                                                                                                  | Description               |
| -------------------------------------------------------------------------------------------------------- | ------------------------- |
| [Mongoose](https://github.com/Goldziher/interface-forge/blob/main/examples/adapters/mongoose-adapter.ts) | MongoDB with Mongoose ORM |
| [Prisma](https://github.com/Goldziher/interface-forge/blob/main/examples/adapters/prisma-adapter.ts)     | Prisma ORM integration    |
| [TypeORM](https://github.com/Goldziher/interface-forge/blob/main/examples/adapters/typeorm-adapter.ts)   | TypeORM entity generation |

## Running Examples

```bash
git clone https://github.com/Goldziher/interface-forge.git
cd interface-forge && pnpm install
pnpm exec tsx examples/01-basic-usage.ts
```
