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
