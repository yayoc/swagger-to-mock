#! /usr/bin/env node
import * as commander from "commander";
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
  let ret: any = {};
  Object.keys(schemas).forEach((name: string) => {
    ret[name] = getMockData(schemas, name);
  });
  return ret;
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
  if ("allOf" in schema) {
    let ret = {};
    schema["allOf"].forEach((data: any) => {
      if ("$ref" in data) {
        const schemaName = getSchemaName(data["$ref"]);
        if (schemaName) {
          const schemaData = getMockData(schemas, schemaName);
          ret = Object.assign({}, schemaData);
        }
      } else if (data.type === "object") {
        const objectMockData: any = {};
        if ("properties" in data) {
          Object.keys(data.properties).forEach(property => {
            const value = data.properties[property];
            objectMockData[property] =
              value.example || DataType.defaultValue(value.type);
          });
          ret = Object.assign({}, objectMockData);
        }
      }
    });
    return ret;
  } else if (schema.type === "array") {
    if ("$ref" in schema.items) {
      const schemaName = getSchemaName(schema.items["$ref"]);
      return schemaName ? [getMockData(schemas, schemaName)] : [];
    } else {
      return [DataType.defaultValue(schema.items.type)];
    }
  } else if ("properties" in schema) {
    let ret: any = {};
    Object.keys(schema.properties).forEach((property: string) => {
      const value = schema.properties[property];
      if ("$ref" in value) {
        const schemaName = getSchemaName(value["$ref"]);
        ret[property] = schemaName ? getMockData(schemas, schemaName) : {};
      } else {
        ret[property] = value.example || DataType.defaultValue(value.type);
      }
    });
    return ret;
  } else if ("additionalProperties" in schema) {
    if (schema.example) {
      return schema.example;
    }
    return {};
  } else if ("$ref" in schema) {
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
    if (res) {
      const val = res["application/json"];
      if ("schema" in val) {
        const ref = val.schema["$ref"];
        if (ref) {
          const schemaName = getSchemaName(ref);
          if (schemaName) {
            const values = schemas[schemaName];
            ret[normalizePath(path)] = values;
          }
        } else {
          // TODO: Support primitive Object
          ret[normalizePath(path)] = val.schema.properties;
        }
      }
    }
  });
  return ret;
};

// Replace `{}, /` charactors with `_`
export const normalizePath = (path: string): string => {
  const replaced = path.replace(/^\/|{|}/g, "");
  return replaced.replace(/\//g, "_");
};

commander
  .arguments("<file>")
  .action(async file => {
    try {
      const content = parse(file);
      const responses = extractResponses(content);
      const schemas = extractSchemas(content);
      const composed = composeMockData(responses, schemas);
      console.log(schemas);
    } catch (e) {
      console.error(e);
    }
  })
  .parse(process.argv);
