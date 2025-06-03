import type { LocaleDefinition, Randomizer } from '@faker-js/faker';
import { en, Faker } from '@faker-js/faker';
import { z } from 'zod';

export interface ZodFactoryConfig {
  /**
   * Custom generators for specific schema descriptions
   */
  customGenerators?: Record<string, () => unknown>;
  
  /**
   * Faker.js locale to use for generation
   */
  locale?: LocaleDefinition;
  
  /**
   * Custom randomizer for Faker.js
   */
  randomizer?: Randomizer;
}

type ZodSchema = z.ZodTypeAny;

/**
 * Creates a factory function from a Zod schema that generates type-safe mock data
 */
export function createFactoryFromZod<T extends ZodSchema>(
  schema: T,
  config?: ZodFactoryConfig
): {
  generate(): z.infer<T>;
  batch(count: number): z.infer<T>[];
  build(overrides?: Partial<z.infer<T>>): z.infer<T>;
  buildMany(count: number): z.infer<T>[];
} {
  const faker = new Faker({
    locale: config.locale ?? en,
    randomizer: config.randomizer
  });
  
  const generateItem = (overrides?: Partial<z.infer<T>>): z.infer<T> => {
    const generated = generateFromZod(schema, faker, config) as z.infer<T>;
    
    // If overrides are provided, merge them with the generated data
    if (overrides) {
      return { ...generated, ...overrides };
    }
    
    return generated;
  };
  
  const generateItems = (count: number): z.infer<T>[] => {
    return Array.from({ length: count }, () => generateItem());
  };
  
  return {
    generate: () => generateItem(),
    batch: generateItems,
    build: generateItem,
    buildMany: generateItems,
  };
}

/**
 * Generates mock data that conforms to a Zod schema
 */
function generateFromZod(schema: ZodSchema, faker: Faker, config: ZodFactoryConfig = {}): unknown {
  // Check for custom generator first
  if (schema.description && config.customGenerators?.[schema.description]) {
    return config.customGenerators[schema.description]();
  }

  // Handle different Zod types
  const zodType = schema._def as Record<string, unknown>;
  
  // Basic types
  if (schema instanceof z.ZodString) {
    return generateString(schema, faker);
  }
  
  if (schema instanceof z.ZodNumber) {
    return generateNumber(schema, faker);
  }
  
  if (schema instanceof z.ZodBoolean) {
    return faker.datatype.boolean();
  }
  
  if (schema instanceof z.ZodDate) {
    return faker.date.recent();
  }
  
  if (schema instanceof z.ZodNull) {
    return null;
  }
  
  if (schema instanceof z.ZodUndefined) {
    return undefined;
  }
  
  if (schema instanceof z.ZodAny || schema instanceof z.ZodUnknown) {
    return faker.lorem.word();
  }

  // Handle literal types
  if (schema instanceof z.ZodLiteral) {
    return (zodType.value);
  }

  // Handle enum types
  if (schema instanceof z.ZodEnum) {
    const enumValues = zodType.values as readonly string[];
    return faker.helpers.arrayElement([...enumValues]);
  }

  // Handle union types
  if (schema instanceof z.ZodUnion) {
    const options = zodType.options as ZodSchema[];
    const randomOption = faker.helpers.arrayElement(options);
    return generateFromZod(randomOption, faker, config);
  }

  // Handle discriminated union types
  if (schema instanceof z.ZodDiscriminatedUnion) {
    const optionsMap = zodType.options as Map<string, ZodSchema>;
    const options = [...optionsMap.values()];
    const randomOption = faker.helpers.arrayElement(options);
    return generateFromZod(randomOption, faker, config);
  }

  // Handle intersection types
  if (schema instanceof z.ZodIntersection) {
    const leftResult = generateFromZod((zodType.left as ZodSchema), faker, config);
    const rightResult = generateFromZod((zodType.right as ZodSchema), faker, config);
    
    // Merge objects if both are objects, otherwise return left
    if (typeof leftResult === 'object' && leftResult !== null && 
        typeof rightResult === 'object' && rightResult !== null) {
      return { ...leftResult, ...rightResult };
    }
    return leftResult;
  }

  // Handle optional types
  if (schema instanceof z.ZodOptional) {
    // 70% chance to generate the value, 30% chance to return undefined
    if (faker.datatype.boolean({ probability: 0.7 })) {
      return generateFromZod((zodType.innerType as ZodSchema), faker, config);
    }
    return undefined;
  }

  // Handle nullable types
  if (schema instanceof z.ZodNullable) {
    // 80% chance to generate the value, 20% chance to return null
    if (faker.datatype.boolean({ probability: 0.8 })) {
      return generateFromZod((zodType.innerType as ZodSchema), faker, config);
    }
    return null;
  }

  // Handle array types
  if (schema instanceof z.ZodArray) {
    const itemSchema = zodType.type as ZodSchema;
    const checks = (zodType.checks as { kind: string; value?: number }[]) || [];
    
    let minLength = 1;
    let maxLength = 5;
    
    for (const check of checks) {
      const checkKind = check.kind;
      const checkValue = check.value;
      
      if (checkKind === 'min' && typeof checkValue === 'number') {
        minLength = Math.max(minLength, checkValue);
      } else if (checkKind === 'max' && typeof checkValue === 'number') {
        maxLength = Math.min(maxLength, checkValue);
      }
    }
    
    const length = faker.number.int({ 
      max: maxLength, 
      min: minLength 
    });
    
    return Array.from({ length }, () => generateFromZod(itemSchema, faker, config));
  }

  // Handle object types
  if (schema instanceof z.ZodObject) {
    const shape = zodType.shape as Record<string, ZodSchema>;
    const result: Record<string, unknown> = {};
    
    for (const [key, fieldSchema] of Object.entries(shape)) {
      result[key] = generateFromZod(fieldSchema, faker, config);
    }
    
    return result;
  }

  // Handle record types
  if (schema instanceof z.ZodRecord) {
    const valueSchema = zodType.valueType as ZodSchema;
    const keySchema = zodType.keyType as undefined | ZodSchema;
    
    const numKeys = faker.number.int({ max: 3, min: 1 });
    const result: Record<string, unknown> = {};
    
    for (let i = 0; i < numKeys; i++) {
      const key = keySchema ? 
        String(generateFromZod(keySchema, faker, config)) : 
        faker.lorem.word();
      result[key] = generateFromZod(valueSchema, faker, config);
    }
    
    return result;
  }

  // Handle default case - try to generate a reasonable default
  return faker.lorem.word();
}

function generateNumber(schema: z.ZodNumber, faker: Faker): number {
  const zodType = schema._def as unknown as Record<string, unknown>;
  const checks = (zodType.checks as { inclusive?: boolean; kind: string; value?: number; }[]) || [];
  
  let min: number | undefined;
  let max: number | undefined;
  let isInt = false;
  
  for (const check of checks) {
    const checkKind = check.kind;
    const checkValue = check.value;
    
    switch (checkKind) {
      case 'int': {
        isInt = true;
        break;
      }
      case 'max': {
        max = checkValue;
        break;
      }
      case 'min': {
        min = checkValue;
        break;
      }
    }
  }
  
  const options = {
    max: max === undefined ? (isInt ? 100 : 100.9) : max,
    min: min === undefined ? (isInt ? 0 : 0.1) : min
  };
  
  return isInt ? faker.number.int(options) : faker.number.float(options);
}

function generateString(schema: z.ZodString, faker: Faker): string {
  const zodType = schema._def as unknown as Record<string, unknown>;
  const checks = (zodType.checks as { kind: string; regex?: RegExp; value?: unknown; }[]) || [];
  
  let result = '';
  
  for (const check of checks) {
    const checkKind = check.kind;
    
    switch (checkKind) {
      case 'cuid': {
        return faker.string.alphanumeric(10);
      }
      case 'email': {
        return faker.internet.email();
      }
      case 'length': {
        const exactLength = check.value as number;
        result = faker.string.alphanumeric(exactLength);
        break;
      }
      case 'max': {
        const maxValue = check.value as number;
        result = faker.lorem.words(1).slice(0, Math.max(0, maxValue));
        break;
      }
      case 'min': {
        const minValue = check.value as number;
        result = faker.lorem.words(Math.ceil(minValue / 5));
        break;
      }
      case 'regex': {
        const regex = check.regex!;
        if (regex.test('test@example.com')) {
          return faker.internet.email();
        }
        return faker.lorem.word();
      }
      case 'url': {
        return faker.internet.url();
      }
      case 'uuid': {
        return faker.string.uuid();
      }
    }
  }
  
  return result.length > 0 ? result : faker.lorem.word();
} 