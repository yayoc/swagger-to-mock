import { ResponsesType, APPLICATION_JSON } from "./response";
import { Schemas } from "./schema";
import { normalizePath, getSchemaName } from "./util";
import { REF, parseObject, parseArray } from "./parse";
import { isObject, isArray } from "./dataType";

type MockData = {
  [path: string]: any;
};

// Compose mock data
export const composeMockData = (
  responses: ResponsesType,
  schemas: Schemas
): MockData => {
  let ret: any = {};
  Object.keys(responses).forEach(path => {
    const res: any = responses[path];
    const pathKey = normalizePath(path);
    if (res) {
      const val = res[APPLICATION_JSON];
      if ("examples" in val) {
        ret[pathKey] = val.examples;
      } else if ("schema" in val) {
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
    }
  });
  return ret;
};
