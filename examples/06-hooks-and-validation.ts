/**
 * Example 06: Hooks and Validation
 *
 * This example demonstrates how to use beforeBuild and afterBuild hooks
 * to add validation, data transformation, and business logic to your factories.
 *
 * Topics covered:
 * - Using synchronous hooks with build()
 * - Using asynchronous hooks with buildAsync()
 * - Data validation and transformation
 * - Conditional logic in hooks
 * - Error handling with hooks
 */

import { Factory } from '../src';

// Example 1: Basic data transformation with synchronous hooks
interface User {
    createdAt: Date;
    email: string;
    id: string;
    isActive: boolean;
    role: 'admin' | 'guest' | 'user';
    username: string;
}

const UserFactory = new Factory<User>((factory) => ({
    createdAt: factory.date.recent(),
    email: '',
    id: factory.string.uuid(),
    isActive: true,
    role: 'user',
    username: '',
}))
    .beforeBuild((params) => {
        // Auto-generate email and username if not provided
        if (!params.email && params.username) {
            params.email = `${params.username}@example.com`;
        } else if (!params.username && params.email) {
            [params.username] = params.email.split('@');
        } else if (!params.email && !params.username) {
            const randomUsername = `user_${Date.now()}`;
            params.email = `${randomUsername}@example.com`;
            params.username = randomUsername;
        }
        return params;
    })
    .afterBuild((user) => {
        // Ensure email and username are lowercase
        user.email = user.email.toLowerCase();
        user.username = user.username.toLowerCase();
        return user;
    });

// Using synchronous hooks
const user1 = UserFactory.build({ username: 'JohnDoe' });
console.log('User 1:', user1);
// email: 'johndoe@example.com', username: 'johndoe'

const user2 = UserFactory.build({ email: 'Jane.Smith@company.com' });
console.log('User 2:', user2);
// email: 'jane.smith@company.com', username: 'jane.smith'

// Example 2: Async hooks for external validation
interface Product {
    category: string;
    id: string;
    isApproved: boolean;
    name: string;
    price: number;
    sku: string;
}

async function checkPriceRange(
    category: string,
    price: number,
): Promise<boolean> {
    // Simulate database lookup
    await new Promise((resolve) => setTimeout(resolve, 10));
    const priceRanges: Record<string, [number, number]> = {
        books: [5, 100],
        clothing: [10, 500],
        electronics: [50, 5000],
    };
    const range = priceRanges[category] ?? [0, 10_000];
    return price >= range[0] && price <= range[1];
}

// Simulated external services
async function validateSKU(sku: string): Promise<boolean> {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 10));
    return /^[A-Z]{3}-\d{4}$/.test(sku);
}

const ProductFactory = new Factory<Product>((factory) => ({
    category: factory.helpers.arrayElement([
        'electronics',
        'books',
        'clothing',
    ]),
    id: factory.string.uuid(),
    isApproved: false,
    name: factory.commerce.productName(),
    price: factory.number.float({ fractionDigits: 2, max: 1000, min: 10 }),
    sku: '',
}))
    .beforeBuild((params) => {
        // Generate SKU if not provided
        if (!params.sku) {
            const category = params.category ?? 'GEN';
            const code = Math.floor(Math.random() * 10_000)
                .toString()
                .padStart(4, '0');
            params.sku = `${category.slice(0, 3).toUpperCase()}-${code}`;
        }
        return params;
    })
    .afterBuild(async (product) => {
        // Validate SKU format
        const isValidSKU = await validateSKU(product.sku);
        if (!isValidSKU) {
            throw new Error(`Invalid SKU format: ${product.sku}`);
        }

        // Validate price range
        const isPriceValid = await checkPriceRange(
            product.category,
            product.price,
        );
        if (!isPriceValid) {
            throw new Error(
                `Price ${product.price} is out of range for category ${product.category}`,
            );
        }

        // Approve product if all validations pass
        product.isApproved = true;
        return product;
    });

// This will throw ConfigurationError because we have async hooks
try {
    ProductFactory.build();
} catch (error) {
    console.log(
        'Expected error:',
        error instanceof Error ? error.message : String(error),
    );
    // "Async hooks detected. Use buildAsync() method to build instances with async hooks."
}

// Use buildAsync for async hooks
const createProducts = async () => {
    const product = await ProductFactory.buildAsync();
    console.log('Validated product:', product);

    // Test validation error
    try {
        await ProductFactory.buildAsync({
            category: 'books',
            price: 10_000,
            sku: 'INVALID-SKU',
        });
    } catch (error) {
        console.log(
            'Validation error:',
            error instanceof Error ? error.message : String(error),
        );
        // Either "Invalid SKU format" or "Price is out of range"
    }
};

// Example 3: Conditional hooks based on data
interface BlogPost {
    author: string;
    content: string;
    id: string;
    publishedAt?: Date;
    slug: string;
    status: 'archived' | 'draft' | 'published';
    tags: string[];
    title: string;
}

const BlogPostFactory = new Factory<BlogPost>((factory) => ({
    author: factory.person.fullName(),
    content: factory.lorem.paragraphs(3),
    id: factory.string.uuid(),
    slug: '',
    status: 'draft',
    tags: [],
    title: factory.lorem.sentence(),
}))
    .beforeBuild((params) => {
        // Generate slug from title
        if (!params.slug && params.title) {
            params.slug = params.title
                .toLowerCase()
                .replaceAll(/[^a-z0-9]+/g, '-')
                .replaceAll(/^-|-$/g, '');
        }

        // Add default tags based on content
        if (params.tags?.length === 0 && params.content) {
            const contentLower = params.content.toLowerCase();
            const autoTags: string[] = [];

            if (
                contentLower.includes('javascript') ||
                contentLower.includes('typescript')
            ) {
                autoTags.push('programming');
            }
            if (
                contentLower.includes('react') ||
                contentLower.includes('vue')
            ) {
                autoTags.push('frontend');
            }
            if (
                contentLower.includes('node') ||
                contentLower.includes('express')
            ) {
                autoTags.push('backend');
            }

            params.tags = autoTags;
        }

        return params;
    })
    .afterBuild((post) => {
        // Set publishedAt date for published posts
        if (post.status === 'published' && !post.publishedAt) {
            post.publishedAt = new Date();
        }

        // Clear publishedAt for non-published posts
        if (post.status !== 'published' && post.publishedAt) {
            delete post.publishedAt;
        }

        return post;
    });

const draftPost = BlogPostFactory.build({
    content:
        'TypeScript is a powerful language that adds static typing to JavaScript...',
    title: 'Getting Started with TypeScript',
});
console.log('Draft post:', {
    publishedAt: draftPost.publishedAt, // undefined
    slug: draftPost.slug,
    tags: draftPost.tags,
    title: draftPost.title,
});

const publishedPost = BlogPostFactory.build({
    status: 'published',
    title: 'Building APIs with Node.js and Express',
});
console.log('Published post:', {
    publishedAt: publishedPost.publishedAt, // Date object
    status: publishedPost.status,
});

// Example 4: Validation factory with business rules
interface Order {
    customerId: string;
    id: string;
    items: { price: number; productId: string; quantity: number }[];
    shipping: number;
    status: 'delivered' | 'pending' | 'processing' | 'shipped';
    subtotal: number;
    tax: number;
    total: number;
}

const OrderFactory = new Factory<Order>((factory) => ({
    customerId: factory.string.uuid(),
    id: factory.string.uuid(),
    items: [],
    shipping: 0,
    status: 'pending',
    subtotal: 0,
    tax: 0,
    total: 0,
}))
    .beforeBuild((params) => {
        // Generate items if not provided
        if (!params.items || params.items.length === 0) {
            const itemCount = Math.floor(Math.random() * 5) + 1;
            params.items = Array.from({ length: itemCount }, () => ({
                price: Number.parseFloat((Math.random() * 100 + 10).toFixed(2)),
                productId: crypto.randomUUID(),
                quantity: Math.floor(Math.random() * 5) + 1,
            }));
        }
        return params;
    })
    .afterBuild((order) => {
        // Calculate subtotal
        order.subtotal = order.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0,
        );

        // Calculate tax (10%)
        order.tax = Number.parseFloat((order.subtotal * 0.1).toFixed(2));

        // Calculate shipping (free for orders over $100)
        order.shipping = order.subtotal >= 100 ? 0 : 10;

        // Calculate total
        order.total = Number.parseFloat(
            (order.subtotal + order.tax + order.shipping).toFixed(2),
        );

        // Validate minimum order amount
        if (order.total < 10) {
            throw new Error('Order total must be at least $10');
        }

        return order;
    });

const order = OrderFactory.build();
console.log('Order summary:', {
    items: order.items.length,
    shipping: order.shipping,
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
});

// Example 5: Factory composition with hooks
interface Address {
    city: string;
    country: string;
    state: string;
    street: string;
    zipCode: string;
}

const AddressFactory = new Factory<Address>((factory) => ({
    city: factory.location.city(),
    country: 'USA',
    state: factory.location.state({ abbreviated: true }),
    street: factory.location.streetAddress(),
    zipCode: '',
})).afterBuild((address) => {
    // Generate appropriate zip code based on state
    const stateZipRanges: Record<string, [number, number]> = {
        CA: [90_000, 96_199],
        NY: [10_000, 14_999],
        TX: [73_301, 88_900],
        // ... more states
    };

    if (!address.zipCode) {
        const range = stateZipRanges[address.state] ?? [10_000, 99_999];
        const zip = Math.floor(
            Math.random() * (range[1] - range[0]) + range[0],
        );
        address.zipCode = zip.toString().padStart(5, '0');
    }

    return address;
});

interface Customer {
    billingAddress: Address;
    email: string;
    id: string;
    name: string;
    sameAsBilling: boolean;
    shippingAddress: Address;
}

const CustomerFactory = new Factory<Customer>((factory) => ({
    billingAddress: AddressFactory.build(),
    email: factory.internet.email(),
    id: factory.string.uuid(),
    name: factory.person.fullName(),
    sameAsBilling: factory.datatype.boolean(),
    shippingAddress: AddressFactory.build(),
})).afterBuild((customer) => {
    // If sameAsBilling is true, copy billing to shipping
    if (customer.sameAsBilling) {
        customer.shippingAddress = { ...customer.billingAddress };
    }
    return customer;
});

const customer = CustomerFactory.build({ sameAsBilling: true });
console.log('Customer addresses:', {
    areSame:
        JSON.stringify(customer.billingAddress) ===
        JSON.stringify(customer.shippingAddress),
    billing: customer.billingAddress,
    shipping: customer.shippingAddress,
});

// Run async examples
void createProducts().catch(console.error);
