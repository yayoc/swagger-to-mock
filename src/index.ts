#!/usr/bin/env node

import * as commander from "commander";
import chalk from "chalk";
import { extractResponses } from "./response";
import { writeFiles } from "./util";
import { extractSchemas } from "./schema";
import { composeMockData } from "./compose";

const swaggerCombine = require('swagger-combine');
const log = console.log;

log(chalk.yellowBright("swagger-to-mock"));
commander
  .arguments("<file>")
  .option("-d, --dir <name>", "output directory")
  .action(async (file, cmd) => {
    try {
        swaggerCombine(file)
            .then((content: any) => {
                const responses = extractResponses(content);
                const schemas = extractSchemas(content);
                const composed = composeMockData(responses, schemas);
                const outputPath = cmd.dir ? cmd.dir : ".";
                writeFiles(composed, outputPath, log);
                log(chalk.yellowBright("Completed"));
            })
            .catch((e: any) => {
                log(chalk.redBright(e));
                log(chalk.redBright("Failed"));
            });
    } catch (e) {
      log(chalk.redBright(e));
      log(chalk.redBright("Failed"));
    }
  })
  .parse(process.argv);
