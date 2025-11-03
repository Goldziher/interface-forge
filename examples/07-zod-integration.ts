// ZodFactory automatically supports both Zod v3 and v4
import { z } from 'zod/v4'; // Or: import { z } from 'zod'; for v3
import { ZodFactory } from 'interface-forge/zod';

// Define a comprehensive user schema with various Zod types
const AddressSchema = z.object({
    city: z.string().min(2).max(50),
    country: z.string().default('USA'),
    state: z.string().length(2).toUpperCase(),
    street: z.string().min(5).max(100),
    zipCode: z.string().regex(/^\d{5}$/),
});

const UserProfileSchema = z.object({
    address: AddressSchema,
    age: z.number().int().min(18).max(120),
    avatar: z.url().nullable(),
    bio: z.string().max(500).nullable(),
    email: z.email(),
    id: z.uuid(),
    isActive: z.boolean(),
    metadata: z.object({
        createdAt: z.date(),
        lastLoginAt: z.date().nullable(),
        loginCount: z.number().int().min(0),
        tags: z.array(z.string()).default([]),
        updatedAt: z.date(),
    }),
    permissions: z.array(z.string()).min(1),
    phoneNumber: z
        .string()
        .regex(/^\+?[\d\s-()]+$/)
        .optional(),
    preferences: z.object({
        language: z.enum(['en', 'es', 'fr', 'de']),
        notifications: z.object({
            email: z.boolean(),
            push: z.boolean(),
            sms: z.boolean(),
        }),
        privacy: z.enum(['public', 'friends', 'private']),
        theme: z.enum(['light', 'dark', 'auto']),
    }),
    role: z.enum(['admin', 'moderator', 'user']),
    settings: z.map(z.string(), z.unknown()),
    socialLinks: z.record(z.string(), z.url()).optional(),
    username: z
        .string()
        .min(3)
        .max(20)
        .regex(/^[a-zA-Z0-9_]+$/),
    website: z.url().optional(),
});

// Create a factory instance
const userFactory = new ZodFactory(UserProfileSchema);

// Example 1: Generate a single user
console.log('=== Example 1: Single User ===');
const singleUser = userFactory.build();
console.log('Generated user:', JSON.stringify(singleUser, null, 2));

// Example 2: Generate with overrides
console.log('\n=== Example 2: User with Overrides ===');
const adminUser = userFactory.build({
    permissions: ['read', 'write', 'delete', 'manage_users'],
    role: 'admin',
    username: 'admin_user',
});
console.log('Admin user:', JSON.stringify(adminUser, null, 2));

// Example 3: Generate multiple users
console.log('\n=== Example 3: Batch Generation ===');
const users = userFactory.batch(3);
console.log(`Generated ${users.length} users`);
users.forEach((user, index) => {
    console.log(`User ${index + 1}: ${user.username} (${user.role})`);
});

// Example 4: Using partial factory functions for dynamic data
// The factory function only needs to define the fields you want to customize
// All other fields will be auto-generated from the schema
const dynamicUserFactory = new ZodFactory(UserProfileSchema, (factory) => ({
    bio: factory.lorem.paragraph(),
    email: factory.internet.email(),
    metadata: {
        createdAt: factory.date.past(),
        lastLoginAt: factory.datatype.boolean() ? factory.date.recent() : null,
        loginCount: factory.number.int({ max: 1000, min: 0 }),
        tags: factory.helpers.multiple(() => factory.lorem.word(), {
            count: 3,
        }),
        updatedAt: factory.date.recent(),
    },
    // Only customize these specific fields
    username: factory.helpers
        .slugify(`${factory.person.firstName()}_${factory.person.lastName()}`)
        .toLowerCase(),
    // All other required fields (id, age, phoneNumber, etc.) are auto-generated
}));

console.log('\n=== Example 4: Dynamic Factory Function ===');
const dynamicUser = dynamicUserFactory.build();
console.log('Dynamic user:', JSON.stringify(dynamicUser, null, 2));

// Example 5: Complex nested schemas
const BlogPostSchema = z.object({
    author: UserProfileSchema,
    categories: z.array(z.enum(['tech', 'lifestyle', 'business', 'health'])),
    comments: z
        .array(
            z.object({
                author: z.object({
                    email: z.email(),
                    name: z.string(),
                }),
                content: z.string().min(1).max(1000),
                createdAt: z.date(),
                id: z.uuid(),
                likes: z.number().int().min(0),
            }),
        )
        .default([]),
    content: z.string().min(100),
    excerpt: z.string().max(300),
    id: z.uuid(),
    metadata: z.object({
        likes: z.number().int().min(0),
        readTime: z.number().int().min(1).describe('Read time in minutes'),
        shares: z.number().int().min(0),
        views: z.number().int().min(0),
    }),
    publishedAt: z.date().nullable(),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    status: z.enum(['draft', 'published', 'archived']),
    tags: z.array(z.string()).min(1).max(10),
    title: z.string().min(10).max(200),
});

const blogPostFactory = new ZodFactory(BlogPostSchema);

console.log('\n=== Example 5: Complex Nested Schema ===');
const blogPost = blogPostFactory.build({
    publishedAt: new Date(),
    slug: 'typescript-zod-tutorial',
    status: 'published',
    title: 'Getting Started with TypeScript and Zod',
});
console.log('Blog post:', JSON.stringify(blogPost, null, 2));

// Example 6: Using generators for custom field generation
// Note: This example shows how to use custom generators with metadata
// The generators option is part of ZodFactoryOptions

// Add metadata to schema fields to use custom generators
const CustomUserSchema = UserProfileSchema.extend({
    email: z.email().describe('customEmail'),
    id: z.uuid().describe('userId'),
});

const customFactory = new ZodFactory(CustomUserSchema, {
    generators: {
        customEmail: () => `user_${Date.now()}@example.com`,
        userId: () =>
            `USR_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    },
});

console.log('\n=== Example 6: Custom Generators ===');
const customUser = customFactory.build();
console.log('Custom user ID:', customUser.id);
console.log('Custom email:', customUser.email);

// Example 7: Working with unions and discriminated unions
const NotificationSchema = z.discriminatedUnion('type', [
    z.object({
        body: z.string(),
        cc: z.array(z.email()).optional(),
        subject: z.string(),
        to: z.email(),
        type: z.literal('email'),
    }),
    z.object({
        message: z.string().max(160),
        phoneNumber: z.string().regex(/^\+\d{10,15}$/),
        type: z.literal('sms'),
    }),
    z.object({
        body: z.string().max(250),
        data: z.record(z.string(), z.unknown()).optional(),
        title: z.string().max(100),
        type: z.literal('push'),
    }),
]);

const NotificationSystemSchema = z.object({
    notifications: z.array(NotificationSchema).min(1),
    preferences: z.object({
        channels: z.array(z.enum(['email', 'sms', 'push'])).min(1),
        quietHours: z.object({
            enabled: z.boolean(),
            end: z.string().regex(/^\d{2}:\d{2}$/),
            start: z.string().regex(/^\d{2}:\d{2}$/),
        }),
    }),
    userId: z.uuid(),
});

const notificationFactory = new ZodFactory(NotificationSystemSchema);

console.log('\n=== Example 7: Discriminated Unions ===');
const notificationSystem = notificationFactory.build();
console.log(
    'Notification system:',
    JSON.stringify(notificationSystem, null, 2),
);

// Example 8: Recursive schemas with depth control
interface Category {
    children: Category[];
    id: string;
    name: string;
    parentId: null | string;
    slug: string;
}

const CategorySchema: z.ZodType<Category> = z.lazy(() =>
    z.object({
        children: z.array(CategorySchema),
        id: z.uuid(),
        name: z.string().min(2).max(50),
        parentId: z.uuid().nullable(),
        slug: z.string().regex(/^[a-z0-9-]+$/),
    }),
);

const RootCategorySchema = z.object({
    categories: z.array(CategorySchema),
});

// Use maxDepth to control recursion
const categoryFactory = new ZodFactory(RootCategorySchema, { maxDepth: 3 });

console.log('\n=== Example 8: Recursive Schemas ===');
const categoryTree = categoryFactory.build();
console.log('Category tree:', JSON.stringify(categoryTree, null, 2));

// Example 9: Working with transformations
const TransformSchema = z.object({
    age: z.number().transform((val) => Math.max(0, val)),
    email: z.email().transform((val) => val.toLowerCase()),
    name: z.string().transform((val) => val.trim().toLowerCase()),
    tags: z
        .array(z.string())
        .transform((arr) => [...new Set(arr)]) // Remove duplicates
        .transform((arr) => arr.toSorted()), // Sort alphabetically
});

// Note: Transformations are applied by Zod during parsing,
// not during generation, but the factory will generate valid input
const transformFactory = new ZodFactory(TransformSchema);

console.log('\n=== Example 9: Schemas with Transformations ===');
const transformedData = transformFactory.build();
console.log('Generated data (before transform):', transformedData);

// Example 10: Using hooks for data enrichment
const hookedUserFactory = new ZodFactory(UserProfileSchema)
    .beforeBuild((params) => {
        console.log('Before build hook - params:', params);
        // For metadata field, we need to provide all required properties
        return {
            ...params,
            metadata: {
                createdAt: new Date('2024-01-01'),
                lastLoginAt: null,
                loginCount: 0,
                tags: params.metadata?.tags ?? [],
                updatedAt: new Date('2024-01-01'),
            },
        };
    })
    .afterBuild((user) => {
        console.log('After build hook - adding computed fields');
        return {
            ...user,
            fullAddress: `${user.address.street}, ${user.address.city}, ${user.address.state} ${user.address.zipCode}`,
            isAdmin: user.role === 'admin',
        };
    });

console.log('\n=== Example 10: Using Hooks ===');
const hookedUser = hookedUserFactory.build();
console.log('User with computed fields:', {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    fullAddress: (hookedUser as any).fullAddress,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    isAdmin: (hookedUser as any).isAdmin,
    username: hookedUser.username,
});

// Validate that all generated data passes Zod validation
console.log('\n=== Validation Check ===');
try {
    UserProfileSchema.parse(singleUser);
    console.log('✓ Single user passes validation');

    BlogPostSchema.parse(blogPost);
    console.log('✓ Blog post passes validation');

    NotificationSystemSchema.parse(notificationSystem);
    console.log('✓ Notification system passes validation');

    console.log('\nAll generated data is valid according to Zod schemas!');
} catch (error) {
    console.error('Validation error:', error);
}
