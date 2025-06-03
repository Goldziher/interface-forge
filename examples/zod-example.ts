/* eslint-disable @typescript-eslint/no-unused-vars, no-console */
// This file is an example and variables are intentionally created for demonstration purposes

import { z } from 'zod';
import { createFactoryFromZod, registerZodType } from '../src/zod.js';

// Example 1: Basic User Schema
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
  isActive: z.boolean(),
  createdAt: z.date(),
});

const userFactory = createFactoryFromZod(UserSchema);

console.log('=== Basic User Example ===');
const user = userFactory.build();
console.log('Generated User:', user);

// Generate multiple users
const users = userFactory.batch(3);
console.log('Batch of 3 users:', users);

// Build with overrides
const customUser = userFactory.build({
  name: 'John Doe',
  email: 'john.doe@example.com'
});
console.log('User with overrides:', customUser);

// Example 2: Complex E-commerce Product Schema
const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().min(0).max(99999.99),
  category: z.enum(['electronics', 'clothing', 'books', 'home', 'sports']),
  inStock: z.boolean(),
  tags: z.array(z.string()).min(1).max(10),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().min(0),
    available: z.boolean(),
  })).optional(),
  ratings: z.object({
    average: z.number().min(1).max(5),
    count: z.number().int().min(0),
  }),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

const productFactory = createFactoryFromZod(ProductSchema);

console.log('\n=== E-commerce Product Example ===');
const product = productFactory.build();
console.log('Generated Product:', JSON.stringify(product, null, 2));

// Example 3: Company with Employees (Complex Nested Schema)
const EmployeeSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  position: z.string(),
  department: z.enum(['engineering', 'marketing', 'sales', 'hr', 'finance']),
  salary: z.number().int().min(30000).max(500000),
  startDate: z.date(),
  isActive: z.boolean(),
  skills: z.array(z.string()).min(1).max(15),
});

const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  website: z.string().url().optional(),
  employees: z.array(EmployeeSchema).min(1).max(10),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
  }),
  foundedAt: z.date(),
  industry: z.string(),
  revenue: z.number().min(0).optional(),
});

const companyFactory = createFactoryFromZod(CompanySchema);

console.log('\n=== Complex Company Example ===');
const company = companyFactory.build();
console.log('Generated Company:');
console.log(`Name: ${company.name}`);
console.log(`Industry: ${company.industry}`);
console.log(`Employees: ${company.employees.length}`);
console.log(`Address: ${company.address.city}, ${company.address.state}`);
console.log('First Employee:', {
  name: `${company.employees[0].firstName} ${company.employees[0].lastName}`,
  position: company.employees[0].position,
  department: company.employees[0].department,
  salary: company.employees[0].salary,
});

// Example 4: Union Types
const EventSchema = z.union([
  z.object({
    type: z.literal('click'),
    element: z.string(),
    timestamp: z.date(),
    coordinates: z.object({
      x: z.number(),
      y: z.number(),
    }),
  }),
  z.object({
    type: z.literal('scroll'),
    position: z.number(),
    timestamp: z.date(),
    direction: z.enum(['up', 'down']),
  }),
  z.object({
    type: z.literal('keypress'),
    key: z.string(),
    timestamp: z.date(),
    modifiers: z.array(z.enum(['ctrl', 'alt', 'shift'])).optional(),
  }),
]);

const eventFactory = createFactoryFromZod(EventSchema);

console.log('\n=== Union Types Example ===');
const events = eventFactory.batch(5);
events.forEach((event, index) => {
  console.log(`Event ${index + 1}:`, event);
});

// Example 5: Custom Generators
const OrderSchema = z.object({
  id: z.string().describe('order-id'),
  customerId: z.string().describe('customer-id'),
  productId: z.string().describe('product-id'),
  quantity: z.number().int().min(1).max(100),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  total: z.number().min(0),
  createdAt: z.date(),
  notes: z.string().optional(),
});

const orderFactory = createFactoryFromZod(OrderSchema, {
  customGenerators: {
    'order-id': () => `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    'customer-id': () => `CUST-${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
    'product-id': () => `PROD-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
  },
});

console.log('\n=== Custom Generators Example ===');
const order = orderFactory.build();
console.log('Generated Order with Custom IDs:', order);

// Example 6: Array Constraints
const PlaylistSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  songs: z.array(z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    artist: z.string().min(1),
    duration: z.number().int().min(1).max(600), // 1 second to 10 minutes
    genre: z.enum(['rock', 'pop', 'jazz', 'classical', 'electronic', 'hip-hop']),
  })).min(3).max(20),
  isPublic: z.boolean(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
});

const playlistFactory = createFactoryFromZod(PlaylistSchema);

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
  id: z.string().uuid(),
  username: z.string().min(3).max(30),
  email: z.string().email(),
  displayName: z.string().optional(),
  bio: z.string().max(500).nullable(),
  avatar: z.string().url().optional(),
  settings: z.object({
    theme: z.enum(['light', 'dark']).optional(),
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean().optional(),
    }),
    privacy: z.object({
      profileVisibility: z.enum(['public', 'friends', 'private']),
      showEmail: z.boolean(),
    }).optional(),
  }),
  socialLinks: z.array(z.object({
    platform: z.enum(['twitter', 'linkedin', 'github', 'website']),
    url: z.string().url(),
  })).optional(),
  lastLoginAt: z.date().nullable(),
  createdAt: z.date(),
});

const userProfileFactory = createFactoryFromZod(UserProfileSchema);

console.log('\n=== Optional and Nullable Fields Example ===');
const profiles = userProfileFactory.batch(3);
profiles.forEach((profile, index) => {
  console.log(`Profile ${index + 1}:`);
  console.log(`  Username: ${profile.username}`);
  console.log(`  Display Name: ${profile.displayName || 'Not set'}`);
  console.log(`  Bio: ${profile.bio || 'Not set'}`);
  console.log(`  Theme: ${profile.settings.theme || 'Default'}`);
  console.log(`  Social Links: ${profile.socialLinks?.length || 0}`);
  console.log(`  Last Login: ${profile.lastLoginAt ? profile.lastLoginAt.toISOString() : 'Never'}`);
});

// Example 8: Performance Testing
console.log('\n=== Performance Testing ===');
const SimpleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  value: z.number(),
  timestamp: z.date(),
});

const simpleFactory = createFactoryFromZod(SimpleSchema);

console.log('Generating 1000 simple objects...');
const startTime = Date.now();
const simpleObjects = simpleFactory.batch(1000);
const endTime = Date.now();

console.log(`Generated 1000 objects in ${endTime - startTime}ms`);
console.log('Sample objects:');
simpleObjects.slice(0, 3).forEach((obj, index) => {
  console.log(`  ${index + 1}. ID: ${obj.id.substr(0, 8)}..., Name: ${obj.name}, Value: ${obj.value}`);
});

// Example 9: Validation Testing
console.log('\n=== Validation Testing ===');
const StrictSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(18).max(100),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  website: z.string().url().optional(),
});

const strictFactory = createFactoryFromZod(StrictSchema);

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
  return BigInt(factory.number.int({ min: 0, max: 1000000 }));
});

// Create a mock BigInt schema (since z.bigint() might not be available in all Zod versions)
const bigIntSchema = {
  constructor: { name: 'ZodBigInt' },
  _def: {}
} as any;

const bigIntFactory = createFactoryFromZod(bigIntSchema);
const bigIntValue = bigIntFactory.build();
console.log('Generated BigInt:', bigIntValue, 'Type:', typeof bigIntValue);

// Example: Third-party package simulation (like zod-openapi)
registerZodType('ZodOpenApi', (schema, factory, config) => {
  const zodType = schema._def as Record<string, unknown>;
  
  // Simulate extracting metadata from OpenAPI extension
  const openApiMeta = zodType.openapi as { example?: unknown; description?: string };
  
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
      return factory.number.float({ min: 0, max: 1000 });
    }
  }
  
  return factory.lorem.word();
});

// Create a mock OpenAPI-extended schema
const openApiSchema = {
  constructor: { name: 'ZodOpenApi' },
  _def: {
    innerType: z.string(),
    openapi: {
      description: 'A user description',
      example: 'John Doe from OpenAPI example'
    }
  }
} as any;

const openApiFactory = createFactoryFromZod(openApiSchema);
const openApiValue = openApiFactory.build();
console.log('Generated OpenAPI value:', openApiValue);

// Example: Custom validation type
registerZodType('ZodCustomValidation', (schema, factory) => {
  const zodType = schema._def as Record<string, unknown>;
  const validationType = zodType.validationType as string;
  
  switch (validationType) {
    case 'email':
      return factory.internet.email();
    case 'phone':
      return factory.phone.number();
    case 'uuid':
      return factory.string.uuid();
    case 'credit-card':
      return factory.finance.creditCardNumber();
    default:
      return factory.lorem.word();
  }
});

const customValidationSchema = {
  constructor: { name: 'ZodCustomValidation' },
  _def: {
    validationType: 'email'
  }
} as any;

const customValidationFactory = createFactoryFromZod(customValidationSchema);
const customValidationValue = customValidationFactory.build();
console.log('Generated custom validation value:', customValidationValue);

// Example: Extending existing object schemas with custom metadata
registerZodType('ZodWithMetadata', (schema, factory, config) => {
  const zodType = schema._def as Record<string, unknown>;
  const baseSchema = zodType.baseSchema as z.ZodObject<any>;
  const metadata = zodType.metadata as Record<string, unknown>;
  
  // For this example, we'll create a simple object instead of using internal functions
  const baseResult: Record<string, unknown> = {
    name: factory.person.fullName(),
    email: factory.internet.email(),
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
  constructor: { name: 'ZodWithMetadata' },
  _def: {
    baseSchema: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    metadata: {
      includeTimestamps: true,
      includeId: true,
    }
  }
} as any;

const withMetadataFactory = createFactoryFromZod(withMetadataSchema);
const withMetadataValue = withMetadataFactory.build();
console.log('Generated with metadata:', withMetadataValue);

console.log('\n=== Custom Type Registration Complete ===');

console.log('\n=== All Examples Completed ==='); 