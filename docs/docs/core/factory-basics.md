---
sidebar_position: 1
---

# Factory Basics

Understanding the core Factory class and its methods.

## Factory Lifecycle

1. **Define** - Create factory with generation function
2. **Configure** - Add hooks, options, adapters
3. **Generate** - Build single objects or batches

## Core Methods

### build() and buildAsync()

Generate single objects:

```typescript
// Synchronous
const user = userFactory.build();
const customUser = userFactory.build({ name: 'John' });

// Asynchronous (for async factory functions or hooks)
const user = await userFactory.buildAsync();
```

### batch() and batchAsync()

Generate multiple objects:

```typescript
// Simple batch
const users = userFactory.batch(10);

// With overrides
const admins = userFactory.batch(5, { isAdmin: true });

// Cycling overrides
const mixedUsers = userFactory.batch(6, [
    { role: 'admin' },
    { role: 'user' },
    { role: 'guest' },
]);
```

### use()

Update factory definition:

```typescript
// Original factory
const factory = new Factory<User>(factoryFn);

// Update definition
factory.use((faker) => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    isAdmin: faker.datatype.boolean(0.3), // Now 30% admins
}));
```

### extend()

Add properties to existing factory:

```typescript
const adminFactory = userFactory.extend({
    role: 'admin',
    permissions: ['read', 'write', 'delete'],
});
```

## Hooks

Transform data before and after generation:

```typescript
const factory = new Factory<User>(factoryFn)
    .beforeBuild((data) => {
        // Normalize email
        if (data.email) {
            data.email = data.email.toLowerCase();
        }
        return data;
    })
    .afterBuild((user) => {
        // Add computed field
        user.displayName = `${user.name} (${user.email})`;
        return user;
    });
```

## Factory Options

Configure factory behavior:

```typescript
const factory = new Factory<User>(factoryFn, {
    maxDepth: 5, // Depth limiting
    locale: 'en', // Faker locale
    fixtures: {
        // Fixture configuration
        basePath: './fixtures',
        validateSignature: true,
    },
});
```

## Advanced Patterns

### Lazy References

```typescript
import { Ref } from 'interface-forge';

const userRef = new Ref<User>();

const postFactory = new Factory<Post>((faker) => ({
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    author: userRef.get(), // Lazy reference
}));

// Set reference later
userRef.set(userFactory.build());
```

### Context-Aware Generation

Factory functions can access override values through the optional `kwargs` parameter, enabling context-aware data generation:

```typescript
const userFactory = new Factory<User>((faker, iteration, kwargs) => {
    // Use provided age or generate one
    const age = kwargs?.age ?? faker.number.int({ min: 18, max: 80 });

    return {
        id: kwargs?.id ?? faker.string.uuid(),
        name: kwargs?.name ?? faker.person.fullName(),
        age,
        // Context-aware: underAge depends on the actual age used
        underAge: age < 18,
        // Conditional generation based on age
        driversLicense: age >= 16 ? faker.string.alphanumeric(8) : null,
    };
});

// Generates consistent data
const minor = userFactory.build({ age: 16 });
// { age: 16, underAge: true, driversLicense: null, ... }

const adult = userFactory.build({ age: 25 });
// { age: 25, underAge: false, driversLicense: "A1B2C3D4", ... }
```

### Conditional Generation

```typescript
const profileFactory = new Factory<Profile>((faker) => {
    const type = faker.helpers.arrayElement(['basic', 'premium']);

    return {
        id: faker.string.uuid(),
        type,
        features:
            type === 'premium'
                ? ['unlimited', 'priority-support']
                : ['basic', 'email-support'],
        maxStorage: type === 'premium' ? 1000 : 100,
    };
});
```

### State Management

```typescript
class UserFactory extends Factory<User> {
    private nextId = 1;

    constructor() {
        super((faker) => ({
            id: (this.nextId++).toString(),
            name: faker.person.fullName(),
            email: faker.internet.email(),
        }));
    }

    buildAdmin() {
        return this.build({ role: 'admin' });
    }

    buildGuest() {
        return this.build({ role: 'guest' });
    }
}
```
