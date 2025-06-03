import type { LocaleDefinition, Randomizer } from '@faker-js/faker';
import { z } from 'zod';
import { Factory, type FactoryFunction, type FactorySchema, type FactoryOptions } from './index.js';

type ZodSchema = z.ZodTypeAny;

export interface ZodFactoryConfig extends FactoryOptions {
  /**
   * Custom generators for specific schema descriptions
   */
  customGenerators?: Record<string, () => unknown>;
}

/**
 * A Factory class that extends the base Factory to work with Zod schemas
 */
export class ZodFactory<T extends ZodSchema> extends Factory<z.infer<T>> {
  private readonly schema: T;
  private readonly zodConfig: ZodFactoryConfig;

  constructor(schema: T, config?: ZodFactoryConfig) {
    // Extract base factory options
    const { customGenerators, ...factoryOptions } = config || {};
    
    // Create a proper factory function that generates the schema
    const factoryFunction: FactoryFunction<z.infer<T>> = (factory, iteration) => {
      return generateFactorySchema(schema, factory, config || {}) as FactorySchema<z.infer<T>>;
    };

    // Call parent constructor with the proper factory function
    super(factoryFunction, factoryOptions);

    this.schema = schema;
    this.zodConfig = config || {};
  }
}

/**
 * Creates a ZodFactory instance from a Zod schema
 * @param schema The Zod schema to generate a factory from
 * @param config Optional configuration for the factory generation
 * @returns A ZodFactory instance that extends the base Factory class
 */
export function createFactoryFromZod<T extends ZodSchema>(
  schema: T,
  config?: ZodFactoryConfig
): ZodFactory<T> {
  return new ZodFactory(schema, config);
}

/**
 * Generates a factory schema (with generators) that conforms to a Zod schema
 */
function generateFactorySchema(schema: ZodSchema, factory: Factory<unknown>, config: ZodFactoryConfig): unknown {
  // Check for custom generator first
  if (schema.description && config.customGenerators?.[schema.description]) {
    return config.customGenerators[schema.description]();
  }

  // Handle different Zod types
  const zodType = schema._def as Record<string, unknown>;
  
  // Basic types
  if (schema instanceof z.ZodString) {
    return generateStringGenerator(schema, factory);
  }
  
  if (schema instanceof z.ZodNumber) {
    return generateNumberGenerator(schema, factory);
  }
  
  if (schema instanceof z.ZodBoolean) {
    return factory.datatype.boolean();
  }
  
  if (schema instanceof z.ZodDate) {
    return factory.date.recent();
  }
  
  if (schema instanceof z.ZodNull) {
    return null;
  }
  
  if (schema instanceof z.ZodUndefined) {
    return undefined;
  }
  
  if (schema instanceof z.ZodAny || schema instanceof z.ZodUnknown) {
    return factory.lorem.word();
  }

  // Handle literal types
  if (schema instanceof z.ZodLiteral) {
    return zodType.value;
  }

  // Handle enum types
  if (schema instanceof z.ZodEnum) {
    const enumValues = zodType.values as readonly string[];
    return factory.helpers.arrayElement([...enumValues]);
  }

  // Handle union types
  if (schema instanceof z.ZodUnion) {
    const options = zodType.options as ZodSchema[];
    const randomOption = factory.helpers.arrayElement(options);
    return generateFactorySchema(randomOption, factory, config);
  }

  // Handle discriminated union types
  if (schema instanceof z.ZodDiscriminatedUnion) {
    const optionsMap = zodType.options as Map<string, ZodSchema>;
    const options = [...optionsMap.values()];
    const randomOption = factory.helpers.arrayElement(options);
    return generateFactorySchema(randomOption, factory, config);
  }

  // Handle intersection types
  if (schema instanceof z.ZodIntersection) {
    const leftResult = generateFactorySchema((zodType.left as ZodSchema), factory, config);
    const rightResult = generateFactorySchema((zodType.right as ZodSchema), factory, config);
    
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
    if (factory.datatype.boolean({ probability: 0.7 })) {
      return generateFactorySchema((zodType.innerType as ZodSchema), factory, config);
    }
    return undefined;
  }

  // Handle nullable types
  if (schema instanceof z.ZodNullable) {
    // 80% chance to generate the value, 20% chance to return null
    if (factory.datatype.boolean({ probability: 0.8 })) {
      return generateFactorySchema((zodType.innerType as ZodSchema), factory, config);
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
    
    const length = factory.number.int({ 
      max: maxLength, 
      min: minLength 
    });
    
    return Array.from({ length }, () => generateFactorySchema(itemSchema, factory, config));
  }

  // Handle object types
  if (schema instanceof z.ZodObject) {
    const shape = zodType.shape as Record<string, ZodSchema>;
    const result: Record<string, unknown> = {};
    
    for (const [key, fieldSchema] of Object.entries(shape)) {
      result[key] = generateFactorySchema(fieldSchema, factory, config);
    }
    
    return result;
  }

  // Handle record types
  if (schema instanceof z.ZodRecord) {
    const valueSchema = zodType.valueType as ZodSchema;
    const keySchema = zodType.keyType as undefined | ZodSchema;
    
    const numKeys = factory.number.int({ max: 3, min: 1 });
    const result: Record<string, unknown> = {};
    
    for (let i = 0; i < numKeys; i++) {
      const key = keySchema ? 
        String(generateFactorySchema(keySchema, factory, config)) : 
        factory.lorem.word();
      result[key] = generateFactorySchema(valueSchema, factory, config);
    }
    
    return result;
  }

  // Handle default case - try to generate a reasonable default
  return factory.lorem.word();
}

function generateStringGenerator(schema: z.ZodString, factory: Factory<unknown>): string {
  const zodType = schema._def as unknown as Record<string, unknown>;
  const checks = (zodType.checks as { kind: string; regex?: RegExp; value?: unknown; }[]) || [];
  
  let result = '';
  
  for (const check of checks) {
    const checkKind = check.kind;
    
    switch (checkKind) {
      case 'cuid': {
        return factory.string.alphanumeric(10);
      }
      case 'email': {
        return factory.internet.email();
      }
      case 'length': {
        const exactLength = check.value as number;
        result = factory.string.alphanumeric(exactLength);
        break;
      }
      case 'max': {
        const maxValue = check.value as number;
        result = factory.lorem.words(1).slice(0, Math.max(0, maxValue));
        break;
      }
      case 'min': {
        const minValue = check.value as number;
        result = factory.lorem.words(Math.ceil(minValue / 5));
        break;
      }
      case 'regex': {
        const regex = check.regex!;
        if (regex.test('test@example.com')) {
          return factory.internet.email();
        }
        return factory.lorem.word();
      }
      case 'url': {
        return factory.internet.url();
      }
      case 'uuid': {
        return factory.string.uuid();
      }
    }
  }
  
  return result.length > 0 ? result : factory.lorem.word();
}

function generateNumberGenerator(schema: z.ZodNumber, factory: Factory<unknown>): number {
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
  
  return isInt ? factory.number.int(options) : factory.number.float(options);
} 