# Interface-Forge

[![npm version](https://img.shields.io/npm/v/interface-forge.svg)](https://www.npmjs.com/package/interface-forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Downloads](https://img.shields.io/npm/dm/interface-forge.svg)](https://www.npmjs.com/package/interface-forge)

Interface-Forge is a TypeScript library for creating strongly typed mock data factories. This library builds upon [Faker.js](https://fakerjs.dev/) by providing a simple and intuitive `Factory` class that extends the `Faker` class from [Faker.js](https://fakerjs.dev/).

## Why Interface-Forge?

- **Type-Safe by Design**: Full TypeScript support with compile-time type checking for all your test data
- **Zero Learning Curve**: Extends Faker.js, so all Faker methods work out of the box—if you know Faker, you know Interface-Forge
- **Powerful Composition**: Build complex object graphs with circular references using the `use()` method for lazy evaluation
- **Flexible Overrides**: Easily customize any part of your generated data with the `build({ ... })` method
- **Built for Testing**: Generate single instances, batches, or compose factories together—perfect for unit tests, integration tests, and storybooks

📚 **[View Full API Documentation](https://goldziher.github.io/interface-forge/)**

📂 **[Browse Example Code](./examples)** - See Interface-Forge in action with practical examples

## Table of Contents

- [Interface-Forge](#interface-forge)
    - [Why Interface-Forge?](#why-interface-forge)
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
            - [`beforeBuild`](#beforebuild)
            - [`afterBuild`](#afterbuild)
            - [`buildAsync`](#buildasync)
    - [JSON Schema Integration](#json-schema-integration)
        - [JSON Schema Installation](#json-schema-installation)
        - [JSON Schema Basic Usage](#json-schema-basic-usage)
        - [JSON Schema Advanced Features](#json-schema-advanced-features)
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

#### `beforeBuild`

Adds a hook that will be executed before building the instance. Hooks receive the partial parameters (kwargs) and can modify them before the instance is built.

**Signature:**

```typescript
beforeBuild(hook: BeforeBuildHook<T>): this
```

**Usage:**

```typescript
const UserFactory = new Factory<User>((factory) => ({
    id: factory.string.uuid(),
    email: '',
    username: '',
})).beforeBuild((params) => {
    // Auto-generate email from username if not provided
    if (!params.email && params.username) {
        params.email = `${params.username}@example.com`;
    }
    return params;
});

const user = UserFactory.build({ username: 'john_doe' });
// user.email == "john_doe@example.com"
```

#### `afterBuild`

Adds a hook that will be executed after building the instance. Hooks are executed in the order they were added and can be either synchronous or asynchronous.

**Signature:**

```typescript
afterBuild(hook: AfterBuildHook<T>): this
```

**Usage:**

```typescript
const ProductFactory = new Factory<Product>((factory) => ({
    id: factory.string.uuid(),
    name: factory.commerce.productName(),
    price: factory.number.float({ min: 10, max: 1000 }),
    formattedPrice: '',
})).afterBuild((product) => {
    // Format price with currency
    product.formattedPrice = `$${product.price.toFixed(2)}`;
    return product;
});

const product = ProductFactory.build();
// product.formattedPrice == "$123.45"
```

#### `buildAsync`

Builds an instance asynchronously with all registered hooks applied in sequence. This method supports both synchronous and asynchronous hooks.

**Signature:**

```typescript
buildAsync(kwargs?: Partial<T>): Promise<T>
```

**Usage:**

```typescript
const UserFactory = new Factory<User>((factory) => ({
    id: factory.string.uuid(),
    email: factory.internet.email(),
    isVerified: false,
})).afterBuild(async (user) => {
    // Simulate API call to verify email
    await verifyEmail(user.email);
    user.isVerified = true;
    return user;
});

// Must use buildAsync for async hooks
const user = await UserFactory.buildAsync();
// user.isVerified == true
```

**Important Hook Behavior:**

- Synchronous hooks automatically work with `build()`
- If async hooks are registered, `build()` will throw a `ConfigurationError`
- Use `buildAsync()` when you have async hooks or want consistent async behavior
- Hooks are executed in the order they were registered
- Multiple hooks of the same type can be chained

## JSON Schema Integration

Interface-Forge supports creating factories directly from JSON Schema definitions, making it perfect for teams that already use JSON Schema, OpenAPI/Swagger specifications, or need language-agnostic schema definitions.

### JSON Schema Installation

The JSON Schema integration is available as an optional feature to keep the core library lightweight:

```shell
# Install the core library
npm install --save-dev interface-forge

# Install optional JSON Schema dependencies
npm install --save-dev ajv ajv-formats
```

### JSON Schema Basic Usage

Create factories from JSON Schema definitions:

```typescript
import { createFactoryFromJsonSchema } from 'interface-forge/json-schema';

const userSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        email: { type: 'string', format: 'email' },
        age: { type: 'integer', minimum: 0, maximum: 120 },
        isActive: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'name', 'email'],
};

// Create factory from schema
const UserFactory = await createFactoryFromJsonSchema(userSchema);

// Use like any other factory
const user = UserFactory.build();
const users = UserFactory.batch(10);

// Override specific properties
const customUser = UserFactory.build({
    name: 'John Doe',
    isActive: true,
});

// Generate multiple instances
const users = UserFactory.batch(5, { isActive: true });
```

### JSON Schema Advanced Features

**Schema Composition with `allOf`, `anyOf`, `oneOf`:**

```typescript
const flexibleSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        data: {
            anyOf: [
                { type: 'string' },
                { type: 'number' },
                {
                    type: 'object',
                    properties: {
                        nested: { type: 'boolean' },
                    },
                },
            ],
        },
    },
};

const FlexibleFactory = await createFactoryFromJsonSchema(flexibleSchema);
```

**Custom Format Generators:**

```typescript
import { JsonSchemaOptions } from 'interface-forge/json-schema';

const options: JsonSchemaOptions = {
    customFormats: {
        'product-code': (faker) =>
            `${faker.string.alpha({ length: 3, casing: 'upper' })}-${faker.string.numeric(6)}`,
        'hex-color': (faker) =>
            `#${faker.string.hexadecimal({ length: 6, casing: 'lower', prefix: '' })}`,
    },
};

const productSchema = {
    type: 'object',
    properties: {
        code: { type: 'string', format: 'product-code' },
        color: { type: 'string', format: 'hex-color' },
    },
};

const ProductFactory = await createFactoryFromJsonSchema(
    productSchema,
    options,
);
```

**Multiple Factories from Schema Collection:**

```typescript
import { createFactoriesFromSchemas } from 'interface-forge/json-schema';

const schemas = {
    user: userSchema,
    product: productSchema,
    order: orderSchema,
};

const factories = await createFactoriesFromSchemas(schemas);

// Use individual factories
const user = factories.user.build();
const product = factories.product.build();
const order = factories.order.build();
```

**Data Validation:**

```typescript
import { validateGeneratedData } from 'interface-forge/json-schema';

const UserFactory = await createFactoryFromJsonSchema(userSchema);
const user = UserFactory.build();

const validation = await validateGeneratedData(user, userSchema);
if (validation.valid) {
    console.log('Generated data is valid!');
} else {
    console.log('Validation errors:', validation.errors);
}
```

**OpenAPI/Swagger Integration:**

```typescript
// Works seamlessly with OpenAPI component schemas
const openApiSchema = {
    type: 'object',
    properties: {
        data: {
            type: 'array',
            items: {
                $ref: '#/components/schemas/User', // Reference handling
            },
        },
        meta: {
            type: 'object',
            properties: {
                total: { type: 'integer', minimum: 0 },
                page: { type: 'integer', minimum: 1 },
            },
        },
    },
};

const APIResponseFactory = await createFactoryFromJsonSchema(openApiSchema);
```

**Integration with Core Factory Features:**

JSON Schema factories work seamlessly with all core Interface-Forge features:

```typescript
const UserFactory = await createFactoryFromJsonSchema(userSchema);

// Extend with additional properties
const ExtendedUserFactory = UserFactory.extend((faker) => ({
    displayName: faker.internet.displayName(),
    metadata: { source: 'api' },
}));

// Compose with other factories
const UserWithPostsFactory = UserFactory.compose({
    posts: PostFactory.batch(3),
});

// Use with hooks
const UserWithHooksFactory = UserFactory.beforeBuild((params) => ({
    ...params,
    isActive: true,
})).afterBuild((user) => {
    user.processedAt = new Date();
    return user;
});
```

**Supported JSON Schema Features:**

- All basic types (string, number, integer, boolean, array, object, null)
- String formats (email, uuid, date-time, uri, ipv4, ipv6, etc.)
- Numeric constraints (minimum, maximum, multipleOf)
- String constraints (minLength, maxLength, pattern)
- Array constraints (minItems, maxItems, uniqueItems)
- Object constraints (required, additionalProperties)
- Schema composition (allOf, anyOf, oneOf)
- Enums and const values
- Custom format generators
- $ref resolution (basic support)

**JSON Schema Version Support:**

- ✅ **JSON Schema Draft-07** (2019) - Full support
- ✅ **JSON Schema Draft 2019-09** - Full support
- ✅ **JSON Schema Draft 2020-12** - Full support (latest)
- ✅ **Schemas without explicit `$schema`** - Defaults to latest version

**OpenAPI/Swagger Version Support:**

- ✅ **OpenAPI 2.0 (Swagger)** - Extract schemas from `definitions`
- ✅ **OpenAPI 3.0.x** - Extract schemas from `components.schemas`
- ✅ **OpenAPI 3.1.x** - Full JSON Schema 2020-12 compatibility
- ✅ **Response schemas** - Generate mock API responses
- ⚠️ **$ref resolution** - Basic support (local references only)

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
