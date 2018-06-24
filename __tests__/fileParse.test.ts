import { parse } from "../src/fileParse";
import { join } from "path";

describe("[parse]", () => {
  describe("for YAML file", () => {
    it("should parse the file propery", () => {
      const yamlFile = join(__dirname, "__mocks__/petstore.yaml");
      const res = parse(yamlFile);
      expect(res).toBeInstanceOf(Object);
      expect(res.openapi).toEqual("3.0.0");
      expect(res.info.version).toEqual("1.0.0");
    });
    it("should throw an exception when the file is wrong format", () => {
      const yamlFile = join(__dirname, "__mocks__/wrong_format.yaml");
      expect(() => {
        parse(yamlFile);
      }).toThrow();
    });
  });
  // TODO: 
  describe("for JSON file", () => {
    it("should parse the file propery", () => {});
    it("should throw an exception when the file is wrong format", () => {});
  });
});
