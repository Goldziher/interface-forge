---
sidebar_position: 2
---

# Basic Usage

Learn the fundamentals of creating and using factories to generate mock data.

## Creating Your First Factory

Define an interface and create a factory:

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
```

## Generating Data

### Single Objects

```typescript
const user = userFactory.build();
// { id: '...', name: 'John Doe', email: 'john@example.com', age: 32 }
```

### Multiple Objects

```typescript
const users = userFactory.batch(5);
// Array of 5 user objects
```

### With Overrides

```typescript
const adminUser = userFactory.build({
    name: 'Admin User',
    age: 30,
});

const youngUsers = userFactory.batch(3, { age: 25 });
```

## Dynamic Values

Use functions for computed or conditional values:

```typescript
const userFactory = new Factory<User>((faker) => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    age: faker.number.int({ min: 18, max: 65 }),
    // Dynamic username based on name
    username: () => {
        const name = faker.person.fullName();
        return name.toLowerCase().replace(/\s+/g, '.');
    },
    // Conditional admin status
    isAdmin: faker.datatype.boolean(0.1), // 10% chance
}));
```

## Context-Aware Factories

Factory functions can inspect override values to generate more consistent data:

```typescript
interface User {
    id: string;
    name: string;
    email: string;
    age: number;
    isMinor: boolean;
}

const userFactory = new Factory<User>((faker, iteration, kwargs) => {
    // Use provided age or generate one
    const age = kwargs?.age ?? faker.number.int({ min: 16, max: 65 });

    return {
        id: kwargs?.id ?? faker.string.uuid(),
        name: kwargs?.name ?? faker.person.fullName(),
        email: kwargs?.email ?? faker.internet.email(),
        age,
        // Depends on the actual age (provided or generated)
        isMinor: age < 18,
    };
});

// Generates consistent data
const minor = userFactory.build({ age: 17 });
// { age: 17, isMinor: true, ... }

const adult = userFactory.build({ age: 25 });
// { age: 25, isMinor: false, ... }
```

## Working with Dates

```typescript
interface Event {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    duration: number;
}

const eventFactory = new Factory<Event>((faker) => {
    const start = faker.date.future();
    const duration = faker.number.int({ min: 1, max: 8 });
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);

    return {
        id: faker.string.uuid(),
        title: faker.company.catchPhrase(),
        startDate: start,
        endDate: end,
        duration,
    };
});
```

## Next Steps

- [Factory Composition](../core/composition) - Combine factories
- [Utility Generators](../core/generators) - Control data patterns
- [Zod Integration](../schema/zod-integration) - Schema-based generation
