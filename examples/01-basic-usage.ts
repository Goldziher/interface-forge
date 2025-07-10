/**
 * Basic Usage Example
 *
 * This example demonstrates the fundamental features of Interface-Forge:
 * - Creating a simple factory
 * - Building single instances
 * - Building batches
 * - Overriding default values
 */

import { Factory } from 'interface-forge';

interface User {
    age: number;
    createdAt: Date;
    email: string;
    id: string;
    isActive: boolean;
    name: string;
}

const UserFactory = new Factory<User>((factory) => ({
    age: factory.number.int({ max: 80, min: 18 }),
    createdAt: factory.date.past(),
    email: factory.internet.email(),
    id: factory.string.uuid(),
    isActive: factory.datatype.boolean(),
    name: factory.person.fullName(),
}));

const user = UserFactory.build();
console.log('Single user:', user);

const users = UserFactory.batch(5);
console.log(`Generated ${users.length} users`);

const customUser = UserFactory.build({
    email: 'john@example.com',
    isActive: true,
    name: 'John Doe',
});
console.log('Custom user:', customUser);

const activeUsers = UserFactory.batch(3, {
    age: 25,
    isActive: true,
});
console.log('Active users:', activeUsers);

// Context-aware factory example
interface Person {
    age: number;
    canDrive: boolean;
    canVote: boolean;
    name: string;
}

const PersonFactory = new Factory<Person>((factory, _iteration, kwargs) => {
    // Use provided age or generate one
    const age = kwargs?.age ?? factory.number.int({ max: 80, min: 0 });

    return {
        age,
        canDrive: age >= 16, // Context-aware: depends on actual age
        canVote: age >= 18, // Context-aware: depends on actual age
        name: kwargs?.name ?? factory.person.fullName(),
    };
});

console.log('\n=== Context-Aware Examples ===');

const child = PersonFactory.build({ age: 10 });
console.log('Child:', child);
// { age: 10, canDrive: false, canVote: false, name: "..." }

const teenager = PersonFactory.build({ age: 17 });
console.log('Teenager:', teenager);
// { age: 17, canDrive: true, canVote: false, name: "..." }

const adult = PersonFactory.build({ age: 25 });
console.log('Adult:', adult);
// { age: 25, canDrive: true, canVote: true, name: "..." }

const companyName = UserFactory.company.name();
const futureDate = UserFactory.date.future();
console.log('\nCompany:', companyName, 'Future date:', futureDate);
