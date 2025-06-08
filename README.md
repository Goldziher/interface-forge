# Interface-Forge

[![npm version](https://img.shields.io/npm/v/interface-forge.svg)](https://www.npmjs.com/package/interface-forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Downloads](https://img.shields.io/npm/dm/interface-forge.svg)](https://www.npmjs.com/package/interface-forge)

Interface-Forge is a TypeScript library for creating strongly typed mock data factories. This library builds upon [Faker.js](https://fakerjs.dev/) by providing a simple and intuitive `Factory` class that extends the `Faker` class from [Faker.js](https://fakerjs.dev/).

## Features

- 🏭 **Type-safe factories** - Generate mock data with full TypeScript support
- 🎯 **Faker.js integration** - Built on top of the popular Faker.js library
- 🔧 **Flexible API** - Support for custom generators, iterations, and sampling
- 📋 **Zod integration** - Automatically generate factories from Zod schemas
- 🎲 **Randomization control** - Deterministic generation with custom randomizers
- 🌍 **Locale support** - Generate localized data using Faker.js locales

## Table of Contents



- [Interface-Forge](#interface-forge)
    - [Table of Contents](#table-of-contents)
    - [Installation](#installation)
    - [Basic Example](#basic-example)
    - [API Reference](#api-reference)
        - [Factory Class Methods](#factory-class-methods)
            - [`build`](#build)
            - [`batch`](#batch)
            - [`use`](#use)
            - [`iterate`](#iterate)
            - [`sample`](#sample)
            - [`extend`](#extend)
            - [`compose`](#compose)
    - [TypeScript Compatibility](#typescript-compatibility)
    - [Faker.js Integration](#fakerjs-integration)
    - [Contributing](#contributing)
    - [License](#license)


## Installation

Choose your preferred package manager:

```shell
# npm
npm install --save-dev interface-forge

# yarn
yarn add --dev interface-forge

# pnpm
pnpm add --save-dev interface-forge
```

### Optional: Zod Integration

If you want to use the automatic factory generation from [Zod](https://zod.dev/) schemas, install Zod as well (it's declared as an optional peerDependency):

```shell
# npm
npm install zod

# yarn
yarn add zod

# pnpm
pnpm add zod
```

## Basic Example

To create a factory, you need a TypeScript type:

```typescript
// types.ts

interface User {
    firstName: string;
    lastName: string;
    email: string;
    profile: {
        profession: string;
        gender: string;
        age: number;
    };
}
```

Pass the desired type as a generic argument when instantiating the `Factory` class, alongside default values for the factory:

```typescript
// factories.ts
import { Factory } from 'interface-forge';
import { User } from './types';

const UserFactory = new Factory<User>((factory, iteration) => ({
    firstName: factory.person.firstName(),
    lastName: factory.person.lastName(),
    email: factory.internet.email(),
    profile: {
        profession: factory.person.jobType(),
        gender: factory.person.gender(),
        age: 27 + iteration,
    },
}));
```

Then use the factory to create an object of the desired type in a test file:

```typescript
// User.spec.ts

describe('User', () => {
    const user = UserFactory.build();
    // user == {
    //     firstName: "Johanne",
    //     lastName: "Smith",
    //     email: "js@example.com",
    //     profile: {
    //         profession: "Journalist",
    //         gender: "Female",
    //         age: 27
    //     },
    // }
    // ...
});
```

## Zod Integration (Optional)

If you have Zod installed, you can automatically generate factories from Zod schemas:

```typescript
import { z } from 'zod';
import { createFactoryFromZod } from 'interface-forge/zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(18).max(100),
});

const UserFactory = createFactoryFromZod(UserSchema);
const user = UserFactory.build();
```

For detailed documentation on Zod integration, see [docs/zod.md](docs/zod.md).

## API Reference

### Factory Class Methods

#### `build`

Builds a single object based on the factory's schema. Optionally, you can pass an object to override specific properties.

**Signature:**

```typescript
build(kwargs?: Partial<T>): T
```

**Usage:**

```typescript
const user = UserFactory.build();
// user == {
//     firstName: "Johanne",
//     lastName: "Smith",
//     email: "js@example.com",
//     profile: {
//         profession: "Journalist",
//         gender: "Female",
//         age: 27
//     },
// }

const customUser = UserFactory.build({
    profile: { age: 35 },
});
// customUser.profile.age == 35
```

#### `batch`

Generates a batch of objects based on the factory's schema. Optionally, you can pass an object or an array of objects to override specific properties for each instance.

**Signature:**

```typescript
batch(size: number, kwargs?: Partial<T> | Partial<T>[]): T[]
```

**Usage:**

```typescript
const users = UserFactory.batch(3);
// users == [
//     { ... },
//     { ... },
//     { ... }
// ]

const customUsers = UserFactory.batch(3, {
    profile: { age: 35 },
});
// customUsers == [
//     { ..., profile: { ..., age: 35 } },
//     { ..., profile: { ..., age: 35 } },
//     { ..., profile: { ..., age: 35 } }
// ]

const variedUsers = UserFactory.batch(3, [
    { profile: { age: 30 } },
    { profile: { age: 25 } },
    { profile: { age: 40 } },
]);
// variedUsers == [
//     { ..., profile: { ..., age: 30 } },
//     { ..., profile: { ..., age: 25 } },
//     { ..., profile: { ..., age: 40 } }
// ]
```

#### `use`

Creates a reference to a function that can be used within the factory. This method allows for the encapsulation of a function and its arguments, enabling deferred execution.

**Signature:**

```typescript
use<C extends (...args: never) => unknown>(handler: C, ...args: Parameters<C>): ReturnType<C>
```

**Usage:**

```typescript
const complexFactory = new Factory<ComplexObject>((factory) => ({
    name: factory.person.firstName(),
    value: factory.number.int({ min: 1, max: 3 }),
    options: {
        type: '1',
    },
}));

const factoryWithOptions = new Factory<ComplexObject>((factory) => ({
    ...defaults,
    options: {
        type: '1',
        children: factory.use(complexFactory.batch, 2),
    },
}));

const result = factoryWithOptions.build();
// result.options.children == [
//     { ... },
//     { ... }
// ]
```

#### `iterate`

Cycles through the values of an iterable indefinitely.

**Signature:**

```typescript
iterate<T>(iterable: Iterable<T>): Generator<T, T, T>
```

**Usage:**

```typescript
const values = ['Value 1', 'Value 2', 'Value 3'];
const generator = UserFactory.iterate(values);

console.log(generator.next().value); // 'Value 1'
console.log(generator.next().value); // 'Value 2'
console.log(generator.next().value); // 'Value 3'
console.log(generator.next().value); // 'Value 1'
```

#### `sample`

Samples values randomly from an iterable, ensuring no immediate repetitions.

**Signature:**

```typescript
sample<T>(iterable: Iterable<T>): Generator<T, T, T>
```

**Usage:**

```typescript
const values = [1, 2, 3];
const generator = UserFactory.sample(values);

console.log(generator.next().value); // 1 (or 2, or 3)
console.log(generator.next().value); // (different from the previous value)
```

#### `extend`

Extends the current factory to create a new factory with additional or overridden properties. This method allows for factory inheritance, a new factory can be built upon an existing one while adding or modifying properties.

**Signature:**

```typescript
extend<U extends T>(factoryFn: FactoryFunction<U>): Factory<U>
```

**Usage:**

```typescript
// Base factory
const BaseUserFactory = new Factory<BaseUser>((factory) => ({
    id: factory.string.uuid(),
    createdAt: factory.date.recent(),
}));

// Extended factory
const AdminUserFactory = BaseUserFactory.extend<AdminUser>((factory) => ({
    role: 'admin',
    permissions: ['read', 'write', 'delete'],
}));

const admin = AdminUserFactory.build();
// admin == {
//     id: "550e8400-e29b-41d4-a716-446655440000",
//     createdAt: Date,
//     role: "admin",
//     permissions: ["read", "write", "delete"]
// }
```

#### `compose`

Composes the current factory with other factories to create a new factory. This method allows for factory composition, a factory can include properties generated by other factories or static values.

**Signature:**

```typescript
compose<U extends T>(composition: FactoryComposition<U>): Factory<U>
```

**Usage:**

```typescript
// User factory
const UserFactory = new Factory<User>((factory) => ({
    name: factory.person.fullName(),
    email: factory.internet.email(),
}));

// Post factory
const PostFactory = new Factory<Post>((factory) => ({
    title: factory.helpers.arrayElement([
        'Welcome to My Website',
        'About Me',
        'Contact Information',
    ]),
    content: factory.helpers.arrayElement([
        'Thanks for visiting my personal website.',
        'I am a software developer passionate about coding.',
        'Feel free to reach out through the contact form.',
    ]),
}));

// Composed factory
const UserWithPostsFactory = UserFactory.compose<UserWithPosts>({
    posts: PostFactory.batch(3),
});

const userWithPosts = UserWithPostsFactory.build();
// userWithPosts == {
//     name: "Johanne Smith",
//     email: "js@example.com",
//     posts: [
//         { title: "First Post", content: "Content..." },
//         { title: "Second Post", content: "Content..." },
//         { title: "Third Post", content: "Content..." }
//     ]
// }

// Mixing with static values
interface UserWithStatus extends User {
    status: string;
}
const UserWithStatusFactory = UserFactory.compose<UserWithStatus>({
    status: 'active',
});

const user = UserWithStatusFactory.build();
// user == {
//     name: "Johanne Smith",
//     email: "js@example.com",
//     status: "active"
// }
```

## TypeScript Compatibility

Interface-Forge is designed to work with TypeScript 5.x and above. It leverages TypeScript's type system to provide type safety and autocompletion for your factories.

## Faker.js Integration

Interface-Forge extends the Faker class from Faker.js, giving you access to all Faker.js functionalities directly from your factory instance. This means you can use any Faker.js method to generate data for your factory.

For example:

const UserFactory = new Factory<User>((factory) => ({
// Using Faker.js methods directly
firstName: factory.person.firstName(),
lastName: factory.person.lastName(),
email: factory.internet.email(),
// ... other properties
}));
For more information about available Faker.js methods, see the [Faker.js documentation](https://fakerjs.dev/api/).

## Contributing

We welcome contributions from the community! Please read our [contributing guidelines](CONTRIBUTING.md) for more information.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
