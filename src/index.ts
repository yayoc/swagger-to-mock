import * as commander from "commander";
import * as fs from "fs";
import { join } from "path";
import { parse } from "./parse";

type OpenAPI = {
  openapi: string;
  info: {
    version: string;
    title: string;
    license: string;
  };
  servers: { url: string }[];
  paths: {
    [key: string]: {};
  };
  components: {
    schemas: {};
  };
};

type ResponsesType = {
  [path: string]: {
    "application/json": { schema: any };
  };
};

const extractResponses = (obj: OpenAPI): ResponsesType => {
  let ret: any = {};
  Object.keys(obj.paths).forEach(path => {
    const methods = obj.paths[path];
    Object.keys(methods).forEach((method: string) => {
      const api = (methods as any)[method];
      const { responses } = api;
      Object.keys(responses).forEach((statusCode: string) => {
        const response = responses[statusCode];
        const { content } = response;
        const key = `${path}_${method}_${statusCode}`;
        ret[key] = content;
      });
    });
  });
  return ret;
};

type Schemas = {
  [key: string]: {};
};

const extractSchemas = (obj: OpenAPI): Schemas => {
  const { schemas } = obj.components;
  return Object.keys(schemas).reduce((acc: any, name: string) => {
    acc[name] = getMockData(schemas, name);
    return acc;
  }, {});
};

// Type Check

enum DataType {
  string = "string",
  number = "number",
  integer = "integer",
  boolean = "boolean",
  array = "array",
  object = "object"
}

namespace DataType {
  export function isString(type: DataType): boolean {
    return type === DataType.string;
  }

  export function isNumber(type: DataType): boolean {
    return type === DataType.number;
  }

  export function isInteger(type: DataType): boolean {
    return type === DataType.integer;
  }

  export function isBoolean(type: DataType): boolean {
    return type === DataType.boolean;
  }

  export function isArray(type: DataType): boolean {
    return type === DataType.array;
  }

  export function isObject(type: DataType): boolean {
    return type === DataType.object;
  }

  export function defaultValue(type: DataType): any {
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

// Extract schema name
export const getSchemaName = (ref: string): string | null => {
  const re = /#\/components\/schemas\/(.*)/;
  const matches = ref.match(re);
  const found = matches;
  if (found) {
    return found[1];
  }
  return null;
};

// Retrieve mock data of schema.
const getMockData = (schemas: any, name: string): Object => {
  const schema = schemas[name];
  if (isAllOf(schema)) {
    return mergeAllOf(schema["allOf"], schemas);
  } else if (DataType.isArray(schema.type)) {
    return parseArray(schema, schemas);
  } else if ("properties" in schema) {
    return parseObject(schema, schemas);
  } else if ("additionalProperties" in schema) {
    if (schema.example) {
      return schema.example;
    }
    return {};
  } else if (isRef(schema)) {
    const schemaName = getSchemaName(schema["$ref"]);
    return schemaName ? getMockData(schemas, schemaName) : {};
  }
  return schema;
};

type MockData = {
  [path: string]: any;
};

// Compose mock data
const composeMockData = (
  responses: ResponsesType,
  schemas: Schemas
): MockData => {
  let ret: any = {};
  Object.keys(responses).forEach(path => {
    const res: any = responses[path];
    const pathKey = normalizePath(path);
    if (res) {
      const val = res["application/json"];
      const { schema } = val;
      const ref = schema["$ref"];
      if (ref) {
        const schemaName = getSchemaName(ref);
        if (schemaName) {
          const values = schemas[schemaName];
          ret[pathKey] = values;
        }
      } else {
        // TODO: Support primitive Object
        if (schema.type === "object") {
          ret[pathKey] = parseObject(schema, schemas);
        } else if (schema.type === "array") {
          ret[pathKey] = parseArray(schema, schemas); // TODO//
        } else {
          ret[pathKey] = val.schema.properties;
        }
      }
    }
  });
  return ret;
};

type ObjectType = {
  type: DataType;
  properties: any;
};

export const isAllOf = (property: any): boolean => {
  return "allOf" in property;
};

export const isOneOf = (property: any): boolean => {
  return "oneOf" in property;
};

export const isAnyOf = (property: any): boolean => {
  return "anyOf" in property;
};

export const isRef = (property: any): boolean => {
  return "$ref" in property;
};

export const mergeAllOf = (properties: any[], schemas: any): any => {
  let ret: any = {};
  properties.forEach((property: any) => {
    if (isRef(property)) {
      const schemaName = getSchemaName(property["$ref"]);
      if (schemaName) {
        const schemaData = getMockData(schemas, schemaName);
        ret = Object.assign({}, ret, schemaData);
      }
    } else if (DataType.isObject(property.type)) {
      const parsed = parseObject(property, schemas);
      ret = Object.assign({}, ret, parsed);
    }
  });
  return ret;
};

export const parseObject = (obj: ObjectType, schemas: Schemas): any => {
  if (!obj.properties) {
    return {};
  }
  return Object.keys(obj.properties).reduce((acc: any, key: string) => {
    const property = obj.properties[key];
    if (isRef(property)) {
      const schemaName = getSchemaName(property["$ref"]);
      if (schemaName) {
        const schema = getMockData(schemas, schemaName);
        acc[key] = Object.assign({}, schema);
      }
    } else if (isAllOf(property)) {
      acc[key] = mergeAllOf(property["allOf"], schemas);
    } else if (isAnyOf(property) || isOneOf(property)) {
    } else if (DataType.isObject(property.type)) {
      acc[key] = parseObject(property, schemas);
    } else if (DataType.isArray(property.type)) {
      acc[key] = parseArray(property, schemas);
    } else {
      acc[key] = property.example || DataType.defaultValue(property.type);
    }
    return acc;
  }, {});
};

type ArrayType = {
  type: DataType.array;
  items: any;
};

export const parseArray = (arr: ArrayType, schemas: Schemas): any => {
  if (isRef(arr.items)) {
    const schemaName = getSchemaName(arr.items["$ref"]);
    return schemaName ? schemas[schemaName] : [];
  } else {
    return [DataType.defaultValue(arr.items.type)];
  }
};

// Replace `{}, /` charactors with `_`
export const normalizePath = (path: string): string => {
  const replaced = path.replace(/^\/|{|}/g, "");
  return replaced.replace(/\//g, "_");
};

export const writeFiles = (data: { [file: string]: any }): void => {
  Object.keys(data).forEach(key => {
    const val = data[key];
    const path = join(__dirname, `${key}.json`);
    const formatted = JSON.stringify(val, null, 2);
    fs.writeFileSync(path, formatted);
  });
};

commander
  .arguments("<file>")
  .action(async file => {
    try {
      const content = parse(file);
      const responses = extractResponses(content);
      const schemas = extractSchemas(content);
      const composed = composeMockData(responses, schemas);
      writeFiles(composed);
    } catch (e) {
      console.error(e);
    }
  })
  .parse(process.argv);
