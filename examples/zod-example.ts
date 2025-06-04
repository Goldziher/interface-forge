/* eslint-disable @typescript-eslint/no-unused-vars, no-console */
// This file is an example and variables are intentionally created for demonstration purposes

import { z } from 'zod';
import { registerZodType, ZodFactory } from '../src/zod.js';

console.log('Running Zod Factory Examples...\n');

// Example 1: Basic User Schema
console.log('=== Basic User Schema ===');
const UserSchema = z.object({
  age: z.number().int().min(18).max(120),
  createdAt: z.date(),
  email: z.string().email(),
  id: z.string().uuid(),
  isActive: z.boolean(),
  name: z.string().min(1).max(100),
});

const userFactory = new ZodFactory(UserSchema);

console.log('Basic User Example:');
const user = userFactory.build();
console.log('Generated User:', user);

// Generate multiple users
const users = userFactory.batch(3);
console.log('Batch of 3 users:', users);

// Build with overrides
const customUser = userFactory.build({
  email: 'john.doe@example.com',
  name: 'John Doe'
});
console.log('User with overrides:', customUser);

// Example 2: Complex E-commerce Product Schema
const ProductSchema = z.object({
  category: z.enum(['electronics', 'clothing', 'books', 'home', 'sports']),
  createdAt: z.date(),
  description: z.string().optional(),
  id: z.string().uuid(),
  inStock: z.boolean(),
  name: z.string().min(1).max(200),
  price: z.number().min(0).max(99_999.99),
  ratings: z.object({
    average: z.number().min(1).max(5),
    count: z.number().int().min(0),
  }),
  tags: z.array(z.string()).min(1).max(10),
  updatedAt: z.date().optional(),
  variants: z.array(z.object({
    available: z.boolean(),
    id: z.string(),
    name: z.string(),
    price: z.number().min(0),
  })).optional(),
});

const productFactory = new ZodFactory(ProductSchema);

console.log('\n=== E-commerce Product Example ===');
const product = productFactory.build();
console.log('Generated Product:', JSON.stringify(product, null, 2));

// Example 3: Company with Employees (Complex Nested Schema)
const EmployeeSchema = z.object({
  department: z.enum(['engineering', 'marketing', 'sales', 'hr', 'finance']),
  email: z.string().email(),
  firstName: z.string().min(1),
  id: z.string().uuid(),
  isActive: z.boolean(),
  lastName: z.string().min(1),
  position: z.string(),
  salary: z.number().int().min(30_000).max(500_000),
  skills: z.array(z.string()).min(1).max(15),
  startDate: z.date(),
});

const CompanySchema = z.object({
  address: z.object({
    city: z.string(),
    country: z.string(),
    state: z.string(),
    street: z.string(),
    zipCode: z.string(),
  }),
  employees: z.array(EmployeeSchema).min(1).max(10),
  foundedAt: z.date(),
  id: z.string().uuid(),
  industry: z.string(),
  name: z.string().min(1),
  revenue: z.number().min(0).optional(),
  website: z.string().url().optional(),
});

const companyFactory = new ZodFactory(CompanySchema);

console.log('\n=== Complex Company Example ===');
const company = companyFactory.build();
console.log('Generated Company:');
console.log(`Name: ${company.name}`);
console.log(`Industry: ${company.industry}`);
console.log(`Employees: ${company.employees.length}`);
console.log(`Address: ${company.address.city}, ${company.address.state}`);
console.log('First Employee:', {
  department: company.employees[0].department,
  name: `${company.employees[0].firstName} ${company.employees[0].lastName}`,
  position: company.employees[0].position,
  salary: company.employees[0].salary,
});

// Example 4: Union Types
const EventSchema = z.union([
  z.object({
    coordinates: z.object({
      x: z.number(),
      y: z.number(),
    }),
    element: z.string(),
    timestamp: z.date(),
    type: z.literal('click'),
  }),
  z.object({
    direction: z.enum(['up', 'down']),
    position: z.number(),
    timestamp: z.date(),
    type: z.literal('scroll'),
  }),
  z.object({
    key: z.string(),
    modifiers: z.array(z.enum(['ctrl', 'alt', 'shift'])).optional(),
    timestamp: z.date(),
    type: z.literal('keypress'),
  }),
]);

const eventFactory = new ZodFactory(EventSchema);

console.log('\n=== Union Types Example ===');
const events = eventFactory.batch(5);
events.forEach((event, index) => {
  console.log(`Event ${index + 1}:`, event);
});

// Example 5: Custom Generators
const OrderSchema = z.object({
  createdAt: z.date(),
  customerId: z.string().describe('customer-id'),
  id: z.string().describe('order-id'),
  notes: z.string().optional(),
  productId: z.string().describe('product-id'),
  quantity: z.number().int().min(1).max(100),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  total: z.number().min(0),
});

const orderFactory = new ZodFactory(OrderSchema, {
  customGenerators: {
    'customer-id': () => `CUST-${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
    'order-id': () => `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    'product-id': () => `PROD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
  },
});

console.log('\n=== Custom Generators Example ===');
const order = orderFactory.build();
console.log('Generated Order with Custom IDs:', order);

// Example 6: Array Constraints
const PlaylistSchema = z.object({
  createdAt: z.date(),
  createdBy: z.string().uuid(),
  description: z.string().optional(),
  id: z.string().uuid(),
  isPublic: z.boolean(),
  name: z.string().min(1).max(100),
  songs: z.array(z.object({
    artist: z.string().min(1),
    duration: z.number().int().min(1).max(600), // 1 second to 10 minutes
    genre: z.enum(['rock', 'pop', 'jazz', 'classical', 'electronic', 'hip-hop']),
    id: z.string().uuid(),
    title: z.string().min(1),
  })).min(3).max(20),
});

const playlistFactory = new ZodFactory(PlaylistSchema);

console.log('\n=== Array Constraints Example ===');
const playlist = playlistFactory.build();
console.log('Generated Playlist:');
console.log(`Name: ${playlist.name}`);
console.log(`Songs: ${playlist.songs.length}`);
console.log('Sample Songs:');
playlist.songs.slice(0, 3).forEach((song, index) => {
  console.log(`  ${index + 1}. ${song.title} by ${song.artist} (${song.genre}) - ${song.duration}s`);
});

// Example 7: Optional and Nullable Fields
const UserProfileSchema = z.object({
  avatar: z.string().url().optional(),
  bio: z.string().max(500).nullable(),
  createdAt: z.date(),
  displayName: z.string().optional(),
  email: z.string().email(),
  id: z.string().uuid(),
  lastLoginAt: z.date().nullable(),
  settings: z.object({
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean().optional(),
    }),
    privacy: z.object({
      profileVisibility: z.enum(['public', 'friends', 'private']),
      showEmail: z.boolean(),
    }).optional(),
    theme: z.enum(['light', 'dark']).optional(),
  }),
  socialLinks: z.array(z.object({
    platform: z.enum(['twitter', 'linkedin', 'github', 'website']),
    url: z.string().url(),
  })).optional(),
  username: z.string().min(3).max(30),
});

const userProfileFactory = new ZodFactory(UserProfileSchema);

console.log('\n=== Optional and Nullable Fields Example ===');
const profiles = userProfileFactory.batch(3);
profiles.forEach((profile, index) => {
  console.log(`Profile ${index + 1}:`);
  console.log(`  Username: ${profile.username}`);
  console.log(`  Display Name: ${profile.displayName ?? 'Not set'}`);
  console.log(`  Bio: ${profile.bio ?? 'Not set'}`);
  console.log(`  Theme: ${profile.settings.theme ?? 'Default'}`);
  console.log(`  Social Links: ${profile.socialLinks?.length ?? 0}`);
  console.log(`  Last Login: ${profile.lastLoginAt ? profile.lastLoginAt.toISOString() : 'Never'}`);
});

// Example 8: Performance Testing
console.log('\n=== Performance Testing ===');
const SimpleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  timestamp: z.date(),
  value: z.number(),
});

const simpleFactory = new ZodFactory(SimpleSchema);

console.log('Generating 1000 simple objects...');
const startTime = Date.now();
const simpleObjects = simpleFactory.batch(1000);
const endTime = Date.now();

console.log(`Generated 1000 objects in ${endTime - startTime}ms`);
console.log('Sample objects:');
simpleObjects.slice(0, 3).forEach((obj, index) => {
  console.log(`  ${index + 1}. ID: ${obj.id.slice(0, 8)}..., Name: ${obj.name}, Value: ${obj.value}`);
});

// Example 9: Validation Testing
console.log('\n=== Validation Testing ===');
const StrictSchema = z.object({
  age: z.number().int().min(18).max(100),
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  website: z.string().url().optional(),
});

const strictFactory = new ZodFactory(StrictSchema);

console.log('Testing validation of generated data...');
const testObjects = strictFactory.batch(10);
let validCount = 0;

testObjects.forEach((obj, index) => {
  try {
    StrictSchema.parse(obj);
    validCount++;
    console.log(`✓ Object ${index + 1}: Valid`);
  } catch (error) {
    console.log(`✗ Object ${index + 1}: Invalid -`, error);
  }
});

console.log(`\nValidation Results: ${validCount}/${testObjects.length} objects passed validation`);

console.log('\n=== Custom Zod Type Registration Examples ===');

// Example: Registering BigInt support
registerZodType('ZodBigInt', (schema, factory) => {
  return BigInt(factory.number.int({ max: 1_000_000, min: 0 }));
});

// Create a mock BigInt schema (since z.bigint() might not be available in all Zod versions)
const bigIntSchema = {
  _def: {},
  constructor: { name: 'ZodBigInt' }
} as unknown;

const bigIntFactory = new ZodFactory(bigIntSchema as z.ZodTypeAny);
const bigIntValue = bigIntFactory.build();
console.log('Generated BigInt:', bigIntValue, 'Type:', typeof bigIntValue);

// Example: Third-party package simulation (like zod-openapi)
registerZodType('ZodOpenApi', (schema, factory, _config) => {
  const zodType = schema._def as Record<string, unknown>;
  
  // Simulate extracting metadata from OpenAPI extension
  const openApiMeta = zodType.openapi as { description?: string; example?: unknown; } | undefined;
  
  if (openApiMeta?.example) {
    return openApiMeta.example;
  }
  
  // Extract the underlying type
  const baseType = zodType.innerType || zodType.type;
  
  if (baseType && typeof baseType === 'object' && 'constructor' in baseType) {
    const typeName = (baseType.constructor as { name: string }).name;
    if (typeName === 'ZodString') {
      return factory.lorem.sentence();
    }
    if (typeName === 'ZodNumber') {
      return factory.number.float({ max: 1000, min: 0 });
    }
  }
  
  return factory.lorem.word();
});

// Create a mock OpenAPI-extended schema
const openApiSchema = {
  _def: {
    innerType: z.string(),
    openapi: {
      description: 'A user description',
      example: 'John Doe from OpenAPI example'
    }
  },
  constructor: { name: 'ZodOpenApi' }
} as unknown;

const openApiFactory = new ZodFactory(openApiSchema as z.ZodTypeAny);
const openApiValue = openApiFactory.build();
console.log('Generated OpenAPI value:', openApiValue);

// Example: Custom validation type
registerZodType('ZodCustomValidation', (schema, factory) => {
  const zodType = schema._def as Record<string, unknown>;
  const validationType = zodType.validationType as string;
  
  switch (validationType) {
    case 'credit-card': {
      return factory.finance.creditCardNumber();
    }
    case 'email': {
      return factory.internet.email();
    }
    case 'phone': {
      return factory.phone.number();
    }
    case 'uuid': {
      return factory.string.uuid();
    }
    default: {
      return factory.lorem.word();
    }
  }
});

const customValidationSchema = {
  _def: {
    validationType: 'email'
  },
  constructor: { name: 'ZodCustomValidation' }
} as unknown;

const customValidationFactory = new ZodFactory(customValidationSchema as z.ZodTypeAny);
const customValidationValue = customValidationFactory.build();
console.log('Generated custom validation value:', customValidationValue);

// Example: Extending existing object schemas with custom metadata
registerZodType('ZodWithMetadata', (schema, factory, _config) => {
  const zodType = schema._def as Record<string, unknown>;
  const baseSchema = zodType.baseSchema as z.ZodObject<z.ZodRawShape>;
  const metadata = zodType.metadata as Record<string, unknown>;
  
  // For this example, we'll create a simple object instead of using internal functions
  const baseResult: Record<string, unknown> = {
    email: factory.internet.email(),
    name: factory.person.fullName(),
  };
  
  // Add metadata fields
  if (metadata?.includeTimestamps) {
    baseResult.createdAt = factory.date.recent();
    baseResult.updatedAt = factory.date.recent();
  }
  
  if (metadata?.includeId) {
    baseResult.id = factory.string.uuid();
  }
  
  return baseResult;
});

const withMetadataSchema = {
  _def: {
    baseSchema: z.object({
      email: z.string().email(),
      name: z.string(),
    }),
    metadata: {
      includeId: true,
      includeTimestamps: true,
    }
  },
  constructor: { name: 'ZodWithMetadata' }
} as unknown;

const withMetadataFactory = new ZodFactory(withMetadataSchema as z.ZodTypeAny);
const withMetadataValue = withMetadataFactory.build();
console.log('Generated with metadata:', withMetadataValue);

console.log('\n=== Custom Type Registration Complete ===');

console.log('\n=== All Examples Completed ==='); 