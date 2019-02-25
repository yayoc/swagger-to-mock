#!/usr/bin/env node

import * as commander from "commander";
import chalk from "chalk";
import { parse } from "./fileParse";
import { extractResponses } from "./response";
import { writeFiles } from "./util";
import { extractSchemas } from "./schema";
import { composeMockData } from "./compose";

const log = console.log;

log(chalk.yellowBright("swagger-to-mock"));
commander
  .arguments("<file>")
  .option("-d, --dir <name>", "output directory")
  .action(async (file, cmd) => {
    try {
      const content = parse(file);
      const responses = extractResponses(content);
      const schemas = extractSchemas(content);
      const composed = composeMockData(responses, schemas);
      const outputPath = cmd.dir ? cmd.dir : ".";
      writeFiles(composed, outputPath, log);
      log(chalk.yellowBright("Completed"));
    } catch (e) {
      log(chalk.redBright(e));
      log(chalk.redBright("Failed"));
    }
  })
  .parse(process.argv);
