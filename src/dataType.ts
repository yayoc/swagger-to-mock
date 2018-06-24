import { SchemaObject, ReferenceObject } from "openapi3-ts";

export enum DataType {
  string = "string",
  number = "number",
  integer = "integer",
  boolean = "boolean",
  array = "array",
  object = "object"
}

export namespace DataType {
  export function isString(type: string): boolean {
    return type === DataType.string;
  }

  export function isNumber(type: string): boolean {
    return type === DataType.number;
  }

  export function isInteger(type: string): boolean {
    return type === DataType.integer;
  }

  export function isBoolean(type: string): boolean {
    return type === DataType.boolean;
  }

  export function isArray(type: string): boolean {
    return type === DataType.array;
  }

  export function isObject(type: string): boolean {
    return type === DataType.object;
  }

  export function defaultValue(type: string): any {
    switch (type) {
      case DataType.string:
        return "";
      case DataType.number:
      case DataType.integer:
        return 0;
      case DataType.boolean:
        return true;
      case DataType.array:
        return [];
      case DataType.object:
        return {};
    }
  }
}

export const isArray = (
  property: SchemaObject
): property is SchemaObject & { items: SchemaObject | ReferenceObject } => {
  return property.type === DataType.array;
};

export const isObject = (
  schema: SchemaObject
): schema is SchemaObject & { type: "object" } => {
  return schema.type === DataType.object;
};

export const isAllOf = (
  schema: SchemaObject
): schema is SchemaObject & { allOf: (SchemaObject | ReferenceObject)[] } => {
  return schema.allOf !== undefined;
};

export const isOneOf = (schema: SchemaObject): boolean => {
  return "oneOf" in schema;
};

export const isAnyOf = (schema: SchemaObject): boolean => {
  return "anyOf" in schema;
};

export const isRef = (
  schema: SchemaObject | ReferenceObject
): schema is ReferenceObject => {
  return "$ref" in schema;
};
