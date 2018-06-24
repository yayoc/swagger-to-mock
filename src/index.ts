#!/usr/bin/env node

import * as commander from "commander";
import chalk from "chalk";
import {
  OpenAPIObject,
  SchemaObject,
  ReferenceObject,
  PathItemObject
} from "openapi3-ts";
import { parse } from "./parse";
import {
  DataType,
  isObject,
  isArray,
  isAllOf,
  isOneOf,
  isAnyOf,
  isReferenceObject
} from "./dataType";
import { getSchemaName, normalizePath, writeFiles } from "./util";

const APPLICATION_JSON = "application/json";
const REF = "$ref";
const log = console.log;

type ResponsesType = {
  [path: string]: {
    [APPLICATION_JSON]: { schema: any };
  };
};

const extractResponses = (obj: OpenAPIObject): ResponsesType => {
  let ret: any = {};
  Object.keys(obj.paths).forEach(path => {
    const methods: PathItemObject = obj.paths[path];
    Object.keys(methods).forEach((method: string) => {
      const api = methods[method];
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
  [schema: string]: SchemaObject;
};

const extractSchemas = (obj: OpenAPIObject): Schemas => {
  const { components } = obj;
  const schemas = components && components.schemas ? components.schemas : {};
  return Object.keys(schemas).reduce((acc: any, name: string) => {
    acc[name] = getSchemaData(schemas, name);
    return acc;
  }, {});
};

// Retrieve mock data of schema.
const getSchemaData = (schemas: Schemas, name: string): Object => {
  const schema = schemas[name];
  if (isReferenceObject(schema)) {
    const schemaName = getSchemaName(schema[REF]);
    return schemaName ? getSchemaData(schemas, schemaName) : {};
  }

  if (isAllOf(schema)) {
    return mergeAllOf(schema["allOf"], schemas);
  } else if (isArray(schema)) {
    return parseArray(schema, schemas);
  } else if (isObject(schema)) {
    return parseObject(schema, schemas);
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
        if (isObject(schema)) {
          ret[pathKey] = parseObject(schema, schemas);
        } else if (isArray(schema)) {
          ret[pathKey] = parseArray(schema, schemas);
        } else {
          ret[pathKey] = val.schema.properties;
        }
      }
    }
  });
  return ret;
};

export const mergeAllOf = (
  properties: (SchemaObject | ReferenceObject)[],
  schemas: Schemas
): any => {
  let ret: any = {};
  properties.forEach(property => {
    if (isReferenceObject(property)) {
      const schemaName = getSchemaName(property[REF]);
      if (schemaName) {
        const schemaData = getSchemaData(schemas, schemaName);
        ret = Object.assign({}, ret, schemaData);
      }
    } else {
      const parsed = parseObject(property, schemas);
      ret = Object.assign({}, ret, parsed);
    }
  });
  return ret;
};

export const pickOneOf = (
  properties: (SchemaObject | ReferenceObject)[],
  schemas: Schemas
): any => {
  const property = properties[0];
  if (isReferenceObject(property)) {
    const schemaName = getSchemaName(property[REF]);
    if (schemaName) {
      const schemaData = getSchemaData(schemas, schemaName);
      return Object.assign({}, schemaData);
    }
  }
  const parsed = parseObject(property, schemas);
  return Object.assign({}, parsed);
};

export const parseObject = (obj: SchemaObject, schemas: Schemas): any => {
  if (obj.example) return obj.example;
  if (!obj.properties) {
    return {};
  }
  return Object.keys(obj.properties).reduce((acc: any, key: string) => {
    const property = obj.properties![key];
    if (isReferenceObject(property)) {
      const schemaName = getSchemaName(property[REF]);
      if (schemaName) {
        const schema = getSchemaData(schemas, schemaName);
        acc[key] = Object.assign({}, schema);
      }
      return acc;
    }
    if (isAllOf(property)) {
      acc[key] = mergeAllOf(property["allOf"], schemas);
    } else if (isOneOf(property)) {
      acc[key] = pickOneOf(property.oneOf, schemas);
    } else if (isAnyOf(property)) {
      acc[key] = pickOneOf(property.anyOf, schemas);
    } else if (isObject(property)) {
      acc[key] = parseObject(property, schemas);
    } else if (isArray(property)) {
      acc[key] = parseArray(property, schemas);
    } else if (property.type) {
      acc[key] = DataType.defaultValue(property);
    }
    return acc;
  }, {});
};

export const parseArray = (
  arr: SchemaObject & { items: SchemaObject | ReferenceObject },
  schemas: Schemas
): Object[] => {
  if (isReferenceObject(arr.items)) {
    const schemaName = getSchemaName(arr.items[REF]);
    if (schemaName) {
      const schema = getSchemaData(schemas, schemaName);
      return [schema];
    }
    return [];
  } else if (arr.items.type) {
    return [DataType.defaultValue(arr.items)];
  }
  return [];
};

log(chalk.yellowBright("swagger-to-mock"));
commander
  .arguments("<file>")
  .action(async file => {
    try {
      const content = parse(file);
      const responses = extractResponses(content);
      const schemas = extractSchemas(content);
      const composed = composeMockData(responses, schemas);
      writeFiles(composed, log);
      log(chalk.yellowBright("Completed"));
    } catch (e) {
      log(chalk.redBright(e));
      log(chalk.redBright("Failed"));
    }
  })
  .parse(process.argv);
