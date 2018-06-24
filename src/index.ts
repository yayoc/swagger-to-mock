import * as commander from "commander";
import { parse } from "./parse";
import { DataType, isAllOf, isOneOf, isAnyOf, isRef } from "./dataType";
import { getSchemaName, normalizePath, writeFiles } from "./util";

const APPLICATION_JSON = "application/json"
const REF = "$ref";

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
    [APPLICATION_JSON]: { schema: any };
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
    acc[name] = getSchemaData(schemas, name);
    return acc;
  }, {});
};

// Retrieve mock data of schema.
const getSchemaData = (schemas: any, name: string): Object => {
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
    const schemaName = getSchemaName(schema[REF]);
    return schemaName ? getSchemaData(schemas, schemaName) : {};
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
      const val = res[APPLICATION_JSON];
      const { schema } = val;
      const ref = schema[REF];
      if (ref) {
        const schemaName = getSchemaName(ref);
        if (schemaName) {
          const values = schemas[schemaName];
          ret[pathKey] = values;
        }
      } else {
        if (DataType.isObject(schema.type)) {
          ret[pathKey] = parseObject(schema, schemas);
        } else if (DataType.isArray(schema.type)) {
          ret[pathKey] = parseArray(schema, schemas); 
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

export const mergeAllOf = (properties: any[], schemas: any): any => {
  let ret: any = {};
  properties.forEach((property: any) => {
    if (isRef(property)) {
      const schemaName = getSchemaName(property[REF]);
      if (schemaName) {
        const schemaData = getSchemaData(schemas, schemaName);
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
      const schemaName = getSchemaName(property[REF]);
      if (schemaName) {
        const schema = getSchemaData(schemas, schemaName);
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
    const schemaName = getSchemaName(arr.items[REF]);
    if (schemaName) {
      const schema = getSchemaData(schemas, schemaName);
      return [schema];
    }
    return [];
  } else {
    return [DataType.defaultValue(arr.items.type)];
  }
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
