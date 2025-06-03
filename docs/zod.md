# Zod Factory Integration

The `createFactoryFromZod` function allows you to automatically generate factories from Zod schemas, similar to how the Python package Polyfactory works with Pydantic models.

## Installation

First, make sure you have `interface-forge` installed:

```bash
npm install interface-forge
# or
pnpm add interface-forge
# or
yarn add interface-forge
```

Since Zod is declared as an optional peerDependency, you also need to install it separately:

```bash
npm install zod
# or
pnpm add zod
# or
yarn add zod
```

## Basic Usage

```typescript
import { z } from 'zod';
import { createFactoryFromZod } from 'interface-forge/zod';

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

// Use the factory
const user = UserFactory.build();
const users = UserFactory.batch(10);
```

## Supported Zod Types

### Primitive Types

- **String**: `z.string()`
- **Number**: `z.number()`
- **Boolean**: `z.boolean()`
- **Date**: `z.date()`
- **Null**: `z.null()`
- **Undefined**: `z.undefined()`
- **Any**: `z.any()`
- **Unknown**: `z.unknown()`

### String Constraints

The factory respects various string constraints:

```typescript
const schema = z.object({
  email: z.string().email(),           // Generates valid email
  url: z.string().url(),               // Generates valid URL
  uuid: z.string().uuid(),             // Generates valid UUID
  minMax: z.string().min(5).max(20),   // Respects length constraints
  exact: z.string().length(10),        // Generates exact length
  pattern: z.string().regex(/^\d+$/),  // Basic regex support
});
```

### Number Constraints

```typescript
const schema = z.object({
  integer: z.number().int(),           // Generates integers
  positive: z.number().positive(),     // Generates positive numbers
  range: z.number().min(1).max(100),   // Respects min/max constraints
  intRange: z.number().int().min(1).max(10), // Integer within range
});
```

### Complex Types

#### Objects

```typescript
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string(),
  }),
});

const factory = createFactoryFromZod(UserSchema);
const user = factory.build();
```

#### Arrays

```typescript
const schema = z.object({
  tags: z.array(z.string()),                    // Array of strings
  numbers: z.array(z.number()).min(2).max(5),   // Array with length constraints
  users: z.array(UserSchema),                   // Array of complex objects
});
```

#### Records

```typescript
const schema = z.object({
  metadata: z.record(z.string()),        // Record with string values
  settings: z.record(z.boolean()),       // Record with boolean values
  config: z.record(z.string(), z.number()), // Record with specific key/value types
});
```

### Union Types

```typescript
const MediaSchema = z.union([
  z.object({
    type: z.literal('image'),
    url: z.string().url(),
    alt: z.string(),
  }),
  z.object({
    type: z.literal('video'),
    url: z.string().url(),
    duration: z.number(),
  }),
]);

const factory = createFactoryFromZod(MediaSchema);
const media = factory.build(); // Will be either image or video
```

### Intersection Types

```typescript
const BaseSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
});

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const UserWithBaseSchema = z.intersection(BaseSchema, UserSchema);
const factory = createFactoryFromZod(UserWithBaseSchema);
```

### Optional and Nullable Types

```typescript
const schema = z.object({
  required: z.string(),
  optional: z.string().optional(),     // 70% chance to be generated
  nullable: z.string().nullable(),     // 80% chance to be generated, 20% null
});
```

### Enums and Literals

```typescript
const schema = z.object({
  status: z.enum(['active', 'inactive', 'pending']),
  type: z.literal('user'),
  priority: z.union([z.literal('low'), z.literal('medium'), z.literal('high')]),
});
```

## Configuration Options

### Custom Generators

You can provide custom generators for specific schema fields using the `describe()` method:

```typescript
const ProductSchema = z.object({
  id: z.string().describe('productId'),
  name: z.string(),
  category: z.string().describe('categoryName'),
});

const factory = createFactoryFromZod(ProductSchema, {
  customGenerators: {
    productId: () => `PROD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    categoryName: () => {
      const categories = ['Electronics', 'Clothing', 'Books'];
      return categories[Math.floor(Math.random() * categories.length)];
    },
  },
});
```

### Locale and Randomizer Options

```typescript
import { de } from '@faker-js/faker';

const factory = createFactoryFromZod(schema, {
  locale: de,                    // Use German locale
  randomizer: customRandomizer,  // Use custom randomizer
});
```

## Factory Methods

The generated factory supports all the standard Factory methods:

### build()

Generate a single instance:

```typescript
const user = UserFactory.build();
const userWithOverrides = UserFactory.build({ name: 'John Doe' });
```

### batch()

Generate multiple instances:

```typescript
const users = UserFactory.batch(10);
const usersWithOverrides = UserFactory.batch(5, { isActive: true });
const usersWithIndividualOverrides = UserFactory.batch(3, [
  { name: 'Alice' },
  { name: 'Bob' },
  { name: 'Charlie' },
]);
```

### iterate() and sample()

Use the factory's built-in iteration and sampling methods:

```typescript
const statusGenerator = UserFactory.iterate(['active', 'inactive']);
const randomStatusGenerator = UserFactory.sample(['active', 'inactive', 'pending']);
```

## Advanced Examples

### Custom Zod Type Registration

Interface-forge supports registering custom handlers for extended Zod types from third-party packages. This is useful when you're using packages that extend Zod with custom types.

#### Registering Custom Types

```typescript
import { z } from 'zod';
import { registerZodType, createFactoryFromZod } from 'interface-forge/zod';

// Register a handler for BigInt
registerZodType('ZodBigInt', (schema, factory) => {
  return BigInt(factory.number.int({ min: 0, max: 1000000 }));
});

// Register a handler for custom validation
registerZodType('ZodNaN', (schema, factory) => {
  return NaN;
});

// Register a handler for functions
registerZodType('ZodFunction', (schema, factory) => {
  // Return a mock function
  return (input: any) => factory.lorem.word();
});

// Register a handler for Promises
registerZodType('ZodPromise', (schema, factory) => {
  const zodType = schema._def as Record<string, unknown>;
  const innerType = zodType.type as any;
  const innerValue = generateFactorySchema(innerType, factory, {});
  return Promise.resolve(innerValue);
});
```

#### Third-Party Package Integration

For packages like `zod-openapi`, `zod-form-data`, etc.:

```typescript
import { z } from 'zod';
import { extendZod } from 'zod-openapi'; // Example third-party package
import { registerZodType, createFactoryFromZod } from 'interface-forge/zod';

// Extend Zod with OpenAPI
const zodWithOpenApi = extendZod(z);

// Register a handler for the OpenAPI extension
registerZodType('ZodOpenApi', (schema, factory, config) => {
  const zodType = schema._def as Record<string, unknown>;
  
  // Extract the underlying Zod type
  const baseType = zodType.innerType || zodType.type;
  
  // Generate based on the underlying type
  if (baseType) {
    return generateFactorySchema(baseType, factory, config);
  }
  
  // Fallback to a default value
  return factory.lorem.word();
});

// Now you can use extended schemas
const OpenApiSchema = zodWithOpenApi.object({
  id: zodWithOpenApi.string().openapi({ example: 'user-123' }),
  name: zodWithOpenApi.string().openapi({ description: 'User name' }),
});

const factory = createFactoryFromZod(OpenApiSchema);
const user = factory.build();
```

#### Available Registration Functions

```typescript
import { 
  registerZodType, 
  unregisterZodType, 
  getRegisteredZodTypes, 
  clearZodTypeRegistry 
} from 'interface-forge/zod';

// Register a custom type
registerZodType('MyCustomType', (schema, factory, config) => {
  return 'custom-value';
});

// Get all registered types
const registeredTypes = getRegisteredZodTypes();
console.log(registeredTypes); // ['ZodBigInt', 'ZodNaN', 'MyCustomType', ...]

// Unregister a type
const wasRemoved = unregisterZodType('MyCustomType');
console.log(wasRemoved); // true

// Clear all registered types (useful for testing)
clearZodTypeRegistry();
```

#### Built-in Extended Types

Interface-forge comes with handlers for these extended Zod types:

- **ZodBigInt** - Generates random BigInt values
- **ZodNaN** - Returns NaN
- **ZodVoid** - Returns undefined  
- **ZodNever** - Throws an error (as expected)
- **ZodFunction** - Returns a mock function that generates random values
- **ZodPromise** - Returns a Promise resolving to the inner type
- **ZodLazy** - Resolves lazy schemas and generates for the resolved type

#### TypeScript Support

The registration system is fully typed:

```typescript
import type { ZodTypeHandler } from 'interface-forge/zod';

const myHandler: ZodTypeHandler = (schema, factory, config) => {
  // schema: ZodSchema (the Zod schema instance)
  // factory: Factory<unknown> (the factory instance for generating data)
  // config: ZodFactoryConfig (the factory configuration)
  
  return 'my-custom-value';
};

registerZodType('MyType', myHandler);
```

### Nested Schemas with References

```typescript
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  country: z.string(),
});

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  address: AddressSchema,
  workAddress: AddressSchema.optional(),
});

const CompanySchema = z.object({
  name: z.string(),
  employees: z.array(UserSchema).min(1).max(50),
  headquarters: AddressSchema,
});

const CompanyFactory = createFactoryFromZod(CompanySchema);
const company = CompanyFactory.build();
```

### Complex Validation Rules

```typescript
const OrderSchema = z.object({
  id: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
    price: z.number().positive(),
  })).min(1),
  total: z.number().positive(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered']),
  shippingAddress: AddressSchema,
  billingAddress: AddressSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
}).refine(data => data.updatedAt >= data.createdAt, {
  message: "Updated date must be after created date",
});

const OrderFactory = createFactoryFromZod(OrderSchema);
```

## Type Safety

The generated factories are fully type-safe and will infer the correct TypeScript types from your Zod schemas:

```typescript
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const UserFactory = createFactoryFromZod(UserSchema);

// TypeScript knows this is { name: string; age: number }
const user = UserFactory.build();

// TypeScript will enforce correct override types
const userWithOverrides = UserFactory.build({
  name: 'John',  // ✅ string is correct
  age: 25,       // ✅ number is correct
  // invalid: true  // ❌ TypeScript error: property doesn't exist
});
```

## Performance Considerations

- The factory generation is done once when `createFactoryFromZod` is called
- Subsequent `build()` and `batch()` calls are optimized for performance
- Complex schemas with deep nesting may take longer to generate
- Consider caching factories for frequently used schemas
- Custom type handlers are called for each generation, so keep them lightweight

## Limitations

- Regex patterns have limited support (basic email detection)
- Custom Zod refinements and transformations are not executed during generation
- Some advanced Zod features may not be fully supported
- Circular references in schemas are not handled

## Migration from Manual Factories

If you have existing manual factories, you can gradually migrate to Zod-based factories:

```typescript
// Before: Manual factory
const UserFactory = new Factory<User>((factory) => ({
  id: factory.string.uuid(),
  name: factory.person.firstName(),
  email: factory.internet.email(),
  age: factory.number.int({ min: 18, max: 65 }),
}));

// After: Zod-based factory
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(18).max(65),
});

const UserFactory = createFactoryFromZod(UserSchema);
```

## Best Practices

1. **Define schemas first**: Create your Zod schemas for validation, then generate factories
2. **Use descriptive names**: Use `.describe()` for fields that need custom generators
3. **Leverage constraints**: Use Zod's built-in constraints for realistic test data
4. **Cache factories**: Store factory instances to avoid recreation overhead
5. **Register custom types early**: Set up custom type handlers before creating factories
6. **Combine with existing factories**: Use Zod factories alongside manual factories as needed

## Troubleshooting

### Common Issues

**Issue**: Generated data doesn't match expected format
**Solution**: Check your Zod schema constraints and add custom generators if needed

**Issue**: TypeScript errors with complex schemas
**Solution**: Ensure your Zod schema is properly typed and consider breaking down complex schemas

**Issue**: Performance issues with large schemas
**Solution**: Consider using simpler schemas for testing or implement custom generators for expensive operations

**Issue**: Unknown Zod type warnings
**Solution**: Register a custom handler using `registerZodType()` for third-party Zod extensions

### Debug Mode

Enable debug logging to see what's being generated:

```typescript
const factory = createFactoryFromZod(schema, {
  customGenerators: {
    debug: () => {
      console.log('Generating debug field');
      return 'debug-value';
    },
  },
});
``` 