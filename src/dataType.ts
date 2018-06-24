export enum DataType {
  string = "string",
  number = "number",
  integer = "integer",
  boolean = "boolean",
  array = "array",
  object = "object"
}

export namespace DataType {
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
