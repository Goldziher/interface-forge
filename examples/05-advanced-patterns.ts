/**
 * Advanced Patterns Example
 *
 * This example showcases advanced patterns and techniques
 * for creating sophisticated test data scenarios.
 */

import { Factory } from 'interface-forge';

interface Task {
    assignee?: string;
    completedAt?: Date;
    dueDate?: Date;
    id: string;
    status: 'done' | 'in-progress' | 'todo';
    title: string;
}

const TaskFactory = new Factory<Task>((faker, _iteration, kwargs) => {
    // Use provided status or generate one
    const status =
        kwargs?.status ??
        faker.helpers.arrayElement(['todo', 'in-progress', 'done'] as const);

    return {
        assignee:
            status === 'todo'
                ? undefined
                : (kwargs?.assignee ?? faker.person.fullName()),
        completedAt:
            status === 'done'
                ? (kwargs?.completedAt ?? faker.date.recent())
                : undefined,
        dueDate: kwargs?.dueDate ?? faker.date.future(),
        id: kwargs?.id ?? faker.string.uuid(),
        status,
        title: kwargs?.title ?? faker.lorem.sentence(),
    };
});

TaskFactory.batch(3, { assignee: undefined, status: 'todo' });
TaskFactory.batch(3, {
    completedAt: new Date(),
    status: 'done',
});

interface Product {
    category: string;
    id: string;
    name: string;
    tags: string[];
}

const categories = ['Electronics', 'Books', 'Clothing', 'Food', 'Home'];
const allTags = [
    'new',
    'sale',
    'popular',
    'limited',
    'eco-friendly',
    'premium',
];

const ProductFactory = new Factory<Product>((faker) => ({
    category: faker.sample(categories),
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    tags: faker.helpers.arrayElements(allTags, { max: 3, min: 1 }),
}));

const products = ProductFactory.batch(10);
console.log(
    'Product categories:',
    products.map((p) => p.category),
);

interface Event {
    duration: number;
    endTime: Date;
    id: string;
    name: string;
    startTime: Date;
}

const EventFactory = new Factory<Event>((faker) => {
    const startTime = faker.date.future();
    const duration = faker.number.int({ max: 240, min: 30 });
    const endTime = new Date(startTime.getTime() + duration * 60_000);

    return {
        duration,
        endTime,
        id: faker.string.uuid(),
        name: faker.lorem.words(3),
        startTime,
    };
});

const createSequentialEvents = (count: number): Event[] => {
    return Array.from({ length: count }, (_, index) => {
        const baseTime = new Date();
        const startTime = new Date(baseTime.getTime() + index * 3_600_000);
        const duration = 45;

        return EventFactory.build({
            duration,
            endTime: new Date(startTime.getTime() + duration * 60_000),
            startTime,
        });
    });
};

const schedule = createSequentialEvents(5);
console.log(
    'Event schedule:',
    schedule.map((e: Event) => ({
        name: e.name,
        start: e.startTime.toLocaleTimeString(),
    })),
);

interface Customer {
    id: string;
    lifetimeValue: number;
    name: string;
    tier: 'bronze' | 'gold' | 'platinum' | 'silver';
}

const CustomerFactory = new Factory<Customer>((faker) => {
    const tierWeights = [
        { value: 'bronze', weight: 50 },
        { value: 'silver', weight: 30 },
        { value: 'gold', weight: 15 },
        { value: 'platinum', weight: 5 },
    ] as const;

    const tier = faker.helpers.weightedArrayElement(tierWeights);

    const lifetimeValueRanges = {
        bronze: { max: 1000, min: 0 },
        gold: { max: 20_000, min: 5000 },
        platinum: { max: 100_000, min: 20_000 },
        silver: { max: 5000, min: 1000 },
    };

    return {
        id: faker.string.uuid(),
        lifetimeValue: faker.number.int(lifetimeValueRanges[tier]),
        name: faker.person.fullName(),
        tier,
    };
});

const customers = CustomerFactory.batch(100);
const tierCounts = customers.reduce<Record<string, number>>(
    (acc: Record<string, number>, c: Customer) => {
        acc[c.tier] = (acc[c.tier] || 0) + 1;
        return acc;
    },
    {},
);
console.log('Customer tier distribution:', tierCounts);

const createSeededFactory = () => {
    const factory = new Factory<{ id: string; value: number }>((faker) => ({
        id: faker.string.uuid(),
        value: faker.number.int({ max: 100, min: 1 }),
    }));

    factory.seed(12_345);
    return factory;
};

const SeededFactory1 = createSeededFactory();
const SeededFactory2 = createSeededFactory();

const deterministicData1 = SeededFactory1.batch(3);
const deterministicData2 = SeededFactory2.batch(3);

console.log(
    'Deterministic data matches:',
    JSON.stringify(deterministicData1) === JSON.stringify(deterministicData2),
);
