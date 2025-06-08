import { z } from 'zod';
import { Factory, type FactoryFunction, type FactoryOptions, type FactorySchema } from './index.js';

export interface ZodFactoryConfig extends FactoryOptions {
  /**
   * Custom generators for specific schema descriptions
   */
  customGenerators?: Record<string, () => unknown>;
}

/**
 * Type for custom Zod type handlers
 */
export type ZodTypeHandler = (schema: ZodSchema, factory: Factory<unknown>, config: ZodFactoryConfig) => unknown;

type ZodSchema = z.ZodTypeAny;

/**
 * Registry for custom Zod type handlers
 */
class ZodTypeRegistry {
  private handlers = new Map<string, ZodTypeHandler>();

  /**
   * Clear all registered handlers
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get a handler for a Zod type
   * @param typeName The name/identifier of the Zod type
   * @returns The handler function or undefined if not found
   */
  get(typeName: string): undefined | ZodTypeHandler {
    return this.handlers.get(typeName);
  }

  /**
   * Get all registered type names
   */
  getRegisteredTypes(): string[] {
    return [...this.handlers.keys()];
  }

  /**
   * Check if a handler exists for a Zod type
   * @param typeName The name/identifier of the Zod type
   * @returns True if handler exists
   */
  has(typeName: string): boolean {
    return this.handlers.has(typeName);
  }

  /**
   * Register a custom handler for a Zod type
   * @param typeName The name/identifier of the Zod type (e.g., 'ZodBigInt', 'ZodNaN')
   * @param handler Function that generates mock data for this type
   */
  register(typeName: string, handler: ZodTypeHandler): void {
    this.handlers.set(typeName, handler);
  }

  /**
   * Remove a handler for a Zod type
   * @param typeName The name/identifier of the Zod type
   */
  unregister(typeName: string): boolean {
    return this.handlers.delete(typeName);
  }
}

/**
 * Global registry instance
 */
const zodTypeRegistry = new ZodTypeRegistry();

/**
 * Clear all registered custom Zod type handlers
 */
export function clearZodTypeRegistry(): void {
  zodTypeRegistry.clear();
}

/**
 * Get all registered custom Zod type names
 * @returns Array of registered type names
 */
export function getRegisteredZodTypes(): string[] {
  return zodTypeRegistry.getRegisteredTypes();
}

/**
 * Register a custom handler for a Zod type
 * @param typeName The name/identifier of the Zod type (e.g., 'ZodBigInt', 'ZodNaN')
 * @param handler Function that generates mock data for this type
 * 
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { registerZodType } from 'interface-forge/zod';
 * 
 * // Register handler for BigInt
 * registerZodType('ZodBigInt', (schema, factory) => {
 *   return BigInt(factory.number.int({ min: 0, max: 1000000 }));
 * });
 * 
 * // Register handler for custom validation
 * registerZodType('ZodNaN', (schema, factory) => {
 *   return NaN;
 * });
 * 
 * // Now you can use it
 * const schema = z.object({
 *   bigNumber: z.bigint(),
 *   notANumber: z.nan(),
 * });
 * ```
 */
export function registerZodType(typeName: string, handler: ZodTypeHandler): void {
  zodTypeRegistry.register(typeName, handler);
}

/**
 * Unregister a custom handler for a Zod type
 * @param typeName The name/identifier of the Zod type
 * @returns True if the handler was found and removed
 */
export function unregisterZodType(typeName: string): boolean {
  return zodTypeRegistry.unregister(typeName);
}

/**
 * A Factory class that extends the base Factory to work with Zod schemas
 */
export class ZodFactory<T extends ZodSchema> extends Factory<z.infer<T>> {
  private readonly schema: T;
  private readonly zodConfig: ZodFactoryConfig;

  constructor(schema: T, config?: ZodFactoryConfig) {
    const { customGenerators, ...factoryOptions } = (config ?? {});
    
    const factoryFunction: FactoryFunction<z.infer<T>> = () => {
      return {} as FactorySchema<z.infer<T>>;
    };

    super(factoryFunction, factoryOptions);

    this.schema = schema;
    this.zodConfig = config ?? {};
  }

  /**
   * Override the build method to generate values directly from Zod schema
   */
  build = (kwargs?: Partial<z.infer<T>>): z.infer<T> => {
    return this.generate(0, kwargs);
  };

  /**
   * Override the generate method to work with Zod schemas
   */
  protected generate(_iteration: number, kwargs?: Partial<z.infer<T>>): z.infer<T> {
    const generated = this.generateFactorySchema(this.schema, this.zodConfig) as z.infer<T>;
    
    if (kwargs && typeof generated === 'object' && generated !== null && !Array.isArray(generated)) {
      return { ...generated, ...kwargs } as z.infer<T>;
    }
    
    return generated;
  }

  /**
   * Generates a factory schema (with generators) that conforms to a Zod schema
   */
  private generateFactorySchema(schema: ZodSchema, config: ZodFactoryConfig): unknown {
    if (schema.description && config.customGenerators?.[schema.description]) {
      return config.customGenerators[schema.description]();
    }

    const typeName = schema.constructor.name;
    if (zodTypeRegistry.has(typeName)) {
      const handler = zodTypeRegistry.get(typeName)!;
      return handler(schema, this, config);
    }

    const zodType = schema._def as Record<string, unknown>;
    
    if (schema instanceof z.ZodString) {
      return this.generateStringGenerator(schema);
    }
    
    if (schema instanceof z.ZodNumber) {
      return this.generateNumberGenerator(schema);
    }
    
    if (schema instanceof z.ZodBoolean) {
      return this.datatype.boolean();
    }
    
    if (schema instanceof z.ZodDate) {
      return this.date.recent();
    }
    
    if (schema instanceof z.ZodNull) {
      return null;
    }
    
    if (schema instanceof z.ZodUndefined) {
      return undefined;
    }
    
    if (schema instanceof z.ZodAny || schema instanceof z.ZodUnknown) {
      return this.lorem.word();
    }

    if (schema instanceof z.ZodLiteral) {
      return zodType.value;
    }

    if (schema instanceof z.ZodEnum) {
      const enumValues = zodType.values as readonly string[];
      return this.helpers.arrayElement([...enumValues]);
    }

    if (schema instanceof z.ZodNativeEnum) {
      const enumValues = Object.values((zodType as { values: Record<string, number | string> }).values);
      return this.helpers.arrayElement(enumValues);
    }

    if (schema instanceof z.ZodTuple) {
      const items = zodType.items as ZodSchema[];
      const rest = zodType.rest as null | ZodSchema;
      
      const result = items.map(itemSchema => this.generateFactorySchema(itemSchema, config));
      
      if (rest) {
        const restCount = this.number.int({ max: 3, min: 0 });
        for (let i = 0; i < restCount; i++) {
          result.push(this.generateFactorySchema(rest, config));
        }
      }
      
      return result;
    }

    if (schema instanceof z.ZodMap) {
      const keyType = zodType.keyType as ZodSchema;
      const valueType = zodType.valueType as ZodSchema;
      
      const map = new Map();
      const size = this.number.int({ max: 5, min: 1 });
      
      for (let i = 0; i < size; i++) {
        const key = this.generateFactorySchema(keyType, config);
        const value = this.generateFactorySchema(valueType, config);
        map.set(key, value);
      }
      
      return map;
    }

    if (schema instanceof z.ZodSet) {
      const valueType = zodType.valueType as ZodSchema;
      
      const set = new Set();
      const size = this.number.int({ max: 5, min: 1 });
      
      for (let i = 0; i < size; i++) {
        const value = this.generateFactorySchema(valueType, config);
        set.add(value);
      }
      
      return set;
    }

    if (schema instanceof z.ZodBranded) {
      const underlying = zodType.type as ZodSchema;
      return this.generateFactorySchema(underlying, config);
    }

    if (schema instanceof z.ZodDefault) {
      const underlying = zodType.innerType as ZodSchema;
      return this.generateFactorySchema(underlying, config);
    }

    if (schema instanceof z.ZodCatch) {
      const underlying = zodType.innerType as ZodSchema;
      return this.generateFactorySchema(underlying, config);
    }

    if (schema instanceof z.ZodUnion) {
      const options = zodType.options as ZodSchema[];
      const randomOption = this.helpers.arrayElement(options);
      return this.generateFactorySchema(randomOption, config);
    }

    if (schema instanceof z.ZodDiscriminatedUnion) {
      const optionsMap = zodType.options as Map<string, ZodSchema>;
      const options = [...optionsMap.values()];
      const randomOption = this.helpers.arrayElement(options);
      return this.generateFactorySchema(randomOption, config);
    }

    if (schema instanceof z.ZodIntersection) {
      const leftResult = this.generateFactorySchema((zodType.left as ZodSchema), config);
      const rightResult = this.generateFactorySchema((zodType.right as ZodSchema), config);
      
      if (typeof leftResult === 'object' && leftResult !== null && 
          typeof rightResult === 'object' && rightResult !== null) {
        return { ...leftResult, ...rightResult };
      }
      return leftResult;
    }

    if (schema instanceof z.ZodOptional) {
      if (this.datatype.boolean({ probability: 0.7 })) {
        return this.generateFactorySchema((zodType.innerType as ZodSchema), config);
      }
      return undefined;
    }

    if (schema instanceof z.ZodNullable) {
      if (this.datatype.boolean({ probability: 0.8 })) {
        return this.generateFactorySchema((zodType.innerType as ZodSchema), config);
      }
      return null;
    }

    if (schema instanceof z.ZodArray) {
      const itemSchema = zodType.type as ZodSchema;
      const checks = (zodType.checks as { kind: string; value?: number }[] | undefined);
      
      let minLength = 1;
      let maxLength = 5;
      
      if (checks) {
        for (const check of checks) {
          const checkKind = check.kind;
          const checkValue = check.value;
          
          if (checkKind === 'min' && typeof checkValue === 'number') {
            minLength = Math.max(minLength, checkValue);
          } else if (checkKind === 'max' && typeof checkValue === 'number') {
            maxLength = Math.min(maxLength, checkValue);
          }
        }
      }
      
      const length = this.number.int({ 
        max: maxLength, 
        min: minLength 
      });
      
      return Array.from({ length }, () => this.generateFactorySchema(itemSchema, config));
    }

    if (schema instanceof z.ZodObject) {
      const shapeFunction = (zodType as { shape: () => Record<string, ZodSchema> }).shape;
      const shape = shapeFunction();
      const result: Record<string, unknown> = {};
      
      for (const [key, fieldSchema] of Object.entries(shape)) {
        result[key] = this.generateFactorySchema(fieldSchema, config);
      }
      
      return result;
    }

    if (schema instanceof z.ZodRecord) {
      const valueSchema = zodType.valueType as ZodSchema;
      const keySchema = zodType.keyType as undefined | ZodSchema;
      
      const numKeys = this.number.int({ max: 3, min: 1 });
      const result: Record<string, unknown> = {};
      
      for (let i = 0; i < numKeys; i++) {
        const key = keySchema ? 
          String(this.generateFactorySchema(keySchema, config)) : 
          this.lorem.word();
        result[key] = this.generateFactorySchema(valueSchema, config);
      }
      
      return result;
    }

    return this.lorem.word();
  }

  private generateNumberGenerator(schema: z.ZodNumber): number {
    const zodType = schema._def as unknown as Record<string, unknown>;
    const checks = zodType.checks as { inclusive?: boolean; kind: string; value?: number; }[] | undefined;
    
    let min: number | undefined;
    let max: number | undefined;
    let isInt = false;
    let isPositive = false;
    let isNegative = false;
    let isNonNegative = false;
    let isNonPositive = false;
    let isFinite = false;
    let isSafe = false;
    let step: number | undefined;
    
    if (checks) {
      for (const check of checks) {
        const checkKind = check.kind;
        const checkValue = check.value;
        
        switch (checkKind) {
          case 'finite': {
            isFinite = true;
            break;
          }
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
          case 'multipleOf': {
            step = checkValue;
            break;
          }
          case 'safe': {
            isSafe = true;
            break;
          }
        }
      }
      
      const checkKinds = new Set(checks.map(c => c.kind));
      isPositive = checkKinds.has('min') && checks.some(c => c.kind === 'min' && (c.value ?? 0) > 0);
      isNegative = checkKinds.has('max') && checks.some(c => c.kind === 'max' && (c.value ?? 0) < 0);
      isNonNegative = checkKinds.has('min') && checks.some(c => c.kind === 'min' && (c.value ?? 0) >= 0);
      isNonPositive = checkKinds.has('max') && checks.some(c => c.kind === 'max' && (c.value ?? 0) <= 0);
    }
    
    if (isPositive && (!min || min <= 0)) {
      min = 0.1;
    }
    if (isNegative && (!max || max >= 0)) {
      max = -0.1;
    }
    if (isNonNegative && (!min || min < 0)) {
      min = 0;
    }
    if (isNonPositive && (!max || max > 0)) {
      max = 0;
    }
    
    if (max !== undefined && max < 0 && (min === undefined || min >= max)) {
      min = Math.min(min ?? max - 100, max - 1);
    }
    
    if (isSafe) {
      min = Math.max(min ?? -Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER);
      max = Math.min(max ?? Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    }
    
    if (isFinite) {
      min = Math.max(min ?? -Number.MAX_VALUE, -Number.MAX_VALUE);
      max = Math.min(max ?? Number.MAX_VALUE, Number.MAX_VALUE);
    }
    
    const options = {
      max: max ?? (isInt ? 100 : 100.9),
      min: min ?? 0
    };
    
    let result = isInt ? this.number.int(options) : this.number.float(options);
    
    if (step && step > 0) {
      result = Math.round(result / step) * step;
    }
    
    return result;
  }

  private generateStringGenerator(schema: z.ZodString): string {
    const zodType = schema._def as unknown as Record<string, unknown>;
    const checks = zodType.checks as { kind: string; regex?: RegExp; value?: unknown; }[] | undefined;
    
    let result = '';
    
    if (checks) {
      for (const check of checks) {
        const checkKind = check.kind;
        
        switch (checkKind) {
          case 'cuid': {
            return this.string.alphanumeric(10);
          }
          case 'email': {
            return this.internet.email();
          }
          case 'length': {
            const exactLength = check.value as number;
            result = this.string.alphanumeric(exactLength);
            break;
          }
          case 'max': {
            const maxValue = check.value as number;
            result = this.lorem.words(1).slice(0, Math.max(0, maxValue));
            break;
          }
          case 'min': {
            const minValue = check.value as number;
            result = this.lorem.words(Math.ceil(minValue / 5));
            break;
          }
          case 'regex': {
            const regex = check.regex!;
            if (regex.test('test@example.com')) {
              return this.internet.email();
            }
            return this.lorem.word();
          }
          case 'url': {
            return this.internet.url();
          }
          case 'uuid': {
            return this.string.uuid();
          }
        }
      }
    }
    
    return result || this.lorem.word();
  }
}

// Register built-in Zod types after the class definition to ensure proper initialization
export function initializeBuiltinZodTypes(): void {
  zodTypeRegistry.register('ZodBigInt', (_schema, factory) => {
    return BigInt(factory.number.int({ max: 1_000_000, min: 0 }));
  });

  zodTypeRegistry.register('ZodNaN', () => {
    return Number.NaN;
  });

  zodTypeRegistry.register('ZodVoid', () => {
    return undefined;
  });

  zodTypeRegistry.register('ZodNever', () => {
    throw new Error('ZodNever should never be reached in factory generation');
  });

  zodTypeRegistry.register('ZodFunction', (_schema, factory) => {
    return () => factory.lorem.word();
  });

  zodTypeRegistry.register('ZodPromise', (schema, _factory, config) => {
    const zodType = schema._def as Record<string, unknown>;
    const innerType = zodType.type as ZodSchema;
    const innerFactory = new ZodFactory(innerType, config);
    const innerValue: unknown = innerFactory.build();
    return Promise.resolve(innerValue);
  });

  zodTypeRegistry.register('ZodLazy', (schema, _factory, config) => {
    const zodType = schema._def as Record<string, unknown>;
    const getter = zodType.getter as () => ZodSchema;
    const lazySchema = getter();
    const lazyFactory = new ZodFactory(lazySchema, config);
    return lazyFactory.build();
  });
}

// Initialize built-in types immediately
initializeBuiltinZodTypes(); 