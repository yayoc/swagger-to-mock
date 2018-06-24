import * as fs from "fs";
import { join } from "path";

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

// Replace `{}, /` charactors with `_`
export const normalizePath = (path: string): string => {
  const replaced = path.replace(/^\/|{|}/g, "");
  return replaced.replace(/\//g, "_");
};

// Write each response to JSON files.
export const writeFiles = (
  data: { [file: string]: any },
  log: (message: any) => void
): void => {
  Object.keys(data).forEach(key => {
    const val = data[key];
    const fileName = `${key}.json`
    const path = join(".", fileName);
    log(fileName);
    const formatted = JSON.stringify(val, null, 2);
    fs.writeFileSync(path, formatted);
  });
};
