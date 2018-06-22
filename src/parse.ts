import { extname } from "path";
import * as yaml from "js-yaml";
import * as fs from "fs";

enum FileType {
  YAML = ".yaml",
  JSON = ".json"
}

export const parse = (file: string): any => {
  const ext = extname(file);
  const content = fs.readFileSync(file, "utf8");
  return ext === FileType.YAML ? yaml.safeLoad(content) : JSON.parse(content);
};
