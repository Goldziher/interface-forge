/**
 * Context-Aware Overrides Example
 *
 * This example demonstrates how to use the optional kwargs parameter in factory functions
 * to create context-aware data generation. The factory function can inspect the overrides
 * and adjust its behavior accordingly.
 */

import { Factory } from 'interface-forge';

// Define our test object with context-dependent properties
interface TestObject {
    age?: number;
    name: string;
    underAge: boolean;
}

// Example 1: Basic Context-Aware Generation
// The factory function uses kwargs to determine if someone is underage
const contextAwareFactory = new Factory<TestObject>(
    (factory, _iteration, kwargs) => {
        // Generate or use provided age
        const age = kwargs?.age ?? factory.number.int({ max: 80, min: 0 });

        return {
            age,
            name: kwargs?.name ?? factory.person.firstName(),
            underAge: age < 18, // depends on the age, which may be overridden
        };
    },
);

console.log('=== Basic Context-Aware Generation ===');

// Generate with specific age - factory will automatically set underAge correctly
const adult = contextAwareFactory.build({ age: 25 });
console.log('Adult:', adult);
// Output: { age: 25, name: "John", underAge: false }

const minor = contextAwareFactory.build({ age: 16 });
console.log('Minor:', minor);
// Output: { age: 16, name: "Emma", underAge: true }

// Generate without age - factory will randomly generate and set underAge accordingly
const randomPerson = contextAwareFactory.build();
console.log('Random person:', randomPerson);
// Output: { age: 42, name: "Sarah", underAge: false }

// Example 2: Batch Generation with Context Awareness
console.log('\n=== Batch Generation with Context ===');

const batchResults = contextAwareFactory.batch(3, [
    { age: 15, name: 'Alice' }, // Will be underAge: true
    { age: 25, name: 'Bob' }, // Will be underAge: false
    { name: 'Charlie' }, // Random age, underAge set accordingly
]);

batchResults.forEach((person, index) => {
    console.log(`Person ${index + 1}:`, person);
});
