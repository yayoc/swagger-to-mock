import { normalizePath, getSchemaName } from "../src/util";

describe("[normalizePath]", () => {
  it("should return normalized path", () => {
    const path = "/pets/{petId}_get_200";
    expect(normalizePath(path)).toEqual("pets_petId_get_200");
  });

  it("should return as it is", () => {
    const path = "/pets_get_200";
    expect(normalizePath(path)).toEqual("pets_get_200");
  });
});

describe("[getSchemaName]", () => {
  it("should return schema name", () => {
    const str = "#/components/schemas/Pet";
    expect(getSchemaName(str)).toEqual("Pet");
  });

  it("should return null when schema is not found", () => {
    const str = "#/components/schemas";
    expect(getSchemaName(str)).toBeNull();
  });
});
