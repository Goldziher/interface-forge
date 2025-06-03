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

- [Installation](#installation)
- [Basic Example](#basic-example)
- [Zod Integration](#zod-integration)
- [API Reference](#api-reference)
  - [Factory Class Methods](#factory-class-methods)
    - [build](#build)
    - [batch](#batch)
    - [use](#use)
    - [iterate](#iterate)
    - [sample](#sample)
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

For Zod integration, also install Zod:

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

## Zod Integration

Interface-Forge now supports automatic factory generation from [Zod](https://zod.dev/) schemas! This feature allows you to automatically create factories that respect your schema constraints and validations.

### Basic Zod Usage

```typescript
import { z } from 'zod';
import { createFactoryFromZod } from 'interface-forge';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(0).max(120),
  isActive: z.boolean(),
  createdAt: z.date(),
  tags: z.array(z.string()),
  metadata: z.record(z.unknown()).optional()
});

// Automatically create a factory from the Zod schema
const UserFactory = createFactoryFromZod(UserSchema);

// Use the factory just like any other factory
const user = UserFactory.build();
const users = UserFactory.batch(10);
```

### Advanced Zod Features

The Zod integration supports:

- **All primitive types**: strings, numbers, booleans, dates
- **String constraints**: email, URL, UUID, min/max length
- **Number constraints**: min/max values, integers
- **Complex types**: objects, arrays, records, unions, intersections
- **Optional and nullable fields**
- **Enums and literal types**
- **Custom generators** for specific fields

```typescript
// Complex schema with constraints
const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(50),
  price: z.number().positive().max(1000),
  category: z.enum(['electronics', 'clothing', 'books']),
  tags: z.array(z.string()).min(1).max(5),
  metadata: z.record(z.string()).optional(),
  inStock: z.boolean(),
});

const ProductFactory = createFactoryFromZod(ProductSchema);

// Custom generators for specific fields
const CustomProductFactory = createFactoryFromZod(ProductSchema, {
  customGenerators: {
    productId: () => `PROD-${Math.random().toString(36).substr(2, 9)}`,
  },
});
```

For detailed documentation on Zod integration, see [docs/zod-factory.md](docs/zod-factory.md).

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
    profile: { age: 35 }
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
    profile: { age: 35 } 
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

## TypeScript Compatibility

Interface-Forge is designed to work with TypeScript 5.x and above. It leverages TypeScript's type system to provide type safety and autocompletion for your factories.

## Faker.js Integration

Interface-Forge extends the `Faker` class from Faker.js, giving you access to all Faker.js functionalities directly from your factory instance. This means you can use any Faker.js method to generate data for your factory.

For example:

```typescript
const UserFactory = new Factory<User>((factory) => ({
    // Using Faker.js methods directly
    firstName: factory.person.firstName(),
    lastName: factory.person.lastName(),
    email: factory.internet.email(),
    // ... other properties
}));
```

For more information about available Faker.js methods, see the [Faker.js documentation](https://fakerjs.dev/api/).

## Contributing

Contributions of any kind are welcome! Please see the [contributing guide](CONTRIBUTING.md).

## License

Interface-Forge is licensed under the [MIT License](LICENSE).
