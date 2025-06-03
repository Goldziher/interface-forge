/* eslint-disable @typescript-eslint/no-unused-vars, no-console */
// This file is an example and variables are intentionally created for demonstration purposes

import { z } from 'zod';
import { createFactoryFromZod } from '../src/zod-factory.js';

// Example 1: Basic user schema
const UserSchema = z.object({
  age: z.number().int().min(18).max(120),
  createdAt: z.date(),
  email: z.string().email(),
  id: z.string().uuid(),
  isActive: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
  name: z.string().min(2),
  tags: z.array(z.string()).min(1).max(5),
});

const UserFactory = createFactoryFromZod(UserSchema);

// Generate a single user
const user = UserFactory.build();
console.log('Generated user:', user);

// Generate multiple users
const users = UserFactory.buildMany(5);
console.log('Generated users:', users);

// Example 2: Complex nested schema
const CommentSchema = z.object({
  author: z.string(),
  content: z.string().min(10),
  createdAt: z.date(),
  id: z.number(),
});

const PostSchema = z.object({
  author: z.object({
    bio: z.string().optional(),
    id: z.string().uuid(),
    name: z.string(),
  }),
  content: z.string().min(50),
  id: z.number(),
  metadata: z.object({
    comments: z.array(CommentSchema).min(0).max(20),
    likes: z.number().int().min(0),
    views: z.number().int().min(0),
  }),
  publishedAt: z.date().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  tags: z.array(z.string()).min(1).max(10),
  title: z.string().min(5).max(100),
});

const PostFactory = createFactoryFromZod(PostSchema);
const post = PostFactory.build();
console.log('Generated post:', post);

// Example 3: Union types
const ImageSchema = z.object({
  alt: z.string(),
  height: z.number().int().positive(),
  type: z.literal('image'),
  url: z.string().url(),
  width: z.number().int().positive(),
});

const VideoSchema = z.object({
  duration: z.number().positive(),
  thumbnail: z.string().url(),
  type: z.literal('video'),
  url: z.string().url(),
});

const AudioSchema = z.object({
  duration: z.number().positive(),
  title: z.string(),
  type: z.literal('audio'),
  url: z.string().url(),
});

const MediaSchema = z.union([ImageSchema, VideoSchema, AudioSchema]);

const MediaFactory = createFactoryFromZod(MediaSchema);
const media = MediaFactory.build();
console.log('Generated media:', media);

// Example 4: Custom generators
const ProductSchema = z.object({
  category: z.string().describe('product-category'),
  id: z.string().uuid().describe('product-id'),
  inStock: z.boolean(),
  name: z.string().describe('product-name'),
  price: z.number().positive().describe('product-price'),
});

const ProductFactory = createFactoryFromZod(ProductSchema, {
  customGenerators: {
    'product-category': () => ['Electronics', 'Computers', 'Audio'][Math.floor(Math.random() * 3)],
    'product-id': () => `PROD-${Math.random().toString(36).slice(2, 11)}`,
    'product-name': () => ['Laptop', 'Phone', 'Tablet', 'Headphones'][Math.floor(Math.random() * 4)],
    'product-price': () => Math.floor(Math.random() * 1000) + 100,
  },
});

const product = ProductFactory.build();
console.log('Generated product with custom generators:', product);

// Example 5: Array constraints
const TeamSchema = z.object({
  members: z.array(UserSchema).min(3).max(10),
  name: z.string(),
  projects: z.array(z.object({
    completed: z.boolean(),
    deadline: z.date(),
    name: z.string(),
  })).min(1).max(5),
});

const TeamFactory = createFactoryFromZod(TeamSchema);
const team = TeamFactory.build();
console.log('Generated team:', team);

// Example 6: Optional and nullable fields
const ConfigSchema = z.object({
  appName: z.string(),
  database: z.object({
    host: z.string(),
    password: z.string().nullable(),
    port: z.number().int(),
    ssl: z.boolean().optional(),
    username: z.string(),
  }),
  debug: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  maintenance: z.object({
    enabled: z.boolean(),
    message: z.string().optional(),
  }).optional(),
  version: z.string(),
});

const ConfigFactory = createFactoryFromZod(ConfigSchema);
const config = ConfigFactory.build();
console.log('Generated config:', config);

// Example 7: Intersection types
const BaseEntitySchema = z.object({
  createdAt: z.date(),
  id: z.string().uuid(),
  updatedAt: z.date(),
});

const PersonSchema = z.object({
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
});

const EmployeeDetailsSchema = z.object({
  department: z.string(),
  employeeId: z.string(),
  salary: z.number().positive(),
  startDate: z.date(),
});

const EmployeeSchema = BaseEntitySchema.and(PersonSchema).and(EmployeeDetailsSchema);

const EmployeeFactory = createFactoryFromZod(EmployeeSchema);
const employee = EmployeeFactory.build();
console.log('Generated employee:', employee);

// Example 8: Record types
const SettingsSchema = z.object({
  featureFlags: z.record(z.boolean()),
  thresholds: z.record(z.number()),
  userPreferences: z.record(z.string()),
});

const SettingsFactory = createFactoryFromZod(SettingsSchema);
const settings = SettingsFactory.build();
console.log('Generated settings:', settings);

export {
  ConfigFactory,
  EmployeeFactory,
  MediaFactory,
  PostFactory,
  ProductFactory,
  SettingsFactory,
  TeamFactory,
  UserFactory,
}; 